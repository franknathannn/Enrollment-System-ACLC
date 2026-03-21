// supabase/functions/check-status/index.ts
//
// Deploy with:
//   supabase functions deploy check-status
//
// This Edge Function replaces the direct Supabase client query on the
// status page. It enforces a rate limit of 10 attempts per IP per hour
// using an in-memory store (resets on cold start — good enough for abuse
// prevention without needing Redis/Upstash).
//
// For persistent rate limiting across cold starts, swap the in-memory
// rateMap for an Upstash Redis call (see commented section at the bottom).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

// ── In-memory rate limit store ──────────────────────────────────────────────
// Key: IP address  →  { count: number; windowStart: ms timestamp }
const rateMap = new Map<string, { count: number; windowStart: number }>()

const RATE_LIMIT   = 10          // max attempts
const WINDOW_MS    = 60 * 60 * 1000  // 1 hour window

function isRateLimited(ip: string): boolean {
  const now  = Date.now()
  const entry = rateMap.get(ip)

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    // New window
    rateMap.set(ip, { count: 1, windowStart: now })
    return false
  }

  if (entry.count >= RATE_LIMIT) return true

  entry.count++
  return false
}

function remainingAttempts(ip: string): number {
  const entry = rateMap.get(ip)
  if (!entry) return RATE_LIMIT
  return Math.max(0, RATE_LIMIT - entry.count)
}

// ── Handler ─────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders })
  }

  // Get client IP — Supabase forwards it in x-forwarded-for
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"

  // ── Rate limit check ────────────────────────────────────────────────────
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({
        error: "Too many attempts. Please wait 1 hour before trying again.",
        rateLimited: true,
      }),
      {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }

  // ── Parse + validate body ───────────────────────────────────────────────
  let body: { lrn?: string; lastName?: string; trackingId?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  const { lrn, lastName, trackingId } = body

  if (!lrn || !lastName || !trackingId) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: lrn, lastName, trackingId." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  // Basic LRN sanity check (12 digits)
  if (!/^\d{12}$/.test(lrn)) {
    return new Response(
      JSON.stringify({ error: "LRN must be exactly 12 digits." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  // ── Supabase query — service role, only whitelisted columns ────────────
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const { data, error } = await supabase
    .from("students")
    .select(`
      id, lrn, first_name, last_name, middle_name,
      strand, grade_level, status, section, school_year,
      registrar_feedback, decline_reason, is_locked,
      sections!students_section_id_fkey(section_name)
    `)
    .eq("lrn", lrn)
    .ilike("last_name", lastName)
    .single()

  if (error || !data) {
    // Don't reveal whether it was a DB error or no record — same response either way
    return new Response(
      JSON.stringify({ data: null, remaining: remainingAttempts(ip) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  // ── Verify tracking ID (first UUID segment) ─────────────────────────────
  const firstSegment = data.id.split("-")[0]
  if (firstSegment.toLowerCase() !== trackingId.toLowerCase()) {
    return new Response(
      JSON.stringify({ data: null, remaining: remainingAttempts(ip) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  // ── Success ─────────────────────────────────────────────────────────────
  return new Response(
    JSON.stringify({ data, remaining: remainingAttempts(ip) }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  )
})

// ── Optional: Upstash Redis persistent rate limiting ────────────────────────
// If you want rate limits to survive Edge Function cold starts, replace the
// isRateLimited() call above with this pattern:
//
// import { Redis } from "https://esm.sh/@upstash/redis"
// const redis = new Redis({
//   url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
//   token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
// })
//
// async function checkRateLimit(ip: string): Promise<boolean> {
//   const key = `rl:status:${ip}`
//   const count = await redis.incr(key)
//   if (count === 1) await redis.expire(key, 3600) // 1 hour TTL
//   return count > RATE_LIMIT
// }