# Login Redirect Issue - Debugging & Fix

## Problem
Users are created successfully but after login, they see "Login successfully" toast but don't get redirected to their dashboard.

## Root Causes (Possible)

1. **Roles not being assigned** - Edge function may not be assigning roles
2. **RLS Policy blocking role fetch** - User can't read their own role
3. **Edge function not deployed** - Using old version without role assignment
4. **Profile not created** - Trigger may not be working

## Step-by-Step Fix

### Step 1: Check if Edge Function is Deployed

Run this command to deploy the updated edge function:

```bash
npx supabase functions deploy create-user
```

**Important:** Make sure you've linked to the correct project first:
```bash
npx supabase link --project-ref hptzvzkfafastxptmqxb
```

### Step 2: Verify Roles Are Being Assigned

After creating a user, run this SQL query in Supabase SQL Editor:

```sql
-- Check if roles are being assigned
SELECT 
  p.email,
  p.full_name,
  ur.role,
  ur.created_at
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
ORDER BY p.created_at DESC
LIMIT 10;
```

**Expected Result:** You should see the role (employee or vehicle_manager) for each user.

**If roles are NULL:** The edge function isn't assigning roles properly.

### Step 3: Check RLS Policies

The issue might be that users can't read their own roles. Run this to verify:

```sql
-- Check if RLS policy exists for users to view their own roles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_roles'
AND policyname = 'Users can view their own roles';
```

**Expected Result:** Should return one row with the policy.

**If missing:** Run this to create it:

```sql
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);
```

### Step 4: Test with Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try logging in with a created user
4. Look for these console logs:
   - "User logged in: [UUID]"
   - "Roles fetched: [array]"
   - "Role list: [array]"
   - "Redirecting to [dashboard]"

**If you see "Roles fetched: []"** → Roles aren't assigned
**If you see "Role error: [error]"** → RLS policy issue

### Step 5: Manual Role Assignment (Temporary Fix)

If roles aren't being assigned automatically, assign them manually:

```sql
-- For an employee user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'employee'::app_role
FROM profiles
WHERE email = 'employee@example.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- For a vehicle manager
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'vehicle_manager'::app_role
FROM profiles
WHERE email = 'manager@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

### Step 6: Verify Edge Function Environment

The edge function needs the service role key. Check if it's set:

1. Go to Supabase Dashboard
2. Navigate to Edge Functions → create-user
3. Click on Settings/Secrets
4. Verify `SUPABASE_SERVICE_ROLE_KEY` is set

**If not set:**
1. Go to Settings → API
2. Copy the `service_role` key (secret)
3. Add it as a secret to the edge function

### Step 7: Check Edge Function Logs

1. Go to Supabase Dashboard → Edge Functions → create-user
2. Click on Logs
3. Look for errors when creating users
4. Check for messages like:
   - "Assigning role [role] to user [UUID]"
   - "Role assigned successfully"

### Step 8: Verify Database Setup

Make sure all migrations ran successfully:

```sql
-- Check if the app_role enum has all 3 roles
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'app_role'::regtype
ORDER BY enumsortorder;
```

**Expected Result:**
- admin
- vehicle_manager
- employee

**If only 2 roles:** Run the role update migration from `COMPLETE_DATABASE_SETUP.sql`

## Quick Fix Script

Run this entire script in SQL Editor to fix common issues:

```sql
-- 1. Ensure RLS policy exists
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Check and display users without roles
SELECT 
  p.id,
  p.email,
  p.full_name,
  CASE 
    WHEN ur.role IS NULL THEN 'NO ROLE ASSIGNED'
    ELSE ur.role::text
  END as current_role
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
ORDER BY p.created_at DESC;

-- 3. If you see users without roles, assign them manually:
-- (Uncomment and modify as needed)
-- INSERT INTO user_roles (user_id, role)
-- SELECT id, 'employee'::app_role FROM profiles WHERE email = 'user@example.com'
-- ON CONFLICT (user_id, role) DO NOTHING;
```

## Testing After Fix

1. Create a new test user from admin dashboard
2. Check browser console for logs
3. Check SQL to verify role was assigned:
```sql
SELECT p.email, ur.role 
FROM profiles p 
JOIN user_roles ur ON p.id = ur.user_id 
WHERE p.email = 'testuser@example.com';
```
4. Log in with test user credentials
5. Verify redirect to correct dashboard

## Common Error Messages

### "No role assigned. Please contact admin."
**Cause:** User exists but has no role in user_roles table
**Fix:** Assign role manually using SQL above

### "Failed to fetch user role. Please contact admin."
**Cause:** RLS policy blocking access or database error
**Fix:** Check RLS policies and database logs

### "Invalid role. Please contact admin."
**Cause:** Role exists but isn't recognized (typo or wrong enum value)
**Fix:** Check role value in database matches enum exactly

## Deployment Checklist

- [ ] Edge function deployed: `npx supabase functions deploy create-user`
- [ ] Service role key set in edge function secrets
- [ ] RLS policy exists for users to view their own roles
- [ ] app_role enum has all 3 values (admin, vehicle_manager, employee)
- [ ] Test user created and role assigned
- [ ] Login works and redirects correctly

## Still Not Working?

If the issue persists after all steps:

1. **Check Supabase Dashboard Logs:**
   - Database → Logs
   - Edge Functions → create-user → Logs

2. **Verify Network Requests:**
   - Open DevTools → Network tab
   - Filter for "user_roles"
   - Check the response

3. **Test RLS Directly:**
```sql
-- Run this as the logged-in user (use their JWT)
SELECT * FROM user_roles WHERE user_id = auth.uid();
```

4. **Contact Support:**
   - Provide edge function logs
   - Provide browser console logs
   - Provide SQL query results from Step 2
