"use server"

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
