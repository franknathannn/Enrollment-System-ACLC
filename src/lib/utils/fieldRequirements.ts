import { supabase } from "@/lib/supabase/client"

export type FieldRequirement = {
  required: boolean
  editable: boolean
}

export type FieldRequirements = {
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
  last_school_address: FieldRequirement
  year_completed_jhs: FieldRequirement
  facebook_user: FieldRequirement
  facebook_link: FieldRequirement
  school_type: FieldRequirement
  preferred_modality: FieldRequirement
  preferred_shift: FieldRequirement
  
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

export const DEFAULT_FIELD_REQUIREMENTS: FieldRequirements = {
  // Step 1
  first_name:    { required: true,  editable: true },
  middle_name:   { required: false, editable: true },
  last_name:     { required: true,  editable: true },
  nationality:   { required: true,  editable: true },
  gender:        { required: true,  editable: true },
  email:         { required: true,  editable: true },
  age:           { required: true,  editable: true },
  civil_status:  { required: true,  editable: true },
  birth_date:    { required: true,  editable: true },
  religion:      { required: true,  editable: true },
  address:       { required: true,  editable: true },
  
  // Step 2
  lrn:                  { required: true,  editable: true },
  strand:               { required: true,  editable: true },
  gwa_grade_10:         { required: false, editable: true },
  student_category:     { required: true,  editable: true },
  last_school_attended: { required: true,  editable: true },
  school_year:          { required: false, editable: false }, // Always locked
  last_school_address:  { required: true,  editable: true },
  year_completed_jhs:   { required: true,  editable: true },
  facebook_user:        { required: true,  editable: true },
  facebook_link:        { required: true,  editable: true },
  school_type:          { required: true,  editable: true },
  preferred_modality:   { required: true,  editable: true },
  preferred_shift:      { required: false, editable: true }, // conditional: only required when modality = Face to Face
  
  // Step 3
  guardian_first_name:  { required: true,  editable: true },
  guardian_middle_name: { required: false, editable: true },
  guardian_last_name:   { required: true,  editable: true },
  guardian_phone:       { required: true,  editable: true },
  phone:                { required: true,  editable: true },
  
  // Step 4
  profile_2x2_url:       { required: true,  editable: true },
  birth_certificate_url: { required: true,  editable: true },
  form_138_url:          { required: false, editable: true },
  good_moral_url:        { required: false, editable: true },
  cor_url:               { required: false, editable: true },
  af5_url:               { required: false, editable: true },
  diploma_url:           { required: false, editable: true },
}

/**
 * Fetch field requirements from database.
 * Falls back to defaults if not found.
 */
export async function getFieldRequirements(): Promise<FieldRequirements> {
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('field_requirements')
      .maybeSingle()

    if (error || !data?.field_requirements) {
      return DEFAULT_FIELD_REQUIREMENTS
    }

    // Merge with defaults to ensure all fields are present,
    // then enforce school_year is always locked regardless of DB value
    return {
      ...DEFAULT_FIELD_REQUIREMENTS,
      ...data.field_requirements,
      school_year: { ...DEFAULT_FIELD_REQUIREMENTS.school_year, editable: false },
    }
  } catch (err) {
    console.error("Error fetching field requirements:", err)
    return DEFAULT_FIELD_REQUIREMENTS
  }
}

/**
 * Check if a field is required
 */
export function isFieldRequired(
  fieldKey: keyof FieldRequirements,
  requirements: FieldRequirements
): boolean {
  return requirements[fieldKey]?.required ?? DEFAULT_FIELD_REQUIREMENTS[fieldKey]?.required ?? false
}

/**
 * Check if a field is editable
 */
export function isFieldEditable(
  fieldKey: keyof FieldRequirements,
  requirements: FieldRequirements
): boolean {
  return requirements[fieldKey]?.editable ?? DEFAULT_FIELD_REQUIREMENTS[fieldKey]?.editable ?? true
}
