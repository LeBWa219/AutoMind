/** API AI Logistics Copilot (ТЗ 6.6). */

export interface ChatMessage {
  id: number
  orderId: number | null
  message: string
  response: string
  createdAt: string
}

export interface Recommendation {
  driverId: number
  reason: string
}

export interface AssistantResponse {
  answer: string
  recommendation: Recommendation | null
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: init?.body ? { 'Content-Type': 'application/json; charset=utf-8' } : undefined,
    ...init,
  })
  if (res.status === 401) throw new Error('Требуется авторизация')
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.message ?? `Ошибка запроса (${res.status})`)
  return body as T
}

export const assistantApi = {
  chat: (message: string, orderId: number | null) =>
    request<AssistantResponse>('/api/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message, orderId }),
    }),
  history: (orderId: number | null) =>
    request<ChatMessage[]>(`/api/assistant/history${orderId ? `?orderId=${orderId}` : ''}`),
  clearHistory: (orderId: number | null) =>
    request<{ success: boolean }>(`/api/assistant/history${orderId ? `?orderId=${orderId}` : ''}`, {
      method: 'DELETE',
    }),
}
