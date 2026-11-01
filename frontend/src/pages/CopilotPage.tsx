import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { assistantApi } from '../api/assistant'
import type { ChatMessage } from '../api/assistant'
import { ordersApi, CARGO_TYPES, ORDER_STATUSES, STATUS_CHIP, fmtMoney, type Analysis, type Order } from '../api/orders'

const SUGGESTIONS = [
  'Кого лучше отправить на перевозку?',
  'Почему перевозка этим водителем дороже?',
  'Какой у водителей риск ДТП и штрафов?',
  'Из чего состоит себестоимость?',
]

/** Интерфейс AI Logistics Copilot (ТЗ 6.2): история, ввод, индикатор обработки, контекст заказа. */
export function CopilotPage({
  initialOrderId,
  onOpenResults,
}: {
  initialOrderId: number | null
  onOpenResults: (orderId: number) => void
}) {
  const [orders, setOrders] = useState<Order[]>([])
  const [orderId, setOrderId] = useState<number | null>(initialOrderId)
  const [order, setOrder] = useState<Order | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    ordersApi.list().then((list) => {
      setOrders(list)
      if (list.length > 0 && orderId == null) setOrderId(list[0].id)
    }).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (orderId == null) {
      setMessages([])
      setOrder(null)
      setAnalysis(null)
      return
    }
    assistantApi.history(orderId).then((h) => setMessages(h)).catch(() => undefined)
    ordersApi.get(orderId).then(setOrder).catch(() => undefined)
    ordersApi.analysis(orderId).then(setAnalysis).catch(() => undefined)
  }, [orderId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  async function send(text: string) {
    const message = text.trim()
    if (!message || busy) return
    setInput('')
    setError(null)
    setBusy(true)
    try {
      const res = await assistantApi.chat(message, orderId)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          orderId,
          message,
          response: res.answer,
          createdAt: new Date().toISOString(),
        },
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка запроса')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Чат (ТЗ 6.2) */}
      <section className="flex min-w-0 flex-1 flex-col border-r border-automind-gray/20">
        <div className="flex items-center justify-between border-b border-automind-gray/20 px-5 py-3.5">
          <div>
            <h1 className="text-[16px] font-semibold">AI Logistics Copilot</h1>
            <p className="text-[11px] text-automind-gray">
              Объясняет расчёты на основе данных заказа · заглушка LLM (ТЗ 6.5)
            </p>
          </div>
          <button
            onClick={() => {
              assistantApi.clearHistory(orderId).then(() => setMessages([])).catch(() => undefined)
            }}
            className="rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-automind-dark hover:bg-automind-bg"
          >
            Очистить историю
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-automind-bg px-5 py-4">
          {messages.length === 0 && !busy && (
            <div className="mx-auto max-w-[560px] rounded-xl border border-automind-gray/20 bg-white p-4 text-[13px] leading-relaxed text-automind-gray">
              Здравствуйте! Я — AI Logistics Copilot. Выберите заказ справа и спросите о расчёте,
              сравнении водителей или рисках. Все цифры беру из системы; если данных не хватает — скажу прямо.
            </div>
          )}
          <div className="mx-auto flex max-w-[760px] flex-col gap-3">
            {messages.map((m) => (
              <div key={m.id} className="flex flex-col gap-2">
                <Bubble text={m.message} user />
                <Bubble text={m.response} />
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1 rounded-xl border border-automind-gray/20 bg-white px-3.5 py-2.5">
                  <span className="size-1.5 animate-pulse rounded-full bg-automind-gray" />
                  <span className="size-1.5 animate-pulse rounded-full bg-automind-gray [animation-delay:150ms]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-automind-gray [animation-delay:300ms]" />
                </div>
                <span className="text-[11px] text-automind-gray">Помощник формирует ответ…</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-automind-gray/20 bg-white px-5 py-3">
          <div className="mx-auto max-w-[760px]">
            <div className="mb-2.5 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={busy}
                  className="rounded-full border border-automind-gray/30 px-3 py-1.5 text-[11px] text-automind-dark hover:bg-automind-bg disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
            {error && <p className="mb-2 text-[12px] text-automind-red">{error}</p>}
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                send(input)
              }}
              className="flex gap-2.5"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Спросите о расчёте, рисках или водителях…"
                className="h-11 flex-1 rounded-xl border border-automind-gray/40 px-4 text-[13px] outline-none focus:border-automind-dark"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="size-11 shrink-0 rounded-xl bg-automind-dark text-white disabled:opacity-40"
                title="Отправить"
              >
                ➤
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Информационный блок о контексте текущего заказа (ТЗ 6.2) */}
      <aside className="w-[330px] shrink-0 overflow-y-auto bg-automind-bg p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-automind-gray">
          Контекст заказа
        </p>
        {orders.length > 0 ? (
          <select
            value={orderId ?? ''}
            onChange={(e) => setOrderId(Number(e.target.value))}
            className="mb-3 h-10 w-full rounded-lg border border-automind-gray/40 bg-white px-3 text-[13px] outline-none focus:border-automind-dark"
          >
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                №{o.id} · {o.orderName}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-[12px] text-automind-gray">Заказов пока нет</p>
        )}

        {order && (
          <div className="rounded-xl border border-automind-gray/20 bg-white p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold">№{order.id} · {order.orderName}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${STATUS_CHIP[order.status].bg} ${STATUS_CHIP[order.status].text}`}
              >
                {ORDER_STATUSES[order.status]}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-automind-gray">
              {CARGO_TYPES[order.cargoType] ?? order.cargoType} · {order.cargoWeight} кг · {order.origin} →{' '}
              {order.destination}
            </p>
            <div className="mt-2 flex flex-col gap-1">
              <Row label="Маршрут" value={`${order.loadedDistance + order.emptyDistance} км`} />
              <Row label="Выручка" value={fmtMoney(order.revenue)} />
              {analysis?.bestCandidateId != null && (
                <Row
                  label="Лучший кандидат"
                  value={
                    analysis.candidates.find((c) => c.driverId === analysis.bestCandidateId)?.driverName.split(' ')[0] +
                    ' · ' +
                    analysis.candidates.find((c) => c.driverId === analysis.bestCandidateId)?.totalScore
                  }
                />
              )}
              {order.assignedDriver && <Row label="Назначен" value={order.assignedDriver.driverName} />}
            </div>
            <button
              onClick={() => onOpenResults(order.id)}
              className="mt-3 w-full rounded-lg border border-automind-gray/40 py-2 text-[12px] font-medium text-automind-dark"
            >
              Показать расчёт
            </button>
          </div>
        )}

        <div className="mt-3 rounded-xl bg-automind-accent/15 p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-automind-dark">Как это работает</p>
          <p className="mt-1.5 text-[11px] leading-relaxed">
            Помощник не считает сам: все цифры готовит backend из выполненного расчёта. Заглушка формирует
            текст по шаблонам и не выдумывает показатели (ТЗ 6.5, 6.7).
          </p>
        </div>
      </aside>
    </div>
  )
}

function Bubble({ text, user }: { text: string; user?: boolean }) {
  return (
    <div className={`flex ${user ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
          user ? 'bg-automind-dark text-white' : 'border border-automind-gray/20 bg-white text-automind-ink'
        }`}
      >
        {text}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-automind-gray">{label}</span>
      <span className="truncate text-right text-[12px] font-medium">{value}</span>
    </div>
  )
}
