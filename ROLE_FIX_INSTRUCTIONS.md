# Role Assignment Fix - Instructions

## Problem
When creating users with the "Vehicle Manager" role, they were being redirected to the Employee dashboard instead of the Vehicle Manager dashboard upon login.

## Root Cause
A database trigger (`on_profile_created`) was automatically assigning the `employee` role to every new user profile, regardless of the intended role specified during user creation.

## Solution Applied

### 1. Database Migration
Created migration file: `supabase/migrations/20251112000000_fix_role_assignment.sql`

This migration:
- Drops the `on_profile_created` trigger that auto-assigned employee role
- Drops the `assign_default_role()` function that was no longer needed
- Allows the `create-user` edge function to handle role assignment explicitly

### 2. Edge Function Enhancement
Updated `supabase/functions/create-user/index.ts` to:
- Add a small delay after profile creation to ensure any triggers complete
- Explicitly clear all roles before assigning the intended role
- Prevent race conditions between trigger execution and role assignment

## How to Apply the Fix

### Step 1: Apply the Database Migration
Run the following command in your project directory:

```bash
npx supabase db push
```

Or if you're using Supabase CLI directly:

```bash
supabase db push
```

### Step 2: Deploy the Updated Edge Function
Deploy the updated edge function:

```bash
npx supabase functions deploy create-user
```

Or:

```bash
supabase functions deploy create-user
```

### Step 3: Fix Existing Vehicle Managers (if any)
If you have existing users who were created as vehicle managers but are stuck with employee role, you can fix them manually:

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Run this query to find affected users:

```sql
SELECT p.id, p.full_name, p.email, ur.role
FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
WHERE p.email IN ('vehicle_manager1@example.com', 'vehicle_manager2@example.com');
-- Replace with actual email addresses of vehicle managers
```

4. Update their roles:

```sql
UPDATE user_roles
SET role = 'vehicle_manager'
WHERE user_id IN (
  SELECT id FROM profiles WHERE email IN ('vehicle_manager1@example.com')
);
-- Replace with actual email addresses
```

## Verification

After applying the fix:

1. Create a new user with "Vehicle Manager" role
2. Log out from admin account
3. Log in with the new vehicle manager credentials
4. Verify you are redirected to `/vehicle-manager/dashboard`

## Technical Details

### Role Hierarchy
The application uses the following role hierarchy:
- **admin** - Highest priority, full access
- **vehicle_manager** - Can manage vehicles and assign trips
- **employee** - Can create trip requests

### Routing Logic
The authentication flow checks roles in this order:
1. If user has `admin` role → redirect to `/admin/dashboard`
2. If user has `vehicle_manager` role → redirect to `/vehicle-manager/dashboard`
3. If user has `employee` role → redirect to `/employee/dashboard`

### Database Schema
Roles are stored in the `user_roles` table with the following structure:
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key to profiles)
- `role`: app_role enum ('admin', 'vehicle_manager', 'employee')

## Files Modified
1. `supabase/migrations/20251112000000_fix_role_assignment.sql` (new)
2. `supabase/functions/create-user/index.ts` (modified)
