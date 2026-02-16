# 🚀 Quick Start - Database Setup

## Step 1: Open Supabase SQL Editor

1. Go to **https://supabase.com/dashboard**
2. Select your project: **wjjskzrsohjjxigfveyg**
3. Click **SQL Editor** in the left sidebar (or press `Ctrl+K` and type "SQL")

## Step 2: Copy the SQL Script

Open this file and copy ALL the content:
```
/home/mustapha/Mobi/supabase/COMPLETE_DATABASE_SETUP.sql
```

## Step 3: Paste and Run

1. Paste the entire SQL script into the SQL Editor
2. Click **Run** (or press `Ctrl+Enter`)
3. Wait for it to complete (should take 5-10 seconds)

## Step 4: Verify Success

You should see output like this:
```
table_name              | column_count
------------------------|-------------
bookings                | 12
buses                   | 6
drivers                 | 9
notifications           | 7
schools                 | 9
students                | 9
trips                   | 9
verification_codes      | 7

id                                   | name                      | name_ar              | city
-------------------------------------|---------------------------|----------------------|-------------
<uuid>                               | University of Casablanca  | جامعة الدار البيضاء  | Casablanca
<uuid>                               | Mohammed V University     | جامعة محمد الخامس    | Rabat
...
```

## Step 5: Restart Your App

```bash
# In your terminal, press Ctrl+C to stop the current server
# Then run:
npm start -- --clear
```

## ✅ Expected Result

The error should be gone! You should see:
```
✅ No errors
✅ App loads successfully
✅ Schools data loads (if you're using SchoolPicker)
```

## 🎉 What Was Created

### Tables (9 total):
1. **schools** - School information with locations
2. **students** - Student profiles
3. **drivers** - Driver profiles
4. **buses** - Bus/vehicle information
5. **bookings** - Trip bookings
6. **trips** - Active trips with live tracking
7. **verification_codes** - Email/phone verification
8. **notifications** - User notifications

### Sample Data:
- ✅ 5 Moroccan universities in the schools table

### Security:
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Public read access for schools
- ✅ Proper policies for students and drivers

### Real-time:
- ✅ Live updates enabled for trips (location tracking)
- ✅ Live updates enabled for bookings (status changes)

## 🔍 Troubleshooting

### If you get an error:
1. Make sure you copied the ENTIRE SQL script
2. Check if you have permission to create tables
3. Try running the script again (it's safe to run multiple times)

### If the app still shows errors:
1. Restart the Expo server: `npm start -- --clear`
2. Clear your app cache
3. Check the terminal for any new errors

## 📝 Next Steps

After the database is set up:
1. ✅ Database is ready
2. ⏭️ Follow the **IMPLEMENTATION_GUIDE.md** to connect your screens
3. ⏭️ Start with authentication integration
4. ⏭️ Then integrate StudentHomeScreen

---

**Need help?** Check the **SUPABASE_CONNECTION_TROUBLESHOOTING.md** file.
