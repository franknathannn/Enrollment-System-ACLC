import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function POST(req: NextRequest) {
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
        resolve(NextResponse.json(
          { error: errOutput || 'Python script exited with an error.' },
          { status: 500 }
        ))
        return
      }
      try {
        resolve(NextResponse.json(JSON.parse(output.trim())))
      } catch {
        resolve(NextResponse.json(
          { error: 'Failed to parse Python output.', raw: output },
          { status: 500 }
        ))
      }
    })

    py.on('error', () => {
      resolve(NextResponse.json(
        { error: 'Python not found. Make sure Python is installed and in PATH, then run: pip install numpy scikit-learn statsmodels' },
        { status: 503 }
      ))
    })
  })
}
