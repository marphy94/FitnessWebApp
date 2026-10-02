import { SwipeableRow } from '../components/SwipeableRow'
import { useSnackbar } from '../components/Snackbar'
import { useData } from '../data/DataContext'
import { navigate } from '../hooks/useHashRoute'
import { startWorkout } from '../lib/workouts'
import { formatDate, uid } from '../lib/util'

export function PlansPage() {
  const data = useData()
  const snackbar = useSnackbar()
  const running = data.workouts.find((w) => !w.finishedAt)

  return (
    <main className="page">
      <header className="page__header">
        <h1>Trainingspläne</h1>
      </header>

      {running && (
        <button className="banner" onClick={() => navigate(`workout/${running.id}`)}>
          <span>
            <strong>Training läuft</strong>
            {running.planName} · {formatDate(running.date)}
          </span>
          <span aria-hidden="true">›</span>
        </button>
      )}

      {data.plans.length === 0 ? (
        <div className="empty">
          <p>Noch kein Trainingsplan.</p>
          <p className="muted">Lege deinen ersten Plan mit Übungen, Gewichten, Sätzen und Pausen an.</p>
        </div>
      ) : (
        <ul className="list">
          {data.plans.map((plan) => (
            <li key={plan.id}>
              <SwipeableRow
                onDelete={() => {
                  data.deletePlan(plan.id)
                  snackbar({
                    text: `„${plan.name}“ gelöscht`,
                    actionLabel: 'Rückgängig',
                    onAction: () => data.savePlan(plan),
                  })
                }}
              >
                <div className="card plan-card">
                  <button className="plan-card__main" onClick={() => navigate(`plans/${plan.id}`)}>
                    <strong>{plan.name}</strong>
                    <span className="muted">
                      {plan.exercises.length} {plan.exercises.length === 1 ? 'Übung' : 'Übungen'}
                      {plan.exercises.length > 0 && ` · ${plan.exercises.map((e) => e.name).slice(0, 3).join(', ')}`}
                      {plan.exercises.length > 3 && ' …'}
                    </span>
                  </button>
                  <button
                    className="btn btn--primary btn--small"
                    disabled={plan.exercises.length === 0}
                    onClick={() => navigate(`workout/${startWorkout(data, plan).id}`)}
                  >
                    Start
                  </button>
                </div>
              </SwipeableRow>
            </li>
          ))}
        </ul>
      )}

      {data.plans.length > 0 && <p className="hint">Tipp: Zum Löschen nach links wischen.</p>}

      <button className="fab" aria-label="Neuer Plan" onClick={() => navigate(`plans/${uid()}`)}>
        +
      </button>
    </main>
  )
}
