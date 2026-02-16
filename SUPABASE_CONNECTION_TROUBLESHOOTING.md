# Supabase Connection Troubleshooting

## Current Error
```
ERROR Error fetching schools: {"hint": "Double check your Supabase `anon` or `service_role` API key.", "message": "Invalid API key"}
```

## Possible Causes & Solutions

### 1. **Verify Supabase Credentials**

Your current credentials:
- **URL:** `https://wjjskzrsohjjxigfveyg.supabase.co`
- **Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Action:** Double-check these in your Supabase dashboard:
1. Go to https://supabase.com/dashboard
2. Select your project: `wjjskzrsohjjxigfveyg`
3. Go to **Settings** → **API**
4. Verify:
   - **Project URL** matches
   - **anon/public** key matches

---

### 2. **Schools Table Doesn't Exist**

The error might occur if the `schools` table hasn't been created yet.

**Action:** Run this SQL in Supabase SQL Editor:

```sql
-- Check if schools table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'schools'
);

-- If false, create the table
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  address TEXT,
  city TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON public.schools
  FOR SELECT USING (true);
```

---

### 3. **Row Level Security (RLS) Blocking Access**

If RLS is enabled but no policies exist, queries will fail.

**Action:** Temporarily disable RLS for testing:

```sql
-- Disable RLS on schools table (ONLY FOR TESTING)
ALTER TABLE public.schools DISABLE ROW LEVEL SECURITY;
```

**Or create a permissive policy:**

```sql
-- Allow anyone to read schools
CREATE POLICY "Allow public select" ON public.schools
  FOR SELECT USING (true);
```

---

### 4. **Environment Variables Not Loaded**

Expo might not have picked up the new `.env` file.

**Action:** Restart Expo with cache clear:

```bash
# Stop the current server (Ctrl+C)
# Then run:
npm start -- --clear
```

---

### 5. **API Key Format Issue**

The key should be a JWT token (which yours is).

**Action:** Verify the key format:
- Should start with `eyJ`
- Should have 3 parts separated by `.`
- Your key: ✅ Correct format

---

## Quick Test

Create a test file to verify the connection:

**File:** `test-supabase-connection.js`

```javascript
import { supabase } from './src/lib/supabase';

const testConnection = async () => {
  console.log('Testing Supabase connection...');
  console.log('URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
  console.log('Key (first 20 chars):', process.env.EXPO_PUBLIC_SUPABASE_KEY?.substring(0, 20));

  try {
    // Test 1: Simple query
    const { data, error } = await supabase
      .from('schools')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Connection failed:', error);
      return false;
    }

    console.log('✅ Connection successful!');
    console.log('Data:', data);
    return true;
  } catch (err) {
    console.error('❌ Exception:', err);
    return false;
  }
};

testConnection();
```

---

## Recommended Steps (In Order)

### Step 1: Verify Credentials
1. Open Supabase Dashboard
2. Go to Settings → API
3. Copy the **Project URL** and **anon public** key
4. Compare with your `.env` file

### Step 2: Check Tables
```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

### Step 3: Create Schools Table (if missing)
```sql
-- Run the CREATE TABLE script from section 2 above
```

### Step 4: Disable RLS (temporarily)
```sql
ALTER TABLE public.schools DISABLE ROW LEVEL SECURITY;
```

### Step 5: Restart Expo
```bash
# Stop current server
# Run:
npm start -- --clear
```

### Step 6: Test Again
- Open your app
- Check if the error persists

---

## If Still Not Working

### Option A: Use Service Role Key (ONLY FOR TESTING)
```bash
# In .env - ONLY FOR TESTING, NEVER IN PRODUCTION
EXPO_PUBLIC_SUPABASE_KEY=<your-service-role-key>
```

### Option B: Check Supabase Logs
1. Go to Supabase Dashboard
2. Click **Logs** → **API Logs**
3. Look for failed requests
4. Check the error details

### Option C: Verify Project Status
1. Go to Supabase Dashboard
2. Check if project is **Active** (not paused)
3. Check if there are any billing issues

---

## Expected Result

After fixing, you should see:
```
✅ Connection successful
✅ Schools loaded (or empty array if no data)
```

Instead of:
```
❌ Error fetching schools: Invalid API key
```

---

## Next Steps After Connection Works

1. Run all database migrations
2. Seed test data
3. Continue with integration as per IMPLEMENTATION_GUIDE.md

---

## Need More Help?

If the issue persists:
1. Share the output from Supabase API Logs
2. Verify your Supabase project is active
3. Check if you can query the database from Supabase SQL Editor
4. Try creating a new anon key in Supabase dashboard
