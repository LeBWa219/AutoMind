/** Клиент API авторизации (ТЗ 3.3). Cookie-сессия передаётся браузером автоматически. */

export interface AuthUser {
  id: number
  role: string
}

interface ApiResponse<T> {
  success: boolean
  message: string
  user?: T
}

async function request<T>(url: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message = body?.message ?? `Ошибка запроса (${res.status})`
    throw new Error(message)
  }
  return body as ApiResponse<T>
}

export const authApi = {
  async login(accessCode: string): Promise<AuthUser> {
    const body = await request<AuthUser>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ accessCode }),
    })
    if (!body.user) throw new Error('Ответ сервера не содержит пользователя')
    return body.user
  },

  async me(): Promise<AuthUser | null> {
    try {
      const body = await request<AuthUser>('/api/auth/me')
      return body.user ?? null
    } catch {
      return null
    }
  },

  async logout(): Promise<void> {
    await request<AuthUser>('/api/auth/logout', { method: 'POST' })
  },
}
