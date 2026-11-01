import { useEffect, useState } from 'react'
import { authApi, type AuthUser } from './api/auth'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { MonitoringPage } from './pages/MonitoringPage'

type View = 'home' | 'monitoring' | 'orders' | 'copilot'

const navLabels: Record<View, string> = {
  home: 'Главная',
  monitoring: 'Мониторинг',
  orders: 'Экономика перевозок',
  copilot: 'AI Copilot',
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checking, setChecking] = useState(true)
  const [view, setView] = useState<View>('home')

  // Проверка активной сессии при загрузке (ТЗ 3.2)
  useEffect(() => {
    authApi.me().then((u) => {
      setUser(u)
      setChecking(false)
    })
  }, [])

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center text-automind-gray">Загрузка…</div>
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />
  }

  return (
    <div className="min-h-screen">
      <header className="flex h-16 items-center justify-between border-b border-automind-gray/20 bg-white px-6">
        <div className="flex items-center gap-6">
          <button onClick={() => setView('home')} className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-automind-dark text-sm font-bold text-automind-accent">
              A
            </span>
            <span className="text-lg font-semibold">AutoMind</span>
          </button>
          <nav className="flex gap-1">
            {(Object.keys(navLabels) as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${
                  view === v ? 'bg-automind-bg text-automind-ink' : 'text-automind-gray hover:text-automind-ink'
                }`}
              >
                {navLabels[v]}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3.5">
          <span className="flex items-center gap-1.5 rounded-full bg-automind-bg px-3 py-1.5 text-[12px] text-automind-gray">
            <span className="size-2 rounded-full bg-automind-status-green" />
            Система работает
          </span>
          <span className="text-[13px] font-medium">
            {user.role === 'DISPATCHER' ? 'Диспетчер' : user.role} · #{user.id}
          </span>
          <button
            onClick={() => authApi.logout().then(() => setUser(null))}
            className="rounded-lg px-2 py-1.5 text-[13px] font-medium text-automind-dark hover:bg-automind-bg"
          >
            Выход
          </button>
        </div>
      </header>

      {view === 'home' && <HomePage onNavigate={setView} />}
      {view === 'monitoring' && <MonitoringPage />}
      {view === 'orders' && <Placeholder title="Экономика перевозок" stage="Этап 5" />}
      {view === 'copilot' && <Placeholder title="AI Logistics Copilot" stage="Этап 6" />}
    </div>
  )
}

function Placeholder({ title, stage }: { title: string; stage: string }) {
  return (
    <div className="flex h-[calc(100vh-64px)] items-center justify-center">
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <p className="text-[17px] font-semibold">{title}</p>
        <p className="mt-1.5 text-[13px] text-automind-gray">Раздел будет реализован на {stage.toLowerCase()}е проекта.</p>
      </div>
    </div>
  )
}
