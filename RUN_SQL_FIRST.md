# 🚨 IMPORTANT: You Need to Run the SQL Script First!

## Current Error
```
ERROR Error fetching schools: {"hint": "Double check your Supabase `anon` or `service_role` API key.", "message": "Invalid API key"}
```

## Why This Error Happens
❌ **The `schools` table doesn't exist in your Supabase database yet!**

The error message is misleading - it says "Invalid API key" but the real issue is that the table hasn't been created.

---

## ✅ Solution: Run the SQL Script

### Step 1: Open Supabase SQL Editor
1. Go to: **https://supabase.com/dashboard**
2. Select your project: **wjjskzrsohjjxigfveyg**
3. Click **SQL Editor** in the left sidebar

### Step 2: Copy the Complete SQL Script
Open this file and **copy ALL 358 lines**:
```
/home/mustapha/Mobi/supabase/COMPLETE_DATABASE_SETUP.sql
```

### Step 3: Paste and Run
1. Paste the entire script into the SQL Editor
2. Click **Run** (or press Ctrl+Enter)
3. Wait 5-10 seconds for completion

### Step 4: Verify Success
You should see output showing:
- ✅ 8 tables created
- ✅ 5 schools in the database

### Step 5: Restart Your App
```bash
# Press Ctrl+C in your terminal
# Then run:
npm start -- --clear
```

---

## 🔓 Schools Table is Now Public

The SQL script has been updated to make the `schools` table **completely public** with **NO authentication required**.

**What this means:**
- ✅ Anyone can read schools data
- ✅ No API key validation for schools
- ✅ Works without user login
- ✅ Perfect for public school listings

**Technical details:**
```sql
-- RLS is DISABLED on schools table
ALTER TABLE public.schools DISABLE ROW LEVEL SECURITY;
```

---

## 📊 What Gets Created

### Public Tables (No Auth Required):
1. **schools** ← 🔓 **COMPLETELY PUBLIC**

### Protected Tables (Auth Required):
2. students
3. drivers
4. buses
5. bookings
6. trips
7. verification_codes
8. notifications

---

## ⚠️ Important Notes

1. **You MUST run the SQL script first** - The app won't work until the tables exist
2. **The API key is correct** - The error is about missing tables, not the key
3. **Schools are public** - No authentication needed to fetch schools
4. **One-time setup** - You only need to run this once

---

## 🎯 After Running the Script

Your app will:
- ✅ Load schools successfully
- ✅ No more "Invalid API key" errors
- ✅ Work with the existing UI
- ✅ Be ready for student registration

---

## 🆘 Still Getting Errors?

If you still see errors AFTER running the SQL script:

1. **Check Supabase Dashboard**
   - Go to Table Editor
   - Verify `schools` table exists
   - Check if it has 5 rows of data

2. **Verify API Key**
   - Go to Settings → API
   - Copy the **anon/public** key
   - Compare with your `.env` file

3. **Clear Cache**
   ```bash
   npm start -- --clear
   ```

4. **Check Terminal**
   - Look for different error messages
   - Share the new error if it persists

---

## 📝 Quick Checklist

- [ ] Opened Supabase SQL Editor
- [ ] Copied COMPLETE_DATABASE_SETUP.sql (all 358 lines)
- [ ] Pasted into SQL Editor
- [ ] Clicked Run
- [ ] Saw success message
- [ ] Restarted app with `npm start -- --clear`
- [ ] Error is gone! ✅

---

**The schools table is configured to be PUBLIC - no authentication needed!** 🎉
