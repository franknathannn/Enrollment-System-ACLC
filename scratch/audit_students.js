const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && !k.startsWith('#')) env[k.trim()] = v.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const VALID_CATEGORIES = ['JHS Graduate', 'ALS Passer', 'PEPT Passer', 'Private non-ESC', 'Transferee'];

async function audit() {
  console.log("🔍 Auditing student categories...");
  const { data: students, error } = await supabase
    .from('students')
    .select('id, first_name, last_name, student_category, school_year, status');

  if (error) {
    console.error("Error fetching students:", error);
    return;
  }

  const unrecognized = [];
  const validCount = {};
  
  students.forEach(s => {
    const cat = s.student_category;
    if (!cat || !VALID_CATEGORIES.includes(cat)) {
      unrecognized.push(s);
    } else {
      validCount[cat] = (validCount[cat] || 0) + 1;
    }
  });

  console.log("\n📊 Valid Categories Breakdown:");
  console.log(validCount);

  if (unrecognized.length > 0) {
    console.log(`\n⚠️ Found ${unrecognized.length} students with unrecognized/missing categories:`);
    unrecognized.forEach(s => {
      console.log(`- [${s.id}] ${s.first_name} ${s.last_name}: Category = "${s.student_category || 'NULL'}" (Status: ${s.status}, SY: ${s.school_year})`);
    });
  } else {
    console.log("\n✅ All student categories are valid and standardized!");
  }
}

audit();
