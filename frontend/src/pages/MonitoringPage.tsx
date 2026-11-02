import { useEffect, useMemo, useState } from 'react'
import { fleetApi } from '../api/fleet'
import { VEHICLE_STATUSES, type Driver, type FleetRoute, type RoutePoint, type Vehicle } from '../api/types'
import { useTelemetryStream } from '../hooks/useTelemetryStream'
import { FleetMap } from '../components/FleetMap'
import { YandexMap } from '../components/YandexMap'
import { VehicleInfoPanel } from '../components/VehicleInfoPanel'
import { VehicleFormModal } from '../components/VehicleFormModal'
import { DriverFormModal } from '../components/DriverFormModal'
import { EconomicSettingsPanel } from '../components/EconomicSettingsPanel'

type Tab = 'vehicles' | 'drivers' | 'economy'

/** Страница мониторинга транспорта (ТЗ 4.2): боковая панель, карта, информационная панель. */
export function MonitoringPage() {
  const [tab, setTab] = useState<Tab>('vehicles')
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [routes, setRoutes] = useState<{ vehicleId: number; points: RoutePoint[]; name: string }[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [vehicleModal, setVehicleModal] = useState<{ open: boolean; vehicle: Vehicle | null }>({
    open: false,
    vehicle: null,
  })
  const [driverModal, setDriverModal] = useState<{ open: boolean; driver: Driver | null }>({
    open: false,
    driver: null,
  })
  const [mapFailed, setMapFailed] = useState(false)
  const yandexKey = import.meta.env.VITE_YANDEX_MAPS_KEY as string | undefined

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

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedId) ?? null,
    [vehicles, selectedId],
  )

  const filteredVehicles = vehicles.filter((v) =>
    `${v.registrationNumber} ${v.brand} ${v.model}`.toLowerCase().includes(search.toLowerCase()),
  )
  const filteredDrivers = drivers.filter((d) => d.fullName.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Боковая панель управления (ТЗ 4.3) */}
      <aside className="flex w-[280px] shrink-0 flex-col gap-3.5 border-r border-automind-gray/20 bg-white p-4">
        <div className="flex rounded-lg bg-automind-bg p-1">
          {(
            [
              ['vehicles', 'Автомобили'],
              ['drivers', 'Водители'],
              ['economy', 'Экономика'],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-md px-2 py-1.5 text-[11px] ${
                tab === key ? 'bg-white font-semibold shadow-sm' : 'text-automind-gray'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab !== 'economy' && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`🔍  Поиск по ${tab === 'vehicles' ? 'госномеру' : 'имени'}…`}
            className="h-9 rounded-lg bg-automind-bg px-3 text-[12px] outline-none placeholder:text-automind-gray"
          />
        )}

        {tab === 'vehicles' && (
          <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {filteredVehicles.map((v) => {
              const t = telemetry.get(v.id)
              const warning = t?.warning ?? ''
              const dot =
                v.status === 'MAINTENANCE' || v.status === 'INACTIVE'
                  ? 'bg-automind-gray'
                  : warning.includes('неисправност')
                    ? 'bg-automind-red'
                    : warning.includes('Перегрев')
                      ? 'bg-automind-warn'
                      : warning
                        ? 'bg-[#e6c86e]'
                        : 'bg-automind-status-green'
              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedId(v.id)}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-left ${
                    selectedId === v.id ? 'bg-automind-accent/25 ring-1 ring-automind-accent' : 'hover:bg-automind-bg'
                  }`}
                >
                  <div>
                    <p className="text-[13px] font-medium">{v.registrationNumber}</p>
                    <p className="text-[10px] text-automind-gray">
                      {v.brand} {v.model} · {v.driver ? v.driver.fullName : 'без водителя'}
                    </p>
                  </div>
                  <span className={`size-2 shrink-0 rounded-full ${dot}`} title={VEHICLE_STATUSES[v.status]} />
                </button>
              )
            })}
          </div>
        )}

        {tab === 'drivers' && (
          <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {filteredDrivers.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  if (d.vehicle) setSelectedId(d.vehicle.id)
                }}
                className="rounded-lg px-2.5 py-2 text-left hover:bg-automind-bg"
              >
                <p className="text-[13px] font-medium">{d.fullName}</p>
                <p className="text-[10px] text-automind-gray">
                  {d.vehicle ? `${d.vehicle.brand} ${d.vehicle.model} · ${d.vehicle.registrationNumber}` : 'без автомобиля'} ·{' '}
                  {d.stats.tripsCount} рейсов
                </p>
              </button>
            ))}
          </div>
        )}

        {tab === 'economy' ? (
          <EconomicSettingsPanel />
        ) : (
          <div className="flex flex-col gap-2">
            {tab === 'vehicles' ? (
              <>
                <button
                  onClick={() => setVehicleModal({ open: true, vehicle: null })}
                  className="rounded-lg border border-automind-gray/40 py-2 text-[12px] font-medium"
                >
                  + Автомобиль
                </button>
                <button
                  onClick={() => selectedVehicle && setVehicleModal({ open: true, vehicle: selectedVehicle })}
                  disabled={!selectedVehicle}
                  className="rounded-lg py-1 text-[12px] font-medium text-automind-dark disabled:text-automind-gray"
                >
                  Редактировать выбранный
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setDriverModal({ open: true, driver: null })}
                  className="rounded-lg border border-automind-gray/40 py-2 text-[12px] font-medium"
                >
                  + Водитель
                </button>
                <button
                  onClick={() => setDriverModal({ open: true, driver: drivers.find((d) => d.id) ?? null })}
                  disabled={drivers.length === 0}
                  className="rounded-lg py-1 text-[12px] font-medium text-automind-dark disabled:text-automind-gray"
                >
                  Редактировать водителя
                </button>
              </>
            )}
          </div>
        )}
      </aside>

      {/* Центральная область: интерактивная карта (ТЗ 4.6) */}
      <main className="flex min-w-0 flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[19px] font-semibold">Мониторинг транспорта</h1>
          <span className="flex items-center gap-1.5 text-[11px] text-automind-gray">
            <span
              className={`size-2 rounded-full ${mode === 'websocket' ? 'bg-automind-status-green' : mode === 'polling' ? 'bg-automind-warn' : 'bg-automind-gray'}`}
            />
            {mode === 'websocket' ? 'Обновление в реальном времени · WebSocket' : mode === 'polling' ? 'Резервный режим · опрос 3 сек' : 'Подключение…'}
          </span>
        </div>
        <div className="min-h-0 flex-1">
          {yandexKey && !mapFailed ? (
            <YandexMap
              vehicles={vehicles}
              routes={routes}
              telemetry={telemetry}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onFail={() => setMapFailed(true)}
            />
          ) : (
            <FleetMap
              vehicles={vehicles}
              routes={routes}
              telemetry={telemetry}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>
      </main>

      {/* Правая информационная панель (ТЗ 4.8) */}
      <aside className="w-[320px] shrink-0 border-l border-automind-gray/20 bg-automind-bg">
        <VehicleInfoPanel vehicleId={selectedId} telemetry={selectedId ? telemetry.get(selectedId) : undefined} />
      </aside>

      {vehicleModal.open && (
        <VehicleFormModal
          vehicle={vehicleModal.vehicle}
          drivers={drivers}
          onClose={() => setVehicleModal({ open: false, vehicle: null })}
          onSaved={reload}
        />
      )}
      {driverModal.open && (
        <DriverFormModal
          driver={driverModal.driver}
          onClose={() => setDriverModal({ open: false, driver: null })}
          onSaved={reload}
        />
      )}
    </div>
  )
}
