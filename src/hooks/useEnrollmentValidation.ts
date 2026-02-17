"use client"

import { useEffect, useState, useCallback } from "react"
import { createEnrollmentSchema } from "@/lib/validators/enrollment"
import { getFieldRequirements, FieldRequirements, DEFAULT_FIELD_REQUIREMENTS } from "@/lib/utils/fieldRequirements"
import { supabase } from "@/lib/supabase/client"
import { z } from "zod"

export function useEnrollmentValidation() {
  const [schema, setSchema] = useState(() => createEnrollmentSchema(DEFAULT_FIELD_REQUIREMENTS))
  const [requirements, setRequirements] = useState<FieldRequirements>(DEFAULT_FIELD_REQUIREMENTS)
  const [loading, setLoading] = useState(true)

  const loadRequirements = useCallback(async () => {
    try {
      const reqs = await getFieldRequirements()
      setRequirements(reqs)
      setSchema(createEnrollmentSchema(reqs))
    } catch (err) {
      console.error("Failed to load field requirements:", err)
      // Use defaults on error
      setRequirements(DEFAULT_FIELD_REQUIREMENTS)
      setSchema(createEnrollmentSchema(DEFAULT_FIELD_REQUIREMENTS))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRequirements()

    // Set up real-time subscription for live updates
    const channel = supabase
      .channel('field_requirements_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_config',
          filter: 'field_requirements=not.is.null'
        },
        (payload) => {
          // Reload requirements when they change
          if (payload.new?.field_requirements) {
            const newReqs = {
              ...DEFAULT_FIELD_REQUIREMENTS,
              ...payload.new.field_requirements
            } as FieldRequirements
            setRequirements(newReqs)
            setSchema(createEnrollmentSchema(newReqs))
          }
        }
      )
      .subscribe()

    // Also listen for broadcast events (for immediate updates)
    const broadcastChannel = supabase
      .channel('field_requirements_broadcast')
      .on(
        'broadcast',
        { event: 'field_requirements_updated' },
        () => {
          // Reload when broadcast is received
          loadRequirements()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(broadcastChannel)
    }
  }, [loadRequirements])

  return {
    schema,
    requirements,
    loading,
    isFieldRequired: (field: keyof FieldRequirements) => requirements[field]?.required ?? false,
    isFieldEditable: (field: keyof FieldRequirements) => requirements[field]?.editable ?? true,
  }
}

