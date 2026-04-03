"use server"

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { headers } from "next/headers"

const AUTHORIZED_ADMIN_EMAILS = new Set([
  "adminaclc@edu.ph",
  "admission@edu.ph",
  "franknathan12@gmail.com",
])

export async function checkAdminEmail(email: string): Promise<boolean> {
  return AUTHORIZED_ADMIN_EMAILS.has(email.toLowerCase().trim())
}

export async function checkEnrollmentRateLimit(): Promise<boolean> {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return true // skip if Upstash not configured

  const rl = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    analytics: false,
  })

  const headersList = await headers()
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "anonymous"

  const { success } = await rl.limit(`enrollment:${ip}`)
  return success
}

export async function verifyTurnstile(token: string): Promise<boolean> {
  if (!token) return false
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    })
    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}
