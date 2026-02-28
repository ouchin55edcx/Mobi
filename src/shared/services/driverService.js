import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Driver Service
 * Handles all Supabase operations for drivers
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
      console.warn('Supabase not available, creating driver locally');

      const localDriver = {
        id: generateUUID(),
        fullname: driverData.fullname,
        phone: driverData.phone,
        email: driverData.email,
        cin: driverData.cin.toUpperCase(),
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await AsyncStorage.setItem(`driver_${localDriver.id}`, JSON.stringify(localDriver));
      await AsyncStorage.setItem(`driver_email_${driverData.email}`, localDriver.id);

      return { data: localDriver, error: null };
    }

    return { data, error: null };
  } catch (error) {
    console.warn('Exception creating driver, saving locally:', error);
    const localDriver = {
      id: generateUUID(),
      fullname: driverData.fullname,
      phone: driverData.phone,
      email: driverData.email,
      cin: driverData.cin.toUpperCase(),
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await AsyncStorage.setItem(`driver_${localDriver.id}`, JSON.stringify(localDriver));
    await AsyncStorage.setItem(`driver_email_${driverData.email}`, localDriver.id);
    return { data: localDriver, error: null };
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
      console.warn('Supabase not available, fetching driver locally');
      const d = await AsyncStorage.getItem(`driver_${driverId}`);
      if (d) return { data: JSON.parse(d), error: null };
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    const d = await AsyncStorage.getItem(`driver_${driverId}`);
    if (d) return { data: JSON.parse(d), error: null };
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
      const d = await AsyncStorage.getItem(`driver_${driverId}`);
      if (d) {
        const driver = JSON.parse(d);
        const updatedDriver = { ...driver, status, updated_at: new Date().toISOString() };
        await AsyncStorage.setItem(`driver_${driverId}`, JSON.stringify(updatedDriver));
        return { data: updatedDriver, error: null };
      }
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Get driver by email
 * @param {string} email - Driver email
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getDriverByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.warn('Supabase not available, fetching driver locally by email');
      const id = await AsyncStorage.getItem(`driver_email_${email}`);
      if (id) {
        const d = await AsyncStorage.getItem(`driver_${id}`);
        if (d) return { data: JSON.parse(d), error: null };
      }
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    const id = await AsyncStorage.getItem(`driver_email_${email}`);
    if (id) {
      const d = await AsyncStorage.getItem(`driver_${id}`);
      if (d) return { data: JSON.parse(d), error: null };
    }
    return { data: null, error };
  }
};


