"use client"

import { useState, useRef, useEffect } from "react"
import { Camera, CameraOff, ScanLine, AlertTriangle, Clock } from "lucide-react"
import { ScheduleRow } from "../types"
import { toast } from "sonner"

interface Props {
  dm: boolean
  onScan: (raw: string) => Promise<void>
  isScannerLive: boolean
  period: ScheduleRow
}

const fmtT = (t: string) => {
  if (!t) return ""
  const [h, m] = t.slice(0, 5).split(":").map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`
}

export function LiveMonitoringScanner({ dm, onScan, isScannerLive, period }: Props) {
  const [scanning, setScanning] = useState(false)
  const [camErr, setCamErr] = useState<string | null>(null)
  const [scannerClosed, setScannerClosed] = useState(false)
  const [isFrontCamera, setIsFrontCamera] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lockRef = useRef(false)
  const rafRef = useRef<number>(0)

  const textHead = dm ? "text-white" : "text-slate-900"
  const textSub = dm ? "text-slate-400" : "text-slate-500"

  const startCam = async (force = false) => {
    setScannerClosed(false)
    setCamErr(null)

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    try {
      let stream: MediaStream
      const constraintsPresets = [
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } } },
        { video: { facingMode: { ideal: "environment" } } },
        { video: { facingMode: { ideal: "user" } } },
      ]

      for (const constraints of constraintsPresets) {
        try { stream = await navigator.mediaDevices.getUserMedia(constraints); break } catch (e) { console.warn(`Constraint failed`, e) }
      }

      // @ts-ignore
      if (!stream) throw new Error("Could not start camera.")

      const track = stream.getVideoTracks()[0]
      const settings = track?.getSettings?.()
      setIsFrontCamera(settings?.facingMode === "user")

      streamRef.current = stream
      if (videoRef.current) { 
        videoRef.current.srcObject = stream
        videoRef.current.play() 
      }

      setScanning(true)
      lockRef.current = false
      tick()
    } catch (e: any) {
      setCamErr(`Failed to start camera: ${e.message}`)
    }
  }

  const stopCam = () => {
    clearTimeout(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    scanCanvasRef.current = null
    setScanning(false)
  }

  const tick = () => {
    rafRef.current = window.setTimeout(() => {
      const v = videoRef.current
      if (!v || v.readyState < 2) { tick(); return }

      if (!lockRef.current && window.jsQR) {
        if (!scanCanvasRef.current) scanCanvasRef.current = document.createElement("canvas")
        const sc = scanCanvasRef.current
        const scanW = Math.min(v.videoWidth, 480)
        const scanH = Math.round(v.videoHeight * (scanW / v.videoWidth))
        
        if (sc.width !== scanW || sc.height !== scanH) { sc.width = scanW; sc.height = scanH }
        const sctx = sc.getContext("2d", { willReadFrequently: true })
        
        if (sctx) {
          sctx.drawImage(v, 0, 0, scanW, scanH)
          const img = sctx.getImageData(0, 0, scanW, scanH)
          
          const code = window.jsQR(img.data, scanW, scanH, { inversionAttempts: "dontInvert" })
          
          if (code?.data) {
            lockRef.current = true
            onScan(code.data).finally(() => {
              setTimeout(() => { lockRef.current = false }, 2000)
            })
          }
        }
      }
      tick()
    }, 120) // ~8fps
  }

  useEffect(() => {
    if (!scanning || !isScannerLive) return
    const check = () => {
      const now = new Date()
      const [eh, em] = period.end_time.slice(0, 5).split(":").map(Number)
      if (now.getHours() * 60 + now.getMinutes() >= eh * 60 + em) {
        stopCam()
        setScannerClosed(true)
        toast.info(`Scanner closed — ${period.subject} ended`)
      }
    }
    const timer = setInterval(check, 30_000)
    return () => clearInterval(timer)
  }, [scanning, isScannerLive, period])

  useEffect(() => () => stopCam(), [])

  return (
    <div className="flex flex-col h-full bg-inherit text-inherit">
      
      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between ${dm ? "border-slate-800" : "border-slate-200"}`}>
        <div>
          <p className={`text-[10px] font-black uppercase tracking-widest ${textSub}`}>QR Scanner</p>
          <span className={`text-[9px] font-bold ${textHead}`}>Scanner is {scanning ? "Active" : "Off"}</span>
        </div>
        <button 
          onClick={scanning ? stopCam : () => startCam(scannerClosed)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all
            ${scanning
              ? "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20"
              : scannerClosed
                ? "bg-amber-500 text-white hover:bg-amber-600 shadow-md"
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-md"}`}>
          {scanning 
            ? <><CameraOff size={12} /> Stop</> 
            : scannerClosed 
              ? <><Camera size={12} /> Force Open</> 
              : <><Camera size={12} /> Start Scanner</>
          }
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 flex flex-col items-center justify-center relative bg-black rounded-b-3xl overflow-hidden">
        {camErr && (
          <div className="absolute top-4 left-4 right-4 z-10 rounded-xl border p-3 flex items-center gap-2 bg-red-500/10 border-red-500/20 backdrop-blur-md">
            <CameraOff size={14} className="text-red-500" />
            <p className="text-[10px] text-red-500 font-bold">{camErr}</p>
          </div>
        )}
        
        {scannerClosed && !scanning && (
          <div className="absolute top-4 left-4 right-4 z-10 rounded-xl border p-3 flex items-center justify-between gap-3 bg-amber-500/10 border-amber-500/20 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-amber-500 shrink-0" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-amber-500">Scanner Auto-Closed</p>
                <p className={`text-[9px] ${dm ? "text-amber-400/70" : "text-amber-700/70"}`}>
                  {period.subject} ended at {fmtT(period.end_time)}
                </p>
              </div>
            </div>
            <button onClick={() => startCam(true)}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-[8px] font-black uppercase tracking-wide hover:bg-amber-600 transition-colors">
              <Camera size={10} /> Force Open
            </button>
          </div>
        )}

        <video 
          ref={videoRef} 
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${scanning ? "opacity-100" : "opacity-0 absolute"}`} 
          muted playsInline
          style={isFrontCamera ? { transform: "scaleX(-1)" } : undefined}
        />

        {!scanning && (
          <div className="flex flex-col items-center gap-4 z-10">
            <div className="p-6 rounded-3xl border bg-white/5 border-white/10 backdrop-blur-md">
              <ScanLine size={48} className="text-white/40" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest text-white/40">Camera Off</p>
          </div>
        )}

        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="relative w-72 h-72">
              {[
                "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-xl",
                "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-xl",
                "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-xl",
                "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-xl",
              ].map((c, i) => (
                <div key={i} className={`absolute w-10 h-10 border-blue-400 ${c}`} />
              ))}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-blue-400/90"
                style={{ animation: "scanLine 2s ease-in-out infinite", boxShadow: "0 0 10px 3px rgba(96,165,250,0.7)" }} />
            </div>
          </div>
        )}
        
        {/* Helper text overlay */}
        {scanning && (
           <div className="absolute bottom-6 left-0 right-0 text-center z-10">
             <span className="bg-black/40 backdrop-blur-md border border-white/10 text-white px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase shadow-lg">
               Position QR In Frame
             </span>
           </div>
        )}
      </div>
    </div>
  )
}
