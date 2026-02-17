import * as z from "zod"
import { FieldRequirements, DEFAULT_FIELD_REQUIREMENTS } from "@/lib/utils/fieldRequirements"

/**
 * Create enrollment schema dynamically based on field requirements
 */
export function createEnrollmentSchema(requirements: FieldRequirements = DEFAULT_FIELD_REQUIREMENTS) {
  const req = (field: keyof FieldRequirements) => requirements[field]?.required ?? false

  return z.object({
    // Step 1: Identity
    first_name: req('first_name') 
      ? z.string().min(2, "Required").max(80, "Max 80 characters").regex(/^[^0-9]*$/, "No numbers allowed")
      : z.string().max(80, "Max 80 characters").regex(/^[^0-9]*$/, "No numbers allowed").optional(),
    
    last_name: req('last_name')
      ? z.string().min(2, "Required").max(50, "Max 50 characters").regex(/^[^0-9]*$/, "No numbers allowed")
      : z.string().max(50, "Max 50 characters").regex(/^[^0-9]*$/, "No numbers allowed").optional(),
    
    middle_name: z.string().max(20, "Max 20 characters").optional().refine((val) => {
      if (!val) return true;
      const digitCount = (val.match(/\d/g) || []).length;
      return digitCount <= 2;
    }, "Max 2 digits allowed in middle name"),
    
    nationality: req('nationality')
      ? z.string().min(2, "Required")
      : z.string().optional(),
    
    gender: req('gender')
      ? z.enum(["Male", "Female"])
      : z.enum(["Male", "Female"]).optional(),
    
    email: req('email')
      ? z.string().email("Invalid email")
      : z.string().email("Invalid email").optional(),
    
    age: req('age')
      ? z.string().min(1, "Required")
      : z.string().optional(),
    
    civil_status: req('civil_status')
      ? z.string().min(1, "Required")
      : z.string().optional(),
    
    birth_date: req('birth_date')
      ? z.string().min(1, "Required")
      : z.string().optional(),
    
    religion: req('religion')
      ? z.string().min(1, "Required")
      : z.string().optional(),
    
    address: req('address')
      ? z.string().min(1, "Required")
      : z.string().optional(),

    // Step 2: Academic
    lrn: req('lrn')
      ? z.string().length(12, "LRN must be 12 digits").regex(/^\d+$/, "Numbers only")
      : z.string().length(12, "LRN must be 12 digits").regex(/^\d+$/, "Numbers only").optional(),
    
    strand: req('strand')
      ? z.enum(["GAS", "ICT"])
      : z.enum(["GAS", "ICT"]).optional(),
    
    gwa_grade_10: req('gwa_grade_10')
      ? z.coerce.number().min(70, "Minimum 70.00").max(99.99, "Must be less than 100.00")
      : z.coerce.number().min(70, "Minimum 70.00").max(99.99, "Must be less than 100.00").optional(),
    
    student_category: req('student_category')
      ? z.string().min(1, "Required")
      : z.string().optional(),
    
    last_school_attended: req('last_school_attended')
      ? z.string().min(1, "Required")
      : z.string().optional(),
    
    school_year: z.string().optional(),

    // Step 3: Family
    guardian_first_name: req('guardian_first_name')
      ? z.string().min(2, "Required").max(80, "Max 80 characters")
      : z.string().max(80, "Max 80 characters").optional(),
    
    guardian_middle_name: z.string().optional(),
    
    guardian_last_name: req('guardian_last_name')
      ? z.string().min(2, "Required").max(80, "Max 80 characters")
      : z.string().max(80, "Max 80 characters").optional(),
    
    guardian_name: z.string().optional(), // Fallback
    
    phone: req('phone')
      ? z.string().regex(/^09\d{9}$/, "Must start with 09 and be 11 digits")
      : z.string().regex(/^09\d{9}$/, "Must start with 09 and be 11 digits").optional(),
    
    guardian_phone: req('guardian_phone')
      ? z.string().regex(/^09\d{9}$/, "Must start with 09 and be 11 digits")
      : z.string().regex(/^09\d{9}$/, "Must start with 09 and be 11 digits").optional(),

    // Step 4: Documents (URLs from Supabase Storage)
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
    
    // System fields
    id: z.string().optional(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
}

// Default schema for backward compatibility
export const enrollmentSchema = createEnrollmentSchema()

export type EnrollmentFormData = z.infer<typeof enrollmentSchema>
