import { supabase } from '../lib/supabase';

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

  return channel;
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
      console.error('Error checking driver status:', error);
      return { data: null, error };
    }

    return { data: data?.status || null, error: null };
  } catch (error) {
    console.error('Exception checking driver status:', error);
    return { data: null, error };
  }
};

