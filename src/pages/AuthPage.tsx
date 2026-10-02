import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

export function AuthPage({ db }: { db: SupabaseClient }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const { error, data } =
      mode === 'signin'
        ? await db.auth.signInWithPassword({ email, password })
        : await db.auth.signUp({ email, password })
    setBusy(false)
    if (error) setMessage({ text: error.message, error: true })
    else if (mode === 'signup' && !data.session)
      setMessage({ text: 'Fast geschafft – bitte bestätige deine E-Mail-Adresse über den zugesandten Link.' })
  }

  return (
    <main className="page auth">
      <div className="auth__logo" aria-hidden="true">
        <img src="/icon.svg" alt="" width={64} height={64} />
      </div>
      <h1>Trainingsplan</h1>
      <p className="muted">{mode === 'signin' ? 'Melde dich an, um deine Daten zu synchronisieren.' : 'Erstelle ein Konto.'}</p>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>E-Mail</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Passwort</span>
          <input
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {message && <p className={message.error ? 'error' : 'muted'}>{message.text}</p>}
        <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
          {busy ? '…' : mode === 'signin' ? 'Anmelden' : 'Registrieren'}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--block"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setMessage(null)
          }}
        >
          {mode === 'signin' ? 'Noch kein Konto? Registrieren' : 'Schon ein Konto? Anmelden'}
        </button>
      </form>
    </main>
  )
}
