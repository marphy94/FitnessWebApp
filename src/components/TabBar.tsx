import { navigate } from '../hooks/useHashRoute'

const TABS = [
  { id: 'plans', label: 'Pläne', icon: 'M4 6h16M4 12h16M4 18h10' },
  { id: 'calendar', label: 'Kalender', icon: 'M5 5h14v15H5zM5 10h14M9 3v4M15 3v4' },
  { id: 'progress', label: 'Fortschritt', icon: 'M4 19l5-6 4 3 7-9M15 7h5v5' },
] as const

export type TabId = (typeof TABS)[number]['id']

export function TabBar({ active }: { active: TabId }) {
  return (
    <nav className="tabbar" aria-label="Hauptnavigation">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={t.id === active ? 'tabbar__item is-active' : 'tabbar__item'}
          aria-current={t.id === active ? 'page' : undefined}
          onClick={() => navigate(t.id, { replace: true })}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={t.icon} />
          </svg>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
