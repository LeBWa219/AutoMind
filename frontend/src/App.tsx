import { Component, useEffect, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { authApi, type AuthUser } from './api/auth'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { MonitoringPage } from './pages/MonitoringPage'
import { OrdersPage } from './pages/OrdersPage'
import { OrderFormPage } from './pages/OrderFormPage'
import { OrderResultsPage } from './pages/OrderResultsPage'
import { CopilotPage } from './pages/CopilotPage'

type View = 'home' | 'monitoring' | 'orders' | 'order-form' | 'order-results' | 'copilot'

const navLabels: Partial<Record<View, string>> = {
  home: 'Главная',
  monitoring: 'Мониторинг',
  orders: 'Экономика перевозок',
  copilot: 'AI Copilot',
}

/** Показывает ошибку рендера вместо белого экрана. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error:', error, info.componentStack)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: 12 }}>
          <b>Ошибка интерфейса:</b>
          {'\n'}
          {this.state.error.message}
          {'\n\n'}
          {this.state.error.stack}
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checking, setChecking] = useState(true)
  const [view, setView] = useState<View>('home')
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null)
  const [copilotOrderId, setCopilotOrderId] = useState<number | null>(null)

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
    <ErrorBoundary>
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
        {view === 'orders' && (
          <OrdersPage
            onOpenResults={(id) => {
              setActiveOrderId(id)
              setView('order-results')
            }}
            onCreate={() => setView('order-form')}
          />
        )}
        {view === 'order-form' && (
          <OrderFormPage
            onCreated={(id) => {
              setActiveOrderId(id)
              setView('order-results')
            }}
            onCancel={() => setView('orders')}
          />
        )}
        {view === 'order-results' && activeOrderId != null && (
          <OrderResultsPage
            orderId={activeOrderId}
            onBack={() => setView('orders')}
            onAskCopilot={() => {
            setCopilotOrderId(activeOrderId)
            setView('copilot')
          }}
          />
        )}
        {view === 'copilot' && (
        <CopilotPage
          initialOrderId={copilotOrderId}
          onOpenResults={(id) => {
            setActiveOrderId(id)
            setView('order-results')
          }}
        />
      )}
      </div>
    </ErrorBoundary>
  )
}
