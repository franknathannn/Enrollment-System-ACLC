-- Trigger Function for Activity Logging
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_id uuid;
    v_admin_name text := 'SYSTEM';
    v_action_type text;
    v_student_name text := 'N/A';
    v_student_image text := NULL;
    v_student_id uuid := NULL;
    v_details text;
BEGIN
    -- Try to get the authenticated user ID
    v_admin_id := auth.uid();
    
    -- Try to resolve admin name if admin_id exists
    IF v_admin_id IS NOT NULL THEN
        SELECT full_name INTO v_admin_name FROM public.admin_profiles WHERE id = v_admin_id;
        IF v_admin_name IS NULL THEN
            v_admin_name := 'Admin';
        END IF;
    END IF;

    -- Handle STUDENTS table
    IF TG_TABLE_NAME = 'students' THEN
        v_student_name := NEW.first_name || ' ' || NEW.last_name;
        v_student_image := NEW.profile_picture;
        v_student_id := NEW.id;
        
        IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
            v_action_type := NEW.status;
            v_details := 'Status updated from ' || OLD.status || ' to ' || NEW.status;
        ELSE
            RETURN NEW; -- Ignore other student updates for now to prevent spam
        END IF;
        
    -- Handle SECTIONS table
    ELSIF TG_TABLE_NAME = 'sections' THEN
        IF TG_OP = 'INSERT' THEN
            v_action_type := 'CREATED';
            v_details := 'Created new ' || NEW.strand || ' section: ' || NEW.section_name;
        ELSIF TG_OP = 'DELETE' THEN
            v_action_type := 'DELETED';
            v_details := 'Deleted section: ' || OLD.section_name || ' (' || OLD.strand || ')';
        END IF;
        
    -- Handle ADMIN MESSAGES
    ELSIF TG_TABLE_NAME IN ('admin_messages', 'admin_dm_messages', 'teacher_global_chat_messages') THEN
        IF TG_OP = 'DELETE' THEN
            v_action_type := 'DELETED';
            v_details := 'Deleted a message in ' || TG_TABLE_NAME;
        END IF;
        
    -- Handle SCHOOL CALENDAR EVENTS
    ELSIF TG_TABLE_NAME = 'school_calendar_events' THEN
        IF TG_OP = 'INSERT' THEN
            v_action_type := 'CREATED';
            v_details := 'Added calendar event: ' || NEW.title;
        ELSIF TG_OP = 'UPDATE' THEN
            v_action_type := 'UPDATED';
            v_details := 'Updated calendar event: ' || NEW.title;
        ELSIF TG_OP = 'DELETE' THEN
            v_action_type := 'DELETED';
            v_details := 'Deleted calendar event: ' || OLD.title;
        END IF;
        
    -- Handle CLASS SUSPENSIONS
    ELSIF TG_TABLE_NAME = 'class_suspensions' THEN
        IF TG_OP = 'INSERT' THEN
            v_action_type := 'CREATED';
            v_details := 'Added class suspension for ' || NEW.suspension_date || ' (Reason: ' || NEW.reason || ')';
        ELSIF TG_OP = 'DELETE' THEN
            v_action_type := 'DELETED';
            v_details := 'Removed class suspension for ' || OLD.suspension_date;
        END IF;
        
    -- Handle SYSTEM SETTINGS / CONFIG
    ELSIF TG_TABLE_NAME IN ('system_config', 'system_settings') THEN
        IF TG_OP = 'UPDATE' THEN
            v_action_type := 'UPDATED';
            IF TG_TABLE_NAME = 'system_settings' THEN
                v_details := 'Updated system setting: ' || NEW.setting_key;
            ELSE
                v_details := 'Updated system config parameters.';
            END IF;
        END IF;
        
    -- Handle TEACHERS
    ELSIF TG_TABLE_NAME = 'teachers' THEN
        IF TG_OP = 'INSERT' THEN
            v_action_type := 'CREATED';
            v_details := 'Added new teacher: ' || NEW.full_name;
        ELSIF TG_OP = 'DELETE' THEN
            v_action_type := 'DELETED';
            v_details := 'Deleted teacher: ' || OLD.full_name;
        END IF;
    END IF;

    -- Insert the log
    IF v_action_type IS NOT NULL THEN
        INSERT INTO public.activity_logs (
            admin_id, admin_name, action_type, student_name, details, student_image, student_id
        ) VALUES (
            v_admin_id, v_admin_name, UPPER(v_action_type), v_student_name, v_details, v_student_image, v_student_id
        );
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers to avoid duplication
DROP TRIGGER IF EXISTS tr_log_students ON public.students;
DROP TRIGGER IF EXISTS tr_log_sections ON public.sections;
DROP TRIGGER IF EXISTS tr_log_admin_messages ON public.admin_messages;
DROP TRIGGER IF EXISTS tr_log_admin_dm_messages ON public.admin_dm_messages;
DROP TRIGGER IF EXISTS tr_log_teacher_global_chat_messages ON public.teacher_global_chat_messages;
DROP TRIGGER IF EXISTS tr_log_school_calendar_events ON public.school_calendar_events;
DROP TRIGGER IF EXISTS tr_log_class_suspensions ON public.class_suspensions;
DROP TRIGGER IF EXISTS tr_log_system_config ON public.system_config;
DROP TRIGGER IF EXISTS tr_log_system_settings ON public.system_settings;
DROP TRIGGER IF EXISTS tr_log_teachers ON public.teachers;

-- Create Triggers
CREATE TRIGGER tr_log_students AFTER UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER tr_log_sections AFTER INSERT OR DELETE ON public.sections FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER tr_log_admin_messages AFTER DELETE ON public.admin_messages FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER tr_log_admin_dm_messages AFTER DELETE ON public.admin_dm_messages FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER tr_log_teacher_global_chat_messages AFTER DELETE ON public.teacher_global_chat_messages FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER tr_log_school_calendar_events AFTER INSERT OR UPDATE OR DELETE ON public.school_calendar_events FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER tr_log_class_suspensions AFTER INSERT OR DELETE ON public.class_suspensions FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER tr_log_system_config AFTER UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER tr_log_system_settings AFTER UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER tr_log_teachers AFTER INSERT OR DELETE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- Trigger Function for Auto-Creating Grade 12 Sections on School Year Update
CREATE OR REPLACE FUNCTION public.auto_create_g12_sections_on_sy_change()
RETURNS TRIGGER AS $$
DECLARE
    r record;
    g12_name text;
    has_g12 integer;
BEGIN
    -- Check if the school_year has actually changed
    IF NEW.school_year IS DISTINCT FROM OLD.school_year THEN
        -- Loop through all existing Grade 11 sections
        FOR r IN SELECT section_name, strand, capacity FROM public.sections WHERE grade_level = '11' LOOP
            -- Derive Grade 12 section name
            g12_name := REPLACE(r.section_name, '11', '12');
            
            -- Check if it already exists
            SELECT COUNT(*) INTO has_g12 FROM public.sections WHERE section_name = g12_name;
            
            IF has_g12 = 0 THEN
                INSERT INTO public.sections (section_name, strand, grade_level, capacity)
                VALUES (g12_name, r.strand, '12', r.capacity);
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS tr_auto_create_g12_sections ON public.system_config;

-- Create trigger on system_config
CREATE TRIGGER tr_auto_create_g12_sections
AFTER UPDATE OF school_year ON public.system_config
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_g12_sections_on_sy_change();

