import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/admin-client"

export interface Room {
  id: string
  name: string
  type: string
  capacity: number
}

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([])
  
  useEffect(() => {
    const fetchRooms = () => {
      supabase.from("rooms").select("*").order("name")
        .then(({ data }) => setRooms(data ?? []))
    }
    
    fetchRooms()

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        fetchRooms()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return rooms
}
