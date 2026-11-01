import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { fleetApi } from '../api/fleet'
import type { EconomicSettings } from '../api/types'

const fmt = (v: number) => v.toLocaleString('ru-RU', { maximumFractionDigits: 2 })

/** Редактирование экономических параметров (ТЗ 4.3.3). Применяется только к новым расчётам (ТЗ 5.10). */
export function EconomicSettingsPanel() {
  const [settings, setSettings] = useState<EconomicSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = () => {
    fleetApi
      .economicSettings()
      .then((s) => {
        setSettings(s)
        setError(null)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
  }
  useEffect(load, [])

  if (!settings) {
    return <p className="p-4 text-[13px] text-automind-gray">{error ?? 'Загрузка…'}</p>
  }

  const fields: { key: keyof EconomicSettings; label: string; unit: string }[] = [
    { key: 'fuelPrice', label: 'Стоимость литра топлива', unit: '₽/л' },
    { key: 'defaultFuelConsumptionRate', label: 'Нормативный расход топлива', unit: 'л/100 км' },
    { key: 'maintenanceRate', label: 'Обслуживание километра', unit: '₽/км' },
    { key: 'driverHourlyRate', label: 'Час работы водителя', unit: '₽/ч' },
    { key: 'additionalCost', label: 'Дополнительные переменные расходы', unit: '₽' },
    { key: 'tollCost', label: 'Платные дороги', unit: '₽' },
    { key: 'otherCost', label: 'Прочие расходы на эксплуатацию', unit: '₽' },
  ]

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!settings || busy) return
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const payload = Object.fromEntries(
        fields.map((f) => [f.key, Number(String(settings[f.key]).replace(',', '.'))]),
      )
      setSettings(await fleetApi.updateEconomicSettings(payload))
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <p className="text-[12px] text-automind-gray">
        Параметры используются в расчёте себестоимости. Изменение применяется только к новым расчётам —
        исторические сохраняют значения на момент выполнения (ТЗ 4.3.3).
      </p>
      <form onSubmit={submit} className="mt-4 flex max-w-[520px] flex-col gap-3" noValidate>
        {fields.map((f) => (
          <label key={f.key} className="flex items-center justify-between gap-4">
            <span className="text-[13px]">
              {f.label} <span className="text-automind-gray">· {f.unit}</span>
            </span>
            <input
              type="number"
              step="0.01"
              value={String(settings[f.key])}
              onChange={(e) => setSettings({ ...settings, [f.key]: Number(e.target.value) })}
              className="h-9 w-[140px] rounded-lg border border-automind-gray/40 px-3 text-right text-[13px] outline-none focus:border-automind-dark"
            />
          </label>
        ))}
        {error && <p className="text-[13px] text-automind-red">{error}</p>}
        {saved && !error && (
          <p className="text-[13px] text-automind-status-green">Параметры сохранены ✓ (текущие: {fmt(settings.fuelPrice)} ₽/л)</p>
        )}
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-automind-dark px-4 py-2.5 text-[13px] font-medium text-white disabled:opacity-40"
          >
            {busy ? 'Сохраняем…' : 'Сохранить параметры'}
          </button>
        </div>
      </form>
    </div>
  )
}
