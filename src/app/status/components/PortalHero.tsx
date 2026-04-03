// app/status/components/PortalHero.tsx

import Image from "next/image"
import { Orbit } from "lucide-react"

export function PortalHero({ schoolYear }: { schoolYear: string }) {
  return (
    <div className="text-center space-y-6 relative group">
      <div className="relative inline-flex items-center justify-center w-32 h-32">
        {/* Ambient glow */}
        <div className="absolute w-32 h-32 bg-blue-600/20 blur-3xl animate-pulse rounded-full" />
        {/* Gradient ring */}
        <div className="absolute w-24 h-24 rounded-[36px] bg-gradient-to-br from-blue-600/40 to-violet-600/20 blur-sm" />
        {/* Orbit ring — fully visible now */}
        <Orbit
          size={108}
          className="absolute text-blue-700/40 animate-spin pointer-events-none"
          style={{ animationDuration: "8s" }}
        />
        {/* Logo card */}
        <div className="relative z-10 w-20 h-20 rounded-[28px] shadow-2xl shadow-blue-500/20 flex items-center justify-center border border-white/10 overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,58,138,0.3) 100%)" }}
        >
          <Image
            src="/logo-aclc.png"
            alt="ACLC Logo"
            width={56}
            height={56}
            className="object-contain drop-shadow-[0_0_8px_rgba(96,165,250,0.4)]"
          />
        </div>
      </div>
      <div className="space-y-2 relative z-10">
        <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic leading-none">
          Portal Status
        </h1>
        <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[9px]">
          Authentication Cycle S.Y. {schoolYear}
        </p>
      </div>
    </div>
  )
}