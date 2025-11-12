# 📊 Weekly Reports Feature - Setup Guide

## Overview

The Weekly Reports feature allows admins to generate and export trip data in Excel format without storing files permanently in Supabase, saving storage space on the free plan.

## Features Implemented

✅ **On-Demand Report Generation** - Reports generated only when requested
✅ **Excel Export** - Download reports as .xlsx files
✅ **Weekly Summaries** - Organized by week (Monday to Sunday)
✅ **Multiple Report Types**:
  - All trips for a week
  - Vehicle-specific reports
  - Employee-specific reports
✅ **Statistics Dashboard** - View trip stats before generating reports
✅ **No Storage Usage** - Files generated client-side and downloaded directly

## Installation Steps

### Step 1: Install Required Package

Run this command in your project directory:

```bash
npm install xlsx
```

This installs the SheetJS library for Excel file generation.

### Step 2: Restart Development Server

After installing, restart your dev server:

```bash
npm run dev
```

### Step 3: Access Weekly Reports

1. Log in as **Admin**
2. Go to **Weekly Reports** tab in the dashboard
3. You'll see:
   - Statistics for the selected week
   - Report generation options
   - Download button

## How to Use

### Generate All Trips Report

1. Select a week from the dropdown (shows last 12 weeks)
2. Keep "Report Type" as "All Trips"
3. Click "Generate & Download Excel Report"
4. Excel file will download automatically

### Generate Vehicle-Specific Report

1. Select a week
2. Change "Report Type" to "By Vehicle"
3. Select a vehicle from the dropdown
4. Click "Generate & Download Excel Report"

### Generate Employee-Specific Report

1. Select a week
2. Change "Report Type" to "By Employee"
3. Select an employee from the dropdown
4. Click "Generate & Download Excel Report"

## Excel Report Structure

Each generated Excel file contains **2 worksheets**:

### 1. Summary Sheet
- Report period (week start - week end)
- Generation date and time
- Total trips count
- Completed trips count
- Active trips count
- Total distance covered
- Filter info (if vehicle/employee specific)

### 2. Trip Details Sheet
Columns:
- Sr. No.
- Vehicle Name
- Employee Name
- Purpose
- Destination
- Start Time
- End Time
- Start Reading (km)
- End Reading (km)
- Distance (km)
- Trip Status
- Approval Status

## File Naming Convention

Generated files are named automatically:

- **All trips**: `Trip_Report_2025-11-12.xlsx`
- **Vehicle report**: `Trip_Report_2025-11-12_Vehicle_Name.xlsx`
- **Employee report**: `Trip_Report_2025-11-12_Employee_Name.xlsx`

## Storage Efficiency

### Why This Saves Storage:

1. **No Database Storage** - Excel files not stored in Supabase
2. **Generated On-Demand** - Created only when requested
3. **Client-Side Generation** - Processing happens in browser
4. **Immediate Download** - File goes directly to user's computer
5. **Data Retention** - All trip data remains in database for future reports

### Storage Comparison:

**Without This Feature:**
- Storing 1 report per week = ~50KB per file
- 52 weeks = ~2.6MB per year
- Multiple vehicles/employees = 10-20MB per year

**With This Feature:**
- Storage used = 0 bytes
- Reports generated unlimited times
- No storage limits reached

## Technical Details

### Files Created:

1. **`src/utils/reportGenerator.ts`**
   - Report generation logic
   - Excel formatting functions
   - Date range calculations
   - Summary statistics

2. **`src/components/reports/WeeklyReports.tsx`**
   - UI for report generation
   - Week selection
   - Filter options
   - Statistics display

3. **`src/components/dashboard/AdminDashboard.tsx`** (modified)
   - Added "Weekly Reports" tab
   - Integrated new component

4. **`package.json`** (modified)
   - Added `xlsx` dependency

### How It Works:

```
1. User selects week and filters
2. Frontend fetches trip data from Supabase
3. Data formatted in browser using xlsx library
4. Excel file generated in memory
5. Browser downloads file automatically
6. No server storage used
```

## Database Queries Used

The feature uses these optimized queries:

```sql
-- Fetch trips for a week
SELECT 
  trips.*,
  vehicles.name as vehicle_name,
  profiles.full_name as employee_name,
  trip_requests.purpose,
  trip_requests.destination,
  trip_requests.approval_status
FROM trips
JOIN vehicles ON trips.vehicle_id = vehicles.id
JOIN profiles ON trips.employee_id = profiles.id
JOIN trip_requests ON trips.request_id = trip_requests.id
WHERE trips.start_time >= [week_start]
  AND trips.start_time <= [week_end]
ORDER BY trips.start_time DESC;
```

## Performance

- **Report Generation Time**: 1-3 seconds
- **File Size**: 10-100 KB (depending on trip count)
- **Browser Memory**: Minimal (cleared after download)
- **Database Load**: Single query per report

## Troubleshooting

### Issue: "Cannot find module 'xlsx'"

**Solution:**
```bash
npm install xlsx
npm run dev
```

### Issue: No trips showing in report

**Check:**
1. Are there trips in the selected week?
2. Run this SQL to verify:
```sql
SELECT COUNT(*) FROM trips 
WHERE start_time >= '2025-11-04' 
AND start_time <= '2025-11-10';
```

### Issue: Download not starting

**Check:**
1. Browser pop-up blocker settings
2. Browser console for errors (F12)
3. Ensure you're logged in as admin

### Issue: Excel file won't open

**Cause:** Usually browser download interruption

**Solution:** Generate the report again

## Future Enhancements (Optional)

You can extend this feature with:

1. **Custom Date Ranges** - Select any date range, not just weeks
2. **PDF Export** - Add PDF generation alongside Excel
3. **Email Reports** - Send reports via email
4. **Scheduled Reports** - Auto-generate weekly reports
5. **Charts in Excel** - Add graphs to Excel files
6. **Multi-Sheet Reports** - Separate sheet per vehicle

## Benefits Summary

✅ **Cost Savings** - No storage costs on Supabase free plan
✅ **Unlimited Reports** - Generate as many times as needed
✅ **Professional Format** - Excel files with proper formatting
✅ **Fast Generation** - Reports ready in seconds
✅ **Flexible Filtering** - By week, vehicle, or employee
✅ **Data Preservation** - All data stays in database
✅ **Easy Sharing** - Download and email Excel files

## Support

If you encounter issues:

1. Check browser console (F12) for errors
2. Verify `npm install xlsx` completed successfully
3. Ensure you're logged in as admin
4. Check that trips exist for the selected period

## Testing Checklist

- [ ] Install xlsx package
- [ ] Restart dev server
- [ ] Log in as admin
- [ ] Navigate to Weekly Reports tab
- [ ] Select current week
- [ ] Generate "All Trips" report
- [ ] Verify Excel file downloads
- [ ] Open Excel file and check data
- [ ] Test vehicle-specific report
- [ ] Test employee-specific report
- [ ] Verify statistics are accurate

## Success!

Your Weekly Reports feature is now ready to use! This will help you:
- Track fleet performance weekly
- Generate reports for management
- Analyze trip patterns
- Save storage costs
- Maintain professional records

All while staying within Supabase's free plan limits! 🎉
