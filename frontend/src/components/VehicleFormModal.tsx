import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { fleetApi } from '../api/fleet'
import { FUEL_TYPES, VEHICLE_STATUSES, type Driver, type Vehicle } from '../api/types'

const inputCls =
  'h-10 w-full rounded-lg border border-automind-gray/40 bg-white px-3 text-[13px] outline-none focus:border-automind-dark'

/** Модальная форма добавления/редактирования автомобиля (ТЗ 4.4). */
export function VehicleFormModal({
  vehicle,
  drivers,
  onClose,
  onSaved,
}: {
  vehicle: Vehicle | null
  drivers: Driver[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    registrationNumber: '',
    vin: '',
    brand: '',
    model: '',
    productionYear: '',
    fuelType: 'DIESEL',
    fuelConsumptionRate: '',
    loadCapacity: '',
    mileage: '',
    status: 'ACTIVE',
    driverId: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (vehicle) {
      setForm({
        registrationNumber: vehicle.registrationNumber,
        vin: vehicle.vin,
        brand: vehicle.brand,
        model: vehicle.model,
        productionYear: vehicle.productionYear?.toString() ?? '',
        fuelType: vehicle.fuelType,
        fuelConsumptionRate: vehicle.fuelConsumptionRate?.toString() ?? '',
        loadCapacity: vehicle.loadCapacity?.toString() ?? '',
        mileage: vehicle.mileage?.toString() ?? '',
        status: vehicle.status,
        driverId: vehicle.driver?.id.toString() ?? '',
      })
    }
  }, [vehicle])

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    const payload = {
      registrationNumber: form.registrationNumber.trim(),
      vin: form.vin.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      productionYear: form.productionYear ? Number(form.productionYear) : null,
      fuelType: form.fuelType,
      fuelConsumptionRate: Number(form.fuelConsumptionRate.replace(',', '.')),
      loadCapacity: Number(form.loadCapacity.replace(',', '.') || 0),
      mileage: form.mileage ? Number(form.mileage.replace(',', '.')) : null,
      status: form.status,
    }
    try {
      if (vehicle) {
        await fleetApi.updateVehicle(vehicle.id, payload)
      } else {
        const saved = await fleetApi.createVehicle(payload)
        if (form.driverId) {
          await fleetApi.assignVehicleDriver(saved.id, Number(form.driverId))
        }
      }
      if (vehicle) {
        const linked = form.driverId ? Number(form.driverId) : null
        if ((vehicle.driver?.id ?? null) !== linked) {
          await fleetApi.assignVehicleDriver(vehicle.id, linked)
        }
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-automind-ink/50 p-4">
      <div className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold">
            {vehicle ? 'Редактирование автомобиля' : 'Добавление автомобиля'}
          </h2>
          <button onClick={onClose} className="text-automind-gray hover:text-automind-ink">
            ✕
          </button>
        </div>
        <form onSubmit={submit} className="grid grid-cols-1 gap-3.5 sm:grid-cols-2" noValidate>
          <Field label="Госномер *" value={form.registrationNumber} onChange={set('registrationNumber')} />
          <Field label="VIN *" value={form.vin} onChange={set('vin')} />
          <Field label="Марка *" value={form.brand} onChange={set('brand')} />
          <Field label="Модель *" value={form.model} onChange={set('model')} />
          <Field label="Год выпуска" value={form.productionYear} onChange={set('productionYear')} type="number" />
          <Select label="Тип топлива" value={form.fuelType} onChange={set('fuelType')} options={FUEL_TYPES} />
          <Field
            label="Средний расход, л/100 км *"
            value={form.fuelConsumptionRate}
            onChange={set('fuelConsumptionRate')}
            type="number"
          />
          <Field
            label="Грузоподъёмность, кг *"
            value={form.loadCapacity}
            onChange={set('loadCapacity')}
            type="number"
          />
          <Field label="Пробег, км" value={form.mileage} onChange={set('mileage')} type="number" />
          <Select
            label="Статус"
            value={form.status}
            onChange={set('status')}
            options={VEHICLE_STATUSES as Record<string, string>}
          />
          <div className="col-span-2">
            <Select
              label="Закрепить водителя"
              value={form.driverId}
              onChange={set('driverId')}
              options={{ '': '— не выбран —', ...Object.fromEntries(drivers.map((d) => [d.id, d.fullName])) }}
            />
          </div>
          {error && <p className="col-span-2 text-[13px] text-automind-red">{error}</p>}
          <div className="col-span-2 mt-1 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-automind-gray/40 px-4 py-2.5 text-[13px] font-medium"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-automind-dark px-4 py-2.5 text-[13px] font-medium text-white disabled:opacity-40"
            >
              {busy ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </label>
  )
}

export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Record<string, string>
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </label>
  )
}
