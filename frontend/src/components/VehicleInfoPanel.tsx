import { useEffect, useState } from 'react'
import { fleetApi } from '../api/fleet'
import {
  VEHICLE_STATUSES,
  type Driver,
  type Incident,
  type Telemetry,
  type Trip,
  type Vehicle,
} from '../api/types'

const fmtMoney = (v: number) => `${v.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`

/** Правая информационная панель мониторинга (ТЗ 4.8): водитель, автомобиль, телеметрия, поездки, ДТП. */
export function VehicleInfoPanel({
  vehicleId,
  telemetry,
}: {
  vehicleId: number | null
  telemetry: Telemetry | undefined
}) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [driver, setDriver] = useState<Driver | null>(null)
  const [trips, setTrips] = useState<Trip[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setVehicle(null)
    setDriver(null)
    setTrips([])
    setIncidents([])
    if (vehicleId == null) return
    let cancelled = false
    fleetApi
      .vehicle(vehicleId)
      .then((v) => {
        if (cancelled) return
        setVehicle(v)
        if (v.driver) {
          fleetApi.driver(v.driver.id).then((d) => !cancelled && setDriver(d))
          fleetApi.driverTrips(v.driver.id, 5).then((t) => !cancelled && setTrips(t))
          fleetApi.driverIncidents(v.driver.id).then((i) => !cancelled && setIncidents(i))
        }
      })
      .catch(() => undefined)
    const timer = setInterval(() => setReloadKey((k) => k + 1), 15000) // данные панели обновляются периодически
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [vehicleId])

  if (vehicleId == null) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-[13px] text-automind-gray">
        Выберите автомобиль на карте,
        <br />
        чтобы увидеть информацию о водителе и телеметрию
      </div>
    )
  }

  const t = telemetry
  return (
    <div className="flex h-full flex-col gap-2.5 overflow-y-auto p-3.5" data-reload={reloadKey}>
      {/* Блок 1. Водитель */}
      <Card title="ВОДИТЕЛЬ">
        {driver ? (
          <>
            <p className="text-[13px] font-semibold">{driver.fullName}</p>
            <p className="mt-0.5 text-[11px] text-automind-gray">
              Стаж {driver.experienceYears} лет · кат. {driver.licenseCategory ?? '—'}
            </p>
            <p className="text-[11px] text-automind-gray">{driver.phone ?? 'телефон не указан'}</p>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              <Stat label="Рейсы" value={driver.stats.tripsCount} />
              <Stat label="ДТП" value={driver.stats.accidents} accent={driver.stats.accidents > 0 ? 'red' : undefined} />
              <Stat
                label="Наруш."
                value={driver.stats.violations}
                accent={driver.stats.violations > 0 ? 'warn' : undefined}
              />
              <Stat label="Штрафы" value={fmtMoney(driver.stats.finesTotal)} />
            </div>
          </>
        ) : (
          <p className="text-[12px] text-automind-gray">Водитель не закреплён</p>
        )}
      </Card>

      {/* Блок 2. Автомобиль */}
      {vehicle && (
        <Card title="АВТОМОБИЛЬ">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-semibold">
                {vehicle.brand} {vehicle.model}
              </p>
              <p className="text-[11px] text-automind-gray">
                {vehicle.registrationNumber} · {vehicle.productionYear ?? '—'} г.
              </p>
            </div>
            <StatusChip status={vehicle.status} />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <Stat label="Пробег" value={`${Math.round(vehicle.mileage).toLocaleString('ru-RU')} км`} />
            <Stat label="Топливо" value={t?.fuelLevel != null ? `${Math.round(t.fuelLevel)} %` : '—'} />
            <Stat label="Норма" value={`${vehicle.fuelConsumptionRate} л/100`} />
          </div>
        </Card>
      )}

      {/* Блок 3. Телеметрия */}
      {t ? (
        <Card title="ТЕЛЕМЕТРИЯ · ОБНОВЛЕНО СЕЙЧАС">
          <div className="grid grid-cols-3 gap-1.5">
            <Stat label="Скорость" value={`${Math.round(t.speed)} км/ч`} />
            <Stat label="Обороты" value={t.engineRpm ?? '—'} />
            <Stat
              label="Т двиг."
              value={t.engineTemperature != null ? `${Math.round(t.engineTemperature)} °C` : '—'}
              accent={(t.engineTemperature ?? 0) > 92 ? 'warn' : undefined}
            />
            <Stat label="Т охл. ж." value={t.coolantTemperature != null ? `${Math.round(t.coolantTemperature)} °C` : '—'} />
            <Stat label="Расход" value={t.fuelConsumption != null ? `${t.fuelConsumption} л/100` : '—'} />
            <Stat label="Масло" value={t.oilPressure != null ? `${t.oilPressure} бар` : '—'} />
            <Stat label="Аккум." value={`${t.batteryVoltage} В`} accent={!t.batteryOk ? 'red' : undefined} />
            <Stat label="Зажигание" value={t.ignitionStatus ? 'Вкл' : 'Выкл'} />
            <Stat label="Движение" value={t.movementStatus ? 'Да' : 'Нет'} />
          </div>
          {t.warning && (
            <p className="mt-2 rounded-lg bg-automind-warn/15 px-2.5 py-2 text-[11px] font-medium text-automind-warn">
              ⚠ {t.warning}
            </p>
          )}
        </Card>
      ) : (
        <Card title="ТЕЛЕМЕТРИЯ">
          <p className="text-[12px] text-automind-gray">Ожидание данных…</p>
        </Card>
      )}

      {/* Блок 4. Последние поездки */}
      <Card title="ПОСЛЕДНИЕ ПОЕЗДКИ (ИЗ 5)">
        {trips.length === 0 && <p className="text-[12px] text-automind-gray">Нет данных о поездках</p>}
        <div className="flex flex-col gap-2">
          {trips.map((trip) => (
            <div key={trip.id} className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium">
                  {new Date(trip.tripDate).toLocaleDateString('ru-RU')} · {trip.startLocation} → {trip.endLocation}
                </p>
                <p className="text-[10px] text-automind-gray">
                  {trip.distance} км · {trip.duration} ч · {trip.fuelConsumption} л
                </p>
              </div>
              <p className="text-[12px] font-semibold">{fmtMoney(trip.totalCost)}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Блок 5. ДТП и штрафы */}
      <Card title="ДТП И ШТРАФЫ">
        {incidents.length === 0 && <p className="text-[12px] text-automind-gray">Событий не зафиксировано</p>}
        <div className="flex flex-col gap-2">
          {incidents.map((inc) => (
            <div key={inc.id} className="flex gap-2">
              <span
                className={`mt-1.5 size-1.5 shrink-0 rounded-full ${inc.incidentType === 'ACCIDENT' ? 'bg-automind-red' : 'bg-automind-warn'}`}
              />
              <div className="flex-1">
                <p className="text-[11px] font-medium leading-snug">
                  {inc.incidentType === 'ACCIDENT' ? 'ДТП' : 'Нарушение'} · {inc.description}
                </p>
                <p className="text-[10px] text-automind-gray">
                  {new Date(inc.accidentDate).toLocaleDateString('ru-RU')} ·{' '}
                  {inc.faultStatus === 'FAULT_FOUND'
                    ? 'виновен'
                    : inc.faultStatus === 'NO_FAULT'
                      ? 'не виновен'
                      : 'устанавливается'}
                  {inc.fines.length > 0 && ` · штраф ${fmtMoney(inc.fines.reduce((s, f) => s + f.amount, 0))}`}
                  {inc.fines.some((f) => f.paymentStatus === 'UNPAID') && ' · не оплачен'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-automind-gray/15 bg-white p-3 shadow-sm">
      <p className="mb-2 text-[9px] font-semibold tracking-[0.08em] text-automind-gray">{title}</p>
      {children}
    </section>
  )
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: 'warn' | 'red' }) {
  const color = accent === 'red' ? 'text-automind-red' : accent === 'warn' ? 'text-automind-warn' : 'text-automind-ink'
  return (
    <div className="rounded-lg bg-automind-accent/15 px-2 py-1.5">
      <p className="text-[8px] uppercase tracking-wider text-automind-gray">{label}</p>
      <p className={`text-[12px] font-semibold ${color}`}>{value}</p>
    </div>
  )
}

function StatusChip({ status }: { status: Vehicle['status'] }) {
  const colors: Record<Vehicle['status'], string> = {
    ACTIVE: 'bg-automind-status-green/15 text-automind-status-green',
    ON_TRIP: 'bg-automind-dark/10 text-automind-dark',
    MAINTENANCE: 'bg-automind-warn/15 text-automind-warn',
    INACTIVE: 'bg-automind-gray/15 text-automind-gray',
  }
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${colors[status]}`}>
      {VEHICLE_STATUSES[status]}
    </span>
  )
}
