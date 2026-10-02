export const uid = () => crypto.randomUUID()

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const today = () => toISODate(new Date())

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const dateFmt = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })
export const formatDate = (s: string) => dateFmt.format(parseISODate(s))

const shortFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' })
export const formatShortDate = (s: string) => shortFmt.format(parseISODate(s))

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export const formatWeight = (kg: number) =>
  `${kg.toLocaleString('de-DE', { maximumFractionDigits: 2 })} kg`

export const exerciseKey = (name: string) => name.trim().toLowerCase()

export function vibrate(pattern: number | number[]) {
  if ('vibrate' in navigator) navigator.vibrate(pattern)
}

/** Trainingsdauer als „m:ss“ bzw. „h:mm:ss“. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/** Dauer in Worten, z. B. „1 Std. 5 Min.“ */
export function formatMinutes(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(min / 60)
  return h ? `${h} Std. ${min % 60} Min.` : `${min} Min.`
}
