"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Building2,
  Users,
  Droplets,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, PieChart, Pie, Cell } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useEffect, useState } from "react"

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

interface GetDashboardStatsResponse {
  stats: DashboardStatsDTO | null
}

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://192.168.1.213:57699"
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true"

// Blood group mapping
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

// Mock data for fallback
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

const getStatusColor = (available: number, minStock: number, maxStock: number) => {
  if (available <= minStock * 0.5) return "text-red-600 bg-red-50"
  if (available <= minStock) return "text-yellow-600 bg-yellow-50"
  return "text-green-600 bg-green-50"
}

const getStatusIcon = (available: number, minStock: number, maxStock: number) => {
  if (available <= minStock * 0.5) return <AlertTriangle className="h-4 w-4" />
  if (available <= minStock) return <AlertTriangle className="h-4 w-4" />
  return <CheckCircle className="h-4 w-4" />
}

const getStatusText = (available: number, minStock: number, maxStock: number) => {
  if (available <= minStock * 0.5) return "critical"
  if (available <= minStock) return "low"
  return "healthy"
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardStatsDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [usingMockData, setUsingMockData] = useState(false)

  const fetchDashboardData = async (retryCount = 0) => {
    if (USE_MOCK_DATA) {
      setDashboardData(mockDashboardData)
      setUsingMockData(true)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(`${API_BASE_URL}/Dashboard/stats`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // Add authorization header if needed
          // 'Authorization': `Bearer ${token}`
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: GetDashboardStatsResponse = await response.json()
      setDashboardData(data.stats)
      setIsOnline(true)
      setUsingMockData(false)
    } catch (err) {
      console.error("Error fetching dashboard data:", err)

      if (retryCount < 2) {
        // Retry up to 2 times
        setTimeout(() => fetchDashboardData(retryCount + 1), 2000)
        return
      }

      // After retries failed, use mock data
      setError(err instanceof Error ? err.message : "Failed to fetch dashboard data")
      setDashboardData(mockDashboardData)
      setUsingMockData(true)
      setIsOnline(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleRetry = () => {
    fetchDashboardData()
  }

  // Transform blood stock data for charts
  const stockData = dashboardData?.globalBloodStock
    ? Object.entries(dashboardData.globalBloodStock).map(([bloodGroupKey, stock]) => {
        const bloodType = bloodGroupMapping[Number.parseInt(bloodGroupKey)] || bloodGroupKey
        const status = getStatusText(stock.totalAvailable, stock.totalMinStock, stock.totalMaxStock)
        return {
          bloodType,
          units: stock.totalAvailable,
          status,
          minStock: stock.totalMinStock,
          maxStock: stock.totalMaxStock,
        }
      })
    : []

  // Transform wilaya data for charts
  const wilayaData = dashboardData?.requestsByWilaya
    ? Object.entries(dashboardData.requestsByWilaya)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([wilaya, requests], index) => ({
          name: wilaya,
          requests,
          color: `hsl(${0 + index * 10}, 70%, ${50 + index * 5}%)`,
        }))
    : []

  if (loading) {
    return (
      <div className="flex-1 w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-lg">Loading dashboard data...</span>
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
            <AlertDescription>No dashboard data available</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const totalStock = stockData.reduce((sum, item) => sum + item.units, 0)
  const criticalStock = stockData.filter((item) => item.status === "critical").length
  const lowStock = stockData.filter((item) => item.status === "low").length

  return (
    <div className="flex-1 w-full max-w-full overflow-hidden">
      <div className="space-y-4 p-4 md:p-6 lg:p-8 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">Dashboard Overview</h2>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-primary border-primary whitespace-nowrap">
              Super Admin
            </Badge>
            <Badge variant={isOnline ? "default" : "destructive"} className="whitespace-nowrap flex items-center gap-1">
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {usingMockData ? "Demo Mode" : "Live Data"}
            </Badge>
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

        {/* Key Metrics */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total BTCs</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{dashboardData.totalBloodCenters}</div>
              <p className="text-xs text-muted-foreground">Blood Transfusion Centers</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Donors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{dashboardData.totalDonors.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Registered donors</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blood Requests</CardTitle>
              <Droplets className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{dashboardData.totalBloodRequests}</div>
              <p className="text-xs text-muted-foreground">Total requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{criticalStock + lowStock}</div>
              <p className="text-xs text-muted-foreground">
                {criticalStock} critical, {lowStock} low
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 grid-cols-1 xl:grid-cols-7">
          {/* Blood Stock Levels */}
          <Card className="xl:col-span-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Droplets className="h-5 w-5 text-primary" />
                National Blood Stock by Type
              </CardTitle>
              <CardDescription>Current inventory levels across all BTCs</CardDescription>
            </CardHeader>
            <CardContent className="p-2 md:p-6">
              {stockData.length > 0 ? (
                <ChartContainer
                  config={{
                    units: {
                      label: "Units",
                      color: "#B71C1C",
                    },
                  }}
                  className="h-[250px] md:h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                      <XAxis dataKey="bloodType" tick={{ fontSize: 11 }} axisLine={{ stroke: "#e5e7eb" }} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={{ stroke: "#e5e7eb" }} />
                      <ChartTooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-white p-3 border rounded-lg shadow-lg max-w-xs">
                                <p className="font-semibold">{`Blood Type: ${label}`}</p>
                                <p className="text-primary">{`Available: ${payload[0].value} units`}</p>
                                <p className="text-sm text-muted-foreground">{`Min Stock: ${data.minStock}`}</p>
                                <p className="text-sm text-muted-foreground">{`Max Stock: ${data.maxStock}`}</p>
                                <p className="text-sm text-muted-foreground capitalize">Status: {data.status}</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="units" fill="#B71C1C" radius={[4, 4, 0, 0]} stroke="#B71C1C" strokeWidth={1} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  <p>No blood stock data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Requests by Wilaya */}
          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Requests by Wilaya
              </CardTitle>
              <CardDescription>Top 5 wilayas by blood requests</CardDescription>
            </CardHeader>
            <CardContent className="p-2 md:p-6">
              {wilayaData.length > 0 ? (
                <ChartContainer
                  config={{
                    requests: {
                      label: "Requests",
                      color: "#B71C1C",
                    },
                  }}
                  className="h-[250px] md:h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                      <Pie
                        data={wilayaData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="requests"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {wilayaData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-3 border rounded-lg shadow-lg max-w-xs">
                                <p className="font-semibold">{payload[0].payload.name}</p>
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

        {/* Stock Status Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Blood Type Status Overview
            </CardTitle>
            <CardDescription>Detailed status for each blood type across the national network</CardDescription>
          </CardHeader>
          <CardContent>
            {stockData.length > 0 ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {stockData.map((item) => (
                  <div key={item.bloodType} className="flex items-center justify-between p-3 border rounded-lg min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="font-semibold text-lg flex-shrink-0">{item.bloodType}</div>
                      <Badge className={`${getStatusColor(item.units, item.minStock, item.maxStock)} flex-shrink-0`}>
                        {getStatusIcon(item.units, item.minStock, item.maxStock)}
                        <span className="ml-1 capitalize">{item.status}</span>
                      </Badge>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-lg">{item.units}</div>
                      <div className="text-sm text-muted-foreground">units</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <p>No blood stock data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
