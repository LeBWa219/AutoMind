import { useEffect, useMemo, useRef, useState } from 'react'
import type { Vehicle } from '../api/types'
import { useFleetData, type FleetData } from '../hooks/useFleetData'
import { transportIcon } from '../components/YandexMap'
import { MapView } from '../components/MapView'
import { VehicleInfoPanel } from '../components/VehicleInfoPanel'
import { VehicleFormModal } from '../components/VehicleFormModal'
import { DriverFormModal } from '../components/DriverFormModal'
import { EconomicSettingsPanel } from '../components/EconomicSettingsPanel'

type Tab = 'vehicles' | 'drivers' | 'economy' | 'info'

const statusColor: Record<Vehicle['status'], string> = {
  ACTIVE: '#4e9b54',
  ON_TRIP: '#174d35',
  MAINTENANCE: '#e6a23c',
  INACTIVE: '#8a948d',
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const fn = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return isDesktop
}

/**
 * Страница мониторинга (ТЗ 4.2).
 * Десктоп: три области — боковая панель, карта, информационная панель.
 * Мобильные: режим навигатора — карта на весь экран + нижняя шторка
 * со списком автомобилей и всей информацией (перетягивается вверх/вниз).
 */
export function MonitoringPage() {
  const isDesktop = useIsDesktop()
  const data = useFleetData()
  return isDesktop ? <DesktopLayout {...data} /> : <MobileNavigatorLayout {...data} />
}

// ============================================================================
// ОБЩЕЕ СОСТОЯНИЕ ДАННЫХ
// ============================================================================


// ============================================================================
// ДЕСКТОП: три области (ТЗ 4.2)
// ============================================================================

function DesktopLayout({ vehicles, drivers, routes, selectedId, setSelectedId, telemetry, mode, reload, vehicleModal, setVehicleModal, driverModal, setDriverModal }: FleetData) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'ontrip' | 'attention' | 'available'>('all')

  const attentionIds = new Set(
    vehicles
      .filter((v) => {
        const t = telemetry.get(v.id)
        return v.status === 'MAINTENANCE' || v.status === 'INACTIVE' || t?.warning != null
      })
      .map((v) => v.id),
  )
  const countOnTrip = vehicles.filter((v) => v.status === 'ON_TRIP').length
  const countAvailable = vehicles.filter((v) => v.status === 'ACTIVE').length

  const filteredVehicles = vehicles.filter((v) => {
    const matchSearch = `${v.registrationNumber} ${v.brand} ${v.model}`.toLowerCase().includes(search.toLowerCase())
    const t = telemetry.get(v.id)
    const matchFilter =
      filter === 'all' ||
      (filter === 'ontrip' && v.status === 'ON_TRIP') ||
      (filter === 'attention' && attentionIds.has(v.id)) ||
      (filter === 'available' && v.status === 'ACTIVE' && t?.warning == null)
    return matchSearch && matchFilter
  })
  const filteredDrivers = drivers.filter((d) => d.fullName.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="relative flex h-[calc(100vh-64px)]">
      {/* Левая боковая панель (ТЗ 4.3) */}
      <aside className="flex w-[280px] shrink-0 flex-col gap-3.5 border-r border-automind-gray/20 bg-white p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍  Поиск по госномеру или имени…"
          className="h-9 rounded-lg bg-automind-bg px-3 text-[12px] outline-none placeholder:text-automind-gray"
        />
        <div className="flex flex-wrap gap-1.5">
          {([
            ['all', `Все (${vehicles.length})`],
            ['ontrip', `В рейсе (${countOnTrip})`],
            ['attention', `Внимание (${attentionIds.size})`],
            ['available', `Свободны (${countAvailable})`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                filter === key
                  ? 'bg-automind-dark text-white'
                  : 'bg-automind-bg text-automind-gray hover:text-automind-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {filteredVehicles.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedId(v.id)}
              className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-left ${
                selectedId === v.id ? 'bg-automind-accent/25 ring-1 ring-automind-accent' : 'hover:bg-automind-bg'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-[17px]">{transportIcon(v)}</span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{v.registrationNumber}</p>
                  <p className="truncate text-[10px] text-automind-gray">
                    {v.driver ? v.driver.fullName : 'без водителя'}
                  </p>
                </div>
              </div>
              <span className="size-2 shrink-0 rounded-full" style={{ background: statusColor[v.status] }} />
            </button>
          ))}
          <p className="px-2.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-automind-gray">Водители</p>
          {filteredDrivers.map((d) => (
            <button
              key={d.id}
              onClick={() => d.vehicle && setSelectedId(d.vehicle.id)}
              className="rounded-lg px-2.5 py-2 text-left hover:bg-automind-bg"
            >
              <p className="text-[13px] font-medium">{d.fullName}</p>
              <p className="text-[10px] text-automind-gray">
                {d.vehicle ? `${d.vehicle.brand} ${d.vehicle.model}` : 'без автомобиля'} · {d.stats.tripsCount} рейсов
              </p>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setVehicleModal({ open: true, vehicle: null })}
            className="rounded-lg border border-automind-gray/40 py-2 text-[12px] font-medium"
          >
            + Автомобиль
          </button>
          <button
            onClick={() => setDriverModal(true)}
            className="rounded-lg border border-automind-gray/40 py-2 text-[12px] font-medium"
          >
            + Водитель
          </button>
        </div>
      </aside>

      {/* Центр: карта (ТЗ 4.6) */}
      <main className="flex min-w-0 flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[19px] font-semibold">Мониторинг транспорта</h1>
          <StreamBadge mode={mode} />
        </div>
        <div className="min-h-0 flex-1">
          <MapView {...{ vehicles, routes, telemetry, selectedId, onSelect: setSelectedId }} />
        </div>
      </main>

      {/* Правая информационная панель (ТЗ 4.8) */}
      <aside className="w-[320px] shrink-0 border-l border-automind-gray/20 bg-automind-bg">
        <VehicleInfoPanel vehicleId={selectedId} telemetry={selectedId ? telemetry.get(selectedId) : undefined} />
      </aside>

      {vehicleModal.open && (
        <VehicleFormModal vehicle={vehicleModal.vehicle} drivers={drivers}
          onClose={() => setVehicleModal({ open: false, vehicle: null })} onSaved={reload} />
      )}
      {driverModal && (
        <DriverFormModal driver={null} onClose={() => setDriverModal(false)} onSaved={reload} />
      )}
    </div>
  )
}

// ============================================================================
// МОБИЛЬНЫЙ: режим навигатора — карта на весь экран + нижняя шторка
// ============================================================================

function MobileNavigatorLayout({ vehicles, drivers, routes, selectedId, setSelectedId, telemetry, mode, reload, vehicleModal, setVehicleModal, driverModal, setDriverModal }: FleetData) {
  const [expanded, setExpanded] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [tab, setTab] = useState<Tab>('vehicles')
  const dragRef = useRef<{ startY: number } | null>(null)
  const activeTab: Tab = selectedId != null ? 'info' : tab

  function selectVehicle(id: number) {
    setSelectedId(id)
    setExpanded(true)
  }

  // Перетаскивание шторки за ручку (pointer events работают и для touch)
  function onPointerDown(e: React.PointerEvent) {
    dragRef.current = { startY: e.clientY }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    setDragOffset(Math.max(-500, Math.min(500, dragRef.current.startY - e.clientY)))
  }
  function onPointerUp() {
    if (dragOffset > 60) setExpanded(true)
    else if (dragOffset < -60) setExpanded(false)
    dragRef.current = null
    setDragOffset(0)
  }

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedId) ?? null,
    [vehicles, selectedId],
  )

  return (
    <div className="relative h-[calc(100vh-64px)] overflow-hidden">
      {/* Карта на весь экран */}
      <div className="absolute inset-0">
        <MapView
          vehicles={vehicles}
          routes={routes}
          telemetry={telemetry}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id)
            setExpanded(true) // клик по иконке на карте открывает карточку машины
          }}
        />
      </div>

      {/* Индикатор потока телеметрии */}
      <div className="absolute left-3 top-3 z-10 rounded-full bg-white/95 px-3 py-1.5 text-[11px] shadow-sm">
        <StreamBadge mode={mode} compact />
      </div>

      {/* Нижняя шторка */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-2xl bg-white shadow-[0_-4px_20px_rgba(23,28,25,0.18)] transition-[height] duration-300"
        style={{
          height: expanded ? '72vh' : '158px',
          transform: dragOffset ? `translateY(${-dragOffset}px)` : undefined,
        }}
      >
        {/* Ручка перетаскивания */}
        <div
          className="shrink-0 cursor-grab touch-none py-2.5 active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="mx-auto h-1.5 w-12 rounded-full bg-automind-gray/40" />
        </div>

        {/* Свёрнуто: лента автомобилей-чипов (быстрый доступ как в навигаторе) */}
        {!expanded && (
          <div className="flex gap-2 overflow-x-auto px-3 pb-3">
            {vehicles.map((v) => {
              const t = telemetry.get(v.id)
              const warning = t?.warning ?? ''
              const dot =
                v.status === 'MAINTENANCE' || v.status === 'INACTIVE'
                  ? '#8a948d'
                  : warning.includes('неисправност')
                    ? '#d9534f'
                    : warning.includes('Перегрев')
                      ? '#e6a23c'
                      : warning
                        ? '#e6c86e'
                        : '#4e9b54'
              return (
                <button
                  key={v.id}
                  onClick={() => selectVehicle(v.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 ${
                    selectedId === v.id ? 'border-automind-dark bg-automind-accent/15' : 'border-automind-gray/30 bg-white'
                  }`}
                >
                  <span className="text-[18px]">{transportIcon(v)}</span>
                  <span className="text-left">
                    <span className="block text-[12px] font-semibold leading-tight">{v.registrationNumber}</span>
                    <span className="block text-[10px] leading-tight text-automind-gray">
                      {v.driver ? v.driver.fullName.split(' ')[0] : 'без водителя'}
                    </span>
                  </span>
                  <span className="size-2 shrink-0 rounded-full" style={{ background: dot }} />
                </button>
              )
            })}
          </div>
        )}

        {/* Развёрнуто: вкладки со всей информацией */}
        {expanded && (
          <>
            {selectedId != null && activeTab === 'info' && (
              <div className="flex items-center justify-between px-4 pb-1">
                <button
                  onClick={() => { setSelectedId(null); setTab('vehicles') }}
                  className="text-[12px] font-medium text-automind-dark"
                >
                  ← К списку
                </button>
                {selectedVehicle && (
                  <p className="text-[13px] font-semibold">
                    {selectedVehicle.brand} {selectedVehicle.model}
                  </p>
                )}
              </div>
            )}
            {selectedId == null && (
              <div className="mb-1 flex gap-1.5 px-4">
                {([['vehicles', 'Автомобили'], ['drivers', 'Водители'], ['economy', 'Экономика']] as [Tab, string][]).map(
                  ([k, label]) => (
                    <button
                      key={k}
                      onClick={() => setTab(k)}
                      className={`flex-1 rounded-lg py-1.5 text-[12px] ${
                        tab === k ? 'bg-automind-dark font-semibold text-white' : 'bg-automind-bg text-automind-gray'
                      }`}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {activeTab === 'info' && selectedId != null && (
                <VehicleInfoPanel vehicleId={selectedId} telemetry={telemetry.get(selectedId)} />
              )}
              {activeTab === 'vehicles' && selectedId == null && (
                <div className="flex flex-col gap-1.5">
                  {vehicles.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => selectVehicle(v.id)}
                      className="flex items-center justify-between rounded-xl border border-automind-gray/25 px-3 py-2.5 text-left"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-[20px]">{transportIcon(v)}</span>
                        <span>
                          <span className="block text-[13px] font-medium">{v.registrationNumber}</span>
                          <span className="block text-[10px] text-automind-gray">
                            {v.brand} {v.model} · {v.driver ? v.driver.fullName : 'без водителя'}
                          </span>
                        </span>
                      </span>
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: statusColor[v.status] }} />
                    </button>
                  ))}
                  <button
                    onClick={() => setVehicleModal({ open: true, vehicle: null })}
                    className="mt-1 rounded-xl border border-dashed border-automind-gray/50 py-2.5 text-[12px] font-medium text-automind-dark"
                  >
                    + Добавить автомобиль
                  </button>
                </div>
              )}
              {activeTab === 'drivers' && selectedId == null && (
                <div className="flex flex-col gap-1.5">
                  {drivers.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => d.vehicle && selectVehicle(d.vehicle.id)}
                      className="rounded-xl border border-automind-gray/25 px-3 py-2.5 text-left"
                    >
                      <p className="text-[13px] font-medium">{d.fullName}</p>
                      <p className="text-[10px] text-automind-gray">
                        {d.vehicle ? `${d.vehicle.brand} ${d.vehicle.model} · ${d.vehicle.registrationNumber}` : 'без автомобиля'} ·{' '}
                        {d.stats.tripsCount} рейсов
                      </p>
                    </button>
                  ))}
                  <button
                    onClick={() => setDriverModal(true)}
                    className="mt-1 rounded-xl border border-dashed border-automind-gray/50 py-2.5 text-[12px] font-medium text-automind-dark"
                  >
                    + Добавить водителя
                  </button>
                </div>
              )}
              {activeTab === 'economy' && selectedId == null && <EconomicSettingsPanel />}
            </div>
          </>
        )}
      </div>

      {vehicleModal.open && (
        <VehicleFormModal vehicle={null} drivers={drivers}
          onClose={() => setVehicleModal({ open: false, vehicle: null })} onSaved={reload} />
      )}
      {driverModal && (
        <DriverFormModal driver={null} onClose={() => setDriverModal(false)} onSaved={reload} />
      )}
    </div>
  )
}

// ============================================================================
// КАРТА (общая)
// ============================================================================

function StreamBadge({ mode, compact }: { mode: string; compact?: boolean }) {
  const color = mode === 'websocket' ? 'bg-automind-status-green' : mode === 'polling' ? 'bg-automind-warn' : 'bg-automind-gray'
  if (compact) {
    return (
      <span className="flex items-center gap-1.5">
        <span className={`size-2 rounded-full ${color}`} />
        {mode === 'websocket' ? 'Online' : mode === 'polling' ? '3 сек' : '…'}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-automind-gray">
      <span className={`size-2 rounded-full ${color}`} />
      {mode === 'websocket' ? 'Обновление в реальном времени · WebSocket' : mode === 'polling' ? 'Резервный режим · опрос 3 сек' : 'Подключение…'}
    </span>
  )
}
