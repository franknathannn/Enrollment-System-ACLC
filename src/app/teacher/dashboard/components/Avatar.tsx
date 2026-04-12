// app/teacher/dashboard/components/Avatar.tsx

import { Student, getStudentPhotoUrl } from "../types"

interface AvatarProps {
  name: string
  size?: number
  img?: string | null
  gender?: string | null
  shape?: "circle" | "box"
}

export function Avatar({ name, size = 40, img, gender, shape = "circle" }: AvatarProps) {
  const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
  const roundClass = shape === "box" ? "rounded-xl" : "rounded-full"
  let hue = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  
  if (gender === 'Male') hue = 210 // Blue
  else if (gender === 'Female') hue = 330 // Pink

  if (img) {
    return (
      <img
        src={img}
        alt={name}
        className={`${roundClass} object-cover flex-shrink-0`}
        style={{ width: size, height: size }}
        onError={e => { e.currentTarget.style.display = "none" }}
      />
    )
  }

  return (
    <div
      className={`${roundClass} flex items-center justify-center font-black text-white select-none flex-shrink-0`}
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