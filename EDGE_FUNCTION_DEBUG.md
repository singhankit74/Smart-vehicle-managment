# 🔍 Edge Function Not Assigning Roles - Debug Guide

## Problem
Existing users can log in (after manual role assignment), but NEW users created from admin dashboard don't get roles assigned.

## Root Cause
The edge function `create-user` is either:
1. Not being called
2. Failing silently
3. Missing the service role key
4. Has incorrect permissions

## Step-by-Step Debug & Fix

### Step 1: Check Browser Console When Creating User

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try creating a new user from admin dashboard
4. Look for these logs:
   - "Creating user with role: [role]"
   - "Edge function response: [...]"
   - "Edge function error: [...]"

**What to look for:**

- ✅ **If you see "User created successfully with role: employee"** → Edge function is working!
- ❌ **If you see an error** → Note the error message
- ❌ **If you see "Edge function response: { error: '...' }"** → Edge function failed

### Step 2: Check Edge Function Logs

1. Go to: https://supabase.com/dashboard/project/hptzvzkfafastxptmqxb/functions
2. Click on `create-user` function
3. Click on **Logs** or **Invocations** tab
4. Try creating a user again
5. Refresh the logs page

**What to look for:**

- ✅ **"Assigning role [role] to user [UUID]"** → Function is running
- ✅ **"Role assigned successfully"** → Role assignment worked
- ❌ **No logs appear** → Function isn't being called
- ❌ **Error messages** → Note the specific error

### Step 3: Verify Service Role Key is Set

1. Go to: https://supabase.com/dashboard/project/hptzvzkfafastxptmqxb/functions
2. Click on `create-user`
3. Go to **Settings** or **Secrets** tab
4. Check if `SUPABASE_SERVICE_ROLE_KEY` exists

**If it doesn't exist:**

1. Go to: https://supabase.com/dashboard/project/hptzvzkfafastxptmqxb/settings/api
2. Copy the **service_role** key (secret)
3. Go back to Edge Functions → create-user → Secrets
4. Add new secret:
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: [paste the service role key]
5. Save

**If it exists but still not working:**

The key might be wrong. Delete it and add it again with the correct value.

### Step 4: Test Edge Function Directly

Run this in your browser console (while logged in as admin):

```javascript
const { data, error } = await supabase.functions.invoke('create-user', {
  body: {
    fullName: 'Test User',
    email: 'testuser' + Date.now() + '@example.com',
    password: 'Test123456',
    phone: '1234567890',
    role: 'employee'
  }
});

console.log('Response:', data);
console.log('Error:', error);
```

**Expected result:** 
```javascript
Response: { success: true, userId: "...", role: "employee" }
Error: null
```

**If you get an error:** Note the error message - this tells us what's wrong!

### Step 5: Check if Edge Function Has Correct Code

The edge function might have old code. Let's redeploy it:

```bash
cd c:\Users\ankit\Downloads\trip-wise-fleet-main\trip-wise-fleet-main
npx supabase functions deploy create-user --no-verify-jwt
```

Wait for deployment to complete.

### Step 6: Verify Database Trigger Isn't Interfering

Run this SQL to check for conflicting triggers:

```sql
-- Check for triggers on profiles table
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles';
```

**If you see a trigger like `on_profile_created` or `assign_default_role`:**

This trigger might be interfering. Drop it:

```sql
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
DROP TRIGGER IF EXISTS assign_default_role ON profiles;
DROP FUNCTION IF EXISTS assign_default_role();
```

### Step 7: Test Creating a New User

After all fixes:

1. Create a new test user from admin dashboard
2. Check browser console for success message
3. Verify in database:

```sql
-- Check if the new user has a role
SELECT 
  p.email,
  p.full_name,
  ur.role,
  ur.created_at
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE p.email = 'testuser@example.com'  -- Replace with actual email
ORDER BY p.created_at DESC;
```

**Expected:** User should have the role you selected!

## Common Issues & Solutions

### Issue 1: "FunctionsRelayError" or "Function not found"

**Cause:** Edge function not deployed or wrong project

**Fix:**
```bash
npx supabase link --project-ref hptzvzkfafastxptmqxb
npx supabase functions deploy create-user
```

### Issue 2: "Failed to fetch user role" or "Unauthorized"

**Cause:** Service role key not set or incorrect

**Fix:** 
1. Get service role key from Settings → API
2. Add it to Edge Functions → create-user → Secrets
3. Name must be exactly: `SUPABASE_SERVICE_ROLE_KEY`

### Issue 3: Edge function succeeds but role not assigned

**Cause:** Database trigger or RLS policy issue

**Fix:**
```sql
-- Drop interfering trigger
DROP TRIGGER IF EXISTS on_profile_created ON profiles;

-- Ensure RLS allows role insertion
-- The edge function uses service role, so this shouldn't be needed
-- But let's verify the policy exists
SELECT policyname FROM pg_policies 
WHERE tablename = 'user_roles';
```

### Issue 4: "Role assignment error" in logs

**Cause:** Enum mismatch or constraint violation

**Fix:**
```sql
-- Verify enum has correct values
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'app_role'::regtype;
-- Should show: admin, vehicle_manager, employee

-- Check for duplicate role constraint
SELECT * FROM user_roles 
WHERE user_id = 'USER_ID_HERE';
-- Should only have one role per user
```

## Quick Test Script

Run this in Supabase SQL Editor after creating a new user:

```sql
-- Get the most recently created user
WITH latest_user AS (
  SELECT id, email, created_at 
  FROM profiles 
  ORDER BY created_at DESC 
  LIMIT 1
)
SELECT 
  lu.email,
  lu.created_at as user_created,
  ur.role,
  ur.created_at as role_assigned,
  CASE 
    WHEN ur.role IS NULL THEN '❌ NO ROLE - EDGE FUNCTION FAILED'
    WHEN ur.created_at - lu.created_at < INTERVAL '5 seconds' THEN '✅ ROLE ASSIGNED IMMEDIATELY'
    ELSE '⚠️ ROLE ASSIGNED BUT DELAYED'
  END as status
FROM latest_user lu
LEFT JOIN user_roles ur ON lu.id = ur.user_id;
```

## Still Not Working?

If after all these steps it's still not working:

1. **Check Edge Function Environment Variables:**
   - Go to Edge Functions → create-user → Settings
   - Verify all required env vars are set

2. **Redeploy with fresh code:**
   ```bash
   npx supabase functions delete create-user
   npx supabase functions deploy create-user
   ```

3. **Check Supabase project status:**
   - Go to Dashboard home
   - Check if project is paused or has issues

4. **Manual workaround (temporary):**
   Create a database trigger to assign roles automatically:
   
   ```sql
   -- Create function to assign role based on email pattern
   CREATE OR REPLACE FUNCTION auto_assign_role()
   RETURNS TRIGGER AS $$
   BEGIN
     -- Default to employee
     INSERT INTO user_roles (user_id, role)
     VALUES (NEW.id, 'employee'::app_role)
     ON CONFLICT (user_id, role) DO NOTHING;
     
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   -- Create trigger
   CREATE TRIGGER auto_assign_role_trigger
     AFTER INSERT ON profiles
     FOR EACH ROW
     EXECUTE FUNCTION auto_assign_role();
   ```

   **Note:** This is a workaround. The proper fix is to get the edge function working.

## Success Checklist

- [ ] Service role key is set in edge function secrets
- [ ] Edge function is deployed (check deployments count)
- [ ] Browser console shows "User created successfully with role: [role]"
- [ ] Edge function logs show "Role assigned successfully"
- [ ] New users have roles in database (verified via SQL)
- [ ] New users can log in and redirect correctly

## Need More Help?

Provide these details:
1. Browser console output when creating user
2. Edge function logs (from Supabase dashboard)
3. Result of the "Quick Test Script" above
4. Any error messages you see
