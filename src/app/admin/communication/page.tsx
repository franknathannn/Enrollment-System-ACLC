"use client"

import { TeachersChatView } from "./TeachersChatView"

export default function CommunicationPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-700">
      <TeachersChatView />
    </div>
  )
}
