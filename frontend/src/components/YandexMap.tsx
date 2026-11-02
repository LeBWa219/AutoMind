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

/**
 * Карта на Яндекс Картах JS API 2.1 (требование заказчика: российский
 * картографический провайдер). Ключ — VITE_YANDEX_MAPS_KEY; при отсутствии
 * ключа MonitoringPage показывает fallback на Leaflet/OpenStreetMap.
 */
export function YandexMap({ vehicles, routes, telemetry, selectedId, onSelect, onFail }: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const ymapsRef = useRef<any>(null)
  const layoutRef = useRef<any>(null)
  const markersRef = useRef<Map<number, any>>(new Map())
  const linesRef = useRef<Set<number>>(new Set())
  const animRef = useRef<Map<number, { from: [number, number]; to: [number, number]; started: number }>>(new Map())
  const rafRef = useRef<number | null>(null)
  const propsRef = useRef({ telemetry, vehicles, selectedId, onSelect })
  propsRef.current = { telemetry, vehicles, selectedId, onSelect }

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
          '<div class="fleet-marker" style="background:{{properties.color}};{% if properties.selected %}width:32px;height:32px;font-size:13px;box-shadow:0 0 0 3px #fff, 0 2px 8px rgba(23,28,25,0.45);{% endif %}">{{properties.num}}</div>',
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
        linesRef.current.clear()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Маршруты
  useEffect(() => {
    const map = mapRef.current
    const ymaps = ymapsRef.current
    if (!map || !ymaps) return
    for (const route of routes) {
      if (linesRef.current.has(route.vehicleId) || route.points.length < 2) continue
      linesRef.current.add(route.vehicleId)
      map.geoObjects.add(
        new ymaps.Polyline(
          route.points.map((p) => [p.lat, p.lng]),
          {},
          { strokeColor: '#174D35', strokeWidth: 3, strokeStyle: 'dash', strokeOpacity: 0.55 },
        ),
      )
    }
    if (routes.length > 0 && linesRef.current.size === routes.length) {
      try {
        map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: 24 })
      } catch {
        /* пустая геометрия */
      }
    }
  }, [routes, mapRef.current, ymapsRef.current])

  // Маркеры и плавное перемещение
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
          { num: String(vehicle.id), color: markerColor(vehicle, t), selected },
          {
            iconLayout: layoutRef.current,
            iconShape: { type: 'Circle', coordinates: [0, 0], radius: 14 },
            iconOffset: [-14, -14],
            zIndexOffset: selected ? 1000 : 0,
          },
        )
        pm.events.add('click', () => propsRef.current.onSelect(vehicle.id))
        map.geoObjects.add(pm)
        markersRef.current.set(vehicle.id, pm)
      } else {
        pm.properties.set({ color: markerColor(vehicle, t), selected })
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
          pm.geometry.setCoordinates([
            anim.from[0] + (anim.to[0] - anim.from[0]) * eased,
            anim.from[1] + (anim.to[1] - anim.from[1]) * eased,
          ])
          if (k >= 1) animRef.current.delete(vehicleId)
        }
        rafRef.current = requestAnimationFrame(step)
      }
      rafRef.current = requestAnimationFrame(step)
    }
  }, [telemetry, vehicles, selectedId, mapRef.current, ymapsRef.current])

  return <div ref={containerRef} className="h-full w-full rounded-xl" />
}
