# Migration Guide - New Supabase Project Setup

## Overview
This guide will help you set up your Trip Wise Fleet application on a fresh Supabase project.

## ✅ Completed Steps
1. ✅ Updated `.env` file with new credentials
2. ✅ Updated `supabase/config.toml` with new project ID

## 📋 Setup Instructions

### Step 1: Run Database Setup SQL

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/hptzvzkfafastxptmqxb
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `COMPLETE_DATABASE_SETUP.sql`
5. Paste it into the SQL Editor
6. Click **Run** to execute the script

This will create:
- All database tables (profiles, user_roles, vehicles, trip_requests, trips)
- All RLS policies for security
- Helper functions
- Storage bucket for meter photos
- Proper role system (admin, vehicle_manager, employee)

### Step 2: Deploy Edge Functions

The application uses a Supabase Edge Function to create users. Deploy it:

```bash
# Navigate to your project directory
cd c:\Users\ankit\Downloads\trip-wise-fleet-main\trip-wise-fleet-main

# Login to Supabase CLI (if not already logged in)
npx supabase login

# Link to your new project
npx supabase link --project-ref hptzvzkfafastxptmqxb

# Deploy the create-user edge function
npx supabase functions deploy create-user
```

### Step 3: Create Your First Admin User

Since you need an admin to create other users, you'll need to create the first admin manually:

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to **Authentication** → **Users** in your Supabase Dashboard
2. Click **Add User** → **Create new user**
3. Enter:
   - Email: `admin@yourcompany.com` (use your actual email)
   - Password: Choose a strong password
   - Auto Confirm User: **Yes** (check this box)
4. Click **Create User**
5. Copy the User ID (UUID) that appears

6. Now go to **SQL Editor** and run this query (replace `YOUR_USER_ID` with the actual UUID):

```sql
-- Insert admin role for your first user
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_ID', 'admin');
```

#### Option B: Using SQL Editor Directly

Run this in SQL Editor (replace email and password):

```sql
-- Create admin user
DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Insert into auth.users (you'll need to set password via dashboard)
  -- For now, just note the email you want to use
  -- Then manually create the user via dashboard and run the role assignment
END $$;
```

**Note:** It's easier to use Option A above.

### Step 4: Update Environment Variables (Already Done ✅)

Your `.env` file has been updated with:
```
VITE_SUPABASE_PROJECT_ID="hptzvzkfafastxptmqxb"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://hptzvzkfafastxptmqxb.supabase.co"
```

### Step 5: Install Dependencies and Start Application

```bash
# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

### Step 6: Test the Setup

1. Open your browser to the local development URL (usually http://localhost:5173)
2. Log in with your admin credentials
3. You should be redirected to `/admin/dashboard`
4. Try creating a new user:
   - Create a **Vehicle Manager** user
   - Create an **Employee** user
5. Log out and test logging in with each new user to verify proper redirects

## 🔍 Verification Checklist

- [ ] Database tables created successfully
- [ ] Storage bucket `meter-photos` exists
- [ ] Edge function `create-user` deployed
- [ ] First admin user created and can log in
- [ ] Admin redirects to `/admin/dashboard`
- [ ] Can create vehicle manager users
- [ ] Vehicle managers redirect to `/vehicle-manager/dashboard`
- [ ] Can create employee users
- [ ] Employees redirect to `/employee/dashboard`

## 📊 Database Schema Overview

### Tables Created:
1. **profiles** - User profile information
2. **user_roles** - User role assignments (admin, vehicle_manager, employee)
3. **vehicles** - Vehicle inventory
4. **trip_requests** - Trip requests from employees
5. **trips** - Active and completed trips

### Roles Hierarchy:
- **admin** - Full access, can create users, approve trips, manage vehicles
- **vehicle_manager** - Can manage vehicles, assign vehicles to approved trips
- **employee** - Can create trip requests, manage own trips

## 🔧 Troubleshooting

### Issue: "Edge function not found"
**Solution:** Make sure you deployed the edge function:
```bash
npx supabase functions deploy create-user
```

### Issue: "Permission denied" when creating users
**Solution:** Verify your admin user has the admin role:
```sql
SELECT * FROM user_roles WHERE user_id = 'YOUR_USER_ID';
```

### Issue: Vehicle manager redirects to employee dashboard
**Solution:** This was the original bug - it's fixed in the new setup. If it still happens:
1. Check the user's role in database:
```sql
SELECT p.email, ur.role 
FROM profiles p 
JOIN user_roles ur ON p.id = ur.user_id 
WHERE p.email = 'vehicle_manager@email.com';
```
2. If role is wrong, update it:
```sql
UPDATE user_roles 
SET role = 'vehicle_manager' 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'vehicle_manager@email.com');
```

### Issue: "Cannot connect to Supabase"
**Solution:** 
1. Verify your `.env` file has the correct credentials
2. Check that your Supabase project is active
3. Restart your development server

## 📝 Important Notes

1. **Service Role Key**: You'll need to add the service role key to your edge function environment variables. Get it from:
   - Supabase Dashboard → Settings → API → `service_role` key (secret)
   - Add it as an environment variable in your edge function settings

2. **Storage Bucket**: The `meter-photos` bucket is created as public. If you need it private, update the bucket settings in Supabase Dashboard → Storage.

3. **RLS Policies**: All tables have Row Level Security enabled. Users can only access data they're authorized to see based on their role.

4. **Edge Function**: The `create-user` function handles user creation securely without exposing the service role key to the client.

## 🎉 Success!

Once all steps are complete, your application should be fully functional on the new Supabase project with:
- ✅ Proper role-based authentication
- ✅ Correct dashboard redirects
- ✅ Secure user creation
- ✅ All original functionality preserved

## 📞 Need Help?

If you encounter any issues:
1. Check the browser console for errors
2. Check Supabase logs in Dashboard → Logs
3. Verify all SQL queries executed successfully
4. Ensure edge function is deployed and has correct environment variables
