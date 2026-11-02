import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ordersApi, CARGO_TYPES } from '../api/orders'

const inputCls =
  'h-10 w-full rounded-lg border border-automind-gray/40 bg-white px-3 text-[13px] outline-none focus:border-automind-dark'

/**
 * Форма создания заказа (ТЗ 5.3). Экономические параметры по умолчанию
 * загружаются из настроек компании. Пустое поле не считается нулём (ТЗ 5.3.3).
 */
export function OrderFormPage({
  onCreated,
  onCancel,
}: {
  onCreated: (orderId: number) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    orderName: '',
    cargoType: 'ORDINARY',
    cargoDescription: '',
    cargoWeight: '',
    cargoVolume: '',
    isFragile: false,
    specialConditions: '',
    origin: '',
    destination: '',
    loadedDistance: '',
    emptyDistance: '',
    plannedDuration: '',
    revenue: '',
  })
  const [econ, setEcon] = useState({
    fuelPrice: '',
    driverHourlyRate: '',
    maintenanceRate: '',
    additionalCost: '',
    tollCost: '',
    otherCost: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fleetSettings()
  }, [])

  async function fleetSettings() {
    try {
      const s = await ordersApi.economicSettings()
      setEcon({
        fuelPrice: String(s.fuelPrice),
        driverHourlyRate: String(s.driverHourlyRate),
        maintenanceRate: String(s.maintenanceRate),
        additionalCost: String(s.additionalCost),
        tollCost: String(s.tollCost),
        otherCost: String(s.otherCost),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки настроек')
    }
  }

  const set = (key: keyof typeof form) => (value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }))

  function validate(): string | null {
    if (!form.orderName.trim()) return 'Укажите название заказа'
    if (!form.cargoWeight || Number(form.cargoWeight) <= 0) return 'Масса груза должна быть больше нуля'
    if (!form.loadedDistance || Number(form.loadedDistance) <= 0) return 'Не указано расстояние маршрута'
    if (!form.plannedDuration || Number(form.plannedDuration) <= 0) return 'Укажите плановое время рейса'
    if (form.revenue === '' || Number(form.revenue) <= 0) return 'Укажите стоимость перевозки'
    for (const [key, label] of [
      ['fuelPrice', 'Не задана стоимость топлива'],
      ['driverHourlyRate', 'Заполните оплату труда водителя или укажите 0'],
      ['maintenanceRate', 'Заполните стоимость обслуживания или укажите 0'],
      ['additionalCost', 'Заполните дополнительные расходы или укажите 0'],
      ['tollCost', 'Заполните стоимость платных дорог или укажите 0'],
      ['otherCost', 'Заполните прочие расходы или укажите 0'],
    ] as const) {
      if (econ[key] === '') return label
    }
    return null
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setBusy(true)
    setError(null)
    setFieldErrors({})
    const num = (v: string) => Number(String(v).replace(',', '.'))
    try {
      const order = await ordersApi.create({
        orderName: form.orderName.trim(),
        cargoType: form.cargoType,
        cargoDescription: form.cargoDescription.trim() || null,
        cargoWeight: num(form.cargoWeight),
        cargoVolume: form.cargoVolume ? num(form.cargoVolume) : null,
        isFragile: form.isFragile || form.cargoType === 'FRAGILE',
        specialConditions: form.specialConditions.trim() || null,
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        loadedDistance: num(form.loadedDistance),
        emptyDistance: num(form.emptyDistance || '0'),
        plannedDuration: num(form.plannedDuration),
        revenue: num(form.revenue),
      })
      await ordersApi.calculate(order.id, {
        fuelPrice: num(econ.fuelPrice),
        driverHourlyRate: num(econ.driverHourlyRate),
        maintenanceRate: num(econ.maintenanceRate),
        additionalCost: num(econ.additionalCost),
        tollCost: num(econ.tollCost),
        otherCost: num(econ.otherCost),
      })
      onCreated(order.id)
    } catch (err) {
      const apiErr = err as Error & { fieldErrors?: { field: string; message: string }[] }
      if (apiErr.fieldErrors && apiErr.fieldErrors.length > 0) {
        setFieldErrors(Object.fromEntries(apiErr.fieldErrors.map((f) => [f.field, f.message])))
        setError('Проверьте заполнение полей')
      } else {
        setError(apiErr.message)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-8 sm:py-7">
      <button onClick={onCancel} className="text-[12px] text-automind-gray hover:text-automind-ink">
        ← К списку заказов
      </button>
      <h1 className="mt-2 text-2xl font-semibold">Создание заказа</h1>

      <form onSubmit={submit} className="mt-5 flex flex-col gap-4" noValidate>
        {/* 5.3.1 Основная информация */}
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-[15px] font-semibold">Основная информация</h2>
          <p className="mt-0.5 text-[11px] text-automind-gray">Поля со звёздочкой обязательны (ТЗ 5.3.1)</p>
          <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Labeled label="Название заказа *">
              <input value={form.orderName} onChange={(e) => set('orderName')(e.target.value)} className={inputCls} />
            </Labeled>
            <Labeled label="Тип груза *">
              <select value={form.cargoType} onChange={(e) => set('cargoType')(e.target.value)} className={inputCls}>
                {Object.entries(CARGO_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Labeled>
            <Labeled label="Описание груза">
              <input
                value={form.cargoDescription}
                onChange={(e) => set('cargoDescription')(e.target.value)}
                className={inputCls}
              />
            </Labeled>
            <Labeled label="Особые условия перевозки">
              <input
                value={form.specialConditions}
                onChange={(e) => set('specialConditions')(e.target.value)}
                className={inputCls}
              />
            </Labeled>
            <Labeled label="Масса груза, кг *" error={fieldErrors.cargoWeight}>
              <input
                type="number"
                value={form.cargoWeight}
                onChange={(e) => set('cargoWeight')(e.target.value)}
                className={inputCls}
              />
            </Labeled>
            <Labeled label="Объём груза, м³">
              <input
                type="number"
                step="0.1"
                value={form.cargoVolume}
                onChange={(e) => set('cargoVolume')(e.target.value)}
                className={inputCls}
              />
            </Labeled>
            <label className="col-span-2 flex items-center gap-2.5 py-1">
              <input
                type="checkbox"
                checked={form.isFragile}
                onChange={(e) => set('isFragile')(e.target.checked)}
                className="size-4 accent-[#174d35]"
              />
              <span className="text-[13px]">Хрупкий груз — повышает вес истории ДТП при выборе водителя</span>
            </label>
          </div>
        </section>

        {/* 5.3.2 Маршрут */}
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-[15px] font-semibold">Маршрут</h2>
          <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <Labeled label="Начальный адрес *" error={fieldErrors.origin}>
              <input value={form.origin} onChange={(e) => set('origin')(e.target.value)} className={inputCls} />
            </Labeled>
            <Labeled label="Конечный адрес *" error={fieldErrors.destination}>
              <input
                value={form.destination}
                onChange={(e) => set('destination')(e.target.value)}
                className={inputCls}
              />
            </Labeled>
            <Labeled label="Расстояние с грузом, км *" error={fieldErrors.loadedDistance}>
              <input
                type="number"
                value={form.loadedDistance}
                onChange={(e) => set('loadedDistance')(e.target.value)}
                className={inputCls}
              />
            </Labeled>
            <Labeled
              label="Дополнительный пробег, км *"
              hint="Порожний пробег и другие перемещения (ТЗ 5.3.2)"
              error={fieldErrors.emptyDistance}
            >
              <input
                type="number"
                value={form.emptyDistance}
                onChange={(e) => set('emptyDistance')(e.target.value)}
                className={inputCls}
              />
            </Labeled>
            <Labeled label="Плановое время, ч *" error={fieldErrors.plannedDuration}>
              <input
                type="number"
                step="0.5"
                value={form.plannedDuration}
                onChange={(e) => set('plannedDuration')(e.target.value)}
                className={inputCls}
              />
            </Labeled>
          </div>
        </section>

        {/* 5.3.3 Экономические данные */}
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-[15px] font-semibold">Экономические данные</h2>
          <p className="mt-0.5 text-[11px] text-automind-gray">
            Загружены из настроек компании, можно скорректировать. Пустое поле не считается нулём —
            укажите 0 явно, если параметр не применяется (ТЗ 5.3.3).
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <Labeled label="Выручка за заказ, ₽ *" error={fieldErrors.revenue}>
              <input
                type="number"
                value={form.revenue}
                onChange={(e) => set('revenue')(e.target.value)}
                className={`${inputCls} ${fieldErrors.revenue ? 'border-automind-red' : ''}`}
              />
            </Labeled>
            <Labeled label="Стоимость топлива, ₽/л *" error={fieldErrors.fuelPrice}>
              <input
                type="number"
                step="0.01"
                value={econ.fuelPrice}
                onChange={(e) => setEcon({ ...econ, fuelPrice: e.target.value })}
                className={inputCls}
              />
            </Labeled>
            <Labeled label="Оплата труда водителя, ₽/ч *" error={fieldErrors.driverHourlyRate}>
              <input
                type="number"
                step="0.01"
                value={econ.driverHourlyRate}
                onChange={(e) => setEcon({ ...econ, driverHourlyRate: e.target.value })}
                className={inputCls}
              />
            </Labeled>
            <Labeled label="Обслуживание, ₽/км *" error={fieldErrors.maintenanceRate}>
              <input
                type="number"
                step="0.01"
                value={econ.maintenanceRate}
                onChange={(e) => setEcon({ ...econ, maintenanceRate: e.target.value })}
                className={inputCls}
              />
            </Labeled>
            <Labeled label="Дополнительные расходы, ₽ *" error={fieldErrors.additionalCost}>
              <input
                type="number"
                step="0.01"
                value={econ.additionalCost}
                onChange={(e) => setEcon({ ...econ, additionalCost: e.target.value })}
                className={inputCls}
              />
            </Labeled>
            <Labeled label="Платные дороги, ₽ *" error={fieldErrors.tollCost}>
              <input
                type="number"
                step="0.01"
                value={econ.tollCost}
                onChange={(e) => setEcon({ ...econ, tollCost: e.target.value })}
                className={inputCls}
              />
            </Labeled>
            <Labeled label="Прочие расходы, ₽ *" error={fieldErrors.otherCost}>
              <input
                type="number"
                step="0.01"
                value={econ.otherCost}
                onChange={(e) => setEcon({ ...econ, otherCost: e.target.value })}
                className={inputCls}
              />
            </Labeled>
          </div>
        </section>

        {error && <p className="text-[13px] text-automind-red">{error}</p>}

        <div className="flex items-center justify-between">
          <div className="flex gap-2.5">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-automind-dark px-4 py-2.5 text-[13px] font-medium text-white disabled:opacity-40"
            >
              {busy ? 'Расчёт выполняется…' : 'Рассчитать себестоимость'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-automind-gray/40 px-4 py-2.5 text-[13px] font-medium"
            >
              Отмена
            </button>
          </div>
          <p className="text-[11px] text-automind-gray">Расчёт выполняется на сервере по формулам ТЗ 5.5</p>
        </div>
      </form>
    </main>
  )
}

function Labeled({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium">
        {label} {hint && <span className="font-normal text-automind-gray">· {hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-[11px] text-automind-red">{error}</span>}
    </label>
  )
}
