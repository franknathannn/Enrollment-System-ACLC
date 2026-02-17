# Database Migration: Field Requirements

## Overview
This migration adds a `field_requirements` JSONB column to the `system_config` table to store dynamic field validation requirements for the enrollment forms.

## SQL Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Add field_requirements column to system_config table
ALTER TABLE system_config 
ADD COLUMN IF NOT EXISTS field_requirements JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN system_config.field_requirements IS 'Stores dynamic field requirements (required/editable) for enrollment forms. Format: {"field_name": {"required": boolean, "editable": boolean}}';
```

## What This Enables

1. **Dynamic Field Requirements**: Admins can control which fields are required vs optional
2. **Pre-Enrollment Flexibility**: Allows students to enroll without certain documents (e.g., Form 138, Good Moral, AF5) during pre-enrollment periods
3. **Field Editability Control**: Admins can lock/unlock fields from editing

## Default Behavior

If `field_requirements` is NULL or a field is missing, the system uses default requirements:
- Most identity fields: Required
- Middle names: Optional
- Documents (Form 138, Good Moral, etc.): Optional by default
- Core documents (2x2 ID, Birth Certificate): Required by default

## Usage

The settings page now includes an "Enrollment Form Control Center" component where admins can:
- Toggle required/optional status for each field
- Control field editability
- Reset to defaults

Changes are saved to the `field_requirements` JSONB column and immediately affect form validation.

