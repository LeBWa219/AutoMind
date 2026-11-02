import { useEffect, useState } from 'react'
import { LegalLinks, LegalModal, type LegalDoc } from '../components/legal/Legal'
import { fleetApi } from '../api/fleet'
import type { Telemetry, Vehicle, Driver } from '../api/types'

/** Главная страница (ТЗ 2.5): три функциональных блока + KPI. */
export function HomePage({ onNavigate }: { onNavigate: (view: 'monitoring' | 'orders' | 'copilot') => void }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [telemetry, setTelemetry] = useState<Telemetry[]>([])
  const [legalDoc, setLegalDoc] = useState<LegalDoc>(null)

  useEffect(() => {
    fleetApi.vehicles().then(setVehicles).catch(() => undefined)
    fleetApi.drivers().then(setDrivers).catch(() => undefined)
    fleetApi.telemetry().then(setTelemetry).catch(() => undefined)
  }, [])

  const attention = telemetry.filter((t) => t.warning != null).length
  const availableDrivers = drivers.filter((d) => d.status === 'AVAILABLE' && d.vehicle).length

  const blocks: { icon: string; title: string; desc: string; view: 'monitoring' | 'orders' | 'copilot' }[] = [
    {
      icon: '🚚',
      title: 'Мониторинг транспорта',
      desc: 'Карта автопарка, перемещение автомобилей по маршрутам, телеметрия, водители, история рейсов, ДТП и штрафы.',
      view: 'monitoring',
    },
    {
      icon: '📊',
      title: 'Экономика перевозок',
      desc: 'Создание заказа, расчёт себестоимости, сравнение водителей по экономике и рискам, назначение ответственного.',
      view: 'orders',
    },
    {
      icon: '🤖',
      title: 'AI Logistics Copilot',
      desc: 'Объяснение расчётов, анализ истории водителей и рекомендации по выбору — простым языком.',
      view: 'copilot',
    },
  ]

  return (
    <main className="mx-auto max-w-6xl px-11 py-8">
      <h1 className="text-2xl font-semibold">Главная</h1>
      <p className="mt-1 text-[13px] text-automind-gray">Что делаем сегодня?</p>

      <div className="mt-6 grid grid-cols-3 gap-5">
        {blocks.map((b) => (
          <button
            key={b.title}
            onClick={() => onNavigate(b.view)}
            className="group flex min-h-[210px] flex-col rounded-xl bg-white p-6 text-left shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-automind-accent/20 text-[26px]">
              {b.icon}
            </span>
            <span className="mt-3.5 text-[19px] font-semibold">{b.title}</span>
            <span className="mt-1.5 flex-1 text-[13px] leading-relaxed text-automind-gray">{b.desc}</span>
            <span className="mt-3 text-[13px] font-medium text-automind-dark group-hover:underline">
              Перейти →
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-4 gap-5">
        <Kpi title="Автомобилей" value={vehicles.length} hint={`${attention} требуют внимания`} />
        <Kpi title="Водителей" value={drivers.length} hint={`${availableDrivers} доступны для назначения`} />
        <Kpi title="Заказов в работе" value="—" hint="появится на этапе 5" />
        <Kpi title="Средняя рентабельность" value="—" hint="появится на этапе 5" />
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-xl border border-automind-gray/20 bg-white px-4 py-3">
        <span className="text-automind-dark">ℹ</span>
        <p className="text-[12px] text-automind-gray">
          Телеметрия обновляется автоматически (WebSocket). Окончательное решение по заказу всегда принимает диспетчер.
        </p>
      </div>
      <div className="mt-4 flex justify-center">
        <LegalLinks onOpen={setLegalDoc} />
      </div>
      {legalDoc && <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />}
    </main>
  )
}

function Kpi({ title, value, hint }: { title: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-[11px] text-automind-gray">{title}</p>
      <p className="mt-0.5 text-[22px] font-bold">{value}</p>
      <p className="text-[10px] text-automind-gray">{hint}</p>
    </div>
  )
}
