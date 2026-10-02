import { useEffect, useState } from 'react'

/** Aktuelle Zeit, die sich im angegebenen Intervall aktualisiert (pausiert, wenn `active` false ist). */
export function useNow(intervalMs = 1000, active = true): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const t = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(t)
  }, [intervalMs, active])
  return now
}
