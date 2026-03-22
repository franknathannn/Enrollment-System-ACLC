// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let ratelimit: Ratelimit | null = null

function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: false,
  })
  return ratelimit
}

const LOGIN_PATHS = ['/admin/login', '/teacher/login']

export async function middleware(request: NextRequest) {
  try {
    // Rate limit login page requests
    if (LOGIN_PATHS.includes(request.nextUrl.pathname)) {
      const rl = getRatelimit()
      if (rl) {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
          ?? request.headers.get('x-real-ip')
          ?? 'anonymous'
        const { success } = await rl.limit(`login:${ip}`)
        if (!success) {
          return new NextResponse(
            '<html><body style="font-family:sans-serif;text-align:center;padding:4rem"><h2>Too Many Attempts</h2><p>Please wait a moment before trying again.</p></body></html>',
            { status: 429, headers: { 'Content-Type': 'text/html' } }
          )
        }
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // If Supabase env vars are missing, allow request to proceed
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.next()
    }

    let response = NextResponse.next({
      request: { headers: request.headers },
    })

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { 
          return request.cookies.getAll() 
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    })

    // Only check auth for /admin routes
    const url = request.nextUrl.clone()
    
    if (url.pathname.startsWith('/admin')) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        const isLoginPage = url.pathname === '/admin/login'
        
        if (!isLoginPage && !user) {
          return NextResponse.redirect(new URL('/admin/login', request.url))
        }
        
        if (isLoginPage && user) {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url))
        }
      } catch (authError) {
        // If auth check fails, allow non-login admin routes to proceed
        // but redirect to login for protected routes
        const isLoginPage = url.pathname === '/admin/login'
        if (!isLoginPage) {
          return NextResponse.redirect(new URL('/admin/login', request.url))
        }
      }
    }

    return response
  } catch (error) {
    // If middleware fails completely, allow request to proceed
    // This prevents middleware from breaking the entire app
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*'],
}