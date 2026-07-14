const { createClient } = require('@supabase/supabase-js');

async function main() {
    const supabaseUrl = "https://xnispwbbrjahvssxhnfy.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuaXNwd2JicmphaHZzc3hobmZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjAyNTgyMiwiZXhwIjoyMDgxNjAxODIyfQ.5guO3R23DMmpjtPBHRfeONeq-NfpdUBF6Vt00J00DSI";
    
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
