import { useEffect, useState } from 'react'
import {
  ordersApi,
  fmtMoney,
  fmtMoney2,
  CARGO_TYPES,
  ORDER_STATUSES,
  STATUS_CHIP,
  type Analysis,
  type Candidate,
  type HistoryEvent,
  type Order,
} from '../api/orders'

const CRITERION_LABELS: Record<string, string> = {
  ECONOMIC: 'Экономическая эффективность',
  ACCIDENT: 'История ДТП',
  VIOLATION: 'Нарушения и штрафы',
  FUEL: 'Расход топлива',
  RELIABILITY: 'Надёжность выполнения рейсов',
}

/** Результаты расчёта заказа (ТЗ 5.7–5.10): таблица кандидатов, обоснование, назначение. */
export function OrderResultsPage({
  orderId,
  onBack,
  onAskCopilot,
}: {
  orderId: number
  onBack: () => void
  onAskCopilot: () => void
}) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [history, setHistory] = useState<HistoryEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function reload() {
    ordersApi
      .analysis(orderId)
      .then(setAnalysis)
      .catch((e) => setError(e.message))
    ordersApi.get(orderId).then(setOrder).catch(() => undefined)
    ordersApi.history(orderId).then(setHistory).catch(() => undefined)
  }
  useEffect(reload, [orderId])

  async function assign(driverId: number) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await ordersApi.assign(orderId, driverId)
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка назначения')
    } finally {
      setBusy(false)
    }
  }

  if (error && !analysis) {
    return (
      <main className="px-8 py-7">
        <p className="text-[13px] text-automind-red">{error}</p>
      </main>
    )
  }
  if (!analysis) {
    return <main className="px-8 py-7 text-[13px] text-automind-gray">Загрузка результатов…</main>
  }

  const best = analysis.candidates.find((c) => c.driverId === analysis.bestCandidateId)
  const bestTotal = analysis.candidates
    .filter((c) => c.status === 'AVAILABLE')
    .reduce((min, c) => Math.min(min, c.totalCost), Infinity)
  const maxProfit = analysis.candidates
    .filter((c) => c.status === 'AVAILABLE')
    .reduce((m, c) => Math.max(m, c.profit), -Infinity)

  return (
    <main className="mx-auto max-w-[1240px] px-4 py-5 sm:px-8 sm:py-6">
      <button onClick={onBack} className="text-[12px] text-automind-gray hover:text-automind-ink">
        ← К списку заказов
      </button>
      <div className="mt-2 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[21px] font-semibold">
              Заказ №{analysis.orderId}
              {order ? ` · ${order.orderName}` : ''}
            </h1>
            {order && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_CHIP[order.status].bg} ${STATUS_CHIP[order.status].text}`}
              >
                {ORDER_STATUSES[order.status]}
              </span>
            )}
          </div>
          {order && (
            <p className="mt-1 text-[12px] text-automind-gray">
              {CARGO_TYPES[order.cargoType] ?? order.cargoType} · {order.cargoWeight} кг · {order.origin} →{' '}
              {order.destination} · {order.loadedDistance + order.emptyDistance} км ({order.loadedDistance} +{' '}
              {order.emptyDistance} порожний) · план {order.plannedDuration} ч · выручка {fmtMoney(order.revenue)}
            </p>
          )}
        </div>
        <button
          onClick={onAskCopilot}
          className="rounded-lg border border-automind-gray/40 px-3.5 py-2 text-[12px] font-medium text-automind-dark"
        >
          🤖 Спросить AI Copilot
        </button>
      </div>

      {error && <p className="mt-3 text-[13px] text-automind-red">{error}</p>}

      {/* KPI */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi title="Выручка" value={fmtMoney(analysis.revenue)} hint="введена диспетчером" />
        <Kpi
          title="Лучшая себестоимость"
          value={bestTotal === Infinity ? '—' : fmtMoney2(bestTotal)}
          hint={best?.vehicleLabel ?? 'нет доступных кандидатов'}
        />
        <Kpi
          title="Максимальная прибыль"
          value={maxProfit === -Infinity ? '—' : fmtMoney2(maxProfit)}
          hint="среди доступных кандидатов"
        />
        <Kpi
          title="Лучший кандидат"
          value={best ? best.driverName.split(' ')[0] + ' ' + best.driverName.split(' ')[1]?.[0] + '.' : '—'}
          hint={best ? `оценка ${best.totalScore} · риск ${best.riskScore}` : '—'}
        />
      </div>

      {/* Сравнительная таблица (ТЗ 5.7) */}
      <section className="mt-4 overflow-hidden rounded-xl bg-white p-2.5 shadow-sm">
        <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-automind-gray">
          Сравнение кандидатов · оплата труда, обслуживание, платные дороги и прочие расходы общие для всех,
          топливо — по индивидуальной истории водителя (ТЗ 5.6)
        </p>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1020px] text-[12px]">
          <thead>
            <tr className="bg-automind-bg text-left text-[9px] uppercase tracking-wider text-automind-gray">
              <th className="rounded-l-lg px-2.5 py-2 font-semibold">Водитель</th>
              <th className="px-2.5 py-2 font-semibold">Автомобиль</th>
              <th className="px-2.5 py-2 text-right font-semibold">Топливо</th>
              <th className="px-2.5 py-2 text-right font-semibold">Себестоимость</th>
              <th className="px-2.5 py-2 text-right font-semibold">Прибыль</th>
              <th className="px-2.5 py-2 text-right font-semibold">Рентаб.</th>
              <th className="px-2.5 py-2 text-right font-semibold">ДТП</th>
              <th className="px-2.5 py-2 text-right font-semibold">Штрафы</th>
              <th className="px-2.5 py-2 text-right font-semibold">Риск</th>
              <th className="px-2.5 py-2 text-right font-semibold">Оценка</th>
              <th className="rounded-r-lg px-2.5 py-2 font-semibold">Действие</th>
            </tr>
          </thead>
          <tbody>
            {analysis.candidates.map((c) => (
              <CandidateRow key={c.driverId} candidate={c} best={c.driverId === analysis.bestCandidateId} onAssign={assign} busy={busy} />
            ))}
          </tbody>
        </table>
        </div>
      </section>

      {/* Обоснование оценки лучшего кандидата (ТЗ 5.9) */}
      {best && (
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_330px]">
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-semibold">Обоснование оценки · {best.driverName}</h2>
            <p className="mt-0.5 text-[11px] text-automind-gray">
              Частные оценки нормализованы 0–100 по набору кандидатов; веса — из БД с учётом типа груза (ТЗ 5.8)
            </p>
            <div className="mt-3.5 flex flex-col gap-2.5">
              {Object.entries(CRITERION_LABELS).map(([key, label]) => {
                const score = best.criteria?.[key]
                if (score == null) return null
                return (
                  <div key={key} className="flex items-center gap-2.5">
                    <span className="w-[240px] text-[11px] text-automind-gray">{label}</span>
                    <div className="h-2 flex-1 rounded bg-automind-bg">
                      <div className="h-2 rounded bg-automind-dark" style={{ width: `${score}%` }} />
                    </div>
                    <span className="w-10 text-right text-[11px] font-semibold">{Math.round(score)}</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-automind-gray/15 pt-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-automind-gray">
                Итоговая оценка
              </span>
              <span className="text-[22px] font-bold text-automind-dark">{best.totalScore} / 100</span>
            </div>
            {best.insufficientData && (
              <p className="mt-2 text-[11px] text-automind-warn">
                ⚠ Недостаточно истории рейсов — часть показателей взята из нормативов автомобиля (ТЗ 5.6)
              </p>
            )}
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-semibold">Назначение водителя</h2>
            {analysis.status === 'ASSIGNED' ? (
              <div className="mt-3">
                <p className="text-[13px] font-medium text-automind-status-green">
                  ✓ Водитель назначен на заказ
                </p>
                <p className="mt-1 text-[13px]">
                  {analysis.candidates.find((c) => c.driverId === analysis.bestCandidateId)?.driverName ?? ''} —
                  заказ закрыт для пересчёта.
                </p>
              </div>
            ) : (
              <>
                <p className="mt-2 text-[12px] text-automind-gray">
                  Рекомендация системы — {best.driverName}. Окончательное решение принимает диспетчер (ТЗ 1.5).
                </p>
                <button
                  onClick={() => assign(best.driverId)}
                  disabled={busy || best.status !== 'AVAILABLE'}
                  className="mt-3 w-full rounded-lg bg-automind-dark py-2.5 text-[13px] font-medium text-white disabled:opacity-40"
                >
                  {best.status === 'AVAILABLE' ? 'Назначить водителя' : 'Кандидат недоступен'}
                </button>
              </>
            )}
            <div className="mt-4 border-t border-automind-gray/15 pt-3">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-automind-gray">История заказа</p>
              <div className="mt-2 flex max-h-[200px] flex-col gap-1.5 overflow-y-auto">
                {history.map((h, i) => (
                  <p key={i} className="text-[11px] text-automind-gray">
                    {new Date(h.at).toLocaleString('ru-RU')} · {h.description}
                  </p>
                ))}
                {history.length === 0 && <p className="text-[11px] text-automind-gray">Событий пока нет</p>}
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

function CandidateRow({
  candidate: c,
  best,
  onAssign,
  busy,
}: {
  candidate: Candidate
  best: boolean
  onAssign: (id: number) => void
  busy: boolean
}) {
  const excluded = c.status === 'EXCLUDED'
  const unavailable = c.status === 'UNAVAILABLE'
  return (
    <tr
      className={`border-b border-automind-gray/10 last:border-0 ${best ? 'bg-automind-accent/15' : excluded || unavailable ? 'text-automind-gray' : ''}`}
    >
      <td className="rounded-l-lg px-2.5 py-2">
        <p className={`font-medium ${excluded || unavailable ? '' : ''}`}>
          {c.driverName}
          {best && (
            <span className="ml-1.5 rounded-full bg-automind-dark/10 px-1.5 py-0.5 text-[9px] font-semibold text-automind-dark">
              ★ лучший
            </span>
          )}
        </p>
        {c.statusReason && (
          <p className={`text-[10px] ${unavailable ? 'text-automind-warn' : 'text-automind-gray'}`}>
            {unavailable ? '⛔ ' : '✕ '}
            {c.statusReason}
          </p>
        )}
        {c.insufficientData && c.status === 'AVAILABLE' && (
          <p className="text-[10px] text-automind-warn">⚠ мало истории рейсов</p>
        )}
      </td>
      <td className="px-2.5 py-2">{excluded ? '—' : c.vehicleLabel}</td>
      <td className="px-2.5 py-2 text-right">{excluded ? '—' : fmtMoney2(c.fuelCost)}</td>
      <td className="px-2.5 py-2 text-right font-medium">{excluded ? '—' : fmtMoney2(c.totalCost)}</td>
      <td className={`px-2.5 py-2 text-right font-medium ${c.profit > 0 ? 'text-automind-status-green' : ''}`}>
        {excluded ? '—' : fmtMoney2(c.profit)}
      </td>
      <td className="px-2.5 py-2 text-right">{excluded ? '—' : `${c.profitability} %`}</td>
      <td className={`px-2.5 py-2 text-right ${c.faultAccidents > 0 ? 'text-automind-red' : ''}`}>
        {excluded ? '—' : c.faultAccidents}
      </td>
      <td className="px-2.5 py-2 text-right">{excluded ? '—' : fmtMoney(c.finesTotal)}</td>
      <td className={`px-2.5 py-2 text-right ${c.riskScore >= 70 ? 'text-automind-red' : c.riskScore >= 40 ? 'text-automind-warn' : ''}`}>
        {excluded ? '—' : c.riskScore}
      </td>
      <td className="px-2.5 py-2 text-right font-bold">{excluded ? '—' : c.totalScore}</td>
      <td className="rounded-r-lg px-2.5 py-2 text-right">
        {best && c.status === 'AVAILABLE' && (
          <button
            onClick={() => onAssign(c.driverId)}
            disabled={busy}
            className="rounded-lg bg-automind-dark px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-40"
          >
            Назначить
          </button>
        )}
      </td>
    </tr>
  )
}

function Kpi({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-[11px] text-automind-gray">{title}</p>
      <p className="mt-0.5 truncate text-[20px] font-bold">{value}</p>
      <p className="truncate text-[10px] text-automind-gray">{hint}</p>
    </div>
  )
}
