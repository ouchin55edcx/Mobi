import { supabase } from '../lib/supabase';

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

  return channel;
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

  return channel;
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

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching trip with driver:', error);
    return { data: null, error };
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

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating trip status:', error);
    return { data: null, error };
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

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching driver location:', error);
    return { data: null, error };
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

    if (error) throw error;

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
    return { data: null, error };
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

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching bookings for time slot:', error);
    return { data: null, error };
  }
};

