import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Driver Approval Service
 * Handles driver approval status checks and real-time subscriptions
 */

/**
 * Subscribe to driver approval status changes
 * @param {string} driverId - Driver ID
 * @param {Function} callback - Callback function for status updates
 * @returns {Object} Subscription channel
 */
export const subscribeToDriverApproval = (driverId, callback) => {
  const channel = supabase
    .channel(`driver-approval:${driverId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'drivers',
        filter: `id=eq.${driverId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  // Mock local updates
  const interval = setInterval(async () => {
    const d = await AsyncStorage.getItem(`driver_${driverId}`);
    if (d) callback(JSON.parse(d));
  }, 5000);

  return { ...channel, intervalId: interval };
};

/**
 * Check driver status manually
 * @param {string} driverId - Driver ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const checkDriverStatus = async (driverId) => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('status')
      .eq('id', driverId)
      .single();

    if (error) {
      console.warn('Supabase not available, checking driver status locally');
      const d = await AsyncStorage.getItem(`driver_${driverId}`);
      if (d) return { data: JSON.parse(d).status, error: null };
      return { data: 'PENDING', error: null };
    }

    return { data: data?.status || null, error: null };
  } catch (error) {
    return { data: 'PENDING', error: null };
  }
};

