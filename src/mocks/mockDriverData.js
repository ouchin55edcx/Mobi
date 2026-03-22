// Static mock data for driver demo (no backend, no database)
// Coordinates roughly around Casablanca (parking & students) and a school in central Casablanca

export const mockDriver = {
  driverId: 'demo-driver-id',
  name: 'Ahmed El Mansouri',
  email: 'driver.demo@mobi.app',
  phone: '+212612345678',
  status: 'AVAILABLE',
};

export const mockBus = {
  id: 'demo-bus-01',
  vehicleNumber: 'CBA-4521',
  vehicleType: 'Mini Bus 24 seats',
  color: 'White / Blue',
};

// Key static locations
export const mockLocations = {
  parking: {
    // Near Sidi Maârouf, Casablanca
    latitude: 33.5425,
    longitude: -7.6400,
    name: 'Depot Sidi Maârouf',
  },
  school: {
    // Central Casablanca (near Maarif)
    latitude: 33.5883,
    longitude: -7.6220,
    name: 'Lycée Al Maarif',
  },
};

export const mockStudents = [
  {
    id: 'student-1',
    name: 'Youssef Benali',
    phone: '+212612340001',
    homeLocation: {
      // Hay Hassani
      latitude: 33.5655,
      longitude: -7.6480,
    },
  },
  {
    id: 'student-2',
    name: 'Salma El Fassi',
    phone: '+212612340002',
    homeLocation: {
      // Aïn Chock
      latitude: 33.5668,
      longitude: -7.6345,
    },
  },
  {
    id: 'student-3',
    name: 'Omar Idrissi',
    phone: '+212612340003',
    homeLocation: {
      // Route d’El Jadida
      latitude: 33.5720,
      longitude: -7.6290,
    },
  },
  {
    id: 'student-4',
    name: 'Fatima Zahra Amrani',
    phone: '+212612340004',
    homeLocation: {
      // Bourgogne area
      latitude: 33.5960,
      longitude: -7.6405,
    },
  },
  {
    id: 'student-5',
    name: 'Hassan Boutaleb',
    phone: '+212612340005',
    homeLocation: {
      // Near school, central
      latitude: 33.5860,
      longitude: -7.6285,
    },
  },
];

export const mockTrip = {
  id: 'demo-trip-casa-001',
  date: '2025-12-16',
  timeSlot: '07:15 - 08:15',
  status: 'ASSIGNED',
  pickupOrder: mockStudents.map((s) => s.id),
  students: mockStudents,
  parkingLocation: mockLocations.parking,
  pickupLocation: mockLocations.parking,
  destination: mockLocations.school.name,
  destinationLocation: {
    latitude: mockLocations.school.latitude,
    longitude: mockLocations.school.longitude,
  },
  // Pre-computed rough distance (parking -> all pickups -> school) in km
  totalDistanceKm: 14.2,
  estimatedDurationMin: 35,
};

export const mockAvailability = [
  {
    id: 'slot-morning',
    label: 'Morning Pickup',
    time: '06:30 - 09:00',
    status: 'Available',
  },
  {
    id: 'slot-midday',
    label: 'Midday Return',
    time: '12:00 - 14:00',
    status: 'Available',
  },
  {
    id: 'slot-afternoon',
    label: 'Afternoon Pickup',
    time: '16:00 - 18:30',
    status: 'Full',
  },
];

export const mockNotifications = [
  {
    id: 'notif-1',
    type: 'TRIP_ASSIGNED',
    message: 'New morning trip assigned: Lycée Al Maarif, 07:15 departure.',
    timestamp: 'Today • 06:10',
    read: false,
  },
];

export const mockDriverScenario = {
  driver: mockDriver,
  bus: mockBus,
  trip: mockTrip,
  students: mockStudents,
  locations: mockLocations,
  availability: mockAvailability,
  notifications: mockNotifications,
};

export default mockDriverScenario;


