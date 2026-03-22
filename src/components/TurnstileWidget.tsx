"use client"

import { useEffect, useRef } from "react"

declare global {
  interface Window {
    turnstile: any
  }
}

interface Props {
  onVerify: (token: string) => void
  onExpire?: () => void
  theme?: "light" | "dark" | "auto"
}

export function TurnstileWidget({ onVerify, onExpire, theme = "auto" }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const rendered = useRef(false)

  useEffect(() => {
    if (rendered.current || !ref.current) return
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    if (!siteKey) return

    const doRender = () => {
      if (rendered.current || !ref.current) return
      rendered.current = true
      window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: onVerify,
        "expired-callback": onExpire ?? (() => {}),
        theme,
        appearance: "interaction-only",
      })
    }

    if (window.turnstile) {
      doRender()
    } else {
      const existing = document.querySelector('script[src*="turnstile"]')
      if (existing) {
        existing.addEventListener("load", doRender)
      } else {
        const script = document.createElement("script")
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
        script.async = true
        script.onload = doRender
        document.head.appendChild(script)
      }
    }
  }, []) // render once on mount only

  return <div ref={ref} />
}
