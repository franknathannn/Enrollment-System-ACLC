"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, FlaskConical } from "lucide-react"
import { SimulationMode } from "../types"
import { toast } from "sonner"

interface Props {
  mode: SimulationMode
  setMode: (m: SimulationMode) => void
  simulationValue: number
  setSimulationValue: (v: number) => void
  currentRealValue: number
  isDarkMode: boolean
}

export function PredictionControlPanel({ mode, setMode, simulationValue, setSimulationValue, currentRealValue, isDarkMode }: Props) {
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val === '') {
      setSimulationValue(0)
      return
    }
    const parsed = parseInt(val)
    if (!isNaN(parsed)) {
      setSimulationValue(parsed)
    }
  }

  const handleBlur = () => {
    if (simulationValue <= 0) {
      toast.error("Simulation Error: Total enrollees cannot be empty or zero.")
    }
  }

  return (
    <div className={`flex flex-col md:flex-row items-end gap-4 p-4 rounded-xl shadow-sm border ring-1 transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800 ring-slate-800' : 'bg-white border-indigo-100 ring-indigo-50 shadow-indigo-100/50'}`}>
      
      <div className="space-y-2">
        <Label className={`text-[10px] uppercase font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Analysis Mode</Label>
        <Select value={mode} onValueChange={(v: any) => setMode(v)}>
          <SelectTrigger className={`w-[200px] font-semibold ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}>
            <SelectItem value="ongoing" className={`cursor-pointer ${isDarkMode ? 'focus:bg-slate-800 text-white' : 'focus:bg-slate-100 text-slate-900'}`}>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Monitoring
              </div>
            </SelectItem>
            <SelectItem value="ended" className={`cursor-pointer ${isDarkMode ? 'focus:bg-slate-800 text-white' : 'focus:bg-slate-100 text-slate-900'}`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-blue-500" />
                Enrollment Ended
              </div>
            </SelectItem>
            <SelectItem value="simulation" className={`cursor-pointer ${isDarkMode ? 'focus:bg-slate-800 text-white' : 'focus:bg-slate-100 text-slate-900'}`}>
              <div className="flex items-center gap-2">
                <FlaskConical className="w-3 h-3 text-purple-500" />
                Simulation / What-If
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === 'simulation' && (
        <div className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-300">
           <Label className="text-[10px] uppercase font-bold text-purple-500">Simulate Total Enrollees</Label>
           <div className="flex items-center gap-2">
             <Input 
                type="number" 
                // Fix: Show empty string if 0 so user doesn't see "01000"
                value={simulationValue === 0 ? '' : simulationValue}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder="Enter value..."
                className={`w-32 font-bold focus-visible:ring-purple-500 ${isDarkMode ? 'text-purple-400 border-purple-900/50 bg-slate-950 placeholder:text-purple-700' : 'text-purple-600 border-purple-200 bg-white placeholder:text-purple-300'}`}
             />
             <span className={`text-xs whitespace-nowrap ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                (Real: {currentRealValue})
             </span>
           </div>
        </div>
      )}
    </div>
  )
}