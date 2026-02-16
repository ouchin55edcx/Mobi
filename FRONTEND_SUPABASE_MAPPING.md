# Frontend-to-Supabase Mapping - Quick Reference

This document provides a quick reference for mapping frontend components to Supabase tables and queries.

---

## Student Screens

### 1. StudentHomeScreen.js

| Feature | Supabase Table | Service Function | Data Flow |
|---------|---------------|------------------|-----------|
| Load student info | `students` | `getStudentById(studentId)` | On mount |
| Load home location | `students.home_location` | `getStudentById(studentId)` | On mount |
| Load school location | `schools` (via `students.school_id`) | `getStudentById(studentId)` | On mount |
| Load active booking | `bookings` | `getActiveBooking(studentId)` | On mount |
| Create booking | `bookings` | `createBooking(bookingData)` | On confirm button |
| Cancel booking | `bookings` | `cancelBooking(bookingId)` | On cancel button |

**Key Data Transformations:**
```javascript
// Student data → Map markers
homeLocation = student.home_location
schoolLocation = { 
  latitude: student.schools.latitude, 
  longitude: student.schools.longitude 
}

// Booking data → Trip display
activeBooking = {
  id, student_id, type, start_time, end_time,
  pickup_location, destination_location, route_coordinates,
  status
}
```

---

### 2. HistoryScreen.js

| Feature | Supabase Table | Service Function | Data Flow |
|---------|---------------|------------------|-----------|
| Load trip history | `bookings` | `getBookingsByStudent(studentId, { status: 'COMPLETED' })` | On mount |
| Filter by date | `bookings` | Add date filters to query | On filter change |
| View trip details | `bookings` | `getBookingById(bookingId)` | On trip tap |

**Key Data Transformations:**
```javascript
// Booking → History item
historyItem = {
  id: booking.id,
  date: new Date(booking.start_time),
  type: booking.type,
  status: booking.status,
  route: booking.route_coordinates
}
```

---

### 3. ProfileScreen.js

| Feature | Supabase Table | Service Function | Data Flow |
|---------|---------------|------------------|-----------|
| Load profile | `students` | `getStudentById(studentId)` | On mount |
| Update profile | `students` | `updateStudent(studentId, updates)` | On save button |
| View school info | `schools` (via `students.school_id`) | Included in `getStudentById()` | On mount |

**Key Data Transformations:**
```javascript
// Student data → Profile display
profile = {
  fullname: student.fullname,
  email: student.email,
  phone: student.phone,
  cin: student.cin,
  school: student.schools.name,
  homeLocation: student.home_location
}
```

---

### 4. LiveTrackingScreen.js

| Feature | Supabase Table | Service Function | Data Flow |
|---------|---------------|------------------|-----------|
| Load trip data | `trips` | `getTripByBookingId(bookingId)` | On mount |
| Subscribe to location | `trips` | `subscribeTripUpdates(tripId, callback)` | Real-time |
| Unsubscribe | N/A | `unsubscribeTripUpdates(channel)` | On unmount |

**Key Data Transformations:**
```javascript
// Trip data → Map display
tripData = {
  currentLocation: trip.current_location,
  driver: trip.drivers,
  bus: trip.buses,
  status: trip.status
}

// Real-time update → Location marker
onUpdate: (updatedTrip) => {
  setDriverLocation(updatedTrip.current_location)
}
```

---

### 5. StudentRegisterScreen.js

| Feature | Supabase Table | Service Function | Data Flow |
|---------|---------------|------------------|-----------|
| Create student | `students` | `createStudent(studentData)` | On register button |
| Create verification | `verification_codes` | `createVerificationCode(email)` | After registration |

**Already integrated** ✅

---

### 6. EmailVerificationScreen.js

| Feature | Supabase Table | Service Function | Data Flow |
|---------|---------------|------------------|-----------|
| Verify code | `verification_codes` | `verifyEmailCode(email, code)` | On verify button |
| Update student | `students` | `updateStudent(studentId, { is_verified: true })` | After verification |

**Already integrated** ✅

---

## Authentication Screens

### 7. LoginScreen.js

| Feature | Supabase Table | Service Function | Data Flow |
|---------|---------------|------------------|-----------|
| Sign in | `auth.users` | `signIn(email, password)` | On login button |
| Get user data | `students` or `drivers` | `getUserDataByEmail(email, userType)` | After sign in |
| Session check | `auth.sessions` | `getSession()` | On app mount |

**Key Data Transformations:**
```javascript
// Auth response → User session
authData = {
  user: { id, email, user_metadata },
  session: { access_token, refresh_token }
}

// User data → App state
userData = {
  studentId: student.id,
  email: student.email,
  isDemo: false
}
```

---

## Database Tables Reference

### Students Table
```sql
students (
  id UUID PRIMARY KEY,
  fullname TEXT,
  phone TEXT,
  email TEXT UNIQUE,
  cin TEXT UNIQUE,
  school_id UUID → schools(id),
  home_location JSONB,
  is_verified BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Bookings Table
```sql
bookings (
  id UUID PRIMARY KEY,
  student_id UUID → students(id),
  driver_id UUID → drivers(id),
  bus_id UUID → buses(id),
  type TEXT ('PICKUP' | 'DROPOFF'),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  pickup_location JSONB,
  destination_location JSONB,
  route_coordinates JSONB,
  status TEXT ('PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Trips Table
```sql
trips (
  id UUID PRIMARY KEY,
  booking_id UUID → bookings(id),
  driver_id UUID → drivers(id),
  bus_id UUID → buses(id),
  current_location JSONB,
  status TEXT ('SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Schools Table
```sql
schools (
  id UUID PRIMARY KEY,
  name TEXT,
  name_ar TEXT,
  address TEXT,
  city TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  created_at TIMESTAMPTZ
)
```

---

## Service Functions Summary

### studentService.js
- `createStudent(studentData)` - Create new student
- `getStudentById(studentId)` - Get student with school info
- `getStudentByEmail(email)` - Get student by email
- `updateStudent(studentId, updates)` - Update student data

### bookingService.js
- `createBooking(bookingData)` - Create new booking
- `getBookingsByStudent(studentId, options)` - Get student's bookings
- `getBookingById(bookingId)` - Get single booking
- `getActiveBooking(studentId)` - Get active booking
- `updateBooking(bookingId, updates)` - Update booking
- `cancelBooking(bookingId)` - Cancel booking

### tripService.js (NEW)
- `createTrip(tripData)` - Create trip from booking
- `getTripById(tripId)` - Get trip with all relations
- `getTripByBookingId(bookingId)` - Get trip by booking
- `updateTripLocation(tripId, location)` - Update driver location
- `startTrip(tripId)` - Start trip
- `completeTrip(tripId)` - Complete trip
- `cancelTrip(tripId)` - Cancel trip
- `subscribeTripUpdates(tripId, callback)` - Real-time updates
- `unsubscribeTripUpdates(channel)` - Unsubscribe
- `getActiveTripForStudent(studentId)` - Get student's active trip

### authService.js (NEW)
- `signUp(email, password, metadata)` - Create auth user
- `signIn(email, password)` - Sign in user
- `signInWithMagicLink(email)` - Passwordless login
- `signOut()` - Sign out user
- `getSession()` - Get current session
- `getCurrentUser()` - Get current user
- `updatePassword(newPassword)` - Update password
- `resetPassword(email)` - Send reset email
- `onAuthStateChange(callback)` - Listen to auth changes
- `getUserDataByEmail(email, userType)` - Get user data
- `isAuthenticated()` - Check if authenticated

---

## Real-time Subscriptions

### Trip Location Updates
```javascript
// Subscribe
const channel = subscribeTripUpdates(tripId, (updatedTrip) => {
  setDriverLocation(updatedTrip.current_location);
});

// Unsubscribe
unsubscribeTripUpdates(channel);
```

### Booking Status Updates
```javascript
const channel = supabase
  .channel('booking-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'bookings',
    filter: `student_id=eq.${studentId}`
  }, (payload) => {
    setActiveBooking(payload.new);
  })
  .subscribe();
```

---

## Common Query Patterns

### Get student with school
```javascript
const { data } = await supabase
  .from('students')
  .select(`
    *,
    schools:school_id (
      id, name, name_ar, latitude, longitude
    )
  `)
  .eq('id', studentId)
  .single();
```

### Get active booking
```javascript
const { data } = await supabase
  .from('bookings')
  .select('*')
  .eq('student_id', studentId)
  .in('status', ['PENDING', 'CONFIRMED'])
  .gte('start_time', new Date().toISOString())
  .order('start_time', { ascending: true })
  .limit(1)
  .single();
```

### Get trip with all relations
```javascript
const { data } = await supabase
  .from('trips')
  .select(`
    *,
    bookings (*),
    drivers (*),
    buses (*)
  `)
  .eq('id', tripId)
  .single();
```

---

## Error Handling Pattern

```javascript
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

const loadData = async () => {
  setLoading(true);
  setError(null);
  
  const { data, error } = await serviceFunction();
  
  if (error) {
    setError(error.message);
  } else {
    setData(data);
  }
  
  setLoading(false);
};

// In render
if (loading) return <LoadingIndicator />;
if (error) return <ErrorMessage message={error} />;
```

---

## State Management Pattern

```javascript
// Component state
const [studentData, setStudentData] = useState(null);
const [activeBooking, setActiveBooking] = useState(null);
const [loading, setLoading] = useState(true);

// Load on mount
useEffect(() => {
  loadData();
}, [studentId]);

// Update on action
const handleAction = async () => {
  const { data, error } = await serviceFunction();
  if (!error) {
    setState(data);
  }
};
```

---

This quick reference should help you quickly find the right service function and data transformation for each screen!
