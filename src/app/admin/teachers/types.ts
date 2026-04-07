// app/admin/teachers/types.ts

export interface Teacher {
    id:                      string
    full_name:               string
    email:                   string
    phone?:                  string | null
    subject_specialization?: string | null
    avatar_url?:             string | null
    gender?:                 string | null
    is_active:               boolean
    school_year:             string
    created_at?:             string
    updated_at?:             string
  }
  
  export interface TeacherAnnouncement {
    id:         string
    title:      string
    body:       string
    posted_by:  string
    target:     string   // "ALL" | teacher_id
    is_pinned:  boolean
    created_at: string
  }
  
  /** Minimal teacher shape used in dropdowns */
  export interface TeacherOption {
    id:        string
    full_name: string
    email:     string
  }