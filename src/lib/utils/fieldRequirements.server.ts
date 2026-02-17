"use server"

import { createClient } from "@/lib/supabase/server"
import { FieldRequirements, DEFAULT_FIELD_REQUIREMENTS } from "./fieldRequirements"

/**
 * Server-side version for use in server actions
 */
export async function getFieldRequirementsServer(): Promise<FieldRequirements> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('system_config')
      .select('field_requirements')
      .maybeSingle()

    if (error || !data?.field_requirements) {
      return DEFAULT_FIELD_REQUIREMENTS
    }

    return {
      ...DEFAULT_FIELD_REQUIREMENTS,
      ...data.field_requirements
    }
  } catch (err) {
    console.error("Error fetching field requirements (server):", err)
    return DEFAULT_FIELD_REQUIREMENTS
  }
}

