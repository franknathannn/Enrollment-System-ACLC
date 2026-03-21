// app/teacher/dashboard/components/Avatar.tsx

import { Student, getStudentPhotoUrl } from "../types"

interface AvatarProps {
  name: string
  size?: number
  img?: string | null
}

export function Avatar({ name, size = 40, img }: AvatarProps) {
  const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
  const hue = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360

  if (img) {
    return (
      <img
        src={img}
        alt={name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={e => { e.currentTarget.style.display = "none" }}
      />
    )
  }

  return (
    <div
      className="rounded-full flex items-center justify-center font-black text-white select-none flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.33, background: `hsl(${hue},65%,45%)` }}
    >
      {initials}
    </div>
  )
}

/** Student avatar — resolves photo from Supabase storage (two_by_two_url or profile_picture) */
export function StudentAvatar({ student, size = 28 }: { student: Student; size?: number }) {
  const photoUrl = getStudentPhotoUrl(student)
  const fullName = `${student.first_name} ${student.last_name}`
  return <Avatar name={fullName} size={size} img={photoUrl} />
}