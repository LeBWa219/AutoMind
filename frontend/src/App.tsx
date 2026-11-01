import { useEffect, useState } from 'react'
import { authApi, type AuthUser } from './api/auth'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checking, setChecking] = useState(true)

  // Проверка активной сессии при загрузке (ТЗ 3.2: перенаправление на главную, если сессия есть)
  useEffect(() => {
    authApi.me().then((u) => {
      setUser(u)
      setChecking(false)
    })
  }, [])

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center text-automind-gray">Загрузка…</div>
  }

  return user ? (
    <HomePage user={user} onLogout={() => setUser(null)} />
  ) : (
    <LoginPage onLogin={setUser} />
  )
}
