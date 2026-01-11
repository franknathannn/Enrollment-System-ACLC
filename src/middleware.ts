// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
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
  matcher: [
    /*
     * Only run middleware on /admin routes
     * This prevents middleware from interfering with other routes like /, /enroll, /status
     * Using proper Next.js matcher pattern - matches all paths starting with /admin
     */
    '/admin/:path*',
  ],
}