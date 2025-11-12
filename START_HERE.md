# 🚀 START HERE - New Supabase Project Setup

## ✅ What's Been Done

Your project has been configured for the new Supabase instance:

### Updated Files:
1. ✅ `.env` - New Supabase credentials
2. ✅ `supabase/config.toml` - New project ID
3. ✅ `COMPLETE_DATABASE_SETUP.sql` - All SQL to run
4. ✅ `MIGRATION_GUIDE.md` - Detailed setup instructions
5. ✅ `QUICK_SQL_REFERENCE.md` - Useful SQL queries

### New Credentials:
- **Project ID:** `hptzvzkfafastxptmqxb`
- **Project URL:** `https://hptzvzkfafastxptmqxb.supabase.co`
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (configured in .env)

## 🎯 Quick Start (3 Steps)

### Step 1: Run Database Setup (5 minutes)
1. Open: https://supabase.com/dashboard/project/hptzvzkfafastxptmqxb/sql
2. Copy all content from `COMPLETE_DATABASE_SETUP.sql`
3. Paste and click **Run**
4. Wait for "Success" message

### Step 2: Deploy Edge Function (2 minutes)
```bash
# In your terminal:
cd c:\Users\ankit\Downloads\trip-wise-fleet-main\trip-wise-fleet-main
npx supabase login
npx supabase link --project-ref hptzvzkfafastxptmqxb
npx supabase functions deploy create-user
```

### Step 3: Create First Admin (3 minutes)
1. Go to: https://supabase.com/dashboard/project/hptzvzkfafastxptmqxb/auth/users
2. Click **Add User** → **Create new user**
3. Enter your email and password
4. Check **Auto Confirm User**
5. Click **Create User** and copy the User ID
6. Go to SQL Editor and run:
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_ID_HERE', 'admin');
```

## 🏃 Start Your App

```bash
npm install
npm run dev
```

Then open http://localhost:5173 and log in with your admin credentials!

## 📚 Documentation Files

- **`MIGRATION_GUIDE.md`** - Complete setup guide with troubleshooting
- **`COMPLETE_DATABASE_SETUP.sql`** - All database setup SQL (run this first!)
- **`QUICK_SQL_REFERENCE.md`** - Useful SQL queries for management
- **`ROLE_FIX_INSTRUCTIONS.md`** - Info about the role redirect bug fix

## 🔍 Verify Setup

After completing the steps above, test:

1. ✅ Log in as admin → Should redirect to `/admin/dashboard`
2. ✅ Create a vehicle manager user
3. ✅ Log in as vehicle manager → Should redirect to `/vehicle-manager/dashboard`
4. ✅ Create an employee user
5. ✅ Log in as employee → Should redirect to `/employee/dashboard`

## ⚠️ Important Notes

1. **Service Role Key**: You'll need to add this to your edge function environment:
   - Get it from: Dashboard → Settings → API → `service_role` (secret)
   - Add in: Dashboard → Edge Functions → create-user → Settings

2. **First Admin**: You MUST create the first admin manually (Step 3 above)

3. **Role Bug Fixed**: The issue where vehicle managers were redirected to employee dashboard is now fixed!

## 🆘 Need Help?

### Common Issues:

**"Cannot connect to Supabase"**
- Check `.env` file has correct credentials
- Restart dev server: `npm run dev`

**"Edge function not found"**
- Run: `npx supabase functions deploy create-user`

**"Permission denied"**
- Verify admin role: `SELECT * FROM user_roles WHERE user_id = 'YOUR_ID';`

### Full Documentation:
- See `MIGRATION_GUIDE.md` for detailed troubleshooting
- See `QUICK_SQL_REFERENCE.md` for useful queries

## 📊 What You Get

### Database Tables:
- **profiles** - User information
- **user_roles** - Role assignments
- **vehicles** - Vehicle inventory
- **trip_requests** - Trip requests from employees
- **trips** - Active and completed trips

### User Roles:
- **admin** - Full access, create users, approve trips
- **vehicle_manager** - Manage vehicles, assign to trips
- **employee** - Create trip requests, manage own trips

### Features:
- ✅ Role-based authentication
- ✅ Secure user creation
- ✅ Trip request workflow
- ✅ Vehicle management
- ✅ Meter photo uploads
- ✅ Location tracking

## 🎉 You're All Set!

Follow the 3 quick steps above and you'll have a fully functional fleet management system with proper role-based access control.

**Next:** Open `MIGRATION_GUIDE.md` for detailed instructions.
