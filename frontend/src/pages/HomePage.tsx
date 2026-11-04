import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { LegalLinks, LegalModal, type LegalDoc } from '../components/legal/Legal'
import { MapView } from '../components/MapView'
import { useFleetData } from '../hooks/useFleetData'
import { ordersApi, fmtMoney, CARGO_TYPES, type Order } from '../api/orders'
import { assistantApi } from '../api/assistant'
import type { Vehicle } from '../api/types'

const statusColor: Record<Vehicle['status'], string> = {
  ACTIVE: '#4e9b54',
  ON_TRIP: '#174d35',
  MAINTENANCE: '#e6a23c',
  INACTIVE: '#8a948d',
}

const VEHICLE_STATUS_LABEL: Record<Vehicle['status'], string> = {
  ACTIVE: 'Активен',
  ON_TRIP: 'В рейсе',
  MAINTENANCE: 'На обслуживании',
  INACTIVE: 'Неактивен',
}

const ORDER_STATUS_LABEL: Record<Order['status'], string> = {
  NEW: 'Новый',
  CALCULATED: 'Рассчитан',
  ASSIGNED: 'Назначен',
  IN_PROGRESS: 'В рейсе',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
}

/**
 * Главная страница — дашборд диспетчера (пропорция ~3:1):
 * большая область — карта мониторинга с полосой статистики,
 * правая колонка — заказы и ассистент по данным компании.
 */
export function HomePage({
  onNavigate,
  onOpenResults,
}: {
  onNavigate: (view: 'monitoring' | 'orders' | 'copilot') => void
  onOpenResults: (orderId: number) => void
}) {
  const data = useFleetData()
  const { vehicles, drivers, telemetry } = data
  const [orders, setOrders] = useState<Order[]>([])
  const [legalDoc, setLegalDoc] = useState<LegalDoc>(null)

  useEffect(() => {
    ordersApi.list().then(setOrders).catch(() => undefined)
  }, [])

  const attentionVehicles = vehicles.filter((v) => {
    const t = telemetry.get(v.id)
    return v.status === 'MAINTENANCE' || v.status === 'INACTIVE' || t?.warning != null
  })
  const onTrip = vehicles.filter((v) => v.status === 'ON_TRIP').length
  const availableDrivers = drivers.filter((d) => d.status === 'AVAILABLE' && d.vehicle).length
  const ordersInWork = orders.filter((o) =>
    ['NEW', 'CALCULATED', 'ASSIGNED', 'IN_PROGRESS'].includes(o.status),
  ).length
  const profitabilityValues = orders.map((o) => o.bestProfitability).filter((v): v is number => v != null)
  const avgProfitability = profitabilityValues.length
    ? (profitabilityValues.reduce((s, v) => s + v, 0) / profitabilityValues.length).toFixed(1)
    : null

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Левая колонка: сводка компании */}
      <aside className="hidden w-[280px] shrink-0 flex-col gap-3 overflow-y-auto border-r border-automind-dark/10 bg-automind-bg p-3.5 xl:flex">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-automind-gray">
          Компания сейчас
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Tile label="Автомобилей" value={vehicles.length} hint={`${attentionVehicles.length} требуют внимания`} />
          <Tile label="Водителей" value={drivers.length} hint={`${availableDrivers} свободны`} />
          <Tile label="В рейсе" value={onTrip} hint="прямо сейчас" />
          <Tile label="Заказов" value={orders.length} hint={`${ordersInWork} в работе`} />
        </div>

        <div className="rounded-xl bg-white p-3.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-automind-gray">Экономика</p>
          <p className="mt-1.5 text-[28px] font-bold leading-none text-automind-warn">
            {avgProfitability ?? '—'}
            {avgProfitability !== '—' && <span className="text-[16px]"> %</span>}
          </p>
          <p className="mt-1 text-[11px] text-automind-gray">средняя рентабельность по заказам</p>
        </div>

        <div className="rounded-xl bg-white p-3.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-automind-gray">
            Требуют внимания
          </p>
          {attentionVehicles.length === 0 && (
            <p className="mt-2 text-[12px] text-automind-status-green">Все машины в норме ✓</p>
          )}
          <div className="mt-2 flex flex-col gap-1.5">
            {attentionVehicles.slice(0, 5).map((v) => {
              const t = telemetry.get(v.id)
              return (
                <div key={v.id} className="flex items-center gap-2 rounded-lg bg-automind-bg px-2 py-1.5">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: statusColor[v.status] }} />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-medium">{v.registrationNumber}</span>
                    <span className="block truncate text-[10px] text-automind-gray">
                      {t?.warning ?? VEHICLE_STATUS_LABEL[v.status]}
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-auto flex flex-col items-center gap-1.5 pt-3">
          <LegalLinks onOpen={setLegalDoc} />
        </div>
        {legalDoc && <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />}
      </aside>

      {/* Центр: карта мониторинга (~3/4 ширины) */}
      <section className="relative min-w-0 flex-1">
        <HomeMap />
        <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/95 px-3.5 py-1.5 text-[13px] font-semibold text-automind-dark shadow-sm">
            Мониторинг транспорта
          </span>
          <span className="rounded-full bg-white/95 px-3 py-1.5 text-[11px] text-automind-gray shadow-sm">
            Московская область · {vehicles.length} машин на карте
          </span>
        </div>
        <button
          onClick={() => onNavigate('monitoring')}
          className="absolute bottom-4 right-4 z-10 rounded-xl bg-automind-dark px-4 py-2.5 text-[13px] font-medium text-white shadow-lg hover:opacity-90"
        >
          Открыть полный мониторинг →
        </button>
      </section>

      {/* Правая колонка: заказы + ассистент (~1/4 ширины) */}
      <aside className="flex w-[370px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-automind-dark/10 bg-automind-bg p-3.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-automind-gray">
            Заказы на перевозку
          </p>
          <button onClick={() => onNavigate('orders')} className="text-[11px] font-medium text-automind-dark hover:underline">
            Все заказы →
          </button>
        </div>

        {orders.length === 0 && (
          <div className="rounded-xl bg-white p-3 text-[12px] text-automind-gray shadow-sm">Заказов пока нет</div>
        )}
        <div className="flex flex-col gap-2">
          {orders.slice(0, 4).map((o) => (
            <button
              key={o.id}
              onClick={() => onOpenResults(o.id)}
              className="rounded-xl border border-automind-gray/20 bg-white p-3 text-left shadow-sm transition-colors hover:border-automind-accent"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[13px] font-semibold">
                  №{o.id} · {o.orderName}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium ${STATUS_CHIP_CLASS[o.status]}`}
                >
                  {o.status === 'ASSIGNED' && o.assignedDriver
                    ? o.assignedDriver.driverName.split(' ')[0]
                    : ORDER_STATUS_LABEL[o.status]}
                </span>
              </div>
              <p className="mt-1 truncate text-[11px] text-automind-gray">
                {CARGO_TYPES[o.cargoType] ?? o.cargoType} · {o.origin} → {o.destination}
              </p>
              <p className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-automind-gray">
                  Выручка: <b className="text-automind-ink">{fmtMoney(o.revenue)}</b>
                </span>
                {o.bestProfitability != null && (
                  <span className="font-bold text-automind-warn">{o.bestProfitability} %</span>
                )}
              </p>
            </button>
          ))}
        </div>

        <button
          onClick={() => onNavigate('orders')}
          className="rounded-xl bg-automind-dark py-2.5 text-[12px] font-medium text-white hover:opacity-90"
        >
          + Создать заказ
        </button>

        {/* Мини-чат ассистента по данным компании */}
        <MiniCopilot onOpenFull={() => onNavigate('copilot')} />
      </aside>
    </div>
  )
}

const STATUS_CHIP_CLASS: Record<Order['status'], string> = {
  NEW: 'bg-automind-gray/15 text-automind-gray',
  CALCULATED: 'bg-automind-dark/10 text-automind-dark',
  ASSIGNED: 'bg-automind-status-green/15 text-automind-status-green',
  IN_PROGRESS: 'bg-automind-warn/15 text-automind-warn',
  COMPLETED: 'bg-automind-gray/15 text-automind-gray',
  CANCELLED: 'bg-automind-red/15 text-automind-red',
}

function Tile({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-xl bg-white p-2.5 shadow-sm">
      <p className="text-[9px] uppercase tracking-wider text-automind-gray">{label}</p>
      <p className="text-[22px] font-bold leading-tight text-automind-dark">{value}</p>
      <p className="truncate text-[9px] text-automind-gray">{hint}</p>
    </div>
  )
}

/** Карта главной: тот же мониторинг в компактном режиме дашборда. */
function HomeMap() {
  const data = useFleetData()
  return (
    <MapView
      vehicles={data.vehicles}
      routes={data.routes}
      telemetry={data.telemetry}
      selectedId={null}
      onSelect={() => undefined}
    />
  )
}

/** Компактный чат ассистента: вопросы по данным последнего заказа. */
function MiniCopilot({ onOpenFull }: { onOpenFull: () => void }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [orderId, setOrderId] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    ordersApi.list().then((list) => {
      setOrders(list)
      const inWork = list.find((o) => ['CALCULATED', 'ASSIGNED', 'IN_PROGRESS'].includes(o.status))
      if (inWork) setOrderId(inWork.id)
      else if (list.length) setOrderId(list[0].id)
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [answer])

  async function ask(text: string) {
    const message = text.trim()
    if (!message || busy) return
    setInput('')
    setBusy(true)
    try {
      const res = await assistantApi.chat(message, orderId)
      setAnswer(res.answer)
    } catch (e) {
      setAnswer(e instanceof Error ? e.message : 'Ошибка запроса')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-automind-dark/10 bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-automind-gray">
          Спросить ассистента
        </p>
        <button onClick={onOpenFull} className="text-[11px] font-medium text-automind-dark hover:underline">
          Открыть чат →
        </button>
      </div>

      {orders.length > 0 && (
        <select
          value={orderId ?? ''}
          onChange={(e) => setOrderId(Number(e.target.value))}
          className="mt-2 h-8 w-full rounded-lg border border-automind-gray/40 bg-white px-2 text-[11px] outline-none focus:border-automind-dark"
        >
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              Контекст: №{o.id} · {o.orderName}
            </option>
          ))}
        </select>
      )}

      {answer && (
        <div className="mt-2.5 max-h-[200px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-automind-accent/60 bg-automind-accent/10 p-2.5 text-[12px] leading-relaxed">
          {answer}
        </div>
      )}

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          ask(input)
        }}
        className="mt-2.5 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Например: кого отправить на заказ?"
          className="h-9 min-w-0 flex-1 rounded-lg border border-automind-gray/40 px-2.5 text-[12px] outline-none focus:border-automind-dark"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="size-9 shrink-0 rounded-lg bg-automind-dark text-white disabled:opacity-40"
          title="Спросить"
        >
          ➤
        </button>
      </form>

      <div ref={bottomRef} />
    </div>
  )
}
