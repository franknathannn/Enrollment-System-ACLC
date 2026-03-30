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

    // Each portal uses its own storageKey so their sessions are independent
    const isAdminPath   = request.nextUrl.pathname.startsWith('/admin')
    const storageKey    = isAdminPath ? 'sb-aclc-admin-auth' : 'sb-aclc-teacher-auth'

    // Track cookies that need to be refreshed
    let refreshedCookies: { name: string; value: string; options: any }[] = []
    let response = NextResponse.next({ request })

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      auth: { storageKey },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Store refreshed cookies so we can apply them to ANY response (including redirects)
          refreshedCookies = cookiesToSet
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    })

    // IMPORTANT: Always call getUser() to refresh the session token.
    // This must happen BEFORE any auth checks so the refreshed cookies
    // are captured in `refreshedCookies`.
    const { data: { user } } = await supabase.auth.getUser()

    const url = request.nextUrl.clone()

    if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/teacher')) {
      const isAdmin     = url.pathname.startsWith('/admin')
      const loginPath   = isAdmin ? '/admin/login'     : '/teacher/login'
      const homePath    = isAdmin ? '/admin/dashboard' : '/teacher/dashboard'
      const isLoginPage = url.pathname === loginPath

      const role = user?.user_metadata?.role as string | undefined

      // For admin routes: any authenticated non-teacher user is an admin
      // For teacher routes: must have role === "teacher"
      const isAuthorized = isAdmin
        ? (!!user && role !== 'teacher')
        : (!!user && role === 'teacher')

      if (!isLoginPage && !isAuthorized) {
        const redirectResponse = NextResponse.redirect(new URL(loginPath, request.url))
        // CRITICAL: Apply refreshed cookies to redirect responses too.
        // Without this, the refreshed token is lost and the user gets logged out.
        refreshedCookies.forEach(({ name, value, options }) => {
          redirectResponse.cookies.set(name, value, options)
        })
        return redirectResponse
      }
      if (isLoginPage && isAuthorized) {
        const redirectResponse = NextResponse.redirect(new URL(homePath, request.url))
        refreshedCookies.forEach(({ name, value, options }) => {
          redirectResponse.cookies.set(name, value, options)
        })
        return redirectResponse
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
