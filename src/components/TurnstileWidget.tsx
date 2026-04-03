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
  const widgetId = useRef<string | undefined>(undefined)

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    if (!siteKey || rendered.current || !ref.current) return

    const tryRender = () => {
      if (rendered.current || !ref.current || !window.turnstile) return
      rendered.current = true
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: onVerify,
        "expired-callback": onExpire ?? (() => {}),
        theme,
        appearance: "always",
      })
    }

    if (window.turnstile) {
      tryRender()
      return
    }

    // Load script if not already loading
    if (!document.querySelector('script[src*="turnstile"]')) {
      const script = document.createElement("script")
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
      script.async = true
      document.head.appendChild(script)
    }

    // Poll until turnstile is ready — more reliable than onload in production
    const interval = setInterval(() => {
      if (window.turnstile) {
        clearInterval(interval)
        tryRender()
      }
    }, 100)

    return () => {
      clearInterval(interval)
      if (widgetId.current !== undefined && window.turnstile) {
        window.turnstile.remove(widgetId.current)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={ref} />
}
