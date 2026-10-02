import { useEffect, useState } from 'react'

/** Minimaler Hash-Router: unterstützt Zurück-Geste/-Taste des Browsers ohne Server-Konfiguration. */
export function useHashRoute(): string[] {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash.replace(/^#\/?/, '').split('/').filter(Boolean)
}

export function navigate(path: string, { replace = false } = {}) {
  const target = `#/${path.replace(/^\//, '')}`
  if (replace) window.location.replace(target)
  else window.location.hash = target
}

/** Zurück, wenn es innerhalb der App eine Historie gibt – sonst zum Fallback. */
export function goBack(fallback: string) {
  if (window.history.length > 1) window.history.back()
  else navigate(fallback, { replace: true })
}
