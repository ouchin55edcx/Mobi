import { supabase } from '../lib/supabase';

/**
 * Bus Service
 * Handles all Supabase operations for buses
 */

/**
 * Create a new bus
 * @param {Object} busData - Bus data object
 * @param {string} busData.driver_id - Driver ID
 * @param {string} busData.type - Bus type (e.g., "Bus", "Minibus", "Van")
 * @param {string} busData.brand - Bus brand
 * @param {number} busData.year - Manufacturing year
 * @param {string} busData.plate_number - License plate number
 * @param {Object} busData.parking_location - Location object with lat and lng
 * @param {number} busData.capacity - Passenger capacity (minimum 7)
 * @returns {Promise<Object>} - Result object with data and error
 */
export const createBus = async (busData) => {
  try {
    const { data, error } = await supabase
      .from('buses')
      .insert([
        {
          driver_id: busData.driver_id,
          type: busData.type,
          brand: busData.brand,
          year: busData.year,
          plate_number: busData.plate_number,
          parking_location: {
            lat: busData.parking_location.lat,
            lng: busData.parking_location.lng,
          },
          capacity: busData.capacity,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating bus:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception creating bus:', error);
    return { data: null, error };
  }
};

/**
 * Get bus by driver ID
 * @param {string} driverId - Driver ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getBusByDriverId = async (driverId) => {
  try {
    const { data, error } = await supabase
      .from('buses')
      .select('*')
      .eq('driver_id', driverId)
      .single();

    if (error) {
      console.error('Error fetching bus:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching bus:', error);
    return { data: null, error };
  }
};

