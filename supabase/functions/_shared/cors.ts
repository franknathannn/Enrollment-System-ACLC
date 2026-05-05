// supabase/functions/_shared/cors.ts
const PRODUCTION_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "https://enrollment-system-aclc.vercel.app"
const ALLOWED_ORIGINS = [PRODUCTION_ORIGIN, "http://localhost:3000"]

export function getCorsHeaders(req?: Request) {
  const origin = req?.headers.get("origin") || ""
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : PRODUCTION_ORIGIN
  return {
    "Access-Control-Allow-Origin":  allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }
}

// Static fallback for backward compat
export const corsHeaders = {
    "Access-Control-Allow-Origin":  PRODUCTION_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }