import { useState } from 'react'
import type { FormEvent } from 'react'
import { LegalLinks, LegalModal, type LegalDoc } from '../components/legal/Legal'
import { Logo } from '../components/Logo'
import { authApi, type AuthUser } from '../api/auth'

/** Страница входа по коду доступа (ТЗ 3.2). Код проверяется на сервере. */
export function LoginPage({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [legalDoc, setLegalDoc] = useState<LegalDoc>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!code.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const user = await authApi.login(code.trim())
      onLogin(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка авторизации')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="h-2 w-full bg-automind-accent" />
        <div className="mb-5 flex items-center">
          <Logo size={40} wordmarkSize={24} />
        </div>
        <h1 className="text-[17px] font-semibold">Вход в систему</h1>
        <p className="mt-1.5 text-[13px] text-automind-gray">
          Введите код доступа, выданный администратором
        </p>

        <form onSubmit={submit} className="mt-6" noValidate>
          <label htmlFor="access-code" className="mb-1.5 block text-[13px] font-medium">
            Код доступа <span className="text-automind-red">*</span>
          </label>
          <input
            id="access-code"
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="••••••••••"
            autoComplete="off"
            className={`h-11 w-full rounded-lg border bg-white px-3.5 text-[14px] outline-none transition-colors placeholder:text-automind-gray focus:border-automind-dark ${
              error ? 'border-automind-red' : 'border-automind-gray/40'
            }`}
          />
          {error && <p className="mt-2 text-[13px] text-automind-red">{error}</p>}

          <button
            type="submit"
            disabled={busy || !code.trim()}
            className="mt-5 h-11 w-full rounded-lg bg-automind-dark text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? 'Проверяем код…' : 'Войти'}
          </button>
        </form>

        <div className="mt-6 border-t border-automind-gray/20 pt-4">
          <p className="text-center text-[12px] leading-relaxed text-automind-gray">
            Код проверяется на сервере и хранится в БД в виде хеша.
            <br />
            Количество попыток ограничено.
          </p>
          <div className="mt-3 flex justify-center">
            <LegalLinks onOpen={setLegalDoc} />
          </div>
        </div>
      </div>
      {legalDoc && <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />}
    </div>
  )
}
