"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, Calendar, Droplets, Users, Building2, AlertTriangle, Loader2, Wifi, WifiOff } from "lucide-react"
import { ResponsiveContainer, XAxis, YAxis, PieChart, Pie, Cell, BarChart, Bar } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useState, useEffect } from "react"

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://192.168.1.213:57679"
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "false"

// API Response Interfaces
interface DashboardStatsDTO {
  totalDonors: number
  totalBloodRequests: number
  totalBloodCenters: number
  requestsByBloodGroup?: Record<string, number>
  requestsByWilaya?: Record<string, number>
  centersByWilaya?: Record<string, number>
  requestsByBloodTransferCenter?: Record<string, number>
  globalBloodStock?: Record<string, BloodStockSummaryDTO>
  bloodStockByWilaya?: Record<string, Record<string, BloodStockSummaryDTO>>
  bloodStockByCenter?: Record<string, Record<string, BloodStockSummaryDTO>>
}

interface BloodStockSummaryDTO {
  totalAvailable: number
  totalMinStock: number
  totalMaxStock: number
  byBloodGroup?: Record<string, number>
  byBloodDonationType?: Record<string, number>
}

interface BloodDonationRequestDTO {
  id: string
  evolutionStatus?: number | null
  donationType: number
  bloodGroup: number
  requestedQty: number
  requestDate: string
  requestDueDate?: string | null
  priority: number
  moreDetails?: string | null
  serviceName?: string | null
  bloodTansfusionCenterId: string
  bloodTansfusionCenter?: {
    id: string
    name?: string | null
    wilayaId: number
    wilaya?: {
      id: number
      name?: string | null
    } | null
  } | null
}

interface ListBloodDonationRequestsResponse {
  bloodDonationRequests: BloodDonationRequestDTO[]
}

// Enums mapping
const bloodGroupMapping: Record<number, string> = {
  1: "AB+",
  2: "AB-",
  3: "A+",
  4: "A-",
  5: "B+",
  6: "B-",
  7: "O+",
  8: "O-",
}

const donationTypeMapping: Record<number, string> = {
  1: "Whole Blood",
  2: "Platelet",
  3: "Plasma",
}

const priorityMapping: Record<number, string> = {
  1: "Low",
  2: "Normal",
  3: "Critical",
}

const statusMapping: Record<number, string> = {
  0: "Initiated",
  1: "Waiting",
  2: "Partially Resolved",
  3: "Resolved",
  4: "Canceled",
}

// Mock data
const mockDashboardData: DashboardStatsDTO = {
  totalDonors: 4068,
  totalBloodRequests: 156,
  totalBloodCenters: 48,
  requestsByBloodGroup: {
    "7": 45, // O+
    "3": 32, // A+
    "5": 28, // B+
    "1": 18, // AB+
    "8": 15, // O-
    "4": 12, // A-
    "6": 4, // B-
    "2": 2, // AB-
  },
  requestsByWilaya: {
    Alger: 45,
    Oran: 32,
    Constantine: 28,
    Annaba: 18,
    Blida: 15,
  },
  centersByWilaya: {
    Alger: 8,
    Oran: 6,
    Constantine: 5,
    Annaba: 3,
    Blida: 4,
  },
  globalBloodStock: {
    "7": { totalAvailable: 298, totalMinStock: 100, totalMaxStock: 500 }, // O+
    "3": { totalAvailable: 245, totalMinStock: 80, totalMaxStock: 400 }, // A+
    "5": { totalAvailable: 156, totalMinStock: 60, totalMaxStock: 300 }, // B+
    "8": { totalAvailable: 45, totalMinStock: 50, totalMaxStock: 200 }, // O-
    "1": { totalAvailable: 67, totalMinStock: 40, totalMaxStock: 150 }, // AB+
    "4": { totalAvailable: 89, totalMinStock: 70, totalMaxStock: 250 }, // A-
    "6": { totalAvailable: 34, totalMinStock: 40, totalMaxStock: 120 }, // B-
    "2": { totalAvailable: 23, totalMinStock: 30, totalMaxStock: 100 }, // AB-
  },
}

const mockBloodRequests: BloodDonationRequestDTO[] = [
  {
    id: "1",
    evolutionStatus: 1,
    donationType: 1,
    bloodGroup: 7,
    requestedQty: 5,
    requestDate: "2024-01-15T10:00:00Z",
    priority: 3,
    serviceName: "Emergency",
    bloodTansfusionCenterId: "1",
    bloodTansfusionCenter: {
      id: "1",
      name: "BTC Alger Centre",
      wilayaId: 16,
      wilaya: { id: 16, name: "Alger" },
    },
  },
  {
    id: "2",
    evolutionStatus: 0,
    donationType: 1,
    bloodGroup: 3,
    requestedQty: 3,
    requestDate: "2024-01-16T14:30:00Z",
    priority: 2,
    serviceName: "Surgery",
    bloodTansfusionCenterId: "2",
    bloodTansfusionCenter: {
      id: "2",
      name: "BTC Oran",
      wilayaId: 31,
      wilaya: { id: 31, name: "Oran" },
    },
  },
]

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "high":
      return "bg-red-100 text-red-800 border-red-200"
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "low":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "info":
      return "bg-green-100 text-green-800 border-green-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

export default function AnalyticsPage() {
  const [dashboardData, setDashboardData] = useState<DashboardStatsDTO | null>(null)
  const [bloodRequests, setBloodRequests] = useState<BloodDonationRequestDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [usingMockData, setUsingMockData] = useState(false)

  const fetchData = async (retryCount = 0) => {
    if (USE_MOCK_DATA) {
      setDashboardData(mockDashboardData)
      setBloodRequests(mockBloodRequests)
      setUsingMockData(true)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      // Fetch dashboard stats and blood requests
      const [statsResponse, requestsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/Dashboard/stats`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        }),
        fetch(`${API_BASE_URL}/BloodDonationRequests`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        }),
      ])

      clearTimeout(timeoutId)

      if (!statsResponse.ok) {
        throw new Error(`Failed to fetch stats: ${statsResponse.status}`)
      }
      if (!requestsResponse.ok) {
        throw new Error(`Failed to fetch requests: ${requestsResponse.status}`)
      }

      const statsData = await statsResponse.json()
      const requestsData: ListBloodDonationRequestsResponse = await requestsResponse.json()

      setDashboardData(statsData.stats)
      setBloodRequests(requestsData.bloodDonationRequests || [])
      setIsOnline(true)
      setUsingMockData(false)
    } catch (err) {
      console.error("Error fetching data:", err)

      if (retryCount < 2) {
        setTimeout(() => fetchData(retryCount + 1), 2000)
        return
      }

      setError(err instanceof Error ? err.message : "Failed to fetch data")
      setDashboardData(mockDashboardData)
      setBloodRequests(mockBloodRequests)
      setUsingMockData(true)
      setIsOnline(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    
  }, [])

  const handleRetry = () => {
    fetchData()
  }

  // Transform data for charts
  const stockTrends = dashboardData?.globalBloodStock
    ? Object.entries(dashboardData.globalBloodStock).map(([bloodGroupKey, stock]) => {
        const bloodType = bloodGroupMapping[Number.parseInt(bloodGroupKey)] || bloodGroupKey
        const critical = stock.totalAvailable <= stock.totalMinStock * 0.5 ? stock.totalAvailable : 0
        const low =
          stock.totalAvailable > stock.totalMinStock * 0.5 && stock.totalAvailable <= stock.totalMinStock
            ? stock.totalAvailable
            : 0
        const healthy = stock.totalAvailable > stock.totalMinStock ? stock.totalAvailable : 0

        return {
          month: bloodType,
          total: stock.totalAvailable,
          critical,
          low,
          healthy,
        }
      })
    : []

  // Requests by priority
  const requestsByPriority = bloodRequests.reduce(
    (acc, request) => {
      const priority = priorityMapping[request.priority] || `Priority ${request.priority}`
      acc[priority] = (acc[priority] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const priorityData = Object.entries(requestsByPriority).map(([priority, count]) => ({
    priority,
    count,
    color: priority === "Critical" ? "#D32F2F" : priority === "Normal" ? "#FBC02D" : "#388E3C",
  }))

  // Requests by blood group
  const requestsByBloodGroup = dashboardData?.requestsByBloodGroup
    ? Object.entries(dashboardData.requestsByBloodGroup).map(([bloodGroupKey, count]) => ({
        bloodType: bloodGroupMapping[Number.parseInt(bloodGroupKey)] || bloodGroupKey,
        requests: count,
      }))
    : []

  // Wilaya performance
  const wilayaPerformance =
    dashboardData?.requestsByWilaya && dashboardData?.centersByWilaya
      ? Object.entries(dashboardData.requestsByWilaya)
          .map(([wilaya, requests]) => ({
            wilaya,
            score: Math.round((requests / (dashboardData.centersByWilaya?.[wilaya] || 1)) * 10),
            requests,
            centers: dashboardData.centersByWilaya?.[wilaya] || 0,
            efficiency: ((requests / (dashboardData.centersByWilaya?.[wilaya] || 1)) * 1.5).toFixed(1),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
      : []

  // Critical alerts based on real data
  const criticalAlerts = [
    ...stockTrends
      .filter((stock) => stock.critical > 0)
      .map((stock) => ({
        id: `stock-${stock.month}`,
        type: "Stock Critical",
        message: `${stock.month} blood type below minimum threshold`,
        severity: "high" as const,
        time: "Real-time",
      })),
    ...stockTrends
      .filter((stock) => stock.low > 0)
      .map((stock) => ({
        id: `low-${stock.month}`,
        type: "Stock Low",
        message: `${stock.month} blood type running low`,
        severity: "medium" as const,
        time: "Real-time",
      })),
    ...bloodRequests
      .filter((req) => req.priority === 3)
      .slice(0, 3)
      .map((req) => ({
        id: `req-${req.id}`,
        type: "Critical Request",
        message: `Critical ${bloodGroupMapping[req.bloodGroup]} request from ${req.bloodTansfusionCenter?.name || "Unknown Center"}`,
        severity: "high" as const,
        time: new Date(req.requestDate).toLocaleDateString(),
      })),
  ]

  if (loading) {
    return (
      <div className="flex-1 w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-lg">Loading analytics data...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex-1 w-full max-w-full overflow-hidden">
        <div className="space-y-4 p-4 md:p-6 lg:p-8 pt-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>No analytics data available</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const totalStock = stockTrends.reduce((sum, item) => sum + item.total, 0)
  const criticalStock = stockTrends.filter((item) => item.critical > 0).length
  const lowStock = stockTrends.filter((item) => item.low > 0).length

  return (
    <div className="flex-1 w-full max-w-full overflow-hidden">
      <div className="space-y-4 p-4 md:p-6 lg:p-8 pt-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">Analytics Dashboard</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Badge variant={isOnline ? "default" : "destructive"} className="whitespace-nowrap flex items-center gap-1">
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {usingMockData ? "Demo Mode" : "Live Data"}
            </Badge>
            <Select defaultValue="realtime">
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">Real-time</SelectItem>
                <SelectItem value="1month">Last Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="whitespace-nowrap">
              <Calendar className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Connection Status Alert */}
        {(error || usingMockData) && (
          <Alert variant={usingMockData ? "default" : "destructive"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{usingMockData ? "Using demo data. API connection unavailable." : `API Error: ${error}`}</span>
              <Button variant="outline" size="sm" onClick={handleRetry} className="ml-2">
                Retry Connection
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Key Performance Indicators */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
              <Droplets className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{totalStock}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                Real-time inventory
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blood Requests</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{dashboardData.totalBloodRequests}</div>
              <p className="text-xs text-muted-foreground">Total requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Centers</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{dashboardData.totalBloodCenters}</div>
              <p className="text-xs text-muted-foreground">BTC facilities</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {criticalAlerts.filter((a) => a.severity === "high").length}
              </div>
              <p className="text-xs text-muted-foreground">Require immediate attention</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* Blood Stock Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Droplets className="h-5 w-5 text-primary" />
                Blood Stock Analysis
              </CardTitle>
              <CardDescription>Current stock levels by blood type</CardDescription>
            </CardHeader>
            <CardContent className="p-2 md:p-6">
              {stockTrends.length > 0 ? (
                <ChartContainer
                  config={{
                    total: { label: "Total Stock", color: "#B71C1C" },
                  }}
                  className="h-[250px] md:h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockTrends} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={{ stroke: "#e5e7eb" }} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={{ stroke: "#e5e7eb" }} />
                      <ChartTooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-white p-3 border rounded-lg shadow-lg max-w-xs">
                                <p className="font-semibold">{`Blood Type: ${label}`}</p>
                                <p className="text-primary">{`Total: ${data.total} units`}</p>
                                <p className="text-green-600">{`Healthy: ${data.healthy} units`}</p>
                                <p className="text-yellow-600">{`Low: ${data.low} units`}</p>
                                <p className="text-red-600">{`Critical: ${data.critical} units`}</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="total" fill="#B71C1C" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <p>No stock data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Request Priority Distribution
              </CardTitle>
              <CardDescription>Blood requests by priority level</CardDescription>
            </CardHeader>
            <CardContent className="p-2 md:p-6">
              {priorityData.length > 0 ? (
                <ChartContainer
                  config={{
                    count: { label: "Requests", color: "#B71C1C" },
                  }}
                  className="h-[250px] md:h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                      <Pie
                        data={priorityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="count"
                        label={({ priority, count }) => `${priority}: ${count}`}
                        labelLine={false}
                      >
                        {priorityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-3 border rounded-lg shadow-lg max-w-xs">
                                <p className="font-semibold">{payload[0].payload.priority}</p>
                                <p className="text-primary">{`Requests: ${payload[0].value}`}</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <p>No request data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 grid-cols-1 xl:grid-cols-3">
          {/* Wilaya Performance */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Building2 className="h-5 w-5 text-primary" />
                Wilaya Performance Ranking
              </CardTitle>
              <CardDescription>Performance scores based on request volume and center efficiency</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] w-full">
                <div className="space-y-4 pr-4">
                  {wilayaPerformance.map((wilaya, index) => (
                    <div
                      key={wilaya.wilaya}
                      className="flex items-center justify-between p-3 border rounded-lg min-w-0"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{wilaya.wilaya}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {wilaya.requests} requests • {wilaya.centers} centers • {wilaya.efficiency} efficiency
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <div className="text-2xl font-bold text-primary">{wilaya.score}</div>
                        <div className="text-sm text-muted-foreground">score</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Blood Group Requests */}
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Droplets className="h-5 w-5 text-primary" />
                Requests by Blood Type
              </CardTitle>
              <CardDescription>Request distribution by blood group</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] w-full">
                <div className="space-y-3 pr-4">
                  {requestsByBloodGroup.map((item) => (
                    <div key={item.bloodType} className="flex items-center justify-between min-w-0">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="font-semibold text-lg w-8 flex-shrink-0">{item.bloodType}</div>
                        <div className="flex-1 bg-muted rounded-full h-2 min-w-[60px]">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min((item.requests / Math.max(...requestsByBloodGroup.map((r) => r.requests))) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <div className="font-semibold">{item.requests}</div>
                        <div className="text-sm text-muted-foreground">requests</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Critical Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <AlertTriangle className="h-5 w-5 text-primary" />
              System Alerts & Notifications
            </CardTitle>
            <CardDescription>Real-time alerts and important notifications requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] w-full">
              <div className="space-y-3 pr-4">
                {criticalAlerts.length > 0 ? (
                  criticalAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start justify-between p-3 border rounded-lg min-w-0">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{alert.type}</span>
                            <Badge className={`${getSeverityColor(alert.severity)} text-xs`}>{alert.severity}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 break-words">{alert.message}</p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">{alert.time}</div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <p>No alerts at this time</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
