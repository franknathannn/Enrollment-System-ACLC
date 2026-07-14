require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
        process.exit(1);
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
        .from('school_calendar_events')
        .select('*');
        
    if (error) {
        console.error(error);
        return;
    }
    console.log("Calendar events in DB:");
    console.log(data);
}

main().catch(console.error);
