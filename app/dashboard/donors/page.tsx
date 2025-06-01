"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Users, Calendar, Droplets, Search, TrendingUp, Loader2, AlertTriangle, Wifi, WifiOff } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponsiveContainer, XAxis, YAxis, LineChart, Line } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

// Configuration
const API_BASE_URL ="https://192.168.1.213:57699"
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "false"

// API Response Interfaces
interface ApplicationUserDTO {
  id: string
  donorWantToStayAnonymous?: boolean | null
  donorExcludeFromPublicPortal?: boolean | null
  donorAvailability?: number | null
  donorContactMethod?: number | null
  donorName?: string | null
  donorBirthDate: string
  donorBloodGroup: number
  donorNIN?: string | null
  donorTel?: string | null
  email?: string | null
  donorNotesForBTC?: string | null
  donorLastDonationDate?: string | null
  communeId?: number | null
  commune?: {
    id: number
    name: string | null
    wilayaId: number
    wilaya?: {
      id: number
      name: string | null
    } | null
  } | null
}

interface ListApplicationUsersResponse {
  users: ApplicationUserDTO[]
}

interface WilayaDTO {
  id: number
  name: string | null
}

interface ListWilayasResponse {
  wilayas: WilayaDTO[]
}

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

// Contact method mapping
const contactMethodMapping: Record<number, string> = {
  1: "Call",
  2: "Text",
  3: "All",
}

// Availability mapping
const availabilityMapping: Record<number, string> = {
  1: "Morning",
  2: "Afternoon",
  3: "Day",
  4: "Night",
  5: "All Time",
}

// Mock data
const mockDonors: ApplicationUserDTO[] = [
  {
    id: "1",
    donorName: "Ahmed Benali",
    donorBirthDate: "1985-03-15T00:00:00Z",
    donorBloodGroup: 7, // O+
    donorTel: "+213 555 123 456",
    donorContactMethod: 3,
    donorAvailability: 5,
    donorLastDonationDate: "2024-01-15T00:00:00Z",
    commune: {
      id: 1,
      name: "Alger Centre",
      wilayaId: 16,
      wilaya: { id: 16, name: "Alger" },
    },
  },
  {
    id: "2",
    donorName: "Fatima Khelifi",
    donorBirthDate: "1990-07-22T00:00:00Z",
    donorBloodGroup: 3, // A+
    donorTel: "+213 555 234 567",
    donorContactMethod: 1,
    donorAvailability: 1,
    donorLastDonationDate: "2024-02-10T00:00:00Z",
    commune: {
      id: 2,
      name: "Oran Centre",
      wilayaId: 31,
      wilaya: { id: 31, name: "Oran" },
    },
  },
  {
    id: "3",
    donorWantToStayAnonymous: true,
    donorBirthDate: "1988-11-08T00:00:00Z",
    donorBloodGroup: 5, // B+
    donorTel: "+213 555 345 678",
    donorContactMethod: 2,
    donorAvailability: 3,
    commune: {
      id: 3,
      name: "Constantine Centre",
      wilayaId: 25,
      wilaya: { id: 25, name: "Constantine" },
    },
  },
]

const mockWilayas: WilayaDTO[] = [
  { id: 16, name: "Alger" },
  { id: 31, name: "Oran" },
  { id: 25, name: "Constantine" },
  { id: 23, name: "Annaba" },
  { id: 9, name: "Blida" },
]

export default function DonorsPage() {
  const [donors, setDonors] = useState<ApplicationUserDTO[]>([])
  const [wilayas, setWilayas] = useState<WilayaDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedWilaya, setSelectedWilaya] = useState<string>("all")
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string>("all")
  const [isOnline, setIsOnline] = useState(true)
  const [usingMockData, setUsingMockData] = useState(false)

  const fetchData = async (retryCount = 0) => {
    if (USE_MOCK_DATA) {
      setDonors(mockDonors)
      setWilayas(mockWilayas)
      setUsingMockData(true)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      // Fetch both donors and wilayas
      const [donorsResponse, wilayasResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/users?level=1`, {
          method: "GET",
          headers: {
            // "Content-Type": "application/json",
          },
          signal: controller.signal,
        }),
        fetch(`${API_BASE_URL}/Wilayas`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        }),
      ])

      clearTimeout(timeoutId)

      if (!donorsResponse.ok) {
        throw new Error(`Failed to fetch donors: ${donorsResponse.status}`)
      }
      if (!wilayasResponse.ok) {
        throw new Error(`Failed to fetch wilayas: ${wilayasResponse.status}`)
      }

      const donorsData: ListApplicationUsersResponse = await donorsResponse.json()
      const wilayasData: ListWilayasResponse = await wilayasResponse.json()

      setDonors(donorsData.users || [])
      setWilayas(wilayasData.wilayas || [])
      setIsOnline(true)
      setUsingMockData(false)
    } catch (err) {
      console.error("Error fetching data:", err)

      if (retryCount < 2) {
        setTimeout(() => fetchData(retryCount + 1), 2000)
        return
      }

      setError(err instanceof Error ? err.message : "Failed to fetch data")
      setDonors(mockDonors)
      setWilayas(mockWilayas)
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

  const filteredDonors = donors.filter((donor) => {
    const matchesSearch =
      donor.donorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donor.commune?.wilaya?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donor.commune?.name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesWilaya = selectedWilaya === "all" || donor.commune?.wilayaId?.toString() === selectedWilaya
    const matchesBloodGroup = selectedBloodGroup === "all" || donor.donorBloodGroup.toString() === selectedBloodGroup

    return matchesSearch && matchesWilaya && matchesBloodGroup
  })

  // Group donors by wilaya for statistics
  const donorsByWilaya = wilayas
    .map((wilaya) => {
      const wilayaDonors = donors.filter((donor) => donor.commune?.wilayaId === wilaya.id)
      const recentDonors = wilayaDonors.filter((donor) => {
        if (!donor.donorLastDonationDate) return false
        const lastDonation = new Date(donor.donorLastDonationDate)
        const oneMonthAgo = new Date()
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
        return lastDonation >= oneMonthAgo
      })

      return {
        wilaya: wilaya.name || `Wilaya ${wilaya.id}`,
        donors: wilayaDonors.length,
        newThisMonth: recentDonors.length,
        bloodDrives: Math.floor(Math.random() * 8) + 1,
      }
    })
    .filter((w) => w.donors > 0)
    .sort((a, b) => b.donors - a.donors)

  // Blood type distribution
  const bloodTypeDistribution = Object.entries(bloodGroupMapping)
    .map(([key, type]) => {
      const count = donors.filter((donor) => donor.donorBloodGroup === Number.parseInt(key)).length
      const percentage = donors.length > 0 ? ((count / donors.length) * 100).toFixed(1) : "0"
      return {
        type,
        percentage: Number.parseFloat(percentage),
        donors: count,
      }
    })
    .filter((item) => item.donors > 0)

  // Mock monthly trends data
  const monthlyTrends = [
    { month: "Jan", donors: Math.round(donors.length * 0.7), donations: Math.round(donors.length * 1.1) },
    { month: "Feb", donors: Math.round(donors.length * 0.75), donations: Math.round(donors.length * 1.15) },
    { month: "Mar", donors: Math.round(donors.length * 0.8), donations: Math.round(donors.length * 1.2) },
    { month: "Apr", donors: Math.round(donors.length * 0.85), donations: Math.round(donors.length * 1.25) },
    { month: "May", donors: Math.round(donors.length * 0.9), donations: Math.round(donors.length * 1.3) },
    { month: "Jun", donors: donors.length, donations: Math.round(donors.length * 1.35) },
  ]

  const totalDonors = donors.length
  const newDonorsThisMonth = donors.filter((donor) => {
    const birthDate = new Date(donor.donorBirthDate)
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    return birthDate >= oneMonthAgo
  }).length

  const totalBloodDrives = donorsByWilaya.reduce((sum, w) => sum + w.bloodDrives, 0)

  if (loading) {
    return (
      <div className="flex-1 w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-lg">Loading donor data...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 w-full max-w-full overflow-hidden">
      <div className="space-y-4 p-4 md:p-6 lg:p-8 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">Donor Management</h2>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-primary border-primary whitespace-nowrap">
              {totalDonors.toLocaleString()} Total Donors
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
              <CardTitle className="text-sm font-medium">Total Donors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{totalDonors.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Registered donors</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Donors</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">+{newDonorsThisMonth}</div>
              <p className="text-xs text-muted-foreground">New registrations</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blood Drives</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{totalBloodDrives}</div>
              <p className="text-xs text-muted-foreground">Active this month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Age</CardTitle>
              <Droplets className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {donors.length > 0
                  ? Math.round(
                      donors.reduce((sum, donor) => {
                        const age = new Date().getFullYear() - new Date(donor.donorBirthDate).getFullYear()
                        return sum + age
                      }, 0) / donors.length,
                    )
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground">Years old</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* Donor Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Donor Growth Trends
              </CardTitle>
              <CardDescription>Monthly donor registration trends</CardDescription>
            </CardHeader>
            <CardContent className="p-2 md:p-6">
              <ChartContainer
                config={{
                  donors: {
                    label: "Donors",
                    color: "#B71C1C",
                  },
                  donations: {
                    label: "Donations",
                    color: "#E53935",
                  },
                }}
                className="h-[250px] md:h-[300px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrends} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={{ stroke: "#e5e7eb" }} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={{ stroke: "#e5e7eb" }} />
                    <ChartTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 border rounded-lg shadow-lg max-w-xs">
                              <p className="font-semibold">{`Month: ${label}`}</p>
                              {payload.map((entry, index) => (
                                <p key={index} style={{ color: entry.color }}>
                                  {`${entry.dataKey}: ${Math.round(entry.value as number)}`}
                                </p>
                              ))}
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="donors"
                      stroke="#B71C1C"
                      strokeWidth={3}
                      dot={{ fill: "#B71C1C", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: "#B71C1C", strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="donations"
                      stroke="#E53935"
                      strokeWidth={3}
                      dot={{ fill: "#E53935", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: "#E53935", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Blood Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Droplets className="h-5 w-5 text-primary" />
                Blood Type Distribution
              </CardTitle>
              <CardDescription>Donor distribution by blood type</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[250px] md:h-[300px] w-full">
                <div className="space-y-3 pr-4">
                  {bloodTypeDistribution.map((item) => (
                    <div key={item.type} className="flex items-center justify-between min-w-0">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="font-semibold text-lg w-8 flex-shrink-0">{item.type}</div>
                        <div className="flex-1 bg-muted rounded-full h-2 min-w-[60px]">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <div className="font-semibold">{item.percentage}%</div>
                        <div className="text-sm text-muted-foreground">{item.donors} donors</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Donors Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Users className="h-5 w-5 text-primary" />
              Registered Donors
            </CardTitle>
            <CardDescription>Donor information and activity across Algeria</CardDescription>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search donors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={selectedWilaya} onValueChange={setSelectedWilaya}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Wilaya" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Wilayas</SelectItem>
                  {wilayas.map((wilaya) => (
                    <SelectItem key={wilaya.id} value={wilaya.id.toString()}>
                      {wilaya.name || `Wilaya ${wilaya.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedBloodGroup} onValueChange={setSelectedBloodGroup}>
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder="Blood Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(bloodGroupMapping).map(([key, type]) => (
                    <SelectItem key={key} value={key}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px] w-full">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Donor</TableHead>
                      <TableHead className="min-w-[80px]">Blood Type</TableHead>
                      <TableHead className="min-w-[120px]">Location</TableHead>
                      <TableHead className="min-w-[100px]">Contact</TableHead>
                      <TableHead className="min-w-[120px]">Last Donation</TableHead>
                      <TableHead className="min-w-[100px]">Availability</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDonors.slice(0, 50).map((donor) => (
                      <TableRow key={donor.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {donor.donorWantToStayAnonymous ? "Anonymous Donor" : donor.donorName || "Unnamed"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Age: {new Date().getFullYear() - new Date(donor.donorBirthDate).getFullYear()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="whitespace-nowrap">
                            {bloodGroupMapping[donor.donorBloodGroup] || `Type ${donor.donorBloodGroup}`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{donor.commune?.name || "Unknown"}</div>
                            <div className="text-muted-foreground">
                              {donor.commune?.wilaya?.name || `Wilaya ${donor.commune?.wilayaId}`}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {donor.donorContactMethod && <div>{contactMethodMapping[donor.donorContactMethod]}</div>}
                            {donor.donorTel && <div className="text-muted-foreground">{donor.donorTel}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {donor.donorLastDonationDate
                              ? new Date(donor.donorLastDonationDate).toLocaleDateString()
                              : "Never"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {donor.donorAvailability ? availabilityMapping[donor.donorAvailability] : "Not specified"}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
