"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Building2, MapPin, Phone, Droplets, Search, Loader2, AlertTriangle, Wifi, WifiOff } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://192.168.1.213:57699"
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true"

// API Response Interfaces
interface BloodInventoryDTO {
  id: string
  bloodTansfusionCenterId: string
  bloodGroup: number
  bloodDonationType: number
  totalQty: number | null
  minQty: number | null
  maxQty: number | null
}

interface BloodTansfusionCenterDTO {
  id: string
  name: string | null
  address: string | null
  contact: string | null
  email: string | null
  tel: string | null
  wilayaId: number
  bloodInventories: BloodInventoryDTO[] | null
  wilaya?: {
    id: number
    name: string | null
  } | null
}

interface ListBloodTansfusionCentersResponse {
  bloodTansfusionCenters: BloodTansfusionCenterDTO[]
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

// Mock data
const mockCenters: BloodTansfusionCenterDTO[] = [
  {
    id: "1",
    name: "BTC Alger Centre",
    address: "Rue Didouche Mourad, Alger",
    contact: "Dr. Ahmed Benali",
    email: "alger@btc.dz",
    tel: "+213 21 123 456",
    wilayaId: 16,
    wilaya: { id: 16, name: "Alger" },
    bloodInventories: [
      {
        id: "1",
        bloodTansfusionCenterId: "1",
        bloodGroup: 7,
        bloodDonationType: 1,
        totalQty: 156,
        minQty: 50,
        maxQty: 300,
      },
      {
        id: "2",
        bloodTansfusionCenterId: "1",
        bloodGroup: 3,
        bloodDonationType: 1,
        totalQty: 89,
        minQty: 40,
        maxQty: 200,
      },
    ],
  },
  {
    id: "2",
    name: "BTC Oran",
    address: "Boulevard de la Révolution, Oran",
    contact: "Dr. Fatima Khelifi",
    email: "oran@btc.dz",
    tel: "+213 41 234 567",
    wilayaId: 31,
    wilaya: { id: 31, name: "Oran" },
    bloodInventories: [
      {
        id: "3",
        bloodTansfusionCenterId: "2",
        bloodGroup: 7,
        bloodDonationType: 1,
        totalQty: 98,
        minQty: 40,
        maxQty: 250,
      },
      {
        id: "4",
        bloodTansfusionCenterId: "2",
        bloodGroup: 3,
        bloodDonationType: 1,
        totalQty: 67,
        minQty: 35,
        maxQty: 180,
      },
    ],
  },
  {
    id: "3",
    name: "BTC Constantine",
    address: "Rue Larbi Ben M'hidi, Constantine",
    contact: "Dr. Mohamed Saidi",
    email: "constantine@btc.dz",
    tel: "+213 31 345 678",
    wilayaId: 25,
    wilaya: { id: 25, name: "Constantine" },
    bloodInventories: [
      {
        id: "5",
        bloodTansfusionCenterId: "3",
        bloodGroup: 7,
        bloodDonationType: 1,
        totalQty: 78,
        minQty: 30,
        maxQty: 200,
      },
      {
        id: "6",
        bloodTansfusionCenterId: "3",
        bloodGroup: 6,
        bloodDonationType: 1,
        totalQty: 12,
        minQty: 20,
        maxQty: 100,
      },
    ],
  },
]

const mockWilayas: WilayaDTO[] = [
  { id: 16, name: "Alger" },
  { id: 31, name: "Oran" },
  { id: 25, name: "Constantine" },
  { id: 23, name: "Annaba" },
  { id: 9, name: "Blida" },
]

const getStockLevel = (total: number | null, min: number | null) => {
  if (!total) return { level: "Unknown", color: "text-gray-600" }
  if (!min) return { level: "Normal", color: "text-blue-600" }

  if (total > min * 2) return { level: "High", color: "text-green-600" }
  if (total > min) return { level: "Medium", color: "text-yellow-600" }
  return { level: "Low", color: "text-red-600" }
}

export default function CTSPage() {
  const [centers, setCenters] = useState<BloodTansfusionCenterDTO[]>([])
  const [wilayas, setWilayas] = useState<WilayaDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedWilaya, setSelectedWilaya] = useState<string>("all")
  const [selectedCTS, setSelectedCTS] = useState<BloodTansfusionCenterDTO | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [usingMockData, setUsingMockData] = useState(false)

  const fetchData = async (retryCount = 0) => {
    // Log initial pour démarrer le traçage
    console.log("🔍 fetchData called, retryCount:", retryCount);
    console.log("📊 USE_MOCK_DATA:", USE_MOCK_DATA);
    console.log("🌐 API_BASE_URL:", API_BASE_URL);

    if (USE_MOCK_DATA) {
      console.log("📋 Using mock data instead of API");
      setCenters(mockCenters)
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

      // Fetch both centers and wilayas
      const filter = {
        wilayaId: 16,  // 0 pour tous les wilayas ou une valeur spécifique
        paginationTake: 50,
        paginationSkip: 0
      };
      
      // Log avant de faire les requêtes
      console.log("🔄 Preparing to fetch with filter:", filter);
      const btcUrl = `${API_BASE_URL}/BTC?wilayaId=${filter.wilayaId}&paginationTake=${filter.paginationTake}&paginationSkip=${filter.paginationSkip}&level=0`;
      const wilayasUrl = `${API_BASE_URL}/Wilayas`;
      console.log("📡 BTC URL:", btcUrl);
      console.log("📡 Wilayas URL:", wilayasUrl);

      const [centersResponse, wilayasResponse] = await Promise.all([
        fetch(btcUrl, {
          method: "GET",
          signal: controller.signal,
        }),
        fetch(wilayasUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        }),
      ])

      clearTimeout(timeoutId)
      
      // Log des statuts de réponse
      console.log("✅ BTC Response status:", centersResponse.status);
      console.log("✅ Wilayas Response status:", wilayasResponse.status);

      if (!centersResponse.ok) {
        // Log du corps de la réponse d'erreur si possible
        const errorText = await centersResponse.text().catch(e => "Could not read error response");
        console.error("❌ BTC Error response body:", errorText);
        throw new Error(`Failed to fetch centers: ${centersResponse.status}`)
      }
      if (!wilayasResponse.ok) {
        const errorText = await wilayasResponse.text().catch(e => "Could not read error response");
        console.error("❌ Wilayas Error response body:", errorText);
        throw new Error(`Failed to fetch wilayas: ${wilayasResponse.status}`)
      }

      // Cloner les réponses pour pouvoir les logger et les utiliser
      const centersResponseClone = centersResponse.clone();
      const wilayasResponseClone = wilayasResponse.clone();

      const centersData: ListBloodTansfusionCentersResponse = await centersResponse.json()
      const wilayasData: ListWilayasResponse = await wilayasResponse.json()
      
      // Log des données reçues
      console.log("📥 BTC centers count:", centersData.bloodTansfusionCenters?.length || 0);
      console.log("📥 Wilayas count:", wilayasData.wilayas?.length || 0);

      setCenters(centersData.bloodTansfusionCenters || [])
      setWilayas(wilayasData.wilayas || [])
      setIsOnline(true)
      setUsingMockData(false)
      
      console.log("✅ Data fetched successfully and state updated");
    } catch (err) {
      console.error("❌ Error fetching data:", err);
      
      // Log plus détaillé des erreurs
      if (err instanceof Error) {
        console.error("❌ Error name:", err.name);
        console.error("❌ Error message:", err.message);
        console.error("❌ Error stack:", err.stack);
      }

      if (retryCount < 2) {
        console.log("🔄 Retrying fetch, attempt:", retryCount + 1);
        setTimeout(() => fetchData(retryCount + 1), 2000)
        return
      }

      setError(err instanceof Error ? err.message : "Failed to fetch data")
      setCenters(mockCenters)
      setWilayas(mockWilayas)
      setUsingMockData(true)
      setIsOnline(false)
      console.log("⚠️ Falling back to mock data after failed fetch attempts");
    } finally {
      setLoading(false)
      console.log("🏁 fetchData completed");
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRetry = () => {
    fetchData()
  }

  const filteredCenters = centers.filter((center) => {
    const matchesSearch =
      center.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.wilaya?.name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesWilaya = selectedWilaya === "all" || center.wilayaId.toString() === selectedWilaya

    return matchesSearch && matchesWilaya
  })

  const calculateTotalStock = (inventories: BloodInventoryDTO[] | null) => {
    if (!inventories) return 0
    return inventories.reduce((total, inv) => total + (inv.totalQty || 0), 0)
  }

  const getBloodTypeStock = (inventories: BloodInventoryDTO[] | null) => {
    if (!inventories) return {}

    const stockByType: Record<string, number> = {}
    inventories.forEach((inv) => {
      const bloodType = bloodGroupMapping[inv.bloodGroup] || `Type ${inv.bloodGroup}`
      stockByType[bloodType] = (stockByType[bloodType] || 0) + (inv.totalQty || 0)
    })

    return stockByType
  }

  if (loading) {
    return (
      <div className="flex-1 w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-lg">Loading BTC centers...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 w-full max-w-full overflow-hidden">
      <div className="space-y-4 p-4 md:p-6 lg:p-8 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">BTC Centers</h2>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-primary border-primary whitespace-nowrap">
              {filteredCenters.length} Centers
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

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search centers or wilaya..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={selectedWilaya} onValueChange={setSelectedWilaya}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select Wilaya" />
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
        </div>

        <div className="grid gap-6 grid-cols-1 xl:grid-cols-3">
          {/* BTC List */}
          <div className="xl:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                  Blood Transfusion Centers
                </CardTitle>
                <CardDescription>Manage and monitor all BTC facilities across Algeria</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px] w-full">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px]">Center</TableHead>
                          <TableHead className="min-w-[100px]">Wilaya</TableHead>
                          <TableHead className="min-w-[80px]">Stock</TableHead>
                          <TableHead className="min-w-[100px]">Contact</TableHead>
                          <TableHead className="min-w-[80px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCenters.map((center) => {
                          const totalStock = calculateTotalStock(center.bloodInventories)
                          const stockLevel = getStockLevel(totalStock, 100)

                          return (
                            <TableRow
                              key={center.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setSelectedCTS(center)}
                            >
                              <TableCell className="min-w-0">
                                <div className="space-y-1">
                                  <div className="font-medium truncate">{center.name || "Unnamed Center"}</div>
                                  <div className="text-sm text-muted-foreground truncate">{center.address}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{center.wilaya?.name || `Wilaya ${center.wilayaId}`}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Droplets className="h-3 w-3 flex-shrink-0" />
                                  <span className={stockLevel.color}>{totalStock}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {center.tel && (
                                    <div className="flex items-center gap-1">
                                      <Phone className="h-3 w-3 flex-shrink-0" />
                                      <span className="truncate">{center.tel}</span>
                                    </div>
                                  )}
                                  {center.email && (
                                    <div className="text-xs text-muted-foreground truncate">{center.email}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" className="text-xs">
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* BTC Details */}
          <div className="xl:col-span-1">
            {selectedCTS ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span className="truncate">{selectedCTS.name || "BTC Center"}</span>
                  </CardTitle>
                  <CardDescription>Detailed information and stock levels</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {selectedCTS.address && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span className="break-words">{selectedCTS.address}</span>
                      </div>
                    )}
                    {selectedCTS.tel && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>{selectedCTS.tel}</span>
                      </div>
                    )}
                    {selectedCTS.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="break-words">{selectedCTS.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{selectedCTS.wilaya?.name || `Wilaya ${selectedCTS.wilayaId}`}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">Blood Stock by Type</h4>
                    {selectedCTS.bloodInventories && selectedCTS.bloodInventories.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(getBloodTypeStock(selectedCTS.bloodInventories)).map(([type, units]) => (
                          <div key={type} className="flex justify-between items-center p-2 bg-muted rounded min-w-0">
                            <span className="font-medium flex-shrink-0">{type}</span>
                            <span className="text-sm">{units} units</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No inventory data available</p>
                    )}
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Stock:</span>
                      <span className="text-lg font-bold text-primary">
                        {calculateTotalStock(selectedCTS.bloodInventories)} units
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a BTC center to view details</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
