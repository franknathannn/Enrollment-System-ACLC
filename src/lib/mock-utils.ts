export const FIRST_NAMES_MALE = [
  "Juan", "Carlos", "Miguel", "Jose", "Luis", "Marco", "Rafael", "Diego",
  "Angelo", "Christian", "James", "Mark", "John", "Paul", "Peter", "Ryan",
  "Kevin", "Daniel", "Nathan", "Adrian", "Felix", "Victor", "Emilio", "Anton",
  "Renz", "Nico", "Liam", "Ethan", "Noah", "Mateo", "Ivan", "Eduardo",
]

export const FIRST_NAMES_FEMALE = [
  "Maria", "Ana", "Sofia", "Isabella", "Gabriela", "Camille", "Nicole",
  "Patricia", "Jasmine", "Kristine", "Angela", "Bianca", "Clarissa", "Diana",
  "Elena", "Francesca", "Grace", "Hannah", "Iris", "Julia", "Karen", "Laura",
  "Mia", "Nina", "Olivia", "Paula", "Queenie", "Rose", "Samantha", "Tina",
]

export const LAST_NAMES = [
  "Santos", "Reyes", "Cruz", "Garcia", "Lopez", "Gonzalez",
  "Rodriguez", "Martinez", "Hernandez", "Flores", "Rivera", "Torres",
  "Ramirez", "Morales", "Mendoza", "Aquino", "Villanueva", "Diaz", "Ramos",
  "Castillo", "Bautista", "Pascual", "Ocampo", "Soriano", "Aguilar",
  "Domingo", "Navarro", "Guerrero", "Estrada", "Lim", "Tan", "Ong", "Chua",
]

export const MIDDLE_NAMES = [
  "Santos", "Reyes", "Cruz", "Garcia", "Lopez", "Flores", "Rivera",
  "Torres", "Mendoza", "Aquino", "Diaz", "Ramos", "Castillo", "Bautista",
  "Ocampo", "Soriano", "Aguilar", "Domingo", "Navarro", "Guerrero",
]

export const RELIGIONS = [
  "Roman Catholic", "Iglesia ni Cristo", "Islam", "Born Again Christian",
  "Baptist", "Seventh-day Adventist", "Jehovah's Witness", "Aglipayan",
]

export const PH_CITIES = [
  "Manila", "Quezon City", "Caloocan", "Las Piñas", "Makati",
  "Malabon", "Mandaluyong", "Marikina", "Muntinlupa", "Navotas",
  "Parañaque", "Pasay", "Pasig", "San Juan", "Taguig", "Valenzuela",
]

export const PH_BARANGAYS = [
  "Tondo", "Sampaloc", "Binondo", "Ermita", "Intramuros", "Malate",
  "Paco", "Pandacan", "Port Area", "Quiapo", "San Miguel", "San Nicolas",
  "Santa Ana", "Santa Cruz", "Santa Mesa",
]

export const SCHOOLS = [
  "Manila Science High School", "Philippine Science High School",
  "Arellano University", "De La Salle University",
  "University of Santo Tomas", "Far Eastern University",
  "Polytechnic University of the Philippines", "San Beda University",
  "Mapua University", "Adamson University", "Jose Rizal University",
  "National University", "Lyceum of the Philippines University",
  "Centro Escolar University", "University of the East",
  "Emilio Aguinaldo College", "AMA Computer University",
  "Holy Angel University", "La Salle Green Hills", "Miriam College",
]

export const SCHOOL_ADDRESSES = [
  "Taft Avenue, Malate, Manila",
  "España Blvd, Sampaloc, Manila",
  "P. Noval St, Sampaloc, Manila",
  "Claro M. Recto Ave, Manila",
  "Aurora Blvd, Pasay City",
  "Leveriza St, Pasay City",
  "Aurora Blvd, Quezon City",
  "Katipunan Ave, Quezon City",
  "Commonwealth Ave, Quezon City",
  "Shaw Blvd, Mandaluyong City",
]

export const STRANDS: Array<"ICT" | "GAS">     = ["ICT", "GAS"]
export const GENDERS: Array<"Male" | "Female"> = ["Male", "Female"]
export const CATEGORIES    = ["JHS Graduate", "ALS Passer"]
export const SCHOOL_TYPES  = ["Public", "Private"]
export const MODALITIES    = ["Face to Face", "Online"]
export const SHIFTS        = ["AM", "PM"]
export const CIVIL_STATUSES = ["Single", "Married"]
export const NATIONALITIES = [
  "Filipino", "Filipino", "Filipino", "Filipino", "Filipino",
  "Filipino", "Filipino", "Filipino", "Chinese", "American",
]

export function portraitUrl(gender: "Male" | "Female", index: number): string {
  const folder = gender === "Male" ? "men" : "women"
  const idx    = index % 99
  return `https://randomuser.me/api/portraits/${folder}/${idx}.jpg`
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function pad(n: number, len = 2): string {
  return String(n).padStart(len, "0")
}

export function generateLRN(index: number, batchId: string): string {
  const prefix = batchId.slice(-4)
  const idx    = pad(index % 99999, 5)
  const suffix = pad(randInt(100, 999), 3)
  return `${prefix}${idx}${suffix}`.slice(0, 12).padStart(12, "0")
}

export function generatePhone(): string {
  const prefixes = [
    "0917", "0918", "0919", "0920", "0921", "0927", "0928",
    "0929", "0930", "0939", "0947", "0948", "0949", "0956",
    "0961", "0963", "0966", "0967", "0973", "0975", "0977",
    "0978", "0979", "0994", "0995", "0998",
  ]
  return pick(prefixes) + pad(randInt(1000000, 9999999), 7)
}

export function generateBirthDate(age: number): string {
  const today     = new Date()
  const birthYear = today.getFullYear() - age
  const month     = randInt(1, 12)
  const maxDay    = new Date(birthYear, month, 0).getDate()
  const day       = randInt(1, maxDay)
  return `${birthYear}-${pad(month)}-${pad(day)}`
}

export function generateGWA(): number {
  return parseFloat((randInt(6500, 10000) / 100).toFixed(2))
}

export function generateSchoolYear(completedYearsAgo: number): string {
  const start = new Date().getFullYear() - completedYearsAgo
  return `${start}-${start + 1}`
}

export function generateFacebookLink(firstName: string, lastName: string, idx: number): string {
  const slug = `${firstName}${lastName}${idx}`
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
  return `https://facebook.com/${slug}`
}

export function generateEmail(firstName: string, lastName: string, index: number): string {
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"]
  const slug    = `${firstName}${lastName}`
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z]/g, "")
  return `${slug}${index}@${pick(domains)}`
}

export function generateStudent(index: number, batchId: string, activeSY: string) {
  const gender     = pick(GENDERS)
  const firstName  = pick(gender === "Male" ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE)
  const lastName   = pick(LAST_NAMES)
  const middleName = Math.random() > 0.15 ? pick(MIDDLE_NAMES) : null
  const age        = randInt(14, 19)
  const category   = pick(CATEGORIES)
  const isJHS      = category === "JHS Graduate"
  const modality   = pick(MODALITIES)
  const isFTF      = modality === "Face to Face"
  const city       = pick(PH_CITIES)
  const barangay   = pick(PH_BARANGAYS)
  const houseNo    = randInt(1, 999)
  const docSeed    = `${batchId}${pad(index, 5)}`

  const photo = portraitUrl(gender, index)

  return {
    lrn:          generateLRN(index, batchId),
    first_name:   firstName,
    last_name:    lastName,
    middle_name:  middleName,
    gender,
    age,
    birth_date:   generateBirthDate(age),
    civil_status: pick(CIVIL_STATUSES),
    nationality:  pick(NATIONALITIES),
    religion:     pick(RELIGIONS),
    address:      `${houseNo} ${barangay} St, ${barangay}, ${city}`.slice(0, 100),
    email:        generateEmail(firstName, lastName, index),
    phone:        generatePhone(),

    strand:               pick(STRANDS),
    student_category:     category,
    school_year:          activeSY,
    school_type:          pick(SCHOOL_TYPES),
    last_school_attended: pick(SCHOOLS),
    last_school_address:  pick(SCHOOL_ADDRESSES),
    year_completed_jhs:   generateSchoolYear(randInt(1, 3)),
    gwa_grade_10:         isJHS ? generateGWA() : null,

    facebook_user: `${firstName} ${lastName}`,
    facebook_link: generateFacebookLink(firstName, lastName, index),

    preferred_modality: modality,
    preferred_shift:    isFTF ? pick(SHIFTS) : null,

    guardian_first_name:  pick(gender === "Male" ? FIRST_NAMES_FEMALE : FIRST_NAMES_MALE),
    guardian_middle_name: Math.random() > 0.3 ? pick(MIDDLE_NAMES) : null,
    guardian_last_name:   lastName,
    guardian_phone:       generatePhone(),

    two_by_two_url:        photo,
    profile_picture:       photo,
    birth_certificate_url: `https://picsum.photos/seed/${docSeed}b/400/600`,
    form_138_url:          isJHS  ? `https://picsum.photos/seed/${docSeed}c/400/600` : null,
    good_moral_url:        isJHS  ? `https://picsum.photos/seed/${docSeed}d/400/600` : null,
    cor_url:               !isJHS ? `https://picsum.photos/seed/${docSeed}e/400/600` : null,
    diploma_url:           !isJHS ? `https://picsum.photos/seed/${docSeed}f/400/600` : null,
    af5_url:               !isJHS ? `https://picsum.photos/seed/${docSeed}g/400/600` : null,

    status:    "Pending",
    section:   "Unassigned",
    is_locked: false,
    mock: true,
  }
}
