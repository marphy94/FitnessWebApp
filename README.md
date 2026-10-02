# Trainingsplan – Fitness-Webapp

Eine einfache, mobil optimierte Webapp (React + TypeScript + Vite), um eigene Trainingspläne zu erstellen,
Trainings zu protokollieren und den Fortschritt der Gewichte über die Zeit zu verfolgen.

## Funktionen

- **Trainingspläne** – Übungen mit Sätzen, Wiederholungen, Gewicht und Pausenzeit anlegen, per Ziehen umsortieren.
- **Training** – Plan starten, Gewicht/Wiederholungen je Satz anpassen, Sätze abhaken, automatischer
  Pausen-Countdown (mit Vibration), Anzeige „Letztes Mal“, erreichte Gewichte optional in den Plan übernehmen.
- **Kalender** – Monatsansicht mit absolvierten (grün) und geplanten (orange) Trainingstagen,
  Trainings einplanen oder nachtragen, Statistiken (Trainings im Monat, Wochen in Folge).
- **Fortschritt** – Verlaufskurve des Höchstgewichts pro Übung, Zeitraumfilter, Bestwert, Veränderung und Verlaufstabelle.

### Unterstützte Gesten

| Geste | Wo |
| --- | --- |
| Nach links wischen → Löschen (mit „Rückgängig“) | Pläne, Übungen, Sätze, geplante Tage |
| Halten & ziehen am Griff ⋮⋮ | Übungen im Plan umsortieren |
| Horizontal wischen | Monatswechsel im Kalender |
| Bottom-Sheet nach unten wischen | Dialoge schließen |
| Finger über das Diagramm ziehen | Werte im Fortschrittsdiagramm ablesen |
| Zurück-Geste / Zurück-Taste | Navigation (Hash-Routing) |

Außerdem: große Touch-Ziele (≥ 44 px), Stepper für Zahlen, Dark Mode, als App installierbar (Web-App-Manifest).

## Entwicklung

```bash
npm install
npm run dev      # Entwicklungsserver
npm run build    # Typecheck + Produktions-Build
```

## Datenspeicherung

Ohne Konfiguration speichert die App alles lokal im Browser (`localStorage`).
Sobald Supabase konfiguriert ist, werden alle Daten pro Nutzer in Supabase gespeichert (mit Anmeldung per E-Mail/Passwort).

### Supabase einrichten

1. Schema anwenden: `supabase/migrations/20261002000000_init.sql`
   (z. B. `supabase db push` oder im SQL-Editor des Dashboards ausführen).
2. `.env.example` nach `.env` kopieren und `VITE_SUPABASE_URL` sowie `VITE_SUPABASE_ANON_KEY` eintragen.
3. App neu starten.

### Datenmodell

| Tabelle | Inhalt |
| --- | --- |
| `plans` | Trainingspläne |
| `plan_exercises` | Übungen eines Plans: Sätze, Wiederholungen, Gewicht, Pause (Soll) |
| `scheduled_days` | Im Kalender eingeplante Trainingstage |
| `workouts` | Absolvierte Trainingseinheiten mit Datum |
| `workout_exercises` | Übungen einer Einheit |
| `workout_sets` | Einzelne Sätze mit tatsächlichem Gewicht/Wiederholungen (Ist) |
| `exercise_progress` (View) | Höchstgewicht und Volumen pro Übung und Tag |

Alle Tabellen sind per Row Level Security auf den angemeldeten Nutzer beschränkt.
