"use client"

import { useEffect, useState, useCallback } from "react"
import { createEnrollmentSchema } from "@/lib/validators/enrollment"
import { getFieldRequirements, FieldRequirements, DEFAULT_FIELD_REQUIREMENTS } from "@/lib/utils/fieldRequirements"
import { supabase } from "@/lib/supabase/client"

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
      setRequirements(DEFAULT_FIELD_REQUIREMENTS)
      setSchema(createEnrollmentSchema(DEFAULT_FIELD_REQUIREMENTS))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRequirements()

    // ── Postgres realtime: fires when system_config row is updated ────────
    // FIX: The previous filter `'field_requirements=not.is.null'` is not valid
    // Supabase realtime filter syntax (only eq/neq/lt/lte/gt/gte/in are supported).
    // Removing the filter so we receive ALL updates to system_config — this is safe
    // because system_config is a single-row settings table. When a payload arrives
    // we merge its field_requirements into DEFAULT_FIELD_REQUIREMENTS exactly as before.
    const dbChannel = supabase
      .channel("system_config_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "system_config",
        },
        (payload) => {
          if (payload.new?.field_requirements) {
            const newReqs = {
              ...DEFAULT_FIELD_REQUIREMENTS,
              ...payload.new.field_requirements,
            } as FieldRequirements
            setRequirements(newReqs)
            setSchema(createEnrollmentSchema(newReqs))
          }
        }
      )
      .subscribe()

    // ── Broadcast: fired immediately by EnrollmentFormControl after save ──
    // EnrollmentFormControl broadcasts on channel "field_requirements_broadcast"
    // with event "field_requirements_updated". We subscribe to the same channel
    // name and event so the student form updates the instant the admin saves,
    // without waiting for the postgres replication lag.
    const broadcastChannel = supabase
      .channel("field_requirements_broadcast")
      .on(
        "broadcast",
        { event: "field_requirements_updated" },
        () => {
          loadRequirements()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(dbChannel)
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
