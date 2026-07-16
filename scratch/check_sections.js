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
  const { data: sections, error } = await supabase.from('sections').select('*');
  if (error) {
    console.error("Error fetching sections:", error);
    return;
  }
  
  console.log("--- SECTIONS IN DATABASE ---");
  let sum = 0;
  sections.forEach(s => {
    const cap = s.capacity || 40;
    console.log(`ID: ${s.id} | Name: ${s.section_name} | Strand: ${s.strand} | Grade: ${s.grade_level} | Capacity: ${s.capacity} (computed as ${cap})`);
    sum += cap;
  });
  console.log("----------------------------");
  console.log(`Total sections: ${sections.length}`);
  console.log(`Sum of computed capacities: ${sum}`);
}

check();
