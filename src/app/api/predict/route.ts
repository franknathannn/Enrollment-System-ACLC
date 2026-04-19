import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getAuthenticatedAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { storageKey: 'sb-aclc-admin-auth' },
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* read-only in route handler */ },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const role = (user.app_metadata?.role ?? user.user_metadata?.role) as string | undefined
  if (role === 'teacher' || role === 'student') return null
  return user
}

export async function POST(req: NextRequest) {
  const admin = await getAuthenticatedAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const scriptPath = path.join(process.cwd(), 'predict.py')

  return new Promise<NextResponse>((resolve) => {
    const py = spawn('python', [scriptPath, '--json'])
    let output    = ''
    let errOutput = ''

    py.stdin.write(JSON.stringify(body))
    py.stdin.end()

    py.stdout.on('data', (d: Buffer) => { output += d.toString() })
    py.stderr.on('data', (d: Buffer) => { errOutput += d.toString() })

    py.on('close', (code: number) => {
      if (code !== 0) {
        console.error('predict.py stderr:', errOutput)
        resolve(NextResponse.json(
          { error: 'Prediction script failed.' },
          { status: 500 }
        ))
        return
      }
      try {
        resolve(NextResponse.json(JSON.parse(output.trim())))
      } catch {
        resolve(NextResponse.json(
          { error: 'Failed to parse prediction output.' },
          { status: 500 }
        ))
      }
    })

    py.on('error', () => {
      resolve(NextResponse.json(
        { error: 'Prediction service unavailable.' },
        { status: 503 }
      ))
    })
  })
}
