/** API экономического анализа (ТЗ 5.11). */

import type { EconomicSettings } from './types'
import { ApiError } from './fleet'

export interface Order {
  id: number
  orderName: string
  cargoType: string
  cargoDescription: string | null
  cargoWeight: number
  cargoVolume: number | null
  isFragile: boolean
  specialConditions: string | null
  origin: string
  destination: string
  loadedDistance: number
  emptyDistance: number
  plannedDuration: number
  revenue: number
  status: 'NEW' | 'CALCULATED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  createdAt: string
  bestProfit: number | null
  bestProfitability: number | null
  assignedDriver: {
    driverId: number
    driverName: string
    vehicleId: number
    vehicleLabel: string
    assignedAt: string
  } | null
}

export interface Candidate {
  driverId: number
  driverName: string
  vehicleId: number | null
  vehicleLabel: string
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'EXCLUDED'
  statusReason: string | null
  fuelCost: number
  driverCost: number
  maintenanceCost: number
  tollCost: number
  additionalCost: number
  otherCost: number
  totalCost: number
  revenue: number
  profit: number
  profitability: number
  riskScore: number
  totalScore: number
  insufficientData: boolean
  faultAccidents: number
  violations: number
  finesTotal: number
  comment: string | null
  criteria: Record<string, number>
}

export interface Analysis {
  orderId: number
  status: Order['status']
  revenue: number
  candidates: Candidate[]
  bestCandidateId: number | null
  calculatedAt: string | null
}

export interface HistoryEvent {
  at: string
  type: 'CALCULATION' | 'ASSIGNMENT'
  description: string
}

export const CARGO_TYPES: Record<string, string> = {
  ORDINARY: 'Обычный',
  FRAGILE: 'Хрупкий',
  DANGEROUS: 'Опасный',
  PERISHABLE: 'Скоропортящийся',
  OVERSIZED: 'Крупногабаритный',
  OTHER: 'Другой',
}

export const ORDER_STATUSES: Record<Order['status'], string> = {
  NEW: 'Новый',
  CALCULATED: 'Расчёт выполнен',
  ASSIGNED: 'Водитель назначен',
  IN_PROGRESS: 'В рейсе',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
}

export const STATUS_CHIP: Record<Order['status'], { bg: string; text: string }> = {
  NEW: { bg: 'bg-automind-gray/15', text: 'text-automind-gray' },
  CALCULATED: { bg: 'bg-automind-dark/10', text: 'text-automind-dark' },
  ASSIGNED: { bg: 'bg-automind-status-green/15', text: 'text-automind-status-green' },
  IN_PROGRESS: { bg: 'bg-automind-warn/15', text: 'text-automind-warn' },
  COMPLETED: { bg: 'bg-automind-gray/15', text: 'text-automind-gray' },
  CANCELLED: { bg: 'bg-automind-red/15', text: 'text-automind-red' },
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: init?.body ? { 'Content-Type': 'application/json; charset=utf-8' } : undefined,
    ...init,
  })
  if (res.status === 401) throw new ApiError('Требуется авторизация', 401)
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new ApiError(body?.message ?? `Ошибка запроса (${res.status})`, res.status)
    ;(err as ApiError & { fieldErrors?: { field: string; message: string }[] }).fieldErrors = body?.errors ?? []
    throw err
  }
  return body as T
}

export const ordersApi = {
  list: () => request<Order[]>('/api/orders'),
  get: (id: number) => request<Order>(`/api/orders/${id}`),
  create: (data: Record<string, unknown>) =>
    request<Order>('/api/orders', { method: 'POST', body: JSON.stringify(data) }),
  calculate: (id: number, params: Record<string, number>) =>
    request<Analysis>(`/api/orders/${id}/calculate`, { method: 'POST', body: JSON.stringify({ params }) }),
  analysis: (id: number) => request<Analysis>(`/api/orders/${id}/analysis`),
  assign: (id: number, driverId: number) =>
    request<Order>(`/api/orders/${id}/assign`, { method: 'POST', body: JSON.stringify({ driverId }) }),
  history: (id: number) => request<HistoryEvent[]>(`/api/orders/${id}/history`),
  economicSettings: () => request<EconomicSettings>('/api/economic-settings'),
}

export const fmtMoney = (v: number) =>
  `${v.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`

export const fmtMoney2 = (v: number) =>
  `${v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`
