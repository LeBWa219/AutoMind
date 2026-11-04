import { useState } from 'react'
import type { RoutePoint, Telemetry, Vehicle } from '../api/types'
import { FleetMap } from './FleetMap'
import { YandexMap } from './YandexMap'

/**
 * Карта мониторинга с автоматическим выбором провайдера:
 * Яндекс Карты по ключу (VITE_YANDEX_MAPS_KEY), иначе — Leaflet/OpenStreetMap.
 */
export function MapView({ vehicles, routes, telemetry, selectedId, onSelect }: {
  vehicles: Vehicle[]
  routes: { vehicleId: number; points: RoutePoint[]; name: string }[]
  telemetry: Map<number, Telemetry>
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  const yandexKey = import.meta.env.VITE_YANDEX_MAPS_KEY as string | undefined
  const [mapFailed, setMapFailed] = useState(false)
  if (yandexKey && !mapFailed) {
    return (
      <YandexMap
        vehicles={vehicles}
        routes={routes}
        telemetry={telemetry}
        selectedId={selectedId}
        onSelect={onSelect}
        onFail={() => setMapFailed(true)}
      />
    )
  }
  return (
    <FleetMap
      vehicles={vehicles}
      routes={routes}
      telemetry={telemetry}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  )
}
