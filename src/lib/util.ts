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
