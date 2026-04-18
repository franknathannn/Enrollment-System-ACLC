import { useState, useMemo } from "react"
import { Users, BookOpen, Trash2, Check, ChevronsUpDown, Replace, ArrowRightLeft, Sparkles, UserMinus, GraduationCap, Library } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SUBJECT_COLORS } from "./ScheduleGrid"
import type { ScheduleRow } from "./types"
import type { TeacherOption } from "./ScheduleEntryForm"
import { cn } from "@/lib/utils"

interface ScheduleTeacherManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedules: ScheduleRow[]
  teachers: TeacherOption[]
  isDarkMode: boolean
  isICT: boolean
  onMassUpdate: (ids: string[], data: { teacher: string | null; teacher_id: string | null }) => Promise<void>
}

type GroupByMode = "teacher" | "subject"

function getInitials(name: string) {
  if (!name) return "?"
  const words = name.split(/\s+/)
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase()
  return words.map(w => w[0]).join('').toUpperCase().substring(0, 3)
}

function TeacherPicker({
  value,
  onSelect,
  teachers,
  excludeTeacherIds = [],
  currentLabel,
  isDarkMode,
  isICT
}: {
  value: string | null,
  onSelect: (teacherId: string | null) => void,
  teachers: TeacherOption[],
  excludeTeacherIds?: string[],
  currentLabel?: string,
  isDarkMode: boolean,
  isICT: boolean
}) {
  const selectedTeacher = teachers.find(t => t.id === value)
  
  return (
    <div className="w-full">
      <Select value={value || ""} onValueChange={(val) => onSelect(val === "unassigned" ? null : val)}>
        <SelectTrigger className={cn(
          "w-full md:w-[240px] h-10 md:h-9 text-xs rounded-xl transition-all border outline-none focus:ring-0",
          isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-300 text-slate-800",
          !value && "text-slate-500 opacity-80"
        )}>
        <SelectValue placeholder={
          <span className="flex items-center gap-2">
            <ArrowRightLeft size={12} className="opacity-50" />
            {currentLabel ? `Replace ${currentLabel}...` : "Select Replacement..."}
          </span>
        }>
          {value === "unassigned" ? (
            "Unassigned (TBA)"
          ) : selectedTeacher ? (
            <div className="flex items-center gap-2 truncate">
              {selectedTeacher.avatar_url ? (
                <img src={selectedTeacher.avatar_url} className="w-5 h-5 rounded-full object-cover" alt="" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[8px] font-bold text-white shadow-sm">
                  {getInitials(selectedTeacher.full_name)}
                </div>
              )}
              <span className="truncate">{selectedTeacher.full_name}</span>
            </div>
          ) : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className={cn("rounded-xl max-h-64 shadow-xl", isDarkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200")}>
        {!excludeTeacherIds.includes("unassigned") && (
          <SelectItem value="unassigned" className="text-xs cursor-pointer font-medium text-red-500 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30">
            <div className="flex items-center gap-2 pr-4">
              <UserMinus size={13} />
              Set as Unassigned (TBA)
            </div>
          </SelectItem>
        )}
        {teachers.filter(t => !excludeTeacherIds.includes(t.id)).map((teacher) => (
          <SelectItem
            key={teacher.id}
            value={teacher.id}
            className="text-xs cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate pr-4">
              {teacher.avatar_url ? (
                <img src={teacher.avatar_url} className="w-5 h-5 rounded-full object-cover shadow-sm" alt="" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-500 flex items-center justify-center text-[8px] font-bold text-white shadow-sm">
                  {getInitials(teacher.full_name)}
                </div>
              )}
              <span className="truncate">{teacher.full_name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    </div>
  )
}

export function ScheduleTeacherManager({
  open,
  onOpenChange,
  schedules,
  teachers,
  isDarkMode,
  isICT,
  onMassUpdate
}: ScheduleTeacherManagerProps) {
  const [mode, setMode] = useState<GroupByMode>("teacher")

  // Local state for picked replacement teacher (per group key)
  const [replacementTeacherId, setReplacementTeacherId] = useState<Record<string, string | null>>({})
  const [isUpdating, setIsUpdating] = useState(false)

  // Groupings
  const groups = useMemo(() => {
    if (mode === "teacher") {
      const g: Record<string, ScheduleRow[]> = {}
      schedules.forEach(s => {
        const key = s.teacher_id || "unassigned"
        if (!g[key]) g[key] = []
        g[key].push(s)
      })
      return g
    } else {
      const g: Record<string, ScheduleRow[]> = {}
      schedules.forEach(s => {
        const key = s.subject
        if (!g[key]) g[key] = []
        g[key].push(s)
      })
      return g
    }
  }, [schedules, mode])

  const subjectColorMap = useMemo(() => {
    const unique = [...new Set(schedules.map(s => s.subject))]
    return Object.fromEntries(unique.map((sub, i) => [sub, SUBJECT_COLORS[i % SUBJECT_COLORS.length]]))
  }, [schedules])

  const handleUpdate = async (groupKey: string, isClear: boolean = false) => {
    try {
      setIsUpdating(true)
      const targetSchedules = groups[groupKey]
      const ids = targetSchedules.map(s => s.id)

      if (isClear) {
        await onMassUpdate(ids, { teacher: null, teacher_id: null })
        setReplacementTeacherId(prev => ({ ...prev, [groupKey]: "unassigned" }))
      } else {
        const selectedId = replacementTeacherId[groupKey]
        if (!selectedId || selectedId === "unassigned") {
          // treat as clear if null
          await onMassUpdate(ids, { teacher: null, teacher_id: null })
        } else {
          const matched = teachers.find(t => t.id === selectedId)
          await onMassUpdate(ids, { teacher: matched?.full_name || null, teacher_id: matched?.id || null })
        }
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const bgClass = isDarkMode ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"
  const itemBg = isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
  const accentText = isICT ? "text-blue-500" : "text-orange-500"
  const accentBg = isICT ? "bg-blue-600 hover:bg-blue-700" : "bg-orange-600 hover:bg-orange-700"
  const accentLight = isICT ? "bg-blue-500/10 text-blue-400" : "bg-orange-500/10 text-orange-400"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-3xl w-[95vw] md:w-full max-h-[92vh] md:max-h-[85vh] overflow-hidden flex flex-col p-0 rounded-2xl md:rounded-3xl", bgClass)}>
        <DialogHeader className={cn("p-4 md:p-6 pb-4 border-b", isDarkMode ? "border-slate-800" : "border-slate-200")}>
          <div className="flex flex-col md:flex-row md:items-center justify-between mt-2 gap-4">
            <div>
              <DialogTitle className={cn("text-lg md:text-xl font-black uppercase tracking-widest flex items-center gap-2", isDarkMode ? "text-slate-100" : "text-slate-900")}>
                <Users className={accentText} size={20} /> Manage Teachers
              </DialogTitle>
              <DialogDescription className={cn("text-[11px] md:text-xs tracking-wider mt-1", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Bulk replace or clear teacher assignments for this section only.
              </DialogDescription>
            </div>
            <div className={cn("flex items-center p-1 rounded-xl border w-full md:w-auto", isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200")}>
              <button
                onClick={() => setMode("teacher")}
                className={cn("flex-1 md:flex-none px-4 py-2 md:py-1.5 rounded-lg text-[11px] md:text-xs font-bold transition-all", mode === "teacher" ? cn(accentLight, "shadow-sm") : "opacity-50 hover:opacity-100")}
              >
                By Teacher
              </button>
              <button
                onClick={() => setMode("subject")}
                className={cn("flex-1 md:flex-none px-4 py-2 md:py-1.5 rounded-lg text-[11px] md:text-xs font-bold transition-all", mode === "subject" ? cn(accentLight, "shadow-sm") : "opacity-50 hover:opacity-100")}
              >
                By Subject
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
          {Object.entries(groups).length === 0 && (
            <div className="h-32 flex items-center justify-center text-sm opacity-50 font-bold uppercase">
              No schedules found.
            </div>
          )}

          {Object.entries(groups).map(([key, rows]) => {
            let label = key
            let subLabel = ""
            let avatar = null
            
            if (mode === "teacher") {
              if (key === "unassigned") {
                label = "Unassigned (TBA)"
              } else {
                const t = teachers.find(x => x.id === key)
                label = t?.full_name || "Unknown Teacher"
                avatar = t?.avatar_url
              }
              subLabel = `${rows.length} block${rows.length !== 1 ? 's' : ''}`
            } else {
              label = key
              subLabel = `${rows.length} occurrence${rows.length !== 1 ? 's' : ''}`
            }

            const defaultTeacherId = mode === "subject" ? (rows[0]?.teacher_id || "unassigned") : (key === "unassigned" ? "unassigned" : key)
            const currentValue = replacementTeacherId[key] !== undefined ? replacementTeacherId[key] : defaultTeacherId
            const isChanged = currentValue !== defaultTeacherId

            let rowBgClass = itemBg
            let iconTextClass = isDarkMode ? "text-slate-300" : "text-slate-700"
            let iconBgClass = isDarkMode ? "bg-slate-800" : "bg-slate-200"

            if (mode === "subject") {
              const colorTheme = subjectColorMap[key]
              if (colorTheme) {
                rowBgClass = cn(colorTheme.bg, colorTheme.border, isDarkMode ? "bg-opacity-20" : "")
                iconTextClass = colorTheme.text
                iconBgClass = isDarkMode ? "bg-slate-900 border border-slate-700" : "bg-white border border-slate-200 shadow-sm"
              }
            }

            return (
              <div key={key} className={cn("rounded-2xl border p-4 md:p-5 flex flex-col md:flex-row gap-4 md:gap-5 md:items-start justify-between", rowBgClass)}>
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {mode === "teacher" && key !== "unassigned" && (
                      <div className="relative">
                        {avatar ? (
                          <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover shadow-md border-2 border-transparent ring-2 ring-slate-500/20" />
                        ) : (
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md", isICT ? "bg-blue-600" : "bg-orange-600")}>
                            {getInitials(label)}
                          </div>
                        )}
                        <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-sm border-2", isDarkMode ? "border-slate-900" : "border-slate-50", isICT ? "bg-blue-500" : "bg-orange-500")}>
                          <Users size={10} />
                        </div>
                      </div>
                    )}
                    {(mode === "subject" || key === "unassigned") && (
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", iconBgClass, iconTextClass)}>
                        {mode === "subject" ? <Library size={15} /> : <GraduationCap size={15} />}
                      </div>
                    )}
                    <div>
                      <h4 className={cn("font-black text-sm tracking-wide", mode === "subject" && subjectColorMap[key] ? subjectColorMap[key].text : (isDarkMode ? "text-slate-100" : "text-slate-800"))}>{label}</h4>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{subLabel}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    {mode === "teacher" ? (
                      Array.from(new Set(rows.map(r => r.subject))).map(subj => {
                        const colorTheme = subjectColorMap[subj]
                        return (
                          <span key={subj} className={cn("px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wider font-bold shadow-sm border", colorTheme ? cn(colorTheme.bg, colorTheme.border, colorTheme.text, isDarkMode ? "bg-opacity-20" : "") : (isDarkMode ? "bg-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-600"))}>
                            {subj}
                          </span>
                        )
                      })
                    ) : (
                      Array.from(new Set(rows.map(r => r.teacher || "TBA"))).map(tName => (
                        <span key={tName} className={cn("px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wider font-bold shadow-sm flex items-center gap-1.5", isDarkMode ? "bg-slate-800 text-slate-300" : "bg-white border border-slate-200 text-slate-600")}>
                           <div className={cn("w-1.5 h-1.5 rounded-full", tName === "TBA" ? "bg-red-500" : "bg-emerald-500")} />
                           {tName}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[280px] mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-200/50 dark:border-slate-800/50">
                  <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full">
                    <TeacherPicker 
                      value={currentValue} 
                      onSelect={(val) => setReplacementTeacherId(prev => ({ ...prev, [key]: val }))}
                      teachers={teachers}
                      excludeTeacherIds={mode === "teacher" ? [key] : []}
                      isDarkMode={isDarkMode}
                      isICT={isICT}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleUpdate(key, false)}
                      disabled={isUpdating || !isChanged}
                      className={cn("h-10 md:h-9 px-4 font-black text-[10px] w-full sm:w-auto tracking-wider uppercase flex-shrink-0 text-white shadow-md active:scale-95 transition-all", accentBg)}
                    >
                      Apply
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdate(key, true)}
                    disabled={isUpdating || defaultTeacherId === "unassigned"}
                    className="h-9 md:h-8 text-[10px] uppercase font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/30 w-full sm:w-fit"
                  >
                    <Trash2 size={12} className="mr-2" /> Clear All
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
