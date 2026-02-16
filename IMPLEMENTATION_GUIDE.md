# Supabase Integration - Step-by-Step Implementation Guide

This guide provides detailed, actionable steps to connect your Mobi app to Supabase while preserving all existing UI/UX.

---

## Phase 1: Database Setup

### Step 1.1: Run Database Migrations

Execute these SQL files in your Supabase SQL Editor (in order):

1. **Create core tables** (if not already done):
   - `create_schools_table.sql`
   - `create_students_table.sql`
   - `create_drivers_table.sql`
   - `create_buses_table.sql`
   - `create_bookings_table.sql`
   - `create_trips_table.sql`
   - `create_verification_codes_table.sql`
   - `create_notifications_table.sql`

2. **Add location fields to bookings**:
   ```bash
   # Run this new migration file
   supabase/add_location_fields_to_bookings.sql
   ```

### Step 1.2: Verify Tables

Check that all tables exist with correct columns:

```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

### Step 1.3: Seed Test Data

Create a test school and student:

```sql
-- Insert test school
INSERT INTO schools (name, name_ar, address, city, latitude, longitude)
VALUES (
  'Test School',
  'مدرسة تجريبية',
  '123 Test Street',
  'Rabat',
  33.5800,
  -7.5920
)
RETURNING id;

-- Insert test student (use the school ID from above)
INSERT INTO students (fullname, phone, email, cin, school_id, home_location, is_verified)
VALUES (
  'Test Student',
  '+212600000000',
  'test@student.com',
  'AB123456',
  '<SCHOOL_ID_FROM_ABOVE>',
  '{"latitude": 33.5731, "longitude": -7.5898}',
  true
);
```

---

## Phase 2: Authentication Integration

### Step 2.1: Update LoginScreen Component

**File:** `/home/mustapha/Mobi/components/LoginScreen.js`

Add authentication logic:

```javascript
import { signIn, getUserDataByEmail } from '../src/services/authService';

// Inside LoginScreen component
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const handleLogin = async () => {
  setLoading(true);
  setError(null);

  // Sign in with Supabase Auth
  const { data: authData, error: authError } = await signIn(email, password);

  if (authError) {
    setError(authError.message);
    setLoading(false);
    return;
  }

  // Get user data (student or driver)
  const { data: userData, error: userError } = await getUserDataByEmail(
    email,
    'student' // or 'driver' based on role selection
  );

  if (userError) {
    setError('User data not found');
    setLoading(false);
    return;
  }

  setLoading(false);
  
  // Navigate to home screen
  onLoginSuccess(userData);
};
```

### Step 2.2: Add Session Persistence to App.js

**File:** `/home/mustapha/Mobi/App.js`

Add session check on app mount:

```javascript
import { getSession, getUserDataByEmail } from './src/services/authService';

// Inside App component
useEffect(() => {
  const checkSession = async () => {
    const { data: sessionData } = await getSession();
    
    if (sessionData?.session) {
      const email = sessionData.session.user.email;
      const userType = sessionData.session.user.user_metadata?.type || 'student';
      
      // Get user data
      const { data: userData } = await getUserDataByEmail(email, userType);
      
      if (userData) {
        if (userType === 'student') {
          setStudentData({
            studentId: userData.id,
            email: userData.email,
            isDemo: false
          });
          setCurrentScreen('studentHome');
        } else if (userType === 'driver') {
          setDriverData({
            driverId: userData.id,
            email: userData.email,
            isDemo: false
          });
          setCurrentScreen('driverHome');
        }
      }
    }
  };
  
  checkSession();
}, []);
```

### Step 2.3: Implement Logout

Add logout functionality to tab navigators:

```javascript
import { signOut } from '../src/services/authService';

const handleLogout = async () => {
  await signOut();
  onLogout(); // Call parent logout handler
};
```

---

## Phase 3: StudentHomeScreen Integration

### Step 3.1: Load Student Data on Mount

**File:** `/home/mustapha/Mobi/screens/students/StudentHomeScreen.js`

Replace demo data loading with real Supabase queries:

```javascript
import { getStudentById } from '../../src/services/studentService';
import { getActiveBooking, createBooking } from '../../src/services/bookingService';

// Add state for loading
const [loading, setLoading] = useState(true);
const [studentData, setStudentData] = useState(null);

// Update the useEffect for loading data
useEffect(() => {
  const loadStudentData = async () => {
    if (isDemo) {
      // Keep demo mode as is
      const demoTrip = getDemoActiveTrip();
      setActiveBooking(demoTrip);
      if (demoTrip && demoTrip.status !== 'COMPLETED' && demoTrip.status !== 'CANCELLED') {
        setTripStatus('active');
      }
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Fetch student data
      const { data: student, error: studentError } = await getStudentById(studentId);
      
      if (studentError) {
        console.error('Error loading student:', studentError);
        setLoading(false);
        return;
      }

      setStudentData(student);

      // Update locations from student data
      if (student.home_location) {
        // homeLocation is already set in component props, but we can update if needed
      }

      // Fetch active booking
      const { data: booking, error: bookingError } = await getActiveBooking(studentId);
      
      if (!bookingError && booking) {
        setActiveBooking(booking);
        if (booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED') {
          setTripStatus('active');
        }
      }
    } catch (err) {
      console.error('Exception loading student data:', err);
    }

    setLoading(false);
  };

  loadStudentData();
}, [studentId, isDemo]);

// Show loading indicator
if (loading) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    </SafeAreaView>
  );
}
```

### Step 3.2: Update Booking Creation

Update the `handleConfirmBooking` function:

```javascript
const handleConfirmBooking = async () => {
  if (!schoolEntryTime) {
    return;
  }

  const routeCoords = getRouteCoordinates();
  const markers = getMapMarkers();

  // Create booking in Supabase
  const { data: newBooking, error } = await createBooking({
    studentId,
    type: 'PICKUP',
    startTime: schoolEntryTime,
    endTime: new Date(schoolEntryTime.getTime() + 45 * 60 * 1000),
    pickupLocation: markers.middle.location,
    destinationLocation: schoolLocation,
    routeCoordinates: routeCoords,
  });

  if (error) {
    console.error('Error creating booking:', error);
    // Show error to user (keep existing UI)
    return;
  }

  // Update state with new booking
  setActiveBooking(newBooking);
  setTripStatus('active');

  // Transform and navigate to trip details
  if (onNavigateToTripDetails) {
    const transformedTripData = transformBookingToTripData(newBooking);
    onNavigateToTripDetails(transformedTripData);
  }
};
```

### Step 3.3: Update Trip Cancellation

Update the cancel button handler:

```javascript
import { cancelBooking } from '../../src/services/bookingService';

// In the cancel button onPress
onPress={async () => {
  if (activeBooking?.id) {
    const { error } = await cancelBooking(activeBooking.id);
    if (!error) {
      setTripStatus('cancelled');
      setConfirmedTripData(null);
      setActiveBooking(null);
    }
  } else {
    setTripStatus('cancelled');
    setConfirmedTripData(null);
  }
}}
```

---

## Phase 4: HistoryScreen Integration

### Step 4.1: Load Trip History

**File:** `/home/mustapha/Mobi/screens/students/HistoryScreen.js`

Replace static data with Supabase queries:

```javascript
import { getBookingsByStudent } from '../../src/services/bookingService';

const [trips, setTrips] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadHistory = async () => {
    if (isDemo) {
      // Keep demo data
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await getBookingsByStudent(studentId, {
      status: 'COMPLETED',
      limit: 50
    });

    if (!error && data) {
      // Transform data to match expected format
      const transformedTrips = data.map(booking => ({
        id: booking.id,
        date: new Date(booking.start_time),
        type: booking.type,
        status: booking.status,
        startTime: booking.start_time,
        endTime: booking.end_time,
        pickupLocation: booking.pickup_location,
        destinationLocation: booking.destination_location,
      }));

      setTrips(transformedTrips);
    }

    setLoading(false);
  };

  loadHistory();
}, [studentId, isDemo]);
```

---

## Phase 5: ProfileScreen Integration

### Step 5.1: Load Profile Data

**File:** `/home/mustapha/Mobi/screens/students/ProfileScreen.js`

```javascript
import { getStudentById, updateStudent } from '../../src/services/studentService';

const [profile, setProfile] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadProfile = async () => {
    if (isDemo) {
      // Keep demo data
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await getStudentById(studentId);

    if (!error && data) {
      setProfile(data);
    }

    setLoading(false);
  };

  loadProfile();
}, [studentId, isDemo]);
```

### Step 5.2: Update Profile

```javascript
const handleUpdateProfile = async (updates) => {
  const { data, error } = await updateStudent(studentId, updates);

  if (!error) {
    setProfile(data);
    // Show success message (keep existing UI)
  } else {
    // Show error message (keep existing UI)
    console.error('Error updating profile:', error);
  }
};
```

---

## Phase 6: Live Tracking Integration

### Step 6.1: Add Real-time Subscriptions

**File:** `/home/mustapha/Mobi/screens/students/LiveTrackingScreen.js`

```javascript
import { subscribeTripUpdates, unsubscribeTripUpdates, getTripByBookingId } from '../../src/services/tripService';

const [driverLocation, setDriverLocation] = useState(null);

useEffect(() => {
  if (!tripId || isDemo) return;

  // Subscribe to trip updates
  const channel = subscribeTripUpdates(tripId, (updatedTrip) => {
    if (updatedTrip.current_location) {
      setDriverLocation(updatedTrip.current_location);
    }
  });

  return () => {
    unsubscribeTripUpdates(channel);
  };
}, [tripId, isDemo]);
```

---

## Phase 7: Testing Checklist

### Test Each Flow:

1. **Registration Flow**
   - [ ] Create new student account
   - [ ] Verify email code
   - [ ] Check student data in Supabase

2. **Login Flow**
   - [ ] Login with email/password
   - [ ] Session persists on app restart
   - [ ] Logout works correctly

3. **Booking Flow**
   - [ ] Create new booking
   - [ ] View active booking
   - [ ] Cancel booking
   - [ ] Booking appears in history

4. **Profile Management**
   - [ ] View profile data
   - [ ] Update profile information
   - [ ] Changes persist

5. **Live Tracking**
   - [ ] View active trip
   - [ ] Real-time location updates work
   - [ ] Trip completion updates status

---

## Common Issues & Solutions

### Issue 1: "Missing environment variables"
**Solution:** Restart the Expo development server after updating `.env`:
```bash
npm start -- --clear
```

### Issue 2: "Row Level Security policy violation"
**Solution:** Check RLS policies in Supabase dashboard. For development, you can temporarily disable RLS:
```sql
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
-- Do this for all tables during development
```

### Issue 3: "Cannot read property of undefined"
**Solution:** Add null checks and loading states:
```javascript
if (!studentData) return <LoadingScreen />;
```

### Issue 4: "Real-time subscriptions not working"
**Solution:** Enable Realtime in Supabase dashboard:
1. Go to Database → Replication
2. Enable replication for tables: `trips`, `bookings`

---

## Next Steps After Implementation

1. **Security Hardening**
   - Implement proper RLS policies
   - Add authentication checks to all protected routes
   - Validate user permissions

2. **Performance Optimization**
   - Add caching for frequently accessed data
   - Implement pagination for large lists
   - Optimize real-time subscriptions

3. **Error Handling**
   - Add user-friendly error messages
   - Implement retry logic for failed requests
   - Add offline support

4. **Testing**
   - Write unit tests for services
   - Test edge cases
   - Load testing with multiple users

---

## Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **React Native Supabase:** https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
- **Realtime Subscriptions:** https://supabase.com/docs/guides/realtime

---

## Summary

This implementation connects your existing frontend to Supabase while:
- ✅ Preserving all UI/UX
- ✅ Maintaining existing flows
- ✅ Adding real data persistence
- ✅ Enabling real-time features
- ✅ Keeping demo mode functional

All changes are data-layer only - no visual changes to the app!
