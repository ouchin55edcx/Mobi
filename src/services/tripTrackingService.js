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

