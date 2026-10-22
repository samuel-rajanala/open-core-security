import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value.trim());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Server configuration is incomplete." }, 500);
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Sign in before submitting a flag." }, 401);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Your session is invalid. Sign in again." }, 401);

  let body: { challenge_id?: string; flag?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const challengeId = body.challenge_id;
  const submittedFlag = body.flag;
  if (typeof challengeId !== "string" || !/^[0-9a-f-]{36}$/i.test(challengeId)) {
    return json({ error: "A valid challenge is required." }, 400);
  }
  if (typeof submittedFlag !== "string" || submittedFlag.length < 1 || submittedFlag.length > 256) {
    return json({ error: "Enter a flag (maximum 256 characters)." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: challenge, error: challengeError } = await admin
    .from("challenges")
    .select("id, points")
    .eq("id", challengeId)
    .eq("is_published", true)
    .maybeSingle();
  if (challengeError) return json({ error: "Could not verify this challenge." }, 500);
  if (!challenge) return json({ error: "Challenge not found or not published." }, 404);

  const userId = authData.user.id;
  const { data: previousCorrect, error: previousError } = await admin
    .from("submissions")
    .select("id")
    .eq("user_id", userId)
    .eq("challenge_id", challengeId)
    .eq("is_correct", true)
    .limit(1);
  if (previousError) return json({ error: "Could not check your submission history." }, 500);
  if (previousCorrect?.length) return json({ correct: true, alreadySolved: true, pointsAwarded: 0 });

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("challenge_id", challengeId)
    .gte("submitted_at", since);
  if (countError) return json({ error: "Could not check submission limits." }, 500);
  if ((count ?? 0) >= 10) return json({ error: "Attempt limit reached. Try again in an hour." }, 429);

  const { data: stored, error: flagError } = await admin
    .schema("private")
    .from("challenge_flags")
    .select("flag_hash")
    .eq("challenge_id", challengeId)
    .maybeSingle();
  if (flagError) return json({ error: "Could not validate the flag." }, 500);
  if (!stored?.flag_hash) return json({ error: "This challenge is not ready for submissions yet." }, 503);

  const candidateHash = await sha256Hex(submittedFlag);
  const expectedHash = String(stored.flag_hash).trim().toLowerCase();
  const correct = /^[0-9a-f]{64}$/.test(expectedHash) && candidateHash === expectedHash;
  const pointsAwarded = correct ? Math.max(0, Number(challenge.points) || 0) : 0;

  const { error: insertError } = await admin.from("submissions").insert({
    user_id: userId,
    challenge_id: challengeId,
    is_correct: correct,
    points_awarded: pointsAwarded,
  });
  if (insertError) return json({ error: "Your attempt could not be recorded." }, 500);

  return json({
    correct,
    alreadySolved: false,
    pointsAwarded,
    message: correct ? "Correct flag. Challenge completed!" : "Not quite. Review the evidence and try again.",
  });
});
