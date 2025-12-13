import { supabase } from '../lib/supabase';

/**
 * Driver Service
 * Handles all Supabase operations for drivers
 */

/**
 * Create a new driver
 * @param {Object} driverData - Driver data object
 * @param {string} driverData.fullname - Full name of the driver
 * @param {string} driverData.phone - Phone number
 * @param {string} driverData.email - Email address
 * @param {string} driverData.cin - CIN (National ID)
 * @returns {Promise<Object>} - Result object with data and error
 */
export const createDriver = async (driverData) => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .insert([
        {
          fullname: driverData.fullname,
          phone: driverData.phone,
          email: driverData.email,
          cin: driverData.cin.toUpperCase(),
          status: 'PENDING',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating driver:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception creating driver:', error);
    return { data: null, error };
  }
};

/**
 * Get driver by ID
 * @param {string} driverId - Driver ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getDriverById = async (driverId) => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', driverId)
      .single();

    if (error) {
      console.error('Error fetching driver:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching driver:', error);
    return { data: null, error };
  }
};

/**
 * Update driver status
 * @param {string} driverId - Driver ID
 * @param {string} status - New status ('PENDING', 'APPROVED', 'REJECTED')
 * @returns {Promise<Object>} - Result object with data and error
 */
export const updateDriverStatus = async (driverId, status) => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .update({ status })
      .eq('id', driverId)
      .select()
      .single();

    if (error) {
      console.error('Error updating driver status:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception updating driver status:', error);
    return { data: null, error };
  }
};

