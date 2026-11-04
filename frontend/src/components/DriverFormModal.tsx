import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { fleetApi } from '../api/fleet'
import { DRIVER_STATUSES, type Driver } from '../api/types'
import { Select } from './VehicleFormModal'

/** Правила валидации водителя (ТЗ 4.5): обязательные поля и форматы. */
const driverRules: Record<string, (v: string) => string | undefined> = {
  fullName: (v) => (!v.trim() ? 'Укажите ФИО' : undefined),
  phone: (v) =>
    !v.trim() ? 'Укажите телефон' : v.replace(/\D/g, '').length < 10 ? 'Телефон: не менее 10 цифр' : undefined,
  licenseNumber: (v) => (!v.trim() ? 'Укажите номер удостоверения' : undefined),
  licenseCategory: (v) => (!v.trim() ? 'Укажите категорию ВУ' : undefined),
  experienceYears: (v) => (v && Number(v) < 0 ? 'Стаж не может быть отрицательным' : undefined),
}

const inputCls =
  'h-10 w-full rounded-lg border px-3 text-[13px] outline-none transition-colors focus:border-automind-dark'
const inputOk = 'border-automind-gray/40'
const inputErr = 'border-automind-red'

/** Модальная форма добавления/редактирования водителя (ТЗ 4.5):
 *  обязательные поля отмечены, валидация при потере фокуса и отправке. */
export function DriverFormModal({
  driver,
  onClose,
  onSaved,
}: {
  driver: Driver | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    licenseNumber: '',
    licenseCategory: '',
    experienceYears: '',
    employmentDate: '',
    status: 'AVAILABLE',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (driver) {
      setForm({
        fullName: driver.fullName,
        phone: driver.phone ?? '',
        licenseNumber: driver.licenseNumber ?? '',
        licenseCategory: driver.licenseCategory ?? '',
        experienceYears: driver.experienceYears?.toString() ?? '',
        employmentDate: driver.employmentDate ?? '',
        status: driver.status,
      })
    }
  }, [driver])

  const set = (key: keyof typeof form) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }
  const blurField = (key: string) => {
    const msg = driverRules[key]?.((form as Record<string, string>)[key] ?? '')
    setErrors((prev) => {
      const next = { ...prev }
      if (msg) next[key] = msg
      else delete next[key]
      return next
    })
  }
  const err = (key: string): string | undefined => errors[key]
  const borderCls = (key: string) => (errors[key] ? inputErr : inputOk)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    const newErrors: Record<string, string> = {}
    for (const [key, rule] of Object.entries(driverRules)) {
      const value = (form as Record<string, string>)[key] ?? ''
      const msg = rule(value)
      if (msg) newErrors[key] = msg
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setError('Заполните обязательные поля — они отмечены *')
      return
    }
    setBusy(true)
    setError(null)
    const payload = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim() || null,
      licenseNumber: form.licenseNumber.trim() || null,
      licenseCategory: form.licenseCategory.trim() || null,
      experienceYears: form.experienceYears ? Number(form.experienceYears) : 0,
      employmentDate: form.employmentDate || null,
      status: form.status,
    }
    try {
      if (driver) await fleetApi.updateDriver(driver.id, payload)
      else await fleetApi.createDriver(payload)
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
      <div className="max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold">{driver ? 'Редактирование водителя' : 'Добавление водителя'}</h2>
          <button onClick={onClose} className="text-automind-gray hover:text-automind-ink">
            ✕
          </button>
        </div>
        <form onSubmit={submit} className="grid grid-cols-1 gap-3.5 sm:grid-cols-2" noValidate>
          <div className="col-span-1 sm:col-span-2">
            <label className="block">
              <span className="mb-1 block text-[12px] font-medium">
                ФИО <span className="font-bold text-automind-warn">*</span>
              </span>
              <input
                value={form.fullName}
                onChange={(e) => set('fullName')(e.target.value)}
                onBlur={() => blurField('fullName')}
                className={`${inputCls} ${borderCls('fullName')}`}
              />
              {err('fullName') && <span className="mt-1 block text-[11px] text-automind-red">{err('fullName')}</span>}
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium">
              Телефон <span className="font-bold text-automind-warn">*</span>
            </span>
            <input
              value={form.phone}
              onChange={(e) => set('phone')(e.target.value)}
              onBlur={() => blurField('phone')}
              placeholder="+7 (___) ___-__-__"
              className={`${inputCls} ${borderCls('phone')}`}
            />
            {err('phone') && <span className="mt-1 block text-[11px] text-automind-red">{err('phone')}</span>}
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium">Дата трудоустройства</span>
            <input
              type="date"
              value={form.employmentDate}
              onChange={(e) => set('employmentDate')(e.target.value)}
              className={`${inputCls} ${inputOk}`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium">
              Номер удостоверения <span className="font-bold text-automind-warn">*</span>
            </span>
            <input
              value={form.licenseNumber}
              onChange={(e) => set('licenseNumber')(e.target.value)}
              onBlur={() => blurField('licenseNumber')}
              className={`${inputCls} ${borderCls('licenseNumber')}`}
            />
            {err('licenseNumber') && <span className="mt-1 block text-[11px] text-automind-red">{err('licenseNumber')}</span>}
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium">
              Категория ВУ <span className="font-bold text-automind-warn">*</span>
            </span>
            <input
              value={form.licenseCategory}
              onChange={(e) => set('licenseCategory')(e.target.value)}
              onBlur={() => blurField('licenseCategory')}
              placeholder="C, CE"
              className={`${inputCls} ${borderCls('licenseCategory')}`}
            />
            {err('licenseCategory') && <span className="mt-1 block text-[11px] text-automind-red">{err('licenseCategory')}</span>}
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium">Стаж, лет</span>
            <input
              type="number"
              value={form.experienceYears}
              onChange={(e) => set('experienceYears')(e.target.value)}
              onBlur={() => blurField('experienceYears')}
              className={`${inputCls} ${borderCls('experienceYears')}`}
            />
            {err('experienceYears') && <span className="mt-1 block text-[11px] text-automind-red">{err('experienceYears')}</span>}
          </label>
          <Select
            label="Статус"
            value={form.status}
            onChange={set('status')}
            options={DRIVER_STATUSES as Record<string, string>}
          />
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
