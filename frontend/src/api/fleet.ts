/** API клиент мониторинга (ТЗ 4.9). При 401 сбрасывает сессию. */

import type { Driver, EconomicSettings, FleetRoute, Telemetry, Trip, Vehicle, Incident } from './types'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler
}
let unauthorizedHandler: (() => void) | null = null

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  })
  if (res.status === 401 && !url.includes('/api/auth/')) {
    unauthorizedHandler?.()
    throw new ApiError('Требуется авторизация', 401)
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(body?.message ?? `Ошибка запроса (${res.status})`, res.status)
  }
  return body as T
}

export const fleetApi = {
  vehicles: () => request<Vehicle[]>('/api/vehicles'),
  vehicle: (id: number) => request<Vehicle>(`/api/vehicles/${id}`),
  createVehicle: (data: Record<string, unknown>) =>
    request<Vehicle>('/api/vehicles', { method: 'POST', body: JSON.stringify(data) }),
  updateVehicle: (id: number, data: Record<string, unknown>) =>
    request<Vehicle>(`/api/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  changeVehicleStatus: (id: number, status: string) =>
    request<Vehicle>(`/api/vehicles/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  assignVehicleDriver: (id: number, driverId: number | null) =>
    request<Vehicle>(`/api/vehicles/${id}/driver`, { method: 'PATCH', body: JSON.stringify({ driverId }) }),

  drivers: () => request<Driver[]>('/api/drivers'),
  driver: (id: number) => request<Driver>(`/api/drivers/${id}`),
  createDriver: (data: Record<string, unknown>) =>
    request<Driver>('/api/drivers', { method: 'POST', body: JSON.stringify(data) }),
  updateDriver: (id: number, data: Record<string, unknown>) =>
    request<Driver>(`/api/drivers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  driverTrips: (id: number, limit?: number) =>
    request<Trip[]>(`/api/drivers/${id}/trips${limit ? `?limit=${limit}` : ''}`),
  driverIncidents: (id: number) => request<Incident[]>(`/api/drivers/${id}/incidents`),

  routes: () => request<FleetRoute[]>('/api/routes'),
  telemetry: () => request<Telemetry[]>('/api/telemetry'),
  vehicleTelemetry: (id: number) => request<Telemetry>(`/api/vehicles/${id}/telemetry`),

  economicSettings: () => request<EconomicSettings>('/api/economic-settings'),
  updateEconomicSettings: (data: Record<string, number>) =>
    request<EconomicSettings>('/api/economic-settings', { method: 'PUT', body: JSON.stringify(data) }),
}
