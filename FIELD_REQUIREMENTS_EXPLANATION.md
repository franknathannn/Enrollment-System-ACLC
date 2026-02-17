# Field Requirements Control Center - Explanation

## What Does "Editable" Do?

The **Editable** toggle controls whether a field can be modified by students during enrollment:

- **✅ Editable (ON)**: Students can type, change, or modify this field
- **❌ Editable (OFF)**: Field is **locked/disabled** - students cannot modify it (read-only)

### Use Cases for Disabling Editability:

1. **Pre-filled Data**: If you pre-fill certain fields from previous records, lock them to prevent changes
2. **System-Managed Fields**: Fields like `school_year` are auto-filled and shouldn't be changed
3. **Verified Information**: Once verified, lock fields to prevent tampering
4. **Administrative Control**: Lock fields that should only be changed by admins

### Example:
- If `first_name` is set to **Editable: OFF**, the input field becomes disabled/grayed out
- Students can see the value but cannot change it
- This is useful for pre-enrollment scenarios where you've already collected some data

## What Does "Required" Do?

The **Required** toggle controls validation:

- **✅ Required (ON)**: Field must be filled out - form won't submit without it
- **❌ Required (OFF)**: Field is optional - form can submit even if empty

### Use Cases for Making Fields Optional:

1. **Pre-Enrollment Period**: Make documents like Form 138, Good Moral optional during early enrollment
2. **Flexible Requirements**: Some students may not have certain documents yet
3. **Progressive Enrollment**: Collect essential info first, optional documents later

## Live Updates Feature

### How It Works:

1. **Real-time Sync**: When an admin changes field requirements in Settings, all open enrollment forms update **instantly** without page refresh
2. **Two-Way Communication**:
   - **PostgreSQL Changes**: Listens for database updates
   - **Broadcast Events**: Immediate notifications when settings are saved
3. **Automatic Schema Update**: Form validation schema updates automatically when requirements change

### Technical Implementation:

- Uses Supabase **Realtime** subscriptions
- Broadcasts changes via Supabase channels
- Forms automatically reload requirements when changes are detected
- No manual refresh needed - changes apply LIVE across all open forms

## Example Workflow:

1. Admin opens Settings → Enrollment Form Control Center
2. Admin makes "Form 138" optional (turns off Required)
3. Admin saves changes
4. **Instantly**, all students filling out Step 4 see:
   - Form 138 field no longer has red asterisk (*)
   - Form can be submitted without Form 138
   - Changes apply immediately - no page refresh needed

## Best Practices:

1. **Pre-Enrollment**: Make non-critical documents optional
2. **Regular Enrollment**: Make all required documents mandatory
3. **Lock Critical Fields**: Disable editability for verified information
4. **Test Changes**: Always test in a separate tab to see live updates

