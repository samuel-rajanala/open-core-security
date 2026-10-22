-- Private answer keys are never exposed to anon/authenticated database roles.
create table if not exists private.challenge_solutions (
  challenge_id uuid primary key references public.challenges(id) on delete cascade,
  flag text not null,
  walkthrough text not null,
  checklist jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
revoke all on table private.challenge_solutions from public, anon, authenticated;
grant all on table private.challenge_solutions to service_role;
