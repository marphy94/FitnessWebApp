-- Fitness-Trainingsplan: Grundschema
-- Alle Tabellen sind per Row Level Security auf den eingeloggten Nutzer beschränkt.

-- Trainingspläne
create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Übungen eines Plans (Soll-Werte)
create table public.plan_exercises (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid not null references public.plans (id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position      int  not null default 0,
  name          text not null,
  sets          int  not null default 3 check (sets > 0),
  reps          int  not null default 10 check (reps >= 0),
  weight        numeric(6,2) not null default 0 check (weight >= 0),
  rest_seconds  int  not null default 90 check (rest_seconds >= 0)
);
create index plan_exercises_plan_id_idx on public.plan_exercises (plan_id, position);

-- Eingeplante Trainingstage im Kalender
create table public.scheduled_days (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date        date not null,
  plan_id     uuid references public.plans (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index scheduled_days_user_date_idx on public.scheduled_days (user_id, date);

-- Absolvierte (oder laufende) Trainingseinheiten
create table public.workouts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_id      uuid references public.plans (id) on delete set null,
  plan_name    text not null,
  date         date not null,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz
);
create index workouts_user_date_idx on public.workouts (user_id, date);

-- Übungen innerhalb einer Trainingseinheit
create table public.workout_exercises (
  id            uuid primary key default gen_random_uuid(),
  workout_id    uuid not null references public.workouts (id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position      int  not null default 0,
  name          text not null,
  rest_seconds  int  not null default 90
);
create index workout_exercises_workout_id_idx on public.workout_exercises (workout_id, position);

-- Einzelne Sätze (Ist-Werte) – Grundlage für die Fortschrittskurve
create table public.workout_sets (
  id                   uuid primary key default gen_random_uuid(),
  workout_exercise_id  uuid not null references public.workout_exercises (id) on delete cascade,
  user_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  set_number           int  not null,
  reps                 int  not null default 0,
  weight               numeric(6,2) not null default 0,
  done                 boolean not null default false
);
create index workout_sets_exercise_idx on public.workout_sets (workout_exercise_id, set_number);

-- Fortschritt: höchstes Gewicht pro Übung und Trainingstag
create view public.exercise_progress
with (security_invoker = true) as
select
  w.user_id,
  lower(trim(we.name)) as exercise_key,
  we.name              as exercise_name,
  w.date,
  max(s.weight)        as max_weight,
  sum(s.weight * s.reps) as volume
from public.workouts w
join public.workout_exercises we on we.workout_id = w.id
join public.workout_sets s       on s.workout_exercise_id = we.id
where s.done
group by w.user_id, lower(trim(we.name)), we.name, w.date;

-- Row Level Security
alter table public.plans             enable row level security;
alter table public.plan_exercises    enable row level security;
alter table public.scheduled_days    enable row level security;
alter table public.workouts          enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets      enable row level security;

do $$
declare t text;
begin
  foreach t in array array['plans','plan_exercises','scheduled_days','workouts','workout_exercises','workout_sets']
  loop
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;
