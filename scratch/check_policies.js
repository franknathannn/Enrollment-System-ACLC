const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && !k.startsWith('#')) env[k.trim()] = v.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: "SELECT schemaname, tablename, policyname, roles, cmd, qual FROM pg_policies WHERE schemaname = 'public'"
  });
  if (error) {
    console.error("RPC failed, trying fallback...", error);
    // Let's run a direct query using postgres if possible, or print tables info
  } else {
    console.log("Policies:", data);
  }
}
run();
