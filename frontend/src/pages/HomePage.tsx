import { authApi, type AuthUser } from '../api/auth'

/**
 * Топбар приложения (ТЗ 2.5): логотип, пользователь, индикатор системы, выход.
 * На этапе 4 сюда добавится полноценная главная страница с тремя блоками.
 */
export function Topbar({ user, onLogout }: { user: AuthUser | null; onLogout: () => void }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-automind-gray/20 bg-white px-6">
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 items-center justify-center rounded-lg bg-automind-dark text-sm font-bold text-automind-accent">
          A
        </span>
        <span className="text-lg font-semibold">AutoMind</span>
      </div>
      <div className="flex items-center gap-3.5">
        <span className="flex items-center gap-1.5 rounded-full bg-automind-bg px-3 py-1.5 text-[12px] text-automind-gray">
          <span className="size-2 rounded-full bg-automind-status-green" />
          Система работает
        </span>
        {user && (
          <span className="text-[13px] font-medium">
            {user.role === 'DISPATCHER' ? 'Диспетчер' : user.role} · #{user.id}
          </span>
        )}
        <button
          onClick={onLogout}
          className="rounded-lg px-2 py-1.5 text-[13px] font-medium text-automind-dark hover:bg-automind-bg"
        >
          Выход
        </button>
      </div>
    </header>
  )
}

export function HomePage({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  return (
    <div className="min-h-screen">
      <Topbar user={user} onLogout={() => authApi.logout().then(onLogout)} />
      <main className="mx-auto max-w-6xl px-11 py-8">
        <h1 className="text-2xl font-semibold">Главная</h1>
        <p className="mt-1 text-[13px] text-automind-gray">
          Авторизация выполнена. Разделы «Мониторинг», «Экономика» и «AI Copilot» появятся на этапе 4.
        </p>
      </main>
    </div>
  )
}
