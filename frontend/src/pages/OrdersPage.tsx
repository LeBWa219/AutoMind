import { useEffect, useState } from 'react'
import { ordersApi, fmtMoney, CARGO_TYPES, ORDER_STATUSES, STATUS_CHIP, type Order } from '../api/orders'

/** Список заказов — раздел «Экономика перевозок» (ТЗ 5.2). */
export function OrdersPage({
  onOpenResults,
  onCreate,
}: {
  onOpenResults: (orderId: number) => void
  onCreate: () => void
}) {
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ordersApi.list().then(setOrders).catch((e) => setError(e.message))
  }, [])

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-8 sm:py-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Экономика перевозок</h1>
          <p className="mt-1 text-[13px] text-automind-gray">
            Заказы на перевозку и результаты экономического анализа
          </p>
        </div>
        <button
          onClick={onCreate}
          className="rounded-lg bg-automind-dark px-4 py-2.5 text-[13px] font-medium text-white hover:opacity-90"
        >
          + Создать заказ
        </button>
      </div>

      {error && <p className="mt-4 text-[13px] text-automind-red">{error}</p>}

      <div className="mt-5 overflow-x-auto rounded-xl bg-white p-2 shadow-sm">
        <table className="w-full min-w-[980px] text-[12px]">
          <thead>
            <tr className="bg-automind-bg text-left text-[10px] uppercase tracking-wider text-automind-gray">
              <th className="rounded-l-lg px-3 py-2.5 font-semibold">№</th>
              <th className="px-3 py-2.5 font-semibold">Заказ</th>
              <th className="px-3 py-2.5 font-semibold">Груз</th>
              <th className="px-3 py-2.5 font-semibold">Маршрут</th>
              <th className="px-3 py-2.5 text-right font-semibold">Км</th>
              <th className="px-3 py-2.5 text-right font-semibold">Выручка</th>
              <th className="px-3 py-2.5 text-right font-semibold">Прибыль</th>
              <th className="px-3 py-2.5 font-semibold">Статус</th>
              <th className="rounded-r-lg px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-[13px] text-automind-gray">
                  Заказов пока нет — создайте первый заказ на перевозку
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-automind-gray/10 last:border-0">
                <td className="px-3 py-2.5 font-medium">{o.id}</td>
                <td className="px-3 py-2.5">
                  <p className="font-medium">{o.orderName}</p>
                  {o.assignedDriver && (
                    <p className="text-[10px] text-automind-gray">Водитель: {o.assignedDriver.driverName}</p>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className="rounded-full bg-automind-bg px-2 py-0.5 text-[10px]">
                    {CARGO_TYPES[o.cargoType] ?? o.cargoType} · {o.cargoWeight} кг
                  </span>
                </td>
                <td className="px-3 py-2.5 text-automind-gray">
                  {o.origin} → {o.destination}
                </td>
                <td className="px-3 py-2.5 text-right">{o.loadedDistance + o.emptyDistance}</td>
                <td className="px-3 py-2.5 text-right font-semibold">{fmtMoney(o.revenue)}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-automind-warn">{o.bestProfit != null ? fmtMoney(o.bestProfit) : '—'}</td>
                <td className="px-3 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_CHIP[o.status].bg} ${STATUS_CHIP[o.status].text}`}
                  >
                    {ORDER_STATUSES[o.status]}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    onClick={() => onOpenResults(o.id)}
                    className="text-[12px] font-medium text-automind-dark hover:underline"
                  >
                    {o.status === 'NEW' ? 'Рассчитать →' : 'Открыть →'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-right text-[11px] text-automind-gray">
        Прибыль — лучшая среди доступных кандидатов последнего расчёта
      </p>
    </main>
  )
}
