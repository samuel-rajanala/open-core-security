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

-- Service-role-only bridge for the Edge Function; browser roles cannot call this RPC.
create or replace function public.get_admin_challenge_solution(p_challenge_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'flag', s.flag,
    'walkthrough', s.walkthrough,
    'checklist', s.checklist
  )
  from private.challenge_solutions as s
  where s.challenge_id = p_challenge_id
  limit 1;
$$;
revoke all on function public.get_admin_challenge_solution(uuid) from public, anon, authenticated;
grant execute on function public.get_admin_challenge_solution(uuid) to service_role;
