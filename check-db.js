const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && !k.startsWith('#')) env[k.trim()] = v.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: student } = await supabase.from('students').select('*').ilike('last_name', '%ESTRADA%').ilike('first_name', '%MARCO%').limit(1).single();
  if(!student) { console.log("Student not found"); return; }
  console.log("Marco Student:", student.id, student.strand, student.grade_level, student.gender, student.status);
  
  const studentGradeLevel = student.grade_level || "11";
  
  const { data: sections } = await supabase.from('sections').select('*').eq('strand', student.strand).eq('grade_level', studentGradeLevel);
  console.log("\nSections matching Strand:", student.strand, " Grade:", studentGradeLevel);
  console.log(sections);
  
  const { data: allStudents } = await supabase.from('students').select('section_id, gender, grade_level').eq('strand', student.strand).eq('grade_level', studentGradeLevel).in('status', ['Accepted', 'Approved']).not('section_id', 'is', null);
  
  const occupancy = {};
  sections.forEach(s => occupancy[s.id] = { male: 0, female: 0 });
  allStudents.forEach(s => {
    if(occupancy[s.section_id]) {
        if(s.gender === 'Male') occupancy[s.section_id].male++;
        else occupancy[s.section_id].female++;
    }
  });
  
  console.log("\nOccupancy:");
  sections.forEach(sec => {
      const occ = occupancy[sec.id];
      console.log(`${sec.section_name} - Cap: ${sec.capacity} | Occ: ${occ.male}M + ${occ.female}F = ${occ.male + occ.female}`);
  });
}
check();
