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
import { ConsentBanner } from './components/legal/Legal'
import { Logo } from './components/Logo'

type View = 'home' | 'monitoring' | 'orders' | 'order-form' | 'order-results' | 'copilot'

const navLabels: Partial<Record<View, string>> = {
  home: 'Главная',
  monitoring: 'Мониторинг',
  orders: 'Расчет грузоперевозок',
  copilot: 'Ассистент',
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
  const [menuOpen, setMenuOpen] = useState(false)
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
      <ConsentBanner />
      <div className="min-h-screen">
        {/* Десктопный топбар */}
        <header className="hidden h-16 items-center justify-between gap-2 border-b border-automind-dark/15 bg-automind-accent px-6 lg:flex">
          <div className="flex items-center gap-6">
            <button onClick={() => setView('home')} className="flex items-center">
              <Logo size={34} wordmarkSize={21} />
            </button>
            <nav className="flex gap-1">
              {(Object.keys(navLabels) as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    view === v ? 'bg-automind-dark text-white' : 'text-automind-dark/70 hover:bg-white/40 hover:text-automind-dark'
                  }`}
                >
                  {navLabels[v]}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-3.5">
            <span className="flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1.5 text-[12px] font-medium text-automind-dark">
              <span className="size-2 rounded-full bg-automind-status-green" />
              Система работает
            </span>
            <span className="text-[13px] font-medium">
              {user.role === 'DISPATCHER' ? 'Диспетчер' : user.role} · #{user.id}
            </span>
            <button
              onClick={() => authApi.logout().then(() => setUser(null))}
              className="rounded-lg px-2 py-1.5 text-[13px] font-semibold text-automind-dark hover:bg-white/50"
            >
              Выход
            </button>
          </div>
        </header>

        {/* Мобильный топбар с бургером */}
        <header className="flex h-16 items-center justify-between border-b border-automind-dark/15 bg-automind-accent px-4 lg:hidden">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Меню"
            className="flex size-10 flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-automind-bg"
          >
            <span className="h-0.5 w-5 rounded bg-automind-ink" />
            <span className="h-0.5 w-5 rounded bg-automind-ink" />
            <span className="h-0.5 w-5 rounded bg-automind-ink" />
          </button>
          <button onClick={() => setView('home')} className="flex items-center">
            <Logo size={32} wordmarkSize={19} />
          </button>
          <button
            onClick={() => authApi.logout().then(() => setUser(null))}
            className="rounded-lg px-2 py-1.5 text-[12px] font-medium text-automind-dark hover:bg-automind-bg"
          >
            Выход
          </button>
        </header>

        {/* Выдвижное меню-бургер */}
        {menuOpen && (
          <div className="fixed inset-0 z-[1200] lg:hidden">
            <div className="absolute inset-0 bg-automind-ink/50" onClick={() => setMenuOpen(false)} />
            <nav className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-white shadow-xl">
              <div className="flex items-center border-b border-automind-dark/15 bg-automind-accent px-4 py-4">
                <Logo size={34} wordmarkSize={20} />
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {(Object.keys(navLabels) as View[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      setView(v)
                      setMenuOpen(false)
                    }}
                    className={`mb-1 w-full rounded-lg px-3.5 py-3 text-left text-[14px] font-medium ${
                      view === v ? 'bg-automind-accent/40 text-automind-dark' : 'text-automind-gray hover:bg-automind-bg'
                    }`}
                  >
                    {navLabels[v]}
                  </button>
                ))}
              </div>
              <div className="border-t border-automind-gray/20 p-4">
                <p className="text-[13px] font-medium">
                  {user.role === 'DISPATCHER' ? 'Диспетчер' : user.role} · #{user.id}
                </p>
                <button
                  onClick={() => authApi.logout().then(() => setUser(null))}
                  className="mt-2 w-full rounded-lg border border-automind-gray/40 py-2 text-[13px] font-medium"
                >
                  Выход
                </button>
              </div>
            </nav>
          </div>
        )}

        {view === 'home' && (
          <HomePage
            onNavigate={setView}
            onOpenResults={(id) => {
              setActiveOrderId(id)
              setView('order-results')
            }}
          />
        )}
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
