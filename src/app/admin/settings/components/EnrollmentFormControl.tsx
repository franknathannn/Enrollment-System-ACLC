"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { ThemedCard } from "@/components/ThemedCard"
import { ThemedText } from "@/components/ThemedText"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { themeColors } from "@/lib/themeColors"
import { 
  FileText, User, GraduationCap, Users, ShieldCheck, 
  Loader2, CheckCircle2
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type FieldRequirement = {
  required: boolean
  editable: boolean
}

type FieldRequirements = {
  // Step 1: Identity
  first_name: FieldRequirement
  middle_name: FieldRequirement
  last_name: FieldRequirement
  nationality: FieldRequirement
  gender: FieldRequirement
  email: FieldRequirement
  age: FieldRequirement
  civil_status: FieldRequirement
  birth_date: FieldRequirement
  religion: FieldRequirement
  address: FieldRequirement
  
  // Step 2: Academic
  lrn: FieldRequirement
  strand: FieldRequirement
  gwa_grade_10: FieldRequirement
  student_category: FieldRequirement
  last_school_attended: FieldRequirement
  school_year: FieldRequirement
  
  // Step 3: Family
  guardian_first_name: FieldRequirement
  guardian_middle_name: FieldRequirement
  guardian_last_name: FieldRequirement
  guardian_phone: FieldRequirement
  phone: FieldRequirement
  
  // Step 4: Documents
  profile_2x2_url: FieldRequirement
  birth_certificate_url: FieldRequirement
  form_138_url: FieldRequirement
  good_moral_url: FieldRequirement
  cor_url: FieldRequirement
  af5_url: FieldRequirement
  diploma_url: FieldRequirement
}

const DEFAULT_REQUIREMENTS: FieldRequirements = {
  // Step 1
  first_name: { required: true, editable: true },
  middle_name: { required: false, editable: true },
  last_name: { required: true, editable: true },
  nationality: { required: true, editable: true },
  gender: { required: true, editable: true },
  email: { required: true, editable: true },
  age: { required: true, editable: true },
  civil_status: { required: true, editable: true },
  birth_date: { required: true, editable: true },
  religion: { required: true, editable: true },
  address: { required: true, editable: true },
  
  // Step 2
  lrn: { required: true, editable: true },
  strand: { required: true, editable: true },
  gwa_grade_10: { required: false, editable: true },
  student_category: { required: true, editable: true },
  last_school_attended: { required: true, editable: true },
  school_year: { required: false, editable: false },
  
  // Step 3
  guardian_first_name: { required: true, editable: true },
  guardian_middle_name: { required: false, editable: true },
  guardian_last_name: { required: true, editable: true },
  guardian_phone: { required: true, editable: true },
  phone: { required: true, editable: true },
  
  // Step 4
  profile_2x2_url: { required: true, editable: true },
  birth_certificate_url: { required: true, editable: true },
  form_138_url: { required: false, editable: true },
  good_moral_url: { required: false, editable: true },
  cor_url: { required: false, editable: true },
  af5_url: { required: false, editable: true },
  diploma_url: { required: false, editable: true },
}

const STEP_GROUPS = [
  {
    title: "Step 1: Personal Identity",
    icon: User,
    fields: [
      { key: "first_name", label: "First Name" },
      { key: "middle_name", label: "Middle Name" },
      { key: "last_name", label: "Last Name" },
      { key: "nationality", label: "Nationality" },
      { key: "gender", label: "Gender" },
      { key: "email", label: "Email" },
      { key: "age", label: "Age" },
      { key: "civil_status", label: "Civil Status" },
      { key: "birth_date", label: "Birth Date" },
      { key: "religion", label: "Religion" },
      { key: "address", label: "Address" },
    ]
  },
  {
    title: "Step 2: Academic Background",
    icon: GraduationCap,
    fields: [
      { key: "lrn", label: "Learner Reference Number (LRN)" },
      { key: "strand", label: "Strand" },
      { key: "student_category", label: "Student Category" },
      { key: "last_school_attended", label: "Last School Attended" },
      { key: "gwa_grade_10", label: "GWA Grade 10" },
      { key: "school_year", label: "School Year" },
    ]
  },
  {
    title: "Step 3: Family & Contacts",
    icon: Users,
    fields: [
      { key: "guardian_first_name", label: "Guardian First Name" },
      { key: "guardian_middle_name", label: "Guardian Middle Name" },
      { key: "guardian_last_name", label: "Guardian Last Name" },
      { key: "guardian_phone", label: "Guardian Phone" },
      { key: "phone", label: "Student Phone" },
    ]
  },
  {
    title: "Step 4: Documents",
    icon: FileText,
    fields: [
      { key: "profile_2x2_url", label: "2x2 ID Photo" },
      { key: "birth_certificate_url", label: "Birth Certificate" },
      { key: "form_138_url", label: "Form 138 (Report Card)" },
      { key: "good_moral_url", label: "Certificate of Good Moral" },
      { key: "cor_url", label: "ALS COR" },
      { key: "af5_url", label: "AF5 Form" },
      { key: "diploma_url", label: "ALS Diploma" },
    ]
  }
]

interface EnrollmentFormControlProps {
  configId: string
  isDarkMode: boolean
}

export function EnrollmentFormControl({ configId, isDarkMode }: EnrollmentFormControlProps) {
  const [requirements, setRequirements] = useState<FieldRequirements>(DEFAULT_REQUIREMENTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const loadRequirements = useCallback(async () => {
    if (!configId) {
      setLoading(false)
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('field_requirements')
        .eq('id', configId)
        .maybeSingle()

      // If column doesn't exist or is null, use defaults
      if (error && error.code !== 'PGRST116' && error.code !== '42703') {
        console.error("Error loading requirements:", error)
        // Don't show error if column doesn't exist yet - it will be created on first save
        if (error.code !== '42703') {
          toast.error("Failed to load field requirements")
        }
      }

      if (data?.field_requirements && typeof data.field_requirements === 'object') {
        const loaded = { ...DEFAULT_REQUIREMENTS, ...data.field_requirements }
        // Ensure school_year is always locked
        loaded.school_year = { ...loaded.school_year, editable: false }
        setRequirements(loaded)
      } else {
        setRequirements(DEFAULT_REQUIREMENTS)
      }
    } catch (err) {
      console.error("Load error:", err)
      // Use defaults on any error
      setRequirements(DEFAULT_REQUIREMENTS)
    } finally {
      setLoading(false)
    }
  }, [configId])

  useEffect(() => {
    loadRequirements()
  }, [loadRequirements])

  const autoSave = useCallback(async (reqs: FieldRequirements) => {
    if (!configId) return

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        // Ensure school_year is always locked before saving
        const toSave = {
          ...reqs,
          school_year: { ...reqs.school_year, editable: false }
        }
        
        const { error } = await supabase
          .from('system_config')
          .update({ field_requirements: toSave })
          .eq('id', configId)

        if (error) throw error

        // Broadcast update to all connected clients for LIVE updates
        const channel = supabase.channel('field_requirements_broadcast')
        await channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.send({
              type: 'broadcast',
              event: 'field_requirements_updated',
              payload: { timestamp: new Date().toISOString() }
            })
            setTimeout(() => supabase.removeChannel(channel), 1000)
          }
        })

        toast.success("Field Requirements Updated", { duration: 2000 })
      } catch (err: unknown) {
        console.error("Auto-save error:", err)
        toast.error("Failed to save requirements")
      } finally {
        setSaving(false)
      }
    }, 500) // 500ms debounce
  }, [configId])

  const updateField = (fieldKey: keyof FieldRequirements, property: 'required' | 'editable', value: boolean) => {
    setRequirements(prev => {
      const current = prev[fieldKey]
      
      // Special case: school_year is always locked (not editable)
      if (fieldKey === 'school_year' && property === 'editable') {
        return prev // Don't allow changing school_year editability
      }
      
      // Logic: If making editable = false, also set required = false (except school_year)
      if (property === 'editable' && !value && fieldKey !== 'school_year') {
        const updated = {
          ...prev,
          [fieldKey]: {
            ...current,
            editable: false,
            required: false // Can't be required if not editable
          }
        }
        autoSave(updated)
        return updated
      }
      
      // Logic: If making required = true, ensure editable = true (except school_year)
      if (property === 'required' && value && fieldKey !== 'school_year') {
        const updated = {
          ...prev,
          [fieldKey]: {
            ...current,
            required: true,
            editable: true // Must be editable to be required
          }
        }
        autoSave(updated)
        return updated
      }
      
      // Normal update
      const updated = {
        ...prev,
        [fieldKey]: {
          ...current,
          [property]: value
        }
      }
      autoSave(updated)
      return updated
    })
  }

  const handleReset = () => {
    setRequirements(DEFAULT_REQUIREMENTS)
    autoSave(DEFAULT_REQUIREMENTS)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  if (loading) {
    return (
      <ThemedCard 
        className="p-10 rounded-[48px] space-y-8 border transition-all duration-500"
        style={{
          backgroundColor: isDarkMode ? themeColors.dark.surface : '#ffffff',
          borderColor: isDarkMode ? themeColors.dark.border : 'rgb(226 232 240)'
        }}
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </ThemedCard>
    )
  }

  return (
    <ThemedCard 
      className="p-10 rounded-[48px] space-y-8 border transition-all duration-500"
      style={{
        backgroundColor: isDarkMode ? themeColors.dark.surface : '#ffffff',
        borderColor: isDarkMode ? themeColors.dark.border : 'rgb(226 232 240)'
      }}
    >
      <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: '#3b82f6', color: 'white' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <ThemedText variant="h3" className="text-xs font-bold uppercase tracking-wide" isDarkMode={isDarkMode}>
              Enrollment Form Control Center
            </ThemedText>
            <ThemedText variant="caption" className="text-[9px] text-slate-500 italic mt-1" isDarkMode={isDarkMode}>
              Configure required fields and editability for pre-enrollment adjustments
            </ThemedText>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" /> Saving...
            </span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                className="text-[9px] font-bold uppercase border-slate-200 dark:border-slate-700"
              >
                Reset Defaults
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 text-white border-slate-800">
              <p>Reset all fields to default requirements</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="space-y-8">
        {STEP_GROUPS.map((step, stepIdx) => {
          const Icon = step.icon
          return (
            <div key={stepIdx} className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 bg-blue-600/10 rounded-xl">
                  <Icon size={18} className="text-blue-600" />
                </div>
                <ThemedText variant="h4" className="text-[10px] font-bold uppercase tracking-wide" isDarkMode={isDarkMode}>
                  {step.title}
                </ThemedText>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {step.fields.map((field) => {
                  const fieldKey = field.key as keyof FieldRequirements
                  const fieldReq = requirements[fieldKey]
                  
                  return (
                    <div
                      key={fieldKey}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all duration-300",
                        fieldReq.required
                          ? "border-blue-500/30 bg-blue-500/5"
                          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <ThemedText variant="label" className="text-[10px] font-bold uppercase tracking-wide" isDarkMode={isDarkMode}>
                            {field.label}
                          </ThemedText>
                          {fieldReq.required && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-[8px] font-bold uppercase rounded-full">
                              Required
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-slate-600 dark:text-slate-400 font-medium">
                            Required Field
                          </span>
                          <Switch
                            checked={fieldReq.required}
                            onCheckedChange={(checked) => updateField(fieldKey, 'required', checked)}
                            disabled={fieldKey === 'school_year' || (!fieldReq.editable && fieldKey !== 'school_year')}
                            className="data-[state=checked]:bg-blue-600"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-slate-600 dark:text-slate-400 font-medium">
                            Editable {fieldKey === 'school_year' && <span className="text-[8px] text-amber-500">(Locked)</span>}
                          </span>
                          <Switch
                            checked={fieldReq.editable}
                            onCheckedChange={(checked) => updateField(fieldKey, 'editable', checked)}
                            disabled={fieldKey === 'school_year'}
                            className="data-[state=checked]:bg-green-600"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-center gap-2 text-[9px] text-slate-500 font-medium">
          {saving ? (
            <>
              <Loader2 className="animate-spin" size={12} />
              Auto-saving changes...
            </>
          ) : (
            <>
              <CheckCircle2 size={12} />
              Changes save automatically
            </>
          )}
        </div>
      </div>
    </ThemedCard>
  )
}

