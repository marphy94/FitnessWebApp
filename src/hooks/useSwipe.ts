import { useRef } from 'react'

interface Options {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number
}

/** Horizontale Wischgeste (z. B. Monatswechsel im Kalender). Vertikales Scrollen bleibt erhalten. */
export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 50 }: Options) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null)
  return {
    onPointerDown(e: React.PointerEvent) {
      start.current = { x: e.clientX, y: e.clientY, t: Date.now() }
    },
    onPointerUp(e: React.PointerEvent) {
      const s = start.current
      start.current = null
      if (!s) return
      const dx = e.clientX - s.x
      const dy = e.clientY - s.y
      if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.5 || Date.now() - s.t > 800) return
      if (dx < 0) onSwipeLeft?.()
      else onSwipeRight?.()
    },
    onPointerCancel() {
      start.current = null
    },
  }
}
