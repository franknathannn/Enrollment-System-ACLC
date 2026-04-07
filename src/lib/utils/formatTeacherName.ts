export function formatTeacherName(
  fullName: string | null | undefined,
  gender?: string | null,
  includePrefix: boolean = true
): string {
  if (!fullName) return "Unknown Teacher";

  if (!includePrefix || !gender) {
    return fullName;
  }

  if (gender === "Male") {
    return `Mr. ${fullName}`;
  } else if (gender === "Female") {
    return `Ms. ${fullName}`;
  }

  return fullName;
}
