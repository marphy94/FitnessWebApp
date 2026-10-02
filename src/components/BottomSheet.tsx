import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  open: boolean
  title?: string
  onClose: () => void
  children: ReactNode
}

/** Bottom-Sheet: schließt per Wischen nach unten, Tippen auf den Hintergrund oder Esc. */
export function BottomSheet({ open, title, onClose, children }: Props) {
  const [dy, setDy] = useState(0)
  const start = useRef<number | null>(null)

  useEffect(() => {
    if (!open) return
    setDy(0)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ transform: `translateY(${dy}px)`, transition: start.current === null ? undefined : 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sheet__grip"
          onPointerDown={(e) => {
            start.current = e.clientY
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => start.current !== null && setDy(Math.max(0, e.clientY - start.current))}
          onPointerUp={() => {
            start.current = null
            if (dy > 100) onClose()
            else setDy(0)
          }}
          onPointerCancel={() => {
            start.current = null
            setDy(0)
          }}
        >
          <span />
          {title && <h2>{title}</h2>}
        </div>
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  )
}
