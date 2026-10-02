import { useRef, useState, type ReactNode } from 'react'
import { vibrate } from '../lib/util'

const REVEAL = 88
const AUTO_DELETE = 180

interface Props {
  children: ReactNode
  onDelete: () => void
  deleteLabel?: string
}

/** Listeneintrag: nach links wischen zeigt „Löschen“, weit wischen löscht direkt. */
export function SwipeableRow({ children, onDelete, deleteLabel = 'Löschen' }: Props) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ x: number; y: number; base: number; axis: 'x' | 'y' | null } | null>(null)
  const passedThreshold = useRef(false)
  const suppressClick = useRef(false)

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    suppressClick.current = false
    drag.current = { x: e.clientX, y: e.clientY, base: offset, axis: null }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (d.axis === 'x') {
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        setDragging(true)
      }
    }
    if (d.axis !== 'x') return
    const next = Math.min(0, d.base + dx)
    setOffset(next)
    const past = next < -AUTO_DELETE
    if (past !== passedThreshold.current) {
      passedThreshold.current = past
      vibrate(10)
    }
  }

  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    setDragging(false)
    if (!d || d.axis !== 'x') return
    suppressClick.current = true
    if (offset < -AUTO_DELETE) {
      setOffset(-window.innerWidth)
      window.setTimeout(onDelete, 180)
    } else {
      setOffset(offset < -REVEAL / 2 ? -REVEAL : 0)
    }
    passedThreshold.current = false
  }

  return (
    <div className="swipe-row">
      <button
        className="swipe-row__action"
        style={{ opacity: offset < 0 ? 1 : 0 }}
        onClick={onDelete}
        tabIndex={offset ? 0 : -1}
        aria-hidden={!offset}
      >
        {deleteLabel}
      </button>
      <div
        className="swipe-row__content"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : undefined,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          // Nach einer Wischgeste kein Tippen auslösen; ein offener Eintrag schließt sich beim Tippen.
          if (suppressClick.current) {
            suppressClick.current = false
            e.stopPropagation()
          } else if (offset !== 0) {
            e.stopPropagation()
            setOffset(0)
          }
        }}
      >
        {children}
      </div>
    </div>
  )
}
