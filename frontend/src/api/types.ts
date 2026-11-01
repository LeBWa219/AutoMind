/** Типы данных API AutoMind. */

export interface AuthUser {
  id: number
  role: string
}

export interface AssignedDriver {
  id: number
  fullName: string
}

export interface Vehicle {
  id: number
  registrationNumber: string
  vin: string
  brand: string
  model: string
  productionYear: number | null
  fuelType: string
  fuelConsumptionRate: number
  loadCapacity: number
  mileage: number
  status: 'ACTIVE' | 'ON_TRIP' | 'MAINTENANCE' | 'INACTIVE'
  driver: AssignedDriver | null
}

export interface VehicleBrief {
  id: number
  brand: string
  model: string
  registrationNumber: string
}

export interface DriverStats {
  tripsCount: number
  accidents: number
  violations: number
  finesCount: number
  finesTotal: number
  avgFuelConsumption: number
  avgTripCost: number
  recentTripsUsed: number
}

export interface Driver {
  id: number
  fullName: string
  phone: string | null
  licenseNumber: string | null
  licenseCategory: string | null
  experienceYears: number
  employmentDate: string | null
  status: 'AVAILABLE' | 'ON_TRIP' | 'UNAVAILABLE'
  vehicle: VehicleBrief | null
  stats: DriverStats
}

export interface Telemetry {
  vehicleId: number
  latitude: number
  longitude: number
  speed: number
  engineRpm: number | null
  engineTemperature: number | null
  coolantTemperature: number | null
  fuelLevel: number | null
  fuelConsumption: number | null
  batteryVoltage: number | null
  batteryOk: boolean
  mileage: number
  oilPressure: number | null
  ignitionStatus: boolean
  movementStatus: boolean
  warning: string | null
  recordedAt: string
}

export interface Trip {
  id: number
  startLocation: string
  endLocation: string
  distance: number
  duration: number
  fuelConsumption: number
  fuelCost: number
  totalCost: number
  tripDate: string
  status: string
  vehicleId: number
}

export interface Fine {
  id: number
  amount: number
  description: string | null
  issuedAt: string
  paymentStatus: 'PAID' | 'UNPAID'
  incidentId: number | null
  vehicleId: number | null
}

export interface Incident {
  id: number
  incidentType: 'ACCIDENT' | 'VIOLATION'
  description: string | null
  accidentDate: string
  faultStatus: 'FAULT_FOUND' | 'NO_FAULT' | 'UNDER_REVIEW'
  vehicleId: number | null
  fines: Fine[]
}

export interface RoutePoint {
  lat: number
  lng: number
}

export interface FleetRoute {
  id: number
  vehicleId: number
  routeName: string
  routeCoordinates: string | RoutePoint[]
  routeStatus: string
}

export interface EconomicSettings {
  id: number
  fuelPrice: number
  defaultFuelConsumptionRate: number
  driverHourlyRate: number
  maintenanceRate: number
  additionalCost: number
  tollCost: number
  otherCost: number
}

export const VEHICLE_STATUSES: Record<Vehicle['status'], string> = {
  ACTIVE: 'Активен',
  ON_TRIP: 'В рейсе',
  MAINTENANCE: 'На обслуживании',
  INACTIVE: 'Неактивен',
}

export const DRIVER_STATUSES: Record<Driver['status'], string> = {
  AVAILABLE: 'Доступен',
  ON_TRIP: 'В рейсе',
  UNAVAILABLE: 'Недоступен',
}

export const FUEL_TYPES: Record<string, string> = {
  DIESEL: 'Дизель',
  PETROL: 'Бензин',
  HYBRID: 'Гибрид',
  ELECTRIC: 'Электро',
  GAS: 'Газ',
}
