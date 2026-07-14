// app/teacher/dashboard/announcements/page.tsx
"use client"

import { useDashboard } from "../context"
import { AnnouncementsTab } from "../components/AnnouncementsTab"

export default function AnnouncementsPage() {
  const { announcements, dm } = useDashboard()

  return (
    <AnnouncementsTab announcements={announcements} dm={dm} />
  )
}
