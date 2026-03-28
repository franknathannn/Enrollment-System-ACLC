/**
 * Shared student attendance QR: encode `studentId` (UUID), same visuals as status page.
 * Requires `window.QRCode` from qrcodejs (loaded by callers).
 */

export const STUDENT_ATTENDANCE_QR_THEMES = {
  dark: {
    bg:         "#0a0f1e",
    card:       "#0d1426",
    border:     "#1e3a6e",
    qrDark:     "#e2e8f0",
    qrLight:    "#0a0f1e",
    textPri:    "#f1f5f9",
    textSec:    "#475569",
    textAccent: "#38bdf8",
    badge:      "#0c2340",
    badgeText:  "#38bdf8",
    strip0:     "#1a3a7a",
    strip1:     "#0c1a3e",
  },
  light: {
    bg:         "#f0f4ff",
    card:       "#ffffff",
    border:     "#c7d7f8",
    qrDark:     "#0a0f1e",
    qrLight:    "#ffffff",
    textPri:    "#0f172a",
    textSec:    "#64748b",
    textAccent: "#1d4ed8",
    badge:      "#dbeafe",
    badgeText:  "#1d4ed8",
    strip0:     "#1d4ed8",
    strip1:     "#1e40af",
  },
} as const

export type StudentAttendanceQrThemeKey = keyof typeof STUDENT_ATTENDANCE_QR_THEMES

export function rrect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

/** Renders a QR encoding `studentId` into `container` (clears innerHTML first). */
export function generateStudentAttendanceQr(
  container: HTMLDivElement,
  studentId: string,
  size: number,
  theme: StudentAttendanceQrThemeKey,
  onDone: () => void,
) {
  container.innerHTML = ""
  const t = STUDENT_ATTENDANCE_QR_THEMES[theme]
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const QR = (window as any).QRCode as new (el: HTMLElement, opts: {
      text: string; width: number; height: number
      colorDark: string; colorLight: string; correctLevel: number
    }) => void
    new QR(container, {
      text: studentId,
      width: size,
      height: size,
      colorDark: t.qrDark,
      colorLight: t.qrLight,
      correctLevel: 2,
    })
    setTimeout(onDone, 50)
  } catch {
    onDone()
  }
}

export interface StudentAttendanceQrDownloadOpts {
  studentName: string
  lrn: string
  section?: string | null
}

/** High-res PNG canvas matching status `StudentQRCard` download. */
export function buildStudentAttendanceQrDownloadCanvas(
  theme: StudentAttendanceQrThemeKey,
  srcCanvas: HTMLCanvasElement,
  opts: StudentAttendanceQrDownloadOpts,
): Promise<HTMLCanvasElement> {
  const { studentName, lrn, section } = opts
  return new Promise(resolve => {
    const t = STUDENT_ATTENDANCE_QR_THEMES[theme]
    const W = 560, PAD = 36
    const HDR = 112, QR = 340
    const FTR = section ? 128 : 108
    const H = HDR + PAD + QR + PAD + FTR

    const out = document.createElement("canvas")
    out.width = W; out.height = H
    const ctx = out.getContext("2d")!

    ctx.fillStyle = t.bg; ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = theme === "dark" ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.04)"
    ctx.lineWidth = 1
    for (let x = 0; x < W; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y < H; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

    const hg = ctx.createLinearGradient(0, 0, W, HDR)
    hg.addColorStop(0, t.strip0); hg.addColorStop(1, t.strip1)
    ctx.fillStyle = hg; ctx.fillRect(0, 0, W, HDR)

    ctx.fillStyle = "rgba(255,255,255,0.055)"
    for (let gx = 14; gx < W; gx += 22)
      for (let gy = 12; gy < HDR; gy += 22) {
        ctx.beginPath(); ctx.arc(gx, gy, 1.8, 0, Math.PI * 2); ctx.fill()
      }

    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(0, HDR - 1, W, 1)

    const fade = ctx.createLinearGradient(0, H - 40, 0, H)
    fade.addColorStop(0, "transparent")
    fade.addColorStop(1, theme === "dark" ? "rgba(29,78,216,0.08)" : "rgba(29,78,216,0.06)")
    ctx.fillStyle = fade; ctx.fillRect(0, H - 40, W, 40)

    const LX = 42, LY = HDR / 2
    ctx.fillStyle = "rgba(255,255,255,0.12)"
    ctx.beginPath(); ctx.arc(LX, LY, 24, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.arc(LX, LY, 24, 0, Math.PI * 2); ctx.stroke()

    const drawTextAndResolve = () => {
      ctx.textAlign = "left"
      ctx.fillStyle = "#ffffff"
      ctx.font = `900 20px "Arial Black", Arial, sans-serif`
      ctx.fillText("AMA ACLC", LX + 36, LY - 4)
      ctx.fillStyle = "rgba(186,220,255,0.8)"
      ctx.font = `700 10px Arial, sans-serif`
      ctx.letterSpacing = "3px"
      ctx.fillText("NORTHBAY COLLEGE", LX + 36, LY + 13)
      ctx.letterSpacing = "0px"

      ctx.textAlign = "right"
      ctx.fillStyle = "rgba(255,255,255,0.28)"
      ctx.font = "700 8px Arial"
      ctx.fillText("STUDENT ATTENDANCE QR", W - 20, HDR - 14)

      const cardPad = 22
      const qrX = (W - QR) / 2
      const qrY = HDR + PAD

      ctx.fillStyle = t.card
      rrect(ctx, qrX - cardPad, qrY - cardPad, QR + cardPad * 2, QR + cardPad * 2, 26)
      ctx.fill()
      ctx.strokeStyle = t.border; ctx.lineWidth = 1.5
      rrect(ctx, qrX - cardPad, qrY - cardPad, QR + cardPad * 2, QR + cardPad * 2, 26)
      ctx.stroke()

      ctx.drawImage(srcCanvas, qrX, qrY, QR, QR)

      const CL = 28, CT = 3, accent = t.textAccent
      ctx.strokeStyle = accent; ctx.lineWidth = CT; ctx.lineCap = "round"
      const corners: [number, number, number, number][] = [
        [qrX, qrY, 1, 1], [qrX + QR, qrY, -1, 1],
        [qrX, qrY + QR, 1, -1], [qrX + QR, qrY + QR, -1, -1],
      ]
      corners.forEach(([cx, cy, dx, dy]) => {
        ctx.beginPath(); ctx.moveTo(cx, cy + dy * CL); ctx.lineTo(cx, cy); ctx.lineTo(cx + dx * CL, cy); ctx.stroke()
      })

      const fy = HDR + PAD + QR + PAD

      if (section) {
        const bw = 180, bh = 28, bx = (W - bw) / 2
        ctx.fillStyle = t.badge
        rrect(ctx, bx, fy, bw, bh, 14); ctx.fill()
        ctx.textAlign = "center"
        ctx.fillStyle = t.badgeText
        ctx.font = `900 10px "Arial Black", Arial`
        ctx.fillText(section.toUpperCase(), W / 2, fy + 19)
      }

      const ny = section ? fy + 46 : fy + 12
      ctx.textAlign = "center"
      ctx.fillStyle = t.textPri
      ctx.font = `900 16px "Arial Black", Arial`
      ctx.fillText(studentName.toUpperCase(), W / 2, ny)

      ctx.fillStyle = t.textSec
      ctx.font = "bold 12px Arial"
      ctx.fillText(`LRN: ${lrn}`, W / 2, ny + 22)

      ctx.strokeStyle = t.border; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(PAD, ny + 38); ctx.lineTo(W - PAD, ny + 38); ctx.stroke()

      ctx.fillStyle = t.textSec
      ctx.font = "600 9px Arial"
      ctx.fillText("Scan this QR for attendance  ·  Keep it private", W / 2, ny + 54)

      resolve(out)
    }

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      ctx.save()
      ctx.beginPath(); ctx.arc(LX, LY, 20, 0, Math.PI * 2); ctx.clip()
      ctx.drawImage(img, LX - 20, LY - 20, 40, 40)
      ctx.restore()
      drawTextAndResolve()
    }
    img.onerror = drawTextAndResolve
    img.src = "/logo-aclc.png"
  })
}
