import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Telemetry, Vehicle } from '../api/types'
import type { RoutePoint } from '../api/types'

interface FleetMapProps {
  vehicles: Vehicle[]
  routes: { vehicleId: number; points: RoutePoint[]; name: string }[]
  telemetry: Map<number, Telemetry>
  selectedId: number | null
  onSelect: (vehicleId: number) => void
}

/** Цвет маркера по состоянию (ТЗ 2.3, решение п.7). */
function markerColor(vehicle: Vehicle | undefined, telemetry: Telemetry | undefined): string {
  if (!vehicle) return '#8a948d'
  if (vehicle.status === 'MAINTENANCE' || vehicle.status === 'INACTIVE') return '#8a948d'
  const warning = telemetry?.warning ?? ''
  if (warning.includes('неисправност') || warning.includes('Разряд')) return '#d9534f'
  if (warning.includes('Перегрев')) return '#e6a23c'
  if (warning) return '#e6c86e'
  return '#174d35'
}

/**
 * Интерактивная карта автопарка (ТЗ 4.6): тайлы OpenStreetMap, маршруты,
 * плавное перемещение маркеров между обновлениями телеметрии.
 */
export function FleetMap({ vehicles, routes, telemetry, selectedId, onSelect }: FleetMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Map<number, L.Marker>>(new Map())
  const linesRef = useRef<Map<number, L.Polyline>>(new Map())
  const animRef = useRef<Map<number, { from: [number, number]; to: [number, number]; startedAt: number }>>(new Map())
  const rafRef = useRef<number | null>(null)
  const propsRef = useRef({ telemetry, vehicles, selectedId, onSelect })
  propsRef.current = { telemetry, vehicles, selectedId, onSelect }

  // Инициализация карты
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true }).setView(
      [54.9, 39.0],
      6,
    )
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current.clear()
      linesRef.current.clear()
    }
  }, [])

  // Маршруты
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const drawn = new Set<number>()
    for (const route of routes) {
      if (drawn.has(route.vehicleId) || route.points.length < 2) continue
      drawn.add(route.vehicleId)
      const line = L.polyline(
        route.points.map((p) => [p.lat, p.lng] as [number, number]),
        { color: '#174d35', weight: 3, opacity: 0.55, dashArray: '8 7' },
      ).addTo(map)
      linesRef.current.set(route.vehicleId, line)
    }
    if (routes.length > 0 && linesRef.current.size === routes.length) {
      const all = routes.flatMap((r) => r.points.map((p) => [p.lat, p.lng] as [number, number]))
      if (all.length) map.fitBounds(L.latLngBounds(all).pad(0.15))
    }
  }, [routes])

  // Маркеры: создание и обновление статуса
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    for (const vehicle of vehicles) {
      const t = telemetry.get(vehicle.id)
      if (!t) continue
      const color = markerColor(vehicle, t)
      const selected = propsRef.current.selectedId === vehicle.id
      let marker = markersRef.current.get(vehicle.id)
      const icon = L.divIcon({
        className: '',
        html: `<div class="fleet-marker ${selected ? 'fleet-marker-selected' : ''}" style="background:${color}">${vehicle.id}</div>`,
        iconSize: selected ? [32, 32] : [26, 26],
        iconAnchor: selected ? [16, 16] : [13, 13],
      })
      if (!marker) {
        marker = L.marker([t.latitude, t.longitude], { icon, zIndexOffset: selected ? 1000 : 0 })
          .addTo(map)
          .on('click', () => propsRef.current.onSelect(vehicle.id))
        markersRef.current.set(vehicle.id, marker)
        marker.setLatLng([t.latitude, t.longitude])
      } else {
        marker.setIcon(icon)
        // планируем плавное перемещение к новой точке
        const current = marker.getLatLng()
        animRef.current.set(vehicle.id, {
          from: [current.lat, current.lng],
          to: [t.latitude, t.longitude],
          startedAt: performance.now(),
        })
      }
    }
    // запуск цикла анимации
    if (rafRef.current == null) {
      const DURATION_MS = 1900 // чуть меньше интервала обновления (2 c)
      const step = () => {
        const now = performance.now()
        for (const [vehicleId, anim] of animRef.current.entries()) {
          const marker = markersRef.current.get(vehicleId)
          if (!marker) continue
          const k = Math.min(1, (now - anim.startedAt) / DURATION_MS)
          const eased = k * (2 - k) // ease-out
          marker.setLatLng([anim.from[0] + (anim.to[0] - anim.from[0]) * eased, anim.from[1] + (anim.to[1] - anim.from[1]) * eased])
          if (k >= 1) animRef.current.delete(vehicleId)
        }
        rafRef.current = requestAnimationFrame(step)
      }
      rafRef.current = requestAnimationFrame(step)
    }
  }, [telemetry, vehicles, selectedId])

  return <div ref={containerRef} className="h-full w-full rounded-xl shadow-sm" />
}
