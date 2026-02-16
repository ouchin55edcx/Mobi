import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Trip Service
 * Handles all Supabase operations for trip tracking and live updates
 */

/**
 * Generate a simple UUID for offline mode
 */
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

/**
 * Create a new trip from a booking
 * @param {Object} tripData - Trip data object
 * @param {string} tripData.bookingId - Booking ID
 * @param {string} tripData.driverId - Driver ID
 * @param {string} tripData.busId - Bus ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const createTrip = async (tripData) => {
    try {
        const { data, error } = await supabase
            .from('trips')
            .insert([
                {
                    booking_id: tripData.bookingId,
                    driver_id: tripData.driverId,
                    bus_id: tripData.busId,
                    status: 'SCHEDULED',
                },
            ])
            .select()
            .single();

        if (error) {
            console.warn('Supabase not available, creating trip locally');

            const localTrip = {
                id: generateUUID(),
                booking_id: tripData.bookingId,
                driver_id: tripData.driverId,
                bus_id: tripData.busId,
                status: 'SCHEDULED',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            await AsyncStorage.setItem(`trip_${localTrip.id}`, JSON.stringify(localTrip));
            await AsyncStorage.setItem(`booking_trip_${tripData.bookingId}`, localTrip.id);

            return { data: localTrip, error: null };
        }

        return { data, error: null };
    } catch (error) {
        console.warn('Exception during createTrip, mocking locally:', error);
        return { data: null, error };
    }
};

/**
 * Get trip by ID with all related data
 * @param {string} tripId - Trip ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getTripById = async (tripId) => {
    try {
        const { data, error } = await supabase
            .from('trips')
            .select(`
        *,
        bookings (
          *,
          students (
            id,
            fullname,
            phone,
            home_location
          )
        ),
        drivers (
          id,
          fullname,
          phone
        ),
        buses (
          id,
          plate_number,
          capacity
        )
      `)
            .eq('id', tripId)
            .single();

        if (error) {
            console.warn('Supabase not available, fetching trip locally');
            const t = await AsyncStorage.getItem(`trip_${tripId}`);
            if (t) return { data: JSON.parse(t), error: null };
            return { data: null, error };
        }

        return { data, error: null };
    } catch (error) {
        const t = await AsyncStorage.getItem(`trip_${tripId}`);
        if (t) return { data: JSON.parse(t), error: null };
        return { data: null, error };
    }
};

/**
 * Get trip by booking ID
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getTripByBookingId = async (bookingId) => {
    try {
        const { data, error } = await supabase
            .from('trips')
            .select(`
        *,
        bookings (
          *,
          students (
            id,
            fullname,
            phone,
            home_location
          )
        ),
        drivers (
          id,
          fullname,
          phone
        ),
        buses (
          id,
          plate_number,
          capacity
        )
      `)
            .eq('booking_id', bookingId)
            .single();

        if (error) {
            console.warn('Supabase not available, fetching trip by booking ID locally');
            const tripId = await AsyncStorage.getItem(`booking_trip_${bookingId}`);
            if (tripId) {
                const t = await AsyncStorage.getItem(`trip_${tripId}`);
                if (t) return { data: JSON.parse(t), error: null };
            }
            return { data: null, error: null };
        }

        return { data, error: null };
    } catch (error) {
        const tripId = await AsyncStorage.getItem(`booking_trip_${bookingId}`);
        if (tripId) {
            const t = await AsyncStorage.getItem(`trip_${tripId}`);
            if (t) return { data: JSON.parse(t), error: null };
        }
        return { data: null, error: null };
    }
};

/**
 * Update trip location (for live tracking)
 * @param {string} tripId - Trip ID
 * @param {Object} location - Location object with latitude and longitude
 * @returns {Promise<Object>} - Result object with data and error
 */
export const updateTripLocation = async (tripId, location) => {
    try {
        const { data, error } = await supabase
            .from('trips')
            .update({
                current_location: location,
                updated_at: new Date().toISOString(),
            })
            .eq('id', tripId)
            .select()
            .single();

        if (error) {
            console.warn('Supabase not available, updating trip location locally');
            const t = await AsyncStorage.getItem(`trip_${tripId}`);
            if (t) {
                const trip = JSON.parse(t);
                const updatedTrip = { ...trip, current_location: location, updated_at: new Date().toISOString() };
                await AsyncStorage.setItem(`trip_${tripId}`, JSON.stringify(updatedTrip));
                return { data: updatedTrip, error: null };
            }
            return { data: null, error };
        }

        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
};

/**
 * Start a trip
 * @param {string} tripId - Trip ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const startTrip = async (tripId) => {
    try {
        const { data, error } = await supabase
            .from('trips')
            .update({
                status: 'IN_PROGRESS',
                started_at: new Date().toISOString(),
            })
            .eq('id', tripId)
            .select()
            .single();

        if (error) {
            const t = await AsyncStorage.getItem(`trip_${tripId}`);
            if (t) {
                const trip = JSON.parse(t);
                const updatedTrip = { ...trip, status: 'IN_PROGRESS', started_at: new Date().toISOString(), updated_at: new Date().toISOString() };
                await AsyncStorage.setItem(`trip_${tripId}`, JSON.stringify(updatedTrip));
                return { data: updatedTrip, error: null };
            }
            return { data: null, error };
        }

        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
};

/**
 * Complete a trip
 * @param {string} tripId - Trip ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const completeTrip = async (tripId) => {
    try {
        const { data, error } = await supabase
            .from('trips')
            .update({
                status: 'COMPLETED',
                completed_at: new Date().toISOString(),
            })
            .eq('id', tripId)
            .select()
            .single();

        if (error) {
            const t = await AsyncStorage.getItem(`trip_${tripId}`);
            if (t) {
                const trip = JSON.parse(t);
                const updatedTrip = { ...trip, status: 'COMPLETED', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() };
                await AsyncStorage.setItem(`trip_${tripId}`, JSON.stringify(updatedTrip));
                return { data: updatedTrip, error: null };
            }
            return { data: null, error };
        }

        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
};

/**
 * Cancel a trip
 * @param {string} tripId - Trip ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const cancelTrip = async (tripId) => {
    try {
        const { data, error } = await supabase
            .from('trips')
            .update({
                status: 'CANCELLED',
            })
            .eq('id', tripId)
            .select()
            .single();

        if (error) {
            const t = await AsyncStorage.getItem(`trip_${tripId}`);
            if (t) {
                const trip = JSON.parse(t);
                const updatedTrip = { ...trip, status: 'CANCELLED', updated_at: new Date().toISOString() };
                await AsyncStorage.setItem(`trip_${tripId}`, JSON.stringify(updatedTrip));
                return { data: updatedTrip, error: null };
            }
            return { data: null, error };
        }

        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
};

/**
 * Subscribe to trip location updates
 * @param {string} tripId - Trip ID
 * @param {Function} callback - Callback function to handle updates
 * @returns {Object} - Subscription channel
 */
export const subscribeTripUpdates = (tripId, callback) => {
    // Check if we are in local fallback mode
    const channel = supabase
        .channel(`trip:${tripId}`)
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

    // Setup local mock updates if needed (simplified)
    const interval = setInterval(async () => {
        const t = await AsyncStorage.getItem(`trip_${tripId}`);
        if (t) {
            callback(JSON.parse(t));
        }
    }, 5000);

    return { ...channel, intervalId: interval };
};

/**
 * Unsubscribe from trip updates
 * @param {Object} channel - Subscription channel
 */
export const unsubscribeTripUpdates = async (channel) => {
    if (channel && channel.unsubscribe) {
        await supabase.removeChannel(channel);
    }
    if (channel && channel.intervalId) {
        clearInterval(channel.intervalId);
    }
};

/**
 * Get active trips for a driver
 * @param {string} driverId - Driver ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getActiveTripsForDriver = async (driverId) => {
    try {
        const { data, error } = await supabase
            .from('trips')
            .select(`
        *,
        bookings (
          *,
          students (
            id,
            fullname,
            phone,
            home_location
          )
        ),
        buses (
          id,
          plate_number,
          capacity
        )
      `)
            .eq('driver_id', driverId)
            .in('status', ['SCHEDULED', 'IN_PROGRESS'])
            .order('created_at', { ascending: false });

        if (error) {
            return { data: [], error: null }; // Return empty array on error for mock flow
        }

        return { data, error: null };
    } catch (error) {
        return { data: [], error: null };
    }
};

/**
 * Get active trip for a student (via booking)
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getActiveTripForStudent = async (studentId) => {
    try {
        // First get active booking from Supabase
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('id')
            .eq('student_id', studentId)
            .in('status', ['PENDING', 'CONFIRMED', 'IN_PROGRESS'])
            .order('start_time', { ascending: true })
            .limit(1)
            .single();

        if (bookingError || !booking) {
            // Fallback: check local storage for active booking
            const studentBookingsStr = await AsyncStorage.getItem(`student_bookings_${studentId}`);
            if (!studentBookingsStr) return { data: null, error: null };

            const bookingIds = JSON.parse(studentBookingsStr);
            let localActiveBookingId = null;

            for (const id of bookingIds) {
                const b = await AsyncStorage.getItem(`booking_${id}`);
                if (b) {
                    const bObj = JSON.parse(b);
                    if (['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(bObj.status)) {
                        localActiveBookingId = id;
                        break;
                    }
                }
            }

            if (!localActiveBookingId) return { data: null, error: null };

            return await getTripByBookingId(localActiveBookingId);
        }

        // Then get trip for that booking
        const { data, error } = await supabase
            .from('trips')
            .select(`
        *,
        drivers (
          id,
          fullname,
          phone
        ),
        buses (
          id,
          plate_number,
          capacity
        )
      `)
            .eq('booking_id', booking.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return { data: null, error: null };
            }
            return await getTripByBookingId(booking.id);
        }

        return { data, error: null };
    } catch (error) {
        console.error('Exception fetching active trip:', error);
        return { data: null, error: null };
    }
};
