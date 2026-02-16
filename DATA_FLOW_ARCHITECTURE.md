# Mobi App - Data Flow Architecture

This document visualizes how data flows through the Mobi app with Supabase integration.

---

## Overall Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React Native)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Student    │  │   Driver     │  │    Admin     │         │
│  │   Screens    │  │   Screens    │  │   Screens    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
│                    ┌───────▼────────┐                           │
│                    │  Service Layer │                           │
│                    │  (src/services)│                           │
│                    └───────┬────────┘                           │
│                            │                                     │
│                    ┌───────▼────────┐                           │
│                    │ Supabase Client│                           │
│                    │ (src/lib)      │                           │
│                    └───────┬────────┘                           │
└────────────────────────────┼────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   SUPABASE      │
                    │   (Backend)     │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐        ┌──────▼──────┐     ┌──────▼──────┐
   │Database │        │    Auth     │     │  Realtime   │
   │(Postgres)│       │             │     │             │
   └─────────┘        └─────────────┘     └─────────────┘
```

---

## Student Flow - Booking a Trip

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. STUDENT OPENS APP                                             │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. CHECK SESSION                                                 │
│    App.js → authService.getSession()                            │
└──────────────────────────────────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
              ┌─────▼─────┐     ┌────▼────┐
              │  Session  │     │   No    │
              │  Exists   │     │ Session │
              └─────┬─────┘     └────┬────┘
                    │                │
                    │                ▼
                    │         ┌──────────────┐
                    │         │ Show Login   │
                    │         │   Screen     │
                    │         └──────┬───────┘
                    │                │
                    │                ▼
                    │         ┌──────────────┐
                    │         │ User Logs In │
                    │         │ authService  │
                    │         │  .signIn()   │
                    │         └──────┬───────┘
                    │                │
                    └────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. LOAD STUDENT DATA                                             │
│    StudentHomeScreen → studentService.getStudentById()          │
│    Returns: student data + school location                      │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. LOAD ACTIVE BOOKING                                           │
│    StudentHomeScreen → bookingService.getActiveBooking()        │
│    Returns: active booking (if exists)                          │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. DISPLAY MAP & BOOKING UI                                      │
│    - Show home location (from student data)                      │
│    - Show school location (from student.schools)                 │
│    - Show active booking (if exists)                             │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 6. USER SELECTS TIME & CONFIRMS BOOKING                          │
│    - User picks departure time                                   │
│    - User clicks "Book Trip"                                     │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 7. CREATE BOOKING                                                │
│    StudentHomeScreen → bookingService.createBooking({           │
│      studentId,                                                  │
│      type: 'PICKUP',                                            │
│      startTime,                                                  │
│      endTime,                                                    │
│      pickupLocation,                                             │
│      destinationLocation,                                        │
│      routeCoordinates                                            │
│    })                                                            │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 8. SUPABASE INSERTS BOOKING                                      │
│    INSERT INTO bookings (...) VALUES (...)                       │
│    Returns: new booking with ID                                  │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 9. UPDATE UI                                                     │
│    - Show active booking card                                    │
│    - Display trip details                                        │
│    - Show "Track Trip" button                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Student Flow - Live Tracking

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. USER CLICKS "TRACK TRIP"                                      │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. NAVIGATE TO LIVE TRACKING SCREEN                              │
│    App.js → setCurrentScreen('liveTracking')                    │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. LOAD TRIP DATA                                                │
│    LiveTrackingScreen → tripService.getTripByBookingId()        │
│    Returns: trip with driver, bus, current location             │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. SUBSCRIBE TO REAL-TIME UPDATES                                │
│    LiveTrackingScreen → tripService.subscribeTripUpdates()      │
│    Listens for: location changes, status changes                │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. DISPLAY LIVE MAP                                              │
│    - Show student location                                       │
│    - Show driver location (real-time)                            │
│    - Show route                                                  │
│    - Show ETA                                                    │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 6. DRIVER UPDATES LOCATION (Backend)                             │
│    Driver App → tripService.updateTripLocation()                │
│    UPDATE trips SET current_location = {...}                    │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 7. SUPABASE REALTIME BROADCASTS UPDATE                           │
│    Realtime channel → sends update to subscribers                │
└──────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 8. STUDENT APP RECEIVES UPDATE                                   │
│    subscribeTripUpdates callback → setDriverLocation()          │
│    Map marker updates automatically                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Flow - Service Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                      COMPONENT LAYER                             │
│  (StudentHomeScreen, HistoryScreen, ProfileScreen, etc.)        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Calls service functions
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                               │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   student    │  │   booking    │  │     trip     │         │
│  │   Service    │  │   Service    │  │   Service    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐         │
│  │     auth     │  │    school    │  │notification  │         │
│  │   Service    │  │   Service    │  │   Service    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
│                            │ Uses Supabase client                │
│                            │                                     │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE CLIENT                               │
│                   (src/lib/supabase.ts)                         │
│                                                                  │
│  - Configured with URL and API key                              │
│  - Handles authentication                                        │
│  - Manages sessions (AsyncStorage)                              │
│  - Provides query builder                                        │
│  - Handles real-time subscriptions                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP/WebSocket
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE                                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    PostgreSQL Database                    │  │
│  │                                                           │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │  │
│  │  │ students │ │ bookings │ │  trips   │ │ schools  │   │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │  │
│  │                                                           │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                │  │
│  │  │ drivers  │ │  buses   │ │  notif.  │                │  │
│  │  └──────────┘ └──────────┘ └──────────┘                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Authentication                         │  │
│  │  - User management                                        │  │
│  │  - Session handling                                       │  │
│  │  - JWT tokens                                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Realtime                               │  │
│  │  - WebSocket connections                                  │  │
│  │  - Change data capture                                    │  │
│  │  - Broadcast to subscribers                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Relationships

```
┌─────────────┐
│   schools   │
│  (id, name) │
└──────┬──────┘
       │
       │ One-to-Many
       │
       ▼
┌─────────────────────┐
│      students       │
│  (id, school_id)    │
└──────┬──────────────┘
       │
       │ One-to-Many
       │
       ▼
┌─────────────────────────────────┐
│          bookings               │
│  (id, student_id, driver_id)    │
└──────┬──────────────────────────┘
       │
       │ One-to-One
       │
       ▼
┌─────────────────────────────────┐
│            trips                │
│  (id, booking_id, driver_id)    │
└─────────────────────────────────┘

┌─────────────┐
│   drivers   │
│  (id, name) │
└──────┬──────┘
       │
       │ One-to-Many
       │
       ▼
┌─────────────┐
│    buses    │
│ (driver_id) │
└─────────────┘
```

---

## Real-time Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ DRIVER APP                                                       │
│                                                                  │
│  Driver moves → Update location                                 │
│                                                                  │
│  tripService.updateTripLocation(tripId, newLocation)            │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ HTTP POST
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ SUPABASE                                                         │
│                                                                  │
│  UPDATE trips SET current_location = {...}                      │
│  WHERE id = tripId                                               │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ Change Data Capture
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ REALTIME ENGINE                                                  │
│                                                                  │
│  Detects change → Broadcasts to subscribers                     │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ WebSocket
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ STUDENT APP                                                      │
│                                                                  │
│  Receives update → Updates map marker                           │
│                                                                  │
│  subscribeTripUpdates callback → setDriverLocation()            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. USER ENTERS EMAIL & PASSWORD                                  │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. CALL authService.signIn(email, password)                     │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. SUPABASE AUTH VALIDATES CREDENTIALS                           │
│    - Checks email/password                                       │
│    - Generates JWT tokens                                        │
│    - Creates session                                             │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. RETURN SESSION DATA                                           │
│    {                                                             │
│      user: { id, email, user_metadata },                        │
│      session: { access_token, refresh_token }                   │
│    }                                                             │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. STORE SESSION IN ASYNCSTORAGE                                 │
│    (Automatic via Supabase client)                              │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ 6. FETCH USER DATA                                               │
│    authService.getUserDataByEmail(email, 'student')             │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ 7. NAVIGATE TO HOME SCREEN                                       │
│    App.js → setCurrentScreen('studentHome')                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## Error Handling Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ COMPONENT CALLS SERVICE FUNCTION                                 │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ SERVICE FUNCTION EXECUTES SUPABASE QUERY                         │
│                                                                  │
│  const { data, error } = await supabase.from('table')...        │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                ┌────────┴────────┐
                │                 │
          ┌─────▼─────┐     ┌────▼────┐
          │  Success  │     │  Error  │
          └─────┬─────┘     └────┬────┘
                │                │
                │                ▼
                │         ┌──────────────┐
                │         │ Log Error    │
                │         │ console.error│
                │         └──────┬───────┘
                │                │
                │                ▼
                │         ┌──────────────┐
                │         │ Return Error │
                │         │ to Component │
                │         └──────┬───────┘
                │                │
                └────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│ COMPONENT HANDLES RESPONSE                                       │
│                                                                  │
│  if (error) {                                                    │
│    setError(error.message)                                       │
│    // Show error UI                                              │
│  } else {                                                        │
│    setData(data)                                                 │
│    // Show success UI                                            │
│  }                                                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## Summary

This architecture ensures:

1. **Separation of Concerns**
   - Components handle UI
   - Services handle data logic
   - Supabase handles persistence

2. **Real-time Updates**
   - WebSocket connections for live data
   - Automatic UI updates on data changes

3. **Error Handling**
   - Errors caught at service layer
   - Propagated to components
   - User-friendly messages displayed

4. **Authentication**
   - Secure session management
   - Automatic token refresh
   - Persistent sessions

5. **Data Flow**
   - Unidirectional data flow
   - Clear request/response pattern
   - Predictable state updates
