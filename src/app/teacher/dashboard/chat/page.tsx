// app/teacher/dashboard/chat/page.tsx
"use client"

import { useDashboard } from "../context"
import { ChatTab } from "../components/ChatTab"

export default function ChatPage() {
  const { session, dm } = useDashboard()

  if (!session) return null

  return (
    <ChatTab session={session} dm={dm} />
  )
}
