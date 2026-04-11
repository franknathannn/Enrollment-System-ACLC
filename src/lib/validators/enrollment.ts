import * as z from "zod"
import { FieldRequirements, DEFAULT_FIELD_REQUIREMENTS } from "@/lib/utils/fieldRequirements"

export function createEnrollmentSchema(requirements: FieldRequirements = DEFAULT_FIELD_REQUIREMENTS) {
  const req = (field: keyof FieldRequirements) => requirements[field]?.required ?? false

  const facebookUrlSchema = z.string().regex(
    /^https?:\/\/(www\.)?facebook\.com\/.+/i,
    "Must be a valid Facebook URL (e.g. https://facebook.com/yourprofile)"
  )

  const schoolYearCompletedSchema = z.string()
    .regex(/^\d{4}-\d{4}$/, "Format must be YYYY-YYYY (e.g. 2023-2024)")
    .refine((val) => {
      const [start, end] = val.split("-").map(Number)
      return end === start + 1
    }, "End year must be exactly one year after start year")

  return z.object({
    // ── Step 1: Identity ──────────────────────────────────────────────────
    first_name: req('first_name')
      ? z.string().min(2, "Required").max(80, "Max 80 characters").regex(/^[^0-9]*$/, "No numbers allowed")
      : z.string().max(80, "Max 80 characters").regex(/^[^0-9]*$/, "No numbers allowed").optional(),

    last_name: req('last_name')
      ? z.string().min(2, "Required").max(50, "Max 50 characters").regex(/^[^0-9]*$/, "No numbers allowed")
      : z.string().max(50, "Max 50 characters").regex(/^[^0-9]*$/, "No numbers allowed").optional(),

    middle_name: z.string()
      .max(20, "Max 20 characters")
      .optional()
      .refine((val) => {
        if (!val) return true
        return (val.match(/\d/g) || []).length <= 2
      }, "Max 2 digits allowed in middle name"),

    nationality: req('nationality')
      ? z.string().min(2, "Required").max(60, "Max 60 characters")
      : z.string().max(60, "Max 60 characters").optional(),

    gender: req('gender')
      ? z.enum(["Male", "Female"])
      : z.enum(["Male", "Female"]).optional(),

    email: req('email')
      ? z.string().email("Invalid email").max(50, "Max 100 characters")
      : z.string().email("Invalid email").max(50, "Max 100 characters").optional(),

    age: req('age')
      ? z.string().min(1, "Required").max(3, "Invalid age")
      : z.string().max(3, "Invalid age").optional(),

    civil_status: req('civil_status')
      ? z.string().min(1, "Required").max(20, "Max 20 characters")
      : z.string().max(20, "Max 20 characters").optional(),

    birth_date: req('birth_date')
      ? z.string().min(1, "Required")
      : z.string().optional(),

    religion: req('religion')
      ? z.string().min(1, "Required").max(60, "Max 60 characters")
      : z.string().max(60, "Max 60 characters").optional(),

    address: req('address')
      ? z.string().min(1, "Required").max(100, "Max 100 characters")
      : z.string().max(100, "Max 100 characters").optional(),

    // ── Step 2: Academic ──────────────────────────────────────────────────
    grade_level: z.enum(["11", "12"]).optional(),

    lrn: req('lrn')
      ? z.string().length(12, "LRN must be exactly 12 digits").regex(/^\d+$/, "Numbers only")
      : z.string().length(12, "LRN must be exactly 12 digits").regex(/^\d+$/, "Numbers only").optional(),

    strand: req('strand')
      ? z.enum(["GAS", "ICT"])
      : z.enum(["GAS", "ICT"]).optional(),

    // FIX: range changed from 70–99.99 → 65–100 to match Step2Academic's validateGWA()
    gwa_grade_10: req('gwa_grade_10')
      ? z.coerce.number().min(65, "Minimum 65.00").max(100, "Maximum 100.00")
      : z.coerce.number().min(65, "Minimum 65.00").max(100, "Maximum 100.00").optional(),

    student_category: req('student_category')
      ? z.enum(["JHS Graduate", "ALS Passer"], { message: "Select a category" })
      : z.enum(["JHS Graduate", "ALS Passer"]).optional(),

    // FIX: school_type now respects requirements config instead of being hardcoded optional
    school_type: req('school_type')
      ? z.enum(["Public", "Private"], { message: "Select school type" })
      : z.enum(["Public", "Private"], { message: "Select school type" }).optional(),

    // FIX: year_completed_jhs now respects requirements config
    year_completed_jhs: req('year_completed_jhs')
      ? schoolYearCompletedSchema
      : schoolYearCompletedSchema.optional(),

    last_school_attended: req('last_school_attended')
      ? z.string().min(1, "Required").max(120, "Max 120 characters")
      : z.string().max(120, "Max 120 characters").optional(),

    last_school_address: req('last_school_address')
      ? z.string().min(1, "Required").max(100, "Max 100 characters")
      : z.string().max(100, "Max 100 characters").optional(),

    // FIX: facebook_user now respects requirements config
    facebook_user: req('facebook_user')
      ? z.string().min(1, "Facebook username is required").max(80, "Max 80 characters")
      : z.string().max(80, "Max 80 characters").optional(),

    // FIX: facebook_link now respects requirements config
    facebook_link: req('facebook_link')
      ? facebookUrlSchema
      : facebookUrlSchema.optional(),

    // FIX: preferred_modality now respects requirements config
    preferred_modality: req('preferred_modality')
      ? z.enum(["Face to Face", "Online"], { message: "Select a modality" })
      : z.enum(["Face to Face", "Online"]).optional(),

    // preferred_shift: conditional — superRefine handles the Face to Face rule below
    preferred_shift: z.string().optional(),

    school_year: z.string().optional(),

    // ── Step 3: Family ────────────────────────────────────────────────────
    guardian_first_name: req('guardian_first_name')
      ? z.string().min(2, "Required").max(80, "Max 80 characters").regex(/^[^0-9]*$/, "No numbers allowed")
      : z.string().max(80, "Max 80 characters").regex(/^[^0-9]*$/, "No numbers allowed").optional(),

    guardian_middle_name: z.string()
      .max(20, "Max 20 characters")
      .optional(),

    guardian_last_name: req('guardian_last_name')
      ? z.string().min(2, "Required").max(80, "Max 80 characters").regex(/^[^0-9]*$/, "No numbers allowed")
      : z.string().max(80, "Max 80 characters").regex(/^[^0-9]*$/, "No numbers allowed").optional(),

    guardian_name: z.string().optional(),

    phone: req('phone')
      ? z.string().regex(/^09\d{9}$/, "Must start with 09 and be 11 digits")
      : z.string().regex(/^09\d{9}$/, "Must start with 09 and be 11 digits").optional(),

    guardian_phone: req('guardian_phone')
      ? z.string().regex(/^09\d{9}$/, "Must start with 09 and be 11 digits")
      : z.string().regex(/^09\d{9}$/, "Must start with 09 and be 11 digits").optional(),

    guardian_email: req('guardian_email')
      ? z.string().email("Invalid email").max(50, "Max 50 characters")
      : z.string().email("Invalid email").max(50, "Max 50 characters").optional().or(z.literal("")),

    // ── Step 4: Documents ─────────────────────────────────────────────────
    profile_picture: z.string().optional(),

    profile_2x2_url: req('profile_2x2_url')
      ? z.string().min(1, "Required")
      : z.string().optional(),

    form_138_url: req('form_138_url')
      ? z.string().min(1, "Required")
      : z.string().optional(),

    good_moral_url: req('good_moral_url')
      ? z.string().min(1, "Required")
      : z.string().optional(),

    cor_url: req('cor_url')
      ? z.string().min(1, "Required")
      : z.string().optional(),

    af5_url: req('af5_url')
      ? z.string().min(1, "Required")
      : z.string().optional(),

    diploma_url: req('diploma_url')
      ? z.string().min(1, "Required")
      : z.string().optional(),

    birth_certificate_url: req('birth_certificate_url')
      ? z.string().min(1, "Required")
      : z.string().optional(),

    // ── System fields ─────────────────────────────────────────────────────
    id:         z.string().optional(),
    status:     z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),

  }).superRefine((data, ctx) => {
    // Shift is required whenever a modality is selected
    if (data.preferred_modality && !data.preferred_shift) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a shift",
        path: ["preferred_shift"],
      })
    }

    // GWA is required when student_category is JHS Graduate (mirrors Step2Academic logic)
    if (data.student_category === "JHS Graduate" && (data.gwa_grade_10 === undefined || data.gwa_grade_10 === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GWA is required for JHS Graduates",
        path: ["gwa_grade_10"],
      })
    }
  })
}

export const enrollmentSchema = createEnrollmentSchema()
export type EnrollmentFormData = z.infer<typeof enrollmentSchema>