/**
 * Demo Mode Static Data
 * All demo data is hardcoded for demonstration purposes
 * No backend or API calls should be made when using this data
 */

// Demo Student
export const DEMO_STUDENT = {
  id: 'demo-student-id',
  studentId: 'demo-student-id',
  fullname: 'Ahmed Alami',
  email: 'demo@mobi.app',
  phone: '+212 6XX XXX XXX',
  school: '1', // School ID
  schoolName: 'Casablanca International School',
  home_location: {
    latitude: 33.5731,
    longitude: -7.5898,
  },
  isDemo: true,
};

// Demo School Location
export const DEMO_SCHOOL = {
  id: '1',
  name: 'Casablanca International School',
  location: {
    latitude: 33.5800,
    longitude: -7.5920,
  },
};

// Demo Pickup Point
export const DEMO_PICKUP_POINT = {
  latitude: 33.5750,
  longitude: -7.5900,
  name: 'Main Pickup Point',
};

// Demo Route Coordinates (home → pickup → school)
export const DEMO_ROUTE_COORDINATES = [
  DEMO_STUDENT.home_location,
  {
    latitude: (DEMO_STUDENT.home_location.latitude + DEMO_PICKUP_POINT.latitude) / 2,
    longitude: (DEMO_STUDENT.home_location.longitude + DEMO_PICKUP_POINT.longitude) / 2,
  },
  DEMO_PICKUP_POINT,
  {
    latitude: (DEMO_PICKUP_POINT.latitude + DEMO_SCHOOL.location.latitude) / 2,
    longitude: (DEMO_PICKUP_POINT.longitude + DEMO_SCHOOL.location.longitude) / 2,
  },
  DEMO_SCHOOL.location,
];

// Demo Driver
export const DEMO_DRIVER = {
  id: 'demo-driver-id',
  name: 'Mohammed Benali',
  phone: '+212 6XX XXX XXX',
  vehicle: {
    plateNumber: '12345-A-67',
    model: 'Mercedes Sprinter',
    capacity: 20,
  },
  current_location: DEMO_PICKUP_POINT,
};

// Helper: Get current time + offset in minutes
const getFutureTime = (minutesFromNow) => {
  const now = new Date();
  return new Date(now.getTime() + minutesFromNow * 60 * 1000);
};

// Helper: Get past time (for completed trips)
const getPastTime = (minutesAgo) => {
  const now = new Date();
  return new Date(now.getTime() - minutesAgo * 60 * 1000);
};

// Demo Active Trip (Scheduled)
export const getDemoActiveTrip = () => {
  const startTime = getFutureTime(120); // 2 hours from now
  const endTime = getFutureTime(165); // 2h 45min from now
  const leaveHomeTime = getFutureTime(75); // 1h 15min from now
  const reachPickupTime = getFutureTime(90); // 1h 30min from now
  const arriveDestinationTime = startTime;

  return {
    id: 'demo-booking-001',
    bookingId: 'demo-booking-001',
    tripId: 'demo-trip-001',
    student_id: DEMO_STUDENT.id,
    studentId: DEMO_STUDENT.id,
    type: 'PICKUP',
    status: 'CONFIRMED',
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    created_at: getPastTime(1440).toISOString(), // 24 hours ago
    updated_at: getPastTime(60).toISOString(), // 1 hour ago
    
    // Trip details
    homeLocation: DEMO_STUDENT.home_location,
    pickupLocation: DEMO_PICKUP_POINT,
    destinationLocation: DEMO_SCHOOL.location,
    routeCoordinates: DEMO_ROUTE_COORDINATES,
    leaveHomeTime,
    reachPickupTime,
    arriveDestinationTime,
    totalDurationMinutes: 45,
    totalDistanceKm: 5.2,
    
    // Driver info
    driver: DEMO_DRIVER,
  };
};

// Demo Ongoing Trip (if needed)
export const getDemoOngoingTrip = () => {
  const startTime = getPastTime(30); // 30 minutes ago
  const endTime = getFutureTime(15); // 15 minutes from now
  const leaveHomeTime = getPastTime(75);
  const reachPickupTime = getPastTime(60);
  const arriveDestinationTime = endTime;

  return {
    id: 'demo-booking-002',
    bookingId: 'demo-booking-002',
    tripId: 'demo-trip-002',
    student_id: DEMO_STUDENT.id,
    studentId: DEMO_STUDENT.id,
    type: 'PICKUP',
    status: 'CONFIRMED',
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    created_at: getPastTime(2880).toISOString(),
    updated_at: getPastTime(30).toISOString(),
    
    homeLocation: DEMO_STUDENT.home_location,
    pickupLocation: DEMO_PICKUP_POINT,
    destinationLocation: DEMO_SCHOOL.location,
    routeCoordinates: DEMO_ROUTE_COORDINATES,
    leaveHomeTime,
    reachPickupTime,
    arriveDestinationTime,
    totalDurationMinutes: 45,
    totalDistanceKm: 5.2,
    driver: DEMO_DRIVER,
  };
};

// Helper: Create demo trip from booking form data
export const createDemoTripFromBooking = (bookingData, studentId) => {
  const startTime = bookingData.startTime || getFutureTime(120);
  const endTime = bookingData.endTime || getFutureTime(165);
  const leaveHomeTime = new Date(startTime.getTime() - 45 * 60 * 1000);
  const reachPickupTime = new Date(startTime.getTime() - 30 * 60 * 1000);
  const arriveDestinationTime = startTime;
  const duration = Math.round((endTime - startTime) / (1000 * 60));

  return {
    id: `demo-booking-${Date.now()}`,
    bookingId: `demo-booking-${Date.now()}`,
    tripId: `demo-trip-${Date.now()}`,
    student_id: studentId,
    studentId: studentId,
    type: bookingData.type || 'PICKUP',
    status: 'PENDING',
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    
    homeLocation: DEMO_STUDENT.home_location,
    pickupLocation: DEMO_PICKUP_POINT,
    destinationLocation: DEMO_SCHOOL.location,
    routeCoordinates: DEMO_ROUTE_COORDINATES,
    leaveHomeTime,
    reachPickupTime,
    arriveDestinationTime,
    totalDurationMinutes: duration,
    totalDistanceKm: 5.2,
    driver: DEMO_DRIVER,
  };
};

// Demo Driver Location Progression (for live tracking simulation)
export const DEMO_DRIVER_ROUTE = [
  { latitude: 33.5731, longitude: -7.5898, timestamp: 0 }, // Start
  { latitude: 33.5740, longitude: -7.5895, timestamp: 300 }, // 5 min
  { latitude: 33.5750, longitude: -7.5900, timestamp: 600 }, // 10 min (Pickup)
  { latitude: 33.5760, longitude: -7.5905, timestamp: 900 }, // 15 min
  { latitude: 33.5770, longitude: -7.5910, timestamp: 1200 }, // 20 min
  { latitude: 33.5780, longitude: -7.5915, timestamp: 1500 }, // 25 min
  { latitude: 33.5790, longitude: -7.5920, timestamp: 1800 }, // 30 min
  { latitude: 33.5800, longitude: -7.5920, timestamp: 2100 }, // 35 min (School)
];

// Helper: Get driver location at specific time (for simulation)
export const getDemoDriverLocationAtTime = (elapsedSeconds) => {
  const route = DEMO_DRIVER_ROUTE;
  for (let i = route.length - 1; i >= 0; i--) {
    if (elapsedSeconds >= route[i].timestamp) {
      return route[i];
    }
  }
  return route[0];
};

// Helper: Calculate ETA in minutes
export const calculateDemoETA = (currentLocation, destination) => {
  // Simple calculation: assume 1km per minute average speed
  const distance = calculateDistance(currentLocation, destination);
  return Math.round(distance * 1); // 1 minute per km
};

// Helper: Calculate distance between two coordinates (Haversine formula simplified)
const calculateDistance = (loc1, loc2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
  const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(loc1.latitude * Math.PI / 180) *
    Math.cos(loc2.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

