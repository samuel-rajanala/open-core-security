-- Allow the Edge Function's service-role client to read a challenge hash
-- without exposing the private schema through the public REST API.
create or replace function public.get_challenge_flag_hash(p_challenge_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select cf.flag_hash
  from private.challenge_flags as cf
  where cf.challenge_id = p_challenge_id
  limit 1;
$$;

revoke all on function public.get_challenge_flag_hash(uuid) from public, anon, authenticated;
grant execute on function public.get_challenge_flag_hash(uuid) to service_role;
