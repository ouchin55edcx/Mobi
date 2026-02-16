# Supabase Integration Plan for Mobi App

## Overview
This document outlines the complete integration plan to connect your existing frontend to Supabase, making all data and user actions fully dynamic while preserving the existing UI/UX.

## Critical Constraints ✅
- ✅ **NO UI/UX changes** - All existing layouts, colors, pages, and routes remain unchanged
- ✅ **NO new features** - Only connecting existing functionality to Supabase
- ✅ **Data-only changes** - Replace static/mock data with real Supabase queries
- ✅ **Preserve all existing flows** - Same user experience, powered by real data

---

## Database Schema Design

### 1. **Students Table** (Already exists)
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fullname TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  cin TEXT UNIQUE NOT NULL,
  school_id UUID REFERENCES schools(id),
  home_location JSONB NOT NULL, -- { latitude, longitude }
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. **Schools Table** (Already exists)
```sql
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_ar TEXT,
  address TEXT,
  city TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. **Bookings Table** (Already exists)
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id),
  bus_id UUID REFERENCES buses(id),
  type TEXT CHECK (type IN ('PICKUP', 'DROPOFF')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  pickup_location JSONB, -- { latitude, longitude }
  destination_location JSONB, -- { latitude, longitude }
  route_coordinates JSONB, -- Array of { latitude, longitude }
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);
```

### 4. **Trips Table** (For live tracking)
```sql
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  driver_id UUID REFERENCES drivers(id),
  bus_id UUID REFERENCES buses(id),
  current_location JSONB, -- { latitude, longitude }
  status TEXT DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. **Drivers Table** (Already exists)
```sql
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fullname TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  cin TEXT UNIQUE NOT NULL,
  license_number TEXT,
  approval_status TEXT DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6. **Buses Table** (Already exists)
```sql
CREATE TABLE buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number TEXT UNIQUE NOT NULL,
  capacity INTEGER NOT NULL,
  driver_id UUID REFERENCES drivers(id),
  status TEXT DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'IN_USE', 'MAINTENANCE')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7. **Verification Codes Table** (Already exists)
```sql
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT CHECK (type IN ('EMAIL', 'PHONE')),
  entity_type TEXT CHECK (entity_type IN ('STUDENT', 'DRIVER')),
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8. **Notifications Table** (Already exists)
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_type TEXT CHECK (user_type IN ('STUDENT', 'DRIVER')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('TRIP_UPDATE', 'BOOKING_CONFIRMED', 'DRIVER_ASSIGNED', 'GENERAL')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Frontend-to-Backend Mapping

### **Student Screens**

#### 1. **StudentHomeScreen.js**
**Current State:** Uses demo/static data for home location, school location, and bookings

**Supabase Integration:**
- **On Mount:**
  - Fetch student data: `getStudentById(studentId)`
  - Fetch active booking: `getActiveBooking(studentId)`
  - Use `student.home_location` for map markers
  - Use `student.schools.latitude/longitude` for school location

- **Actions:**
  - **Book Trip:** Call `createBooking({ studentId, type, startTime, endTime, ... })`
  - **Cancel Trip:** Call `cancelBooking(bookingId)` or `updateBooking(bookingId, { status: 'CANCELLED' })`

**Data Flow:**
```javascript
// On component mount
useEffect(() => {
  const loadData = async () => {
    const { data: student } = await getStudentById(studentId);
    setHomeLocation(student.home_location);
    setSchoolLocation({ 
      latitude: student.schools.latitude, 
      longitude: student.schools.longitude 
    });
    
    const { data: booking } = await getActiveBooking(studentId);
    setActiveBooking(booking);
  };
  loadData();
}, [studentId]);

// On booking confirmation
const handleConfirmBooking = async () => {
  const { data, error } = await createBooking({
    studentId,
    type: 'PICKUP',
    startTime: schoolEntryTime,
    endTime: new Date(schoolEntryTime.getTime() + 45 * 60 * 1000),
    pickupLocation: markers.middle.location,
    destinationLocation: schoolLocation,
    routeCoordinates: getRouteCoordinates()
  });
  
  if (!error) {
    setActiveBooking(data);
    setTripStatus('active');
  }
};
```

---

#### 2. **HistoryScreen.js**
**Current State:** Uses static/demo trip history data

**Supabase Integration:**
- **On Mount:**
  - Fetch trip history: `getBookingsByStudent(studentId, { status: 'COMPLETED' })`
  - Display trips sorted by date

- **Filters:**
  - Filter by date range using Supabase query with date filters
  - Filter by status (completed, cancelled)

**Data Flow:**
```javascript
useEffect(() => {
  const loadHistory = async () => {
    const { data: trips } = await getBookingsByStudent(studentId, { 
      status: 'COMPLETED',
      limit: 50 
    });
    setTripHistory(trips);
  };
  loadHistory();
}, [studentId]);
```

---

#### 3. **ProfileScreen.js**
**Current State:** Uses static student profile data

**Supabase Integration:**
- **On Mount:**
  - Fetch student profile: `getStudentById(studentId)`
  - Display student info (name, email, phone, school, etc.)

- **Actions:**
  - **Update Profile:** Call `updateStudent(studentId, updates)`

**Data Flow:**
```javascript
useEffect(() => {
  const loadProfile = async () => {
    const { data: student } = await getStudentById(studentId);
    setStudentData(student);
  };
  loadProfile();
}, [studentId]);

const handleUpdateProfile = async (updates) => {
  const { data, error } = await updateStudent(studentId, updates);
  if (!error) {
    setStudentData(data);
  }
};
```

---

#### 4. **LiveTrackingScreen.js**
**Current State:** Uses static trip data for live tracking

**Supabase Integration:**
- **On Mount:**
  - Fetch trip details: `getTripById(tripId)` or use booking data
  - Subscribe to real-time updates: `supabase.channel().on('postgres_changes', ...)`

- **Real-time Updates:**
  - Listen for driver location updates
  - Update map markers and route in real-time

**Data Flow:**
```javascript
useEffect(() => {
  // Subscribe to trip updates
  const channel = supabase
    .channel(`trip:${tripId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'trips',
      filter: `id=eq.${tripId}`
    }, (payload) => {
      setCurrentLocation(payload.new.current_location);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [tripId]);
```

---

#### 5. **StudentRegisterScreen.js**
**Current State:** Calls `createStudent()` service

**Supabase Integration:**
- **Already integrated** ✅
- Uses `createStudent()` from `studentService.js`
- After registration, creates verification code and sends email

**No changes needed** - already connected to Supabase

---

#### 6. **EmailVerificationScreen.js**
**Current State:** Calls verification service

**Supabase Integration:**
- **Already integrated** ✅
- Uses `verifyEmailCode()` from `verificationService.js`

**No changes needed** - already connected to Supabase

---

### **Authentication & Session Management**

#### **Login Flow**
**Current State:** No real authentication, uses demo mode

**Supabase Integration:**
- **Option 1: Email/Password Auth (Recommended)**
  ```javascript
  const handleLogin = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (!error) {
      // Fetch student data
      const { data: student } = await getStudentByEmail(email);
      setStudentData(student);
      setCurrentScreen('studentHome');
    }
  };
  ```

- **Option 2: Magic Link (Passwordless)**
  ```javascript
  const handleLogin = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (!error) {
      // Show verification screen
    }
  };
  ```

- **Session Persistence:**
  - Supabase automatically handles session persistence via AsyncStorage
  - Check for existing session on app mount:
  ```javascript
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Auto-login user
        loadUserData(session.user.email);
      }
    });
  }, []);
  ```

---

### **Protected Routes**

**Implementation:**
```javascript
// Add auth check wrapper
const ProtectedScreen = ({ children, onUnauthorized }) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthorized(true);
      } else {
        onUnauthorized();
      }
    });
  }, []);
  
  if (!isAuthorized) return null;
  return children;
};
```

---

## Service Layer Updates

### **1. Update bookingService.js**

Add missing fields to `createBooking`:
```javascript
export const createBooking = async (bookingData) => {
  const { data, error } = await supabase
    .from('bookings')
    .insert([{
      student_id: bookingData.studentId,
      type: bookingData.type,
      start_time: bookingData.startTime.toISOString(),
      end_time: bookingData.endTime.toISOString(),
      pickup_location: bookingData.pickupLocation,
      destination_location: bookingData.destinationLocation,
      route_coordinates: bookingData.routeCoordinates,
      status: 'PENDING'
    }])
    .select()
    .single();
  
  return { data, error };
};
```

### **2. Create tripService.js**

New service for trip tracking:
```javascript
import { supabase } from '../lib/supabase';

export const createTrip = async (tripData) => {
  const { data, error } = await supabase
    .from('trips')
    .insert([{
      booking_id: tripData.bookingId,
      driver_id: tripData.driverId,
      bus_id: tripData.busId,
      status: 'SCHEDULED'
    }])
    .select()
    .single();
  
  return { data, error };
};

export const updateTripLocation = async (tripId, location) => {
  const { data, error } = await supabase
    .from('trips')
    .update({ 
      current_location: location,
      updated_at: new Date().toISOString()
    })
    .eq('id', tripId)
    .select()
    .single();
  
  return { data, error };
};

export const getTripById = async (tripId) => {
  const { data, error } = await supabase
    .from('trips')
    .select(`
      *,
      bookings (*),
      drivers (*),
      buses (*)
    `)
    .eq('id', tripId)
    .single();
  
  return { data, error };
};
```

---

## Real-time Features

### **1. Live Trip Tracking**

Enable real-time subscriptions for driver location updates:

```javascript
// In LiveTrackingScreen.js
useEffect(() => {
  const channel = supabase
    .channel('trip-tracking')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'trips',
      filter: `id=eq.${tripId}`
    }, (payload) => {
      // Update driver location on map
      setDriverLocation(payload.new.current_location);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [tripId]);
```

### **2. Booking Status Updates**

Real-time booking status changes:

```javascript
// In StudentHomeScreen.js
useEffect(() => {
  const channel = supabase
    .channel('booking-updates')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'bookings',
      filter: `student_id=eq.${studentId}`
    }, (payload) => {
      // Update booking status
      setActiveBooking(payload.new);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [studentId]);
```

---

## Error Handling & Loading States

### **Pattern to Follow:**

```javascript
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    const { data, error } = await getStudentById(studentId);
    
    if (error) {
      setError(error.message);
    } else {
      setStudentData(data);
    }
    
    setLoading(false);
  };
  
  loadData();
}, [studentId]);

// In render
if (loading) {
  return <ActivityIndicator />; // Keep existing loading UI
}

if (error) {
  return <Text>{error}</Text>; // Keep existing error UI
}
```

---

## Security & RLS Policies

### **Row Level Security (RLS)**

Enable RLS on all tables and create policies:

#### **Students Table:**
```sql
-- Students can only read/update their own data
CREATE POLICY "Students can view own data" ON students
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Students can update own data" ON students
  FOR UPDATE USING (auth.uid()::text = id::text);
```

#### **Bookings Table:**
```sql
-- Students can only access their own bookings
CREATE POLICY "Students can view own bookings" ON bookings
  FOR SELECT USING (student_id::text = auth.uid()::text);

CREATE POLICY "Students can create own bookings" ON bookings
  FOR INSERT WITH CHECK (student_id::text = auth.uid()::text);

CREATE POLICY "Students can update own bookings" ON bookings
  FOR UPDATE USING (student_id::text = auth.uid()::text);
```

---

## Migration Checklist

### **Phase 1: Database Setup** ✅
- [x] Create all tables (already done)
- [ ] Add missing columns to bookings table (pickup_location, destination_location, route_coordinates)
- [ ] Verify RLS policies
- [ ] Seed test data

### **Phase 2: Service Layer**
- [x] studentService.js (already done)
- [x] bookingService.js (already done)
- [ ] Update bookingService to include location fields
- [ ] Create tripService.js for live tracking
- [ ] Add real-time subscription helpers

### **Phase 3: Authentication**
- [ ] Implement Supabase Auth in LoginScreen
- [ ] Add session persistence
- [ ] Add logout functionality
- [ ] Protect routes with auth checks

### **Phase 4: Student Screens**
- [ ] StudentHomeScreen - Connect to real bookings
- [ ] HistoryScreen - Fetch real trip history
- [ ] ProfileScreen - Fetch/update real student data
- [ ] LiveTrackingScreen - Add real-time subscriptions
- [ ] ActiveTripScreen - Connect to real trip data

### **Phase 5: Testing**
- [ ] Test registration flow
- [ ] Test login/logout
- [ ] Test booking creation
- [ ] Test trip tracking
- [ ] Test real-time updates
- [ ] Test error handling

---

## Implementation Priority

### **High Priority (Core Functionality):**
1. ✅ Update .env with new Supabase credentials
2. Authentication (Login/Logout)
3. StudentHomeScreen booking integration
4. Active booking display
5. Trip history

### **Medium Priority:**
6. Profile management
7. Real-time trip tracking
8. Booking cancellation

### **Low Priority:**
9. Notifications
10. Advanced filters
11. Performance optimizations

---

## Next Steps

1. **Update database schema** - Add missing columns to bookings table
2. **Implement authentication** - Add Supabase Auth to LoginScreen
3. **Update StudentHomeScreen** - Connect to real bookings
4. **Add real-time subscriptions** - For live tracking
5. **Test thoroughly** - Ensure all flows work with real data

---

## Notes

- All existing UI/UX remains unchanged ✅
- No new features added ✅
- Only data connections and logic updates ✅
- Existing demo mode can remain for testing ✅
- All services already use proper error handling ✅
