-- Teams are created with a one-time invite code. A user can belong to only one
-- team, and membership is immutable through the public API so historical points
-- cannot be reassigned by leaving/rejoining another team.
create extension if not exists pgcrypto;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 40),
  invite_code text not null unique default upper(encode(gen_random_bytes(5), 'hex')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  user_id uuid primary key references public.profiles(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  joined_at timestamptz not null default now()
);

create index if not exists team_members_team_id_idx on public.team_members(team_id);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

-- No direct table reads: invite codes and membership rows are returned only
-- through narrowly scoped RPCs, never through broad table SELECT grants.
revoke all on public.teams, public.team_members from anon, authenticated;

create or replace function public.create_team(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_team public.teams;
begin
  if v_user is null then raise exception 'Sign in to create a team.'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 40 then
    raise exception 'Team name must be between 2 and 40 characters.';
  end if;
  if exists (select 1 from public.team_members where user_id = v_user) then
    raise exception 'You already belong to a team. Membership cannot be changed by members.';
  end if;
  insert into public.teams(name, created_by)
  values (btrim(p_name), v_user) returning * into v_team;
  insert into public.team_members(user_id, team_id) values (v_user, v_team.id);
  return jsonb_build_object('id', v_team.id, 'name', v_team.name, 'invite_code', v_team.invite_code);
end;
$$;

create or replace function public.join_team(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_team public.teams;
begin
  if v_user is null then raise exception 'Sign in to join a team.'; end if;
  if exists (select 1 from public.team_members where user_id = v_user) then
    raise exception 'You already belong to a team. Membership cannot be changed by members.';
  end if;
  select * into v_team from public.teams
  where invite_code = upper(btrim(coalesce(p_invite_code, '')));
  if not found then raise exception 'That invite code is not valid.'; end if;
  insert into public.team_members(user_id, team_id) values (v_user, v_team.id);
  return jsonb_build_object('id', v_team.id, 'name', v_team.name);
end;
$$;

-- Only verified successful submissions contribute points. Failed attempts remain
-- visible to administrators but never affect either leaderboard.

create or replace function public.get_my_team()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $
  select jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'invite_code', t.invite_code,
    'joined_at', tm.joined_at
  )
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where tm.user_id = auth.uid()
  limit 1;
$;

create or replace function public.get_individual_leaderboard()
returns table (
  user_id uuid,
  display_name text,
  points bigint,
  solves bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, coalesce(p.display_name, 'Unnamed member'),
         coalesce(sum(s.points_awarded) filter (where s.is_correct), 0)::bigint,
         count(*) filter (where s.is_correct)::bigint
  from public.profiles p
  left join public.submissions s on s.user_id = p.id
  where p.role <> 'admin'
  group by p.id, p.display_name
  order by 3 desc, 4 desc, 2 asc
  limit 100;
$$;

create or replace function public.get_team_leaderboard()
returns table (
  team_id uuid,
  team_name text,
  points bigint,
  solves bigint,
  member_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.name,
         coalesce(sum(s.points_awarded) filter (where s.is_correct), 0)::bigint,
         count(*) filter (where s.is_correct)::bigint,
         count(distinct tm.user_id)::bigint
  from public.teams t
  left join public.team_members tm on tm.team_id = t.id
  left join public.submissions s on s.user_id = tm.user_id
  group by t.id, t.name
  order by 3 desc, 4 desc, 2 asc
  limit 100;
$$;

create or replace function public.get_admin_scoring_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Administrator access required.';
  end if;

  return jsonb_build_object(
    'individuals', coalesce((
      select jsonb_agg(to_jsonb(x)) from public.get_individual_leaderboard() x
    ), '[]'::jsonb),
    'teams', coalesce((
      select jsonb_agg(to_jsonb(x)) from public.get_team_leaderboard() x
    ), '[]'::jsonb),
    'attempts', (select count(*) from public.submissions),
    'correct_submissions', (select count(*) from public.submissions where is_correct),
    'team_memberships', (select count(*) from public.team_members)
  );
end;
$$;

revoke all on function public.create_team(text) from public, anon;\nrevoke all on function public.get_my_team() from public, anon;
revoke all on function public.join_team(text) from public, anon;
revoke all on function public.get_individual_leaderboard() from public, anon;
revoke all on function public.get_team_leaderboard() from public, anon;
revoke all on function public.get_admin_scoring_data() from public, anon;
grant execute on function public.create_team(text) to authenticated;\ngrant execute on function public.get_my_team() to authenticated;
grant execute on function public.join_team(text) to authenticated;
grant execute on function public.get_individual_leaderboard() to authenticated;
grant execute on function public.get_team_leaderboard() to authenticated;
grant execute on function public.get_admin_scoring_data() to authenticated;
