import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { SnackbarProvider } from './components/Snackbar'
import { TabBar, type TabId } from './components/TabBar'
import { DataProvider, useData } from './data/DataContext'
import { localStore } from './data/localStore'
import { createSupabaseStore } from './data/supabaseStore'
import { useHashRoute } from './hooks/useHashRoute'
import { supabase } from './lib/supabase'
import { AuthPage } from './pages/AuthPage'
import { CalendarPage } from './pages/CalendarPage'
import { PlanEditorPage } from './pages/PlanEditorPage'
import { PlansPage } from './pages/PlansPage'
import { ProgressPage } from './pages/ProgressPage'
import { WorkoutPage } from './pages/WorkoutPage'

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  const store = useMemo(() => (supabase && userId ? createSupabaseStore(supabase) : localStore), [userId])

  if (supabase && session === undefined) return <Splash />
  if (supabase && !session) return <AuthPage db={supabase} />

  return (
    <SnackbarProvider>
      <DataProvider key={userId ?? 'local'} store={store}>
        <Shell />
      </DataProvider>
    </SnackbarProvider>
  )
}

function Splash() {
  return (
    <div className="splash" aria-busy="true">
      <img src="/icon.svg" alt="" width={56} height={56} />
    </div>
  )
}

function Shell() {
  const { loading, error, dismissError, store } = useData()
  const [section, id] = useHashRoute()

  if (loading) return <Splash />

  let page: React.ReactNode
  let tab: TabId | null = null
  if (section === 'plans' && id) page = <PlanEditorPage key={id} planId={id} />
  else if (section === 'workout' && id) page = <WorkoutPage key={id} workoutId={id} />
  else if (section === 'calendar') {
    page = <CalendarPage />
    tab = 'calendar'
  } else if (section === 'progress') {
    page = <ProgressPage />
    tab = 'progress'
  } else {
    page = <PlansPage />
    tab = 'plans'
  }

  return (
    <div className={tab ? 'app has-tabbar' : 'app'}>
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button onClick={dismissError} aria-label="Schließen">
            ×
          </button>
        </div>
      )}
      {page}
      {tab && <TabBar active={tab} />}
      {tab && store.kind === 'supabase' && supabase && (
        <button className="signout" onClick={() => supabase!.auth.signOut()}>
          Abmelden
        </button>
      )}
    </div>
  )
}
