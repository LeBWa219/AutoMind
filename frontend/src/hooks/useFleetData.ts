import { useEffect, useState } from 'react'
import { fleetApi } from '../api/fleet'
import type { Driver, FleetRoute, RoutePoint, Vehicle } from '../api/types'
import { useTelemetryStream } from './useTelemetryStream'

/**
 * Общее состояние флот-данных для главной и мониторинга:
 * автомобили, водители, маршруты, выбор машины и поток телеметрии.
 */
export function useFleetData() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [routes, setRoutes] = useState<{ vehicleId: number; points: RoutePoint[]; name: string }[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [vehicleModal, setVehicleModal] = useState<{ open: boolean; vehicle: Vehicle | null }>({
    open: false,
    vehicle: null,
  })
  const [driverModal, setDriverModal] = useState(false)
  const { telemetry, mode } = useTelemetryStream(true)

  function reload() {
    fleetApi.vehicles().then(setVehicles).catch(() => undefined)
    fleetApi.drivers().then(setDrivers).catch(() => undefined)
    fleetApi
      .routes()
      .then((rs: FleetRoute[]) =>
        setRoutes(
          rs.map((r) => ({
            vehicleId: r.vehicleId,
            name: r.routeName,
            points:
              typeof r.routeCoordinates === 'string'
                ? (JSON.parse(r.routeCoordinates) as RoutePoint[])
                : r.routeCoordinates,
          })),
        ),
      )
      .catch(() => undefined)
  }
  useEffect(reload, [])

  return {
    vehicles, drivers, routes, selectedId, setSelectedId,
    telemetry, mode, reload, vehicleModal, setVehicleModal, driverModal, setDriverModal,
  }
}

export type FleetData = ReturnType<typeof useFleetData>
