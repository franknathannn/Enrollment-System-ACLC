// supabase/functions/_shared/cors.ts
const PRODUCTION_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "https://sms-aclc-northbay.vercel.app"

export function getCorsHeaders(req?: Request) {
  const origin = req?.headers.get("origin") || ""
  const isAllowed = 
    origin === "http://localhost:3000" || 
    origin === PRODUCTION_ORIGIN ||
    origin.endsWith(".vercel.app")
  
  const allowedOrigin = isAllowed ? origin : PRODUCTION_ORIGIN
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }
}

// Static fallback for backward compat
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}