import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

interface Message {
  id: number
  text: string
  actionLabel?: string
  onAction?: () => void
}

const Ctx = createContext<(m: Omit<Message, 'id'>) => void>(() => {})

/** Kurze Hinweise unten am Bildschirm, optional mit „Rückgängig“. */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<Message | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const counter = useRef(0)

  const show = useCallback((m: Omit<Message, 'id'>) => {
    window.clearTimeout(timer.current)
    const id = ++counter.current
    setMsg({ ...m, id })
    timer.current = window.setTimeout(() => setMsg((cur) => (cur?.id === id ? null : cur)), 5000)
  }, [])

  return (
    <Ctx.Provider value={show}>
      {children}
      {msg && (
        <div className="snackbar" role="status" key={msg.id}>
          <span>{msg.text}</span>
          {msg.actionLabel && (
            <button
              onClick={() => {
                msg.onAction?.()
                setMsg(null)
              }}
            >
              {msg.actionLabel}
            </button>
          )}
        </div>
      )}
    </Ctx.Provider>
  )
}

export const useSnackbar = () => useContext(Ctx)
