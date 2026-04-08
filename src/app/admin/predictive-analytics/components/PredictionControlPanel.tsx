"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FlaskConical, Layers, UserPlus, Settings2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Props {
  mode: string
  setMode: (m: any) => void
  isDarkMode: boolean
}

export function PredictionControlPanel({ mode, setMode, isDarkMode }: Props) {
  
  return (
    <div className={`relative overflow-hidden flex flex-col md:flex-row items-end gap-8 p-8 rounded-[2rem] shadow-2xl border transition-all duration-500 ${
      isDarkMode 
        ? 'bg-slate-900/80 border-slate-800/50 backdrop-blur-xl' 
        : 'bg-white/80 border-slate-100 backdrop-blur-xl shadow-slate-200/40'
    }`}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500 opacity-50" />
      
      <div className="space-y-4 flex-1">
        <div className="flex items-center gap-2">
          <Settings2 className={`w-3.5 h-3.5 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <Label className={`text-[10px] font-black uppercase tracking-[0.25em] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Analytical Perspective
          </Label>
        </div>
        
        <Select value={mode} onValueChange={(v: any) => setMode(v)}>
          <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger className={`w-full md:w-[320px] h-12 font-black rounded-2xl transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-slate-950/50 border-slate-800 text-white focus:ring-indigo-500/40 hover:border-indigo-500/30' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-indigo-500/20 shadow-sm hover:border-indigo-300'
              }`}>
                <SelectValue />
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white border-slate-800 p-2 rounded-lg shadow-xl"><p className="text-xs font-medium">Toggle between live stream data and hypothetical scenarios</p></TooltipContent>
          </Tooltip>
          </TooltipProvider>
          
          <SelectContent className={`rounded-2xl overflow-hidden shadow-2xl p-1 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'}`}>
            <SelectItem value="live_enrolled" className="rounded-xl cursor-pointer py-3 focus:bg-emerald-500/10">
              <div className="flex items-center gap-3">
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                </div>
                <span className="font-bold tracking-tight">Live Enrolled</span>
              </div>
            </SelectItem>
            <SelectItem value="live_enrollees" className="rounded-xl cursor-pointer py-3 focus:bg-blue-500/10">
              <div className="flex items-center gap-3">
                <UserPlus className="w-4 h-4 text-blue-500" />
                <span className="font-bold tracking-tight">Live Enrollees</span>
              </div>
            </SelectItem>
            <SelectItem value="live_full" className="rounded-xl cursor-pointer py-3 focus:bg-indigo-500/10">
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span className="font-bold tracking-tight">Full Data</span>
              </div>
            </SelectItem>
            <SelectItem value="simulation" className="rounded-xl cursor-pointer py-3 focus:bg-purple-500/10">
              <div className="flex items-center gap-3">
                <FlaskConical className="w-4 h-4 text-purple-500" />
                <span className="font-bold tracking-tight">Simulation / What If</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

    </div>
  )
}