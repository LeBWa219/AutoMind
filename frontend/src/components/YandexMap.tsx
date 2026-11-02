import { useEffect, useRef } from 'react'
import type { RoutePoint, Telemetry, Vehicle } from '../api/types'
import { markerColor } from './FleetMap'

export interface MapProps {
  vehicles: Vehicle[]
  routes: { vehicleId: number; points: RoutePoint[]; name: string }[]
  telemetry: Map<number, Telemetry>
  selectedId: number | null
  onSelect: (vehicleId: number) => void
  onFail: () => void
}

// Минимальные локальные типы JS API 2.1 (подключается динамически по ключу)
declare global {
  interface Window {
    ymaps?: any
    __ymapsLoading?: Promise<any>
  }
}

function loadYmaps(key: string): Promise<any> {
  if (window.ymaps) return Promise.resolve(window.ymaps)
  if (window.__ymapsLoading) return window.__ymapsLoading
  window.__ymapsLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=ru_RU`
    script.onload = () => window.ymaps.ready(() => resolve(window.ymaps))
    script.onerror = () => {
      window.__ymapsLoading = undefined
      reject(new Error('Не удалось загрузить Яндекс Карты'))
    }
    document.head.appendChild(script)
  })
  return window.__ymapsLoading
}

/** Иконка транспорта по типу ТС: фура 🚛, грузовик 🚚, фургон 🚐 (ТЗ 4.4). */
export function transportIcon(vehicle: Vehicle): string {
  const model = vehicle.model.toLowerCase()
  if (vehicle.loadCapacity >= 10000) return '🚛'
  if (model.includes('daily') || model.includes('largus')) return '🚐'
  return '🚚'
}

/** Корректные границы для setBounds: прямоугольник из двух угловых точек. */
function boundsOf(coords: [number, number][]): [[number, number], [number, number]] {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180
  for (const [lat, lng] of coords) {
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat)
    minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng)
  }
  return [[minLat, minLng], [maxLat, maxLng]]
}

/** Ближайшая точка на полилинии — прижимаем маркер к реальной дороге. */
function nearestOnPolyline(pt: [number, number], coords: [number, number][]): [number, number] {
  let best: [number, number] = coords[0]
  let bestD = Infinity
  for (let i = 0; i < coords.length - 1; i++) {
    const ax = coords[i][0], ay = coords[i][1], bx = coords[i + 1][0], by = coords[i + 1][1]
    const dx = bx - ax, dy = by - ay
    const len2 = dx * dx + dy * dy
    let t = len2 ? ((pt[0] - ax) * dx + (pt[1] - ay) * dy) / len2 : 0
    t = Math.max(0, Math.min(1, t))
    const qx = ax + dx * t, qy = ay + dy * t
    const d = (pt[0] - qx) * (pt[0] - qx) + (pt[1] - qy) * (pt[1] - qy)
    if (d < bestD) {
      bestD = d
      best = [qx, qy]
    }
  }
  return best
}

/**
 * Карта на Яндекс Картах JS API 2.1: реальные дорожные маршруты
 * (маршрутизатор Яндекса, «как в навигаторе»), иконки транспорта по типу ТС,
 * прилипание маркеров к дороге, зум к маршруту выбранного автомобиля.
 */
export function YandexMap({ vehicles, routes, telemetry, selectedId, onSelect, onFail }: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const ymapsRef = useRef<any>(null)
  const layoutRef = useRef<any>(null)
  const markersRef = useRef<Map<number, any>>(new Map())
  const routingRef = useRef<Set<number>>(new Set())
  const realGeometryRef = useRef<Map<number, [number, number][]>>(new Map())
  const animRef = useRef<Map<number, { from: [number, number]; to: [number, number]; started: number }>>(new Map())
  const rafRef = useRef<number | null>(null)
  const propsRef = useRef({ telemetry, vehicles, routes, selectedId, onSelect })
  propsRef.current = { telemetry, vehicles, routes, selectedId, onSelect }

  useEffect(() => {
    let cancelled = false
    loadYmaps(import.meta.env.VITE_YANDEX_MAPS_KEY)
      .then((ymaps) => {
        if (cancelled || !containerRef.current) return
        ymapsRef.current = ymaps
        const map = new ymaps.Map(containerRef.current, {
          center: [54.9, 39.0],
          zoom: 6,
          controls: ['zoomControl'],
        })
        mapRef.current = map
        layoutRef.current = ymaps.templateLayoutFactory.createClass(
          '<div class="vehicle-marker {{properties.selectedClass}}" style="border-color:{{properties.color}}">{{properties.icon}}</div>',
        )
      })
      .catch(() => {
        if (!cancelled) onFail()
      })
    return () => {
      cancelled = true
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      if (mapRef.current) {
        try {
          mapRef.current.destroy()
        } catch {
          /* карта уже уничтожена */
        }
        mapRef.current = null
        markersRef.current.clear()
        routingRef.current.clear()
        realGeometryRef.current.clear()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Реальные дорожные маршруты через маршрутизатор Яндекса (ТЗ: «как в навигаторе»)
  useEffect(() => {
    const map = mapRef.current
    const ymaps = ymapsRef.current
    if (!map || !ymaps) return
    for (const route of routes) {
      if (routingRef.current.has(route.vehicleId) || route.points.length < 2) continue
      routingRef.current.add(route.vehicleId)
      const pts: [number, number][] = route.points.map((p) => [p.lat, p.lng])
      ymaps
        .route(pts, { routingMode: 'auto', mapStateAutoApply: false })
        .then((r: any) => {
          if (!mapRef.current) return
          try {
            r.options.set({ strokeColor: '#174D35', strokeWidth: 4, strokeOpacity: 0.75, strokeStyle: 'solid' })
            r.getWayPoints().each((wp: any) => wp.options.set('visible', false))
          } catch {
            /* оформление не критично */
          }
          mapRef.current.geoObjects.add(r)
          const coords: [number, number][] = []
          r.getPaths().each((path: any) => {
            path.getSegments().each((seg: any) => {
              for (const c of seg.geometry.getCoordinates()) coords.push([c[0], c[1]])
            })
          })
          if (coords.length > 1) realGeometryRef.current.set(route.vehicleId, coords)
          if (propsRef.current.selectedId === route.vehicleId) zoomToRoute(route.vehicleId)
        })
        .catch(() => {
          // маршрутизатор недоступен — рисуем прямую линию как в первой версии
          if (!mapRef.current) return
          mapRef.current.geoObjects.add(
            new ymaps.Polyline(pts, {}, { strokeColor: '#174D35', strokeWidth: 3, strokeStyle: 'dash', strokeOpacity: 0.55 }),
          )
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes, mapRef.current, ymapsRef.current])

  /** Приблизить карту к маршруту выбранного автомобиля (ТЗ: как в навигаторе). */
  function zoomToRoute(vehicleId: number) {
    const map = mapRef.current
    if (!map) return
    const geom = realGeometryRef.current.get(vehicleId)
    if (geom && geom.length > 1) {
      map.setBounds(boundsOf(geom), { checkZoomRange: true, zoomMargin: 40, duration: 400 })
      return
    }
    const route = propsRef.current.routes.find((r) => r.vehicleId === vehicleId)
    if (route && route.points.length) {
      map.setBounds(
        boundsOf(route.points.map((p) => [p.lat, p.lng] as [number, number])),
        { checkZoomRange: true, zoomMargin: 40, duration: 400 },
      )
      return
    }
    const t = propsRef.current.telemetry.get(vehicleId)
    if (t) map.setCenter([t.latitude, t.longitude], 13, { duration: 300 })
  }

  // Реакция на выбор автомобиля в боковой панели
  useEffect(() => {
    if (selectedId == null) {
      // без выбора — показать весь автопарк
      const map = mapRef.current
      if (!map) return
      const all: [number, number][] = []
      realGeometryRef.current.forEach((geom) => all.push(...geom))
      if (all.length > 1) {
        map.setBounds(boundsOf(all), { checkZoomRange: true, zoomMargin: 40, duration: 400 })
      }
      return
    }
    zoomToRoute(selectedId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  // Маркеры и плавное перемещение по дороге
  useEffect(() => {
    const map = mapRef.current
    const ymaps = ymapsRef.current
    if (!map || !ymaps) return
    for (const vehicle of vehicles) {
      const t = telemetry.get(vehicle.id)
      if (!t) continue
      const selected = propsRef.current.selectedId === vehicle.id
      let pm = markersRef.current.get(vehicle.id)
      if (!pm) {
        pm = new ymaps.Placemark(
          [t.latitude, t.longitude],
          {
            icon: transportIcon(vehicle),
            color: markerColor(vehicle, t),
            selectedClass: selected ? 'selected' : '',
          },
          {
            iconLayout: layoutRef.current,
            iconShape: { type: 'Circle', coordinates: [0, 0], radius: 18 },
            iconOffset: [-18, -18],
            zIndexOffset: selected ? 1000 : 0,
          },
        )
        pm.events.add('click', () => propsRef.current.onSelect(vehicle.id))
        map.geoObjects.add(pm)
        markersRef.current.set(vehicle.id, pm)
      } else {
        pm.properties.set({
          color: markerColor(vehicle, t),
          selectedClass: selected ? 'selected' : '',
        })
        const cur = pm.geometry.getCoordinates()
        animRef.current.set(vehicle.id, {
          from: [cur[0], cur[1]],
          to: [t.latitude, t.longitude],
          started: performance.now(),
        })
      }
    }
    if (rafRef.current == null) {
      const DURATION_MS = 1900
      const step = () => {
        const now = performance.now()
        for (const [vehicleId, anim] of animRef.current.entries()) {
          const pm = markersRef.current.get(vehicleId)
          if (!pm) continue
          const k = Math.min(1, (now - anim.started) / DURATION_MS)
          const eased = k * (2 - k)
          const straight: [number, number] = [
            anim.from[0] + (anim.to[0] - anim.from[0]) * eased,
            anim.from[1] + (anim.to[1] - anim.from[1]) * eased,
          ]
          // прижимаем позицию к реальной дороге, если геометрия маршрута известна
          const road = realGeometryRef.current.get(vehicleId)
          pm.geometry.setCoordinates(road && road.length > 1 ? nearestOnPolyline(straight, road) : straight)
          if (k >= 1) animRef.current.delete(vehicleId)
        }
        rafRef.current = requestAnimationFrame(step)
      }
      rafRef.current = requestAnimationFrame(step)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telemetry, vehicles, selectedId, mapRef.current, ymapsRef.current])

  return <div ref={containerRef} className="h-full w-full rounded-xl" />
}
