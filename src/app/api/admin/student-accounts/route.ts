import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function getAuthenticatedAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { storageKey: "sb-aclc-admin-auth" },
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* read-only in route handler */ },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const role = (user.app_metadata?.role ?? user.user_metadata?.role) as string | undefined
  if (role === "teacher" || role === "student") return null
  return user
}

export async function POST(req: Request) {
  try {
    const admin = await getAuthenticatedAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { action, userId, payload } = body

    if (!action || !userId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    if (action === "deactivate" || action === "activate") {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { is_active: action === "activate" }
      })

      if (error) throw error

      // Optional: You can also update a public table or trigger a logout logic here
      // But logging out a user relies on checking `user_metadata.is_active` in client or middleware.

      return NextResponse.json({ success: true })
    }

    if (action === "reset_password_email") {
      const { email } = payload
      if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 })
      
      const { error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
      })

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === "force_reset_password") {
      const { newPassword } = payload
      if (!newPassword || newPassword.length < 6) return NextResponse.json({ error: "Invalid password" }, { status: 400 })
      
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      })

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })

  } catch (error: any) {
    console.error("Admin account action error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
