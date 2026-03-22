import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Trip Tracking Service
 * Handles real-time trip tracking and driver location updates
 */

/**
 * Subscribe to trip status updates
 * @param {string} tripId - Trip ID
 * @param {Function} callback - Callback function for updates
 * @returns {Object} Subscription channel
 */
export const subscribeToTripStatus = (tripId, callback) => {
  const channel = supabase
    .channel(`trip-status:${tripId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'trips',
        filter: `id=eq.${tripId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  // Mock local updates
  const interval = setInterval(async () => {
    const t = await AsyncStorage.getItem(`trip_${tripId}`);
    if (t) callback(JSON.parse(t));
  }, 5000);

  return { ...channel, intervalId: interval };
};

/**
 * Subscribe to driver location updates
 * @param {string} driverId - Driver ID
 * @param {Function} callback - Callback function for location updates
 * @returns {Object} Subscription channel
 */
export const subscribeToDriverLocation = (driverId, callback) => {
  const channel = supabase
    .channel(`driver-location:${driverId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'drivers',
        filter: `id=eq.${driverId}`,
      },
      (payload) => {
        const driver = payload.new;
        if (driver.current_location) {
          callback({
            latitude: driver.current_location.latitude,
            longitude: driver.current_location.longitude,
            timestamp: driver.location_updated_at,
          });
        }
      }
    )
    .subscribe();

  // Mock local updates
  const interval = setInterval(async () => {
    const d = await AsyncStorage.getItem(`driver_${driverId}`);
    if (d) {
      const driver = JSON.parse(d);
      if (driver.current_location) {
        callback({
          latitude: driver.current_location.latitude,
          longitude: driver.current_location.longitude,
          timestamp: driver.location_updated_at,
        });
      }
    }
  }, 5000);

  return { ...channel, intervalId: interval };
};

/**
 * Get trip with driver information
 * @param {string} tripId - Trip ID
 * @returns {Promise<Object>} Trip data with driver info
 */
export const getTripWithDriver = async (tripId) => {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        drivers (
          id,
          name,
          phone,
          current_location,
          location_updated_at
        )
      `)
      .eq('id', tripId)
      .single();

    if (error) {
      console.warn('Supabase not available, fetching trip with driver locally');
      const t = await AsyncStorage.getItem(`trip_${tripId}`);
      if (t) {
        const trip = JSON.parse(t);
        const d = await AsyncStorage.getItem(`driver_${trip.driver_id}`);
        if (d) trip.drivers = JSON.parse(d);
        return { data: trip, error: null };
      }
      return { data: null, error: null };
    }
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching trip with driver:', error);
    return { data: null, error: null };
  }
};

/**
 * Update trip status
 * @param {string} tripId - Trip ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Update result
 */
export const updateTripStatus = async (tripId, status) => {
  try {
    const { data, error } = await supabase
      .from('trips')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', tripId)
      .select()
      .single();

    if (error) {
      console.warn('Supabase not available, updating trip status locally');
      const t = await AsyncStorage.getItem(`trip_${tripId}`);
      if (t) {
        const trip = JSON.parse(t);
        const updatedTrip = { ...trip, status, updated_at: new Date().toISOString() };
        await AsyncStorage.setItem(`trip_${tripId}`, JSON.stringify(updatedTrip));
        return { data: updatedTrip, error: null };
      }
      return { data: null, error: null };
    }
    return { data, error: null };
  } catch (error) {
    console.error('Error updating trip status:', error);
    return { data: null, error: null };
  }
};

/**
 * Get driver's current location
 * @param {string} driverId - Driver ID
 * @returns {Promise<Object>} Driver location
 */
export const getDriverLocation = async (driverId) => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('current_location, location_updated_at')
      .eq('id', driverId)
      .single();

    if (error) {
      console.warn('Supabase not available, fetching driver location locally');
      const d = await AsyncStorage.getItem(`driver_${driverId}`);
      if (d) {
        const driver = JSON.parse(d);
        return { data: { current_location: driver.current_location, location_updated_at: driver.location_updated_at }, error: null };
      }
      return { data: null, error: null };
    }
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching driver location:', error);
    return { data: null, error: null };
  }
};

/**
 * Get trips assigned to a driver with students
 * @param {string} driverId - Driver ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Trips with students
 */
export const getDriverTripsWithStudents = async (driverId, options = {}) => {
  try {
    let query = supabase
      .from('trips')
      .select(`
        *,
        students (
          id,
          fullname,
          phone,
          home_location
        ),
        bookings (
          id,
          student_id,
          type,
          start_time,
          end_time,
          status
        )
      `)
      .eq('driver_id', driverId)
      .in('status', options.status || ['CONFIRMED', 'ACTIVE', 'IN_PROGRESS', 'GENERATED']);

    if (options.date) {
      const startOfDay = new Date(options.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(options.date);
      endOfDay.setHours(23, 59, 59, 999);

      query = query
        .gte('reach_pickup_time', startOfDay.toISOString())
        .lte('reach_pickup_time', endOfDay.toISOString());
    }

    query = query.order('reach_pickup_time', { ascending: true });

    const { data, error } = await query;

    if (error) {
      return { data: [], error: null }; // Return empty array for local mock flow
    }

    // Group trips by time slot and aggregate students
    const groupedTrips = {};
    if (data) {
      data.forEach(trip => {
        const timeSlot = trip.reach_pickup_time
          ? new Date(trip.reach_pickup_time).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })
          : '00:00';

        const key = `${trip.destination_location?.name || 'Unknown'}_${timeSlot}`;

        if (!groupedTrips[key]) {
          groupedTrips[key] = {
            id: trip.id,
            destination: trip.destination_location?.name || 'Unknown Destination',
            destinationLocation: trip.destination_location || trip.destinationLocation,
            pickupLocation: trip.pickup_location || trip.pickupLocation,
            timeSlot: timeSlot,
            status: trip.status,
            students: [],
            studentCount: 0,
          };
        }

        // Add student if not already added
        if (trip.students && !groupedTrips[key].students.find(s => s.id === trip.students.id)) {
          groupedTrips[key].students.push({
            id: trip.students.id,
            name: trip.students.fullname,
            phone: trip.students.phone,
            homeLocation: trip.students.home_location,
          });
          groupedTrips[key].studentCount++;
        }
      });
    }

    return { data: Object.values(groupedTrips), error: null };
  } catch (error) {
    console.error('Error fetching driver trips with students:', error);
    return { data: [], error: null };
  }
};

/**
 * Get bookings for a specific time slot and destination (for grouping into trips)
 * @param {Date} startTime - Start time
 * @param {Date} endTime - End time
 * @param {string} destination - Destination name or location
 * @returns {Promise<Object>} Bookings
 */
export const getBookingsForTimeSlot = async (startTime, endTime, destination = null) => {
  try {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        students (
          id,
          fullname,
          phone,
          home_location
        )
      `)
      .eq('status', 'PENDING')
      .gte('start_time', startTime.toISOString())
      .lte('start_time', endTime.toISOString());

    const { data, error } = await query;

    if (error) return { data: [], error: null };
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching bookings for time slot:', error);
    return { data: [], error: null };
  }
};


