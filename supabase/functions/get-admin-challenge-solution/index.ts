import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Server configuration is incomplete." }, 500);
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Sign in required." }, 401);
  const auth = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await auth.auth.getUser();
  if (authError || !authData.user) return json({ error: "Your session is invalid. Sign in again." }, 401);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await admin.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
  if (profileError) return json({ error: "Could not verify administrator access." }, 500);
  if (profile?.role !== "admin") return json({ error: "Administrator access required." }, 403);
  let body: { challenge_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request body." }, 400); }
  if (typeof body.challenge_id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.challenge_id)) return json({ error: "A valid challenge is required." }, 400);
  const { data: solution, error } = await admin.rpc("get_admin_challenge_solution", { p_challenge_id: body.challenge_id });
  if (error) return json({ error: "Could not load the protected answer key." }, 500);
  if (!solution) return json({ error: "No answer key has been seeded for this challenge yet." }, 404);
  return json({ solution });
});
