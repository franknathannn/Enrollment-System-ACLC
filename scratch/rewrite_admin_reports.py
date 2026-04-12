import re

with open('src/app/admin/teachers/components/AdminReportsTab.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Make it completely independent of teachers' schedules/students
code = code.replace('export function ReportsTab(', 'export function AdminReportsTab(')
code = code.replace(
'''interface Props {
  schedules: ScheduleRow[]
  students: Student[]
  dm: boolean
  session: TeacherSession
  schoolYear: string
  advisorySections?: string[]
}''',
'''interface Props {
  dm: boolean
  session: { full_name: string }
  schoolYear: string
}''')

# Fix AttRow to include section
code = code.replace(
'''interface AttRow {
  student_id: string
  subject: string
  date: string
  status: string
  notes?: string | null
}''',
'''interface AttRow {
  student_id: string
  section: string
  subject: string
  date: string
  status: string
  notes?: string | null
}''')

# In AdminReportsTab, remove schedules, students, session, etc. from destructuring
code = code.replace(
'export function AdminReportsTab({ schedules, students, dm, session, schoolYear, advisorySections = [] }: Props) {',
'''export function AdminReportsTab({ dm, session, schoolYear }: Props) {
  const [studentsCache, setStudentsCache] = useState<Record<string, Student>>({})
  const [loadingSectionStudents, setLoadingSectionStudents] = useState<Record<string, boolean>>({})
  
  // Triage cache
  const [triagedStudentsList, setTriagedStudentsList] = useState<Student[]>([])

  const getCachedStudent = useCallback((id: string) => {
    return studentsCache[id] || { id, first_name: "Unknown", last_name: "Student", section: "Unknown" } as Student
  }, [studentsCache])
  
  const ensureSectionStudents = useCallback(async (sectionName: string) => {
    if (loadingSectionStudents[sectionName] || Object.values(studentsCache).some(s => s.section === sectionName)) return;
    setLoadingSectionStudents(prev => ({ ...prev, [sectionName]: true }));
    try {
      const { data } = await supabase.from("students").select("id, first_name, last_name, middle_name, lrn, gender, section, strand, status, profile_picture, two_by_two_url").eq("section", sectionName).not("status", "eq", "Pending");
      if (data) {
        setStudentsCache(prev => {
          const next = { ...prev };
          data.forEach(s => { next[s.id] = s; });
          return next;
        });
      }
    } finally {
      setLoadingSectionStudents(prev => ({ ...prev, [sectionName]: false }));
    }
  }, [studentsCache, loadingSectionStudents]);
  
  const ensureTriageStudents = useCallback(async (ids: string[]) => {
    const missing = ids.filter(id => !studentsCache[id]);
    if (missing.length === 0) return;
    const { data } = await supabase.from("students").select("id, first_name, last_name, middle_name, lrn, gender, section, strand, status, profile_picture, two_by_two_url").in("id", missing).not("status", "eq", "Pending");
    if (data) {
      setStudentsCache(prev => {
        const next = { ...prev };
        data.forEach(s => { next[s.id] = s; });
        return next;
      });
      setTriagedStudentsList(prev => {
        const nextMap = new Map([...prev, ...data].map(s => [s.id, s]));
        return Array.from(nextMap.values());
      });
    }
  }, [studentsCache]);
''')

# Replace mySections definition logic
code = re.sub(
r'  const mySections = useMemo\(.*?\[schedules, advisorySections\]\n  \)',
'''  const mySections = useMemo(() => {
    return [...new Set(attData.map(r => r.section))].filter(Boolean).sort()
  }, [attData])''', code, flags=re.DOTALL)

# Replace isAdvisory / isAdvisoryOnly checks (they are false for admin)
code = re.sub(
r'  const isAdvisory = useCallback.*?\[advisorySections\]\)',
'''  const isAdvisory = useCallback((section: string) => false, [])''', code, flags=re.DOTALL)

code = re.sub(
r'  const isAdvisoryOnly = useCallback.*?\[advisorySections, schedules\]\)',
'''  const isAdvisoryOnly = useCallback((section: string) => false, [])''', code, flags=re.DOTALL)

# Modify load()
code = re.sub(
r'  const load = useCallback\(async \(silent = false\) => \{.*?setAttData\(data \|\| \[\]\)\n    \} finally \{.*?\[students, schoolYear\]\)',
'''  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { data } = await supabase
        .from("attendance").select("student_id, section, subject, date, status, notes")
        .eq("school_year", schoolYear)
      setAttData(data || [])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [schoolYear])''', code, flags=re.DOTALL)

# Fix sectionReports mapping
code = code.replace(
'''      const sectionStudents = students.filter(s => s.section === section)
      const sectionSchedules = schedules.filter(s => s.section === section)

      // If adviser of this section, show ALL subjects (from attendance data)
      // merged with scheduled subjects. This covers:
      // - Advisory-only: shows all subjects from attendance
      // - Both teacher + adviser: shows taught subjects + all other subjects from attendance
      const isAdv = advisorySections.includes(section)
      const scheduledSubjects = [...new Set(sectionSchedules.map(s => s.subject))]
      const attendanceSubjects = isAdv
        ? [...new Set(attData.filter(r => sectionStudents.some(s => s.id === r.student_id)).map(r => r.subject))]
        : []
      const uniqueSubjects = [...new Set([...scheduledSubjects, ...attendanceSubjects])].sort()''',
'''      const sectionRecs = attData.filter(r => r.section === section)
      const sectionStudentIds = [...new Set(sectionRecs.map(r => r.student_id))]
      const uniqueSubjects = [...new Set(sectionRecs.map(r => r.subject))].sort()''')

code = code.replace('sectionStudents.length', 'sectionStudentIds.length')
code = code.replace(
'''        const recs = attData.filter(r =>
          sectionStudents.some(s => s.id === r.student_id) && r.subject === subject
        )''',
'''        const recs = sectionRecs.filter(r => r.subject === subject)''')
code = code.replace('[mySections, students, schedules, attData, advisorySections]', '[mySections, attData]')

# Fix triageList
code = code.replace(
'''  const triageList: TriageStudent[] = useMemo(() => {
    return students.map(student => {''',
'''  const rawTriageList = useMemo(() => {
    const studentIds = [...new Set(attData.map(r => r.student_id))]
    return studentIds.map(sid => {''')

code = code.replace('const recs = attData.filter(r => r.student_id === student.id)', 'const recs = attData.filter(r => r.student_id === sid)')
code = code.replace(
'''        return { student, worstClassification, flaggedSubjects, totalAbsences }
      }
      return null
    }).filter((v): v is TriageStudent => v !== null)
      .sort((a, b) => b.totalAbsences - a.totalAbsences)
  }, [students, attData])''',
'''        return { student_id: sid, worstClassification, flaggedSubjects, totalAbsences }
      }
      return null
    }).filter((v) => v !== null)
      .sort((a, b) => b.totalAbsences - a.totalAbsences)
  }, [attData])
  
  const triageList: TriageStudent[] = useMemo(() => {
    return rawTriageList.map(r => ({ ...r, student: getCachedStudent(r.student_id as string) }) as TriageStudent)
  }, [rawTriageList, getCachedStudent])
  
  useEffect(() => {
    if (rawTriageList.length > 0) {
      ensureTriageStudents(rawTriageList.map(r => (r as any).student_id))
    }
  }, [rawTriageList, ensureTriageStudents])''')

# Fix filteredTriage
code = code.replace('students.length', '([...new Set(attData.map(r => r.student_id))].length)')

# Fix sectionStudents inside Roster
code = code.replace(
'''                    const sectionStudents = students.filter(s => s.section === report.section)''',
'''                    const sectionStudents = Object.values(studentsCache).filter(s => s.section === report.section)''')

code = code.replace(
'''          const sectionStudents = students.filter(s => s.section === section)''',
'''          const sectionStudents = Object.values(studentsCache).filter(s => s.section === section)''')

# Fix trendData
code = code.replace(
'''        const student = students.find(s => s.id === r.student_id)
        return student?.section === activeSection''',
'''        return r.section === activeSection''')
code = code.replace(', [attData, activeSection, students]', ', [attData, activeSection]')

code = code.replace(
'''          const secDates = [...new Set(attData.filter(d => {
            const s = students.find(st => st.id === d.student_id)
            return s?.section === report.section
          }).map(d => d.date))].sort().slice(-5)''',
'''          const secDates = [...new Set(attData.filter(d => d.section === report.section).map(d => d.date))].sort().slice(-5)''')

code = code.replace(
'''            const relevant = dayRecs.filter(d => {
              const s = students.find(st => st.id === d.student_id)
              return s?.section === report.section
            })''',
'''            const relevant = dayRecs.filter(d => d.section === report.section)''')



# Now we need to call ensureSectionStudents when a toggleExpand happens or subjectFocus happens
code = re.sub(
r'  const toggleExpand = \(key: string\) => \{.*?return s\n    \}\)\n  \}',
'''  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const s = new Set(prev)
      if (s.has(key)) {
        s.delete(key)
        setSubjectFocus(f => ({ ...f, [key]: null }))
      } else {
        s.add(key)
        ensureSectionStudents(key)
      }
      return s
    })
  }
  
  const toggleSubjectList = (section: string, subject: string) => {
    toggleSubjectFocus(section, subject)
    ensureSectionStudents(section)
  }
''', code, flags=re.DOTALL)

code = code.replace('toggleSubjectFocus(report.section, subj.subject)', 'toggleSubjectList(report.section, subj.subject)')


# Save it
with open('src/app/admin/teachers/components/AdminReportsTab.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
