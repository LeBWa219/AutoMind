import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ordersApi, CARGO_TYPES } from '../api/orders'

const inputCls =
  'h-10 w-full rounded-lg border bg-white px-3 text-[13px] outline-none transition-colors focus:border-automind-dark'
const inputOk = 'border-automind-gray/40'
const inputErr = 'border-automind-red'

/** Создание заказа (ТЗ 5.3). Валидация каждого блока, обязательные поля
 *  выделены сразу: оранжевая звёздочка + красная рамка при ошибке.
 *  Пустое поле не считается нулём (ТЗ 5.3.3). */
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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ordersApi.economicSettings().then((s) => {
      setEcon({
        fuelPrice: String(s.fuelPrice),
        driverHourlyRate: String(s.driverHourlyRate),
        maintenanceRate: String(s.maintenanceRate),
        additionalCost: String(s.additionalCost),
        tollCost: String(s.tollCost),
        otherCost: String(s.otherCost),
      })
    }).catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки настроек'))
  }, [])

  const setFormValue = (key: keyof typeof form) => (value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }
  const setEconValue = (key: keyof typeof econ) => (value: string) => {
    setEcon((f) => ({ ...f, [key]: value }))
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }
  const blurField = (key: string) => {
    setErrors((prev) => ({ ...prev, [key]: fieldRules[key]?.(form, econ) ?? prev[key] }))
  }

  // Правила валидации каждого поля (ТЗ 5.4)
  const fieldRules: Record<string, (f: typeof form, e: typeof econ) => string | undefined> = {
    orderName: (f) => (!f.orderName.trim() ? 'Укажите название заказа' : undefined),
    cargoWeight: (f) =>
      !f.cargoWeight ? 'Укажите массу груза' : Number(f.cargoWeight) <= 0 ? 'Масса груза должна быть больше нуля' : undefined,
    loadedDistance: (f) =>
      !f.loadedDistance ? 'Не указано расстояние маршрута' : Number(f.loadedDistance) <= 0 ? 'Расстояние должно быть больше нуля' : undefined,
    emptyDistance: (f) =>
      f.emptyDistance === '' ? 'Укажите порожний пробег или 0' : Number(f.emptyDistance) < 0 ? 'Пробег не может быть отрицательным' : undefined,
    plannedDuration: (f) =>
      !f.plannedDuration ? 'Укажите плановое время' : Number(f.plannedDuration) <= 0 ? 'Время должно быть больше нуля' : undefined,
    revenue: (f) =>
      !f.revenue ? 'Укажите стоимость перевозки' : Number(f.revenue) <= 0 ? 'Стоимость перевозки должна быть больше нуля' : undefined,
    fuelPrice: (_f, e) =>
      e.fuelPrice === '' ? 'Не задана стоимость топлива' : Number(e.fuelPrice) <= 0 ? 'Стоимость топлива должна быть больше нуля' : undefined,
    driverHourlyRate: (_f, e) =>
      e.driverHourlyRate === '' ? 'Заполните оплату труда или укажите 0' : Number(e.driverHourlyRate) < 0 ? 'Не может быть отрицательной' : undefined,
    maintenanceRate: (_f, e) =>
      e.maintenanceRate === '' ? 'Заполните стоимость обслуживания или укажите 0' : Number(e.maintenanceRate) < 0 ? 'Не может быть отрицательной' : undefined,
    additionalCost: (_f, e) =>
      e.additionalCost === '' ? 'Заполните дополнительные расходы или укажите 0' : Number(e.additionalCost) < 0 ? 'Не могут быть отрицательными' : undefined,
    tollCost: (_f, e) =>
      e.tollCost === '' ? 'Укажите стоимость платных дорог или 0' : Number(e.tollCost) < 0 ? 'Не может быть отрицательной' : undefined,
    otherCost: (_f, e) =>
      e.otherCost === '' ? 'Укажите прочие расходы или 0' : Number(e.otherCost) < 0 ? 'Не могут быть отрицательными' : undefined,
    origin: (f) => (!f.origin.trim() ? 'Укажите начальный адрес' : undefined),
    destination: (f) => (!f.destination.trim() ? 'Укажите конечный адрес' : undefined),
  }

  function validateAll(): Record<string, string> {
    const errs: Record<string, string> = {}
    for (const [key, rule] of Object.entries(fieldRules)) {
      const msg = rule(form, econ)
      if (msg) errs[key] = msg
    }
    return errs
  }

  // Ошибки по блокам — для бейджей в заголовках секций
  const sectionErrors: Record<string, number> = {}
  for (const key of ['orderName', 'cargoWeight']) {
    if (errors[key]) sectionErrors.cargo = (sectionErrors.cargo ?? 0) + 1
  }
  for (const key of ['origin', 'destination', 'loadedDistance', 'emptyDistance', 'plannedDuration']) {
    if (errors[key]) sectionErrors.route = (sectionErrors.route ?? 0) + 1
  }
  for (const key of ['revenue', 'fuelPrice', 'driverHourlyRate', 'maintenanceRate', 'additionalCost', 'tollCost', 'otherCost']) {
    if (errors[key]) sectionErrors.economics = (sectionErrors.economics ?? 0) + 1
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    const clientErrs = validateAll()
    setErrors(clientErrs)
    setServerErrors({})
    if (Object.keys(clientErrs).length > 0) {
      setError('Исправьте ошибки в форме — расчёт не запускается при некорректных данных (ТЗ 5.4)')
      return
    }
    setBusy(true)
    setError(null)
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
        const merged = apiErr.fieldErrors.reduce<Record<string, string>>((acc, f) => ({ ...acc, [f.field]: f.message }), {})
        setErrors(merged)
        setServerErrors(merged)
        setError('Проверьте заполнение полей')
      } else {
        setError(apiErr.message)
      }
    } finally {
      setBusy(false)
    }
  }

  const err = (key: string): string | undefined => errors[key] ?? serverErrors[key] ?? undefined
  const borderCls = (key: string) => (err(key) ? inputErr : inputOk)

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-8 sm:py-7">
      <button onClick={onCancel} className="text-[12px] text-automind-gray hover:text-automind-ink">
        ← К списку заказов
      </button>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Создание заказа</h1>
        <p className="text-[12px] text-automind-gray">
          <span className="font-bold text-automind-warn">*</span> — обязательные поля, расчёт без них не запускается (ТЗ 5.4)
        </p>
      </div>

      <form onSubmit={submit} className="mt-5 flex flex-col gap-4" noValidate>
        {/* Блок 1: основная информация */}
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <div className="section-header">
            <h2 className="text-[15px] font-semibold">Основная информация</h2>
            {(sectionErrors.cargo ?? 0) > 0 && (
              <span className="rounded-full bg-automind-red/10 px-2 py-0.5 text-[10px] font-semibold text-automind-red">
                {sectionErrors.cargo} ошибок(и)
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="Название заказа" required error={err('orderName')}>
              <input value={form.orderName} onChange={(e) => setFormValue('orderName')(e.target.value)} onBlur={() => blurField('orderName')} className={`${inputCls} ${borderCls('orderName')}`} />
            </Field>
            <Field label="Тип груза" required>
              <select value={form.cargoType} onChange={(e) => setFormValue('cargoType')(e.target.value)} className={`${inputCls} ${inputOk}`}>
                {Object.entries(CARGO_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Описание груза">
              <input value={form.cargoDescription} onChange={(e) => setFormValue('cargoDescription')(e.target.value)} className={`${inputCls} ${inputOk}`} />
            </Field>
            <Field label="Особые условия перевозки">
              <input value={form.specialConditions} onChange={(e) => setFormValue('specialConditions')(e.target.value)} className={`${inputCls} ${inputOk}`} />
            </Field>
            <Field label="Масса груза, кг" required error={err('cargoWeight')}>
              <input type="number" value={form.cargoWeight} onChange={(e) => setFormValue('cargoWeight')(e.target.value)} onBlur={() => blurField('cargoWeight')} className={`${inputCls} ${borderCls('cargoWeight')}`} />
            </Field>
            <Field label="Объём груза, м³">
              <input type="number" step="0.1" value={form.cargoVolume} onChange={(e) => setFormValue('cargoVolume')(e.target.value)} className={`${inputCls} ${inputOk}`} />
            </Field>
            <label className="col-span-1 flex items-center gap-2.5 py-1 sm:col-span-2">
              <input type="checkbox" checked={form.isFragile} onChange={(e) => setFormValue('isFragile')(e.target.checked)} className="size-4 accent-[#E6A23C]" />
              <span className="text-[13px]">
                Хрупкий груз — <span className="font-medium text-automind-warn">повышает вес истории ДТП</span> при выборе водителя
              </span>
            </label>
          </div>
        </section>

        {/* Блок 2: маршрут */}
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <div className="section-header">
            <h2 className="text-[15px] font-semibold">Маршрут</h2>
            {(sectionErrors.route ?? 0) > 0 && (
              <span className="rounded-full bg-automind-red/10 px-2 py-0.5 text-[10px] font-semibold text-automind-red">
                {sectionErrors.route} ошибок(и)
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <Field label="Начальный адрес" required error={err('origin')}>
              <input value={form.origin} onChange={(e) => setFormValue('origin')(e.target.value)} onBlur={() => blurField('origin')} className={`${inputCls} ${borderCls('origin')}`} />
            </Field>
            <Field label="Конечный адрес" required error={err('destination')}>
              <input value={form.destination} onChange={(e) => setFormValue('destination')(e.target.value)} onBlur={() => blurField('destination')} className={`${inputCls} ${borderCls('destination')}`} />
            </Field>
            <Field label="Расстояние с грузом, км" required error={err('loadedDistance')}>
              <input type="number" value={form.loadedDistance} onChange={(e) => setFormValue('loadedDistance')(e.target.value)} onBlur={() => blurField('loadedDistance')} className={`${inputCls} ${borderCls('loadedDistance')}`} />
            </Field>
            <Field label="Дополнительный пробег, км" required hint="порожние перемещения (ТЗ 5.3.2)" error={err('emptyDistance')}>
              <input type="number" value={form.emptyDistance} onChange={(e) => setFormValue('emptyDistance')(e.target.value)} onBlur={() => blurField('emptyDistance')} className={`${inputCls} ${borderCls('emptyDistance')}`} />
            </Field>
            <Field label="Плановое время, ч" required error={err('plannedDuration')}>
              <input type="number" step="0.5" value={form.plannedDuration} onChange={(e) => setFormValue('plannedDuration')(e.target.value)} onBlur={() => blurField('plannedDuration')} className={`${inputCls} ${borderCls('plannedDuration')}`} />
            </Field>
          </div>
        </section>

        {/* Блок 3: экономические данные */}
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <div className="section-header">
            <h2 className="text-[15px] font-semibold">Экономические данные</h2>
            {(sectionErrors.economics ?? 0) > 0 && (
              <span className="rounded-full bg-automind-red/10 px-2 py-0.5 text-[10px] font-semibold text-automind-red">
                {sectionErrors.economics} ошибок(и)
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-automind-gray">
            Загружены из настроек компании. <span className="font-medium text-automind-warn">Пустое поле не считается нулём</span> — укажите 0 явно (ТЗ 5.3.3).
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <Field label="Выручка за заказ, ₽" required error={err('revenue')}>
              <input type="number" value={form.revenue} onChange={(e) => setFormValue('revenue')(e.target.value)} onBlur={() => blurField('revenue')} className={`${inputCls} ${borderCls('revenue')}`} />
            </Field>
            <Field label="Стоимость топлива, ₽/л" required error={err('fuelPrice')}>
              <input type="number" step="0.01" value={econ.fuelPrice} onChange={(e) => setEconValue('fuelPrice')(e.target.value)} onBlur={() => blurField('fuelPrice')} className={`${inputCls} ${borderCls('fuelPrice')}`} />
            </Field>
            <Field label="Оплата труда водителя, ₽/ч" required error={err('driverHourlyRate')}>
              <input type="number" step="0.01" value={econ.driverHourlyRate} onChange={(e) => setEconValue('driverHourlyRate')(e.target.value)} onBlur={() => blurField('driverHourlyRate')} className={`${inputCls} ${borderCls('driverHourlyRate')}`} />
            </Field>
            <Field label="Обслуживание, ₽/км" required error={err('maintenanceRate')}>
              <input type="number" step="0.01" value={econ.maintenanceRate} onChange={(e) => setEconValue('maintenanceRate')(e.target.value)} onBlur={() => blurField('maintenanceRate')} className={`${inputCls} ${borderCls('maintenanceRate')}`} />
            </Field>
            <Field label="Дополнительные расходы, ₽" required error={err('additionalCost')}>
              <input type="number" step="0.01" value={econ.additionalCost} onChange={(e) => setEconValue('additionalCost')(e.target.value)} onBlur={() => blurField('additionalCost')} className={`${inputCls} ${borderCls('additionalCost')}`} />
            </Field>
            <Field label="Платные дороги, ₽" required error={err('tollCost')}>
              <input type="number" step="0.01" value={econ.tollCost} onChange={(e) => setEconValue('tollCost')(e.target.value)} onBlur={() => blurField('tollCost')} className={`${inputCls} ${borderCls('tollCost')}`} />
            </Field>
            <Field label="Прочие расходы, ₽" required error={err('otherCost')}>
              <input type="number" step="0.01" value={econ.otherCost} onChange={(e) => setEconValue('otherCost')(e.target.value)} onBlur={() => blurField('otherCost')} className={`${inputCls} ${borderCls('otherCost')}`} />
            </Field>
          </div>
        </section>

        {error && <p className="text-[13px] font-medium text-automind-red">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2.5">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-automind-dark px-4 py-2.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              {busy ? 'Расчёт выполняется…' : 'Рассчитать себестоимость'}
            </button>
            <button type="button" onClick={onCancel} className="rounded-lg border border-automind-gray/40 px-4 py-2.5 text-[13px] font-medium">
              Отмена
            </button>
          </div>
          <p className="text-[11px] text-automind-gray">Расчёт выполняется на сервере по формулам ТЗ 5.5</p>
        </div>
      </form>
    </main>
  )
}

function Field({
  label, required, hint, error, children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium">
        {label}{' '}
        {required && <span className="font-bold text-automind-warn">*</span>}
        {hint && <span className="font-normal text-automind-gray"> · {hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-[11px] text-automind-red">{error}</span>}
    </label>
  )
}
