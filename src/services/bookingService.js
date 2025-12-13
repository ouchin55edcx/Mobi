import { supabase } from '../lib/supabase';

/**
 * Booking Service
 * Handles all Supabase operations for bookings
 */

/**
 * Create a new booking
 * @param {Object} bookingData - Booking data object
 * @param {string} bookingData.studentId - Student ID
 * @param {string} bookingData.type - Booking type ('PICKUP' or 'DROPOFF')
 * @param {Date} bookingData.startTime - Start time
 * @param {Date} bookingData.endTime - End time
 * @returns {Promise<Object>} - Result object with data and error
 */
export const createBooking = async (bookingData) => {
  try {
    // Validate time range
    if (bookingData.endTime <= bookingData.startTime) {
      return {
        data: null,
        error: { message: 'End time must be after start time' },
      };
    }

    // Validate future time
    const now = new Date();
    if (bookingData.startTime < now) {
      return {
        data: null,
        error: { message: 'Start time must be in the future' },
      };
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert([
        {
          student_id: bookingData.studentId,
          type: bookingData.type,
          start_time: bookingData.startTime.toISOString(),
          end_time: bookingData.endTime.toISOString(),
          status: 'PENDING',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating booking:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception creating booking:', error);
    return { data: null, error };
  }
};

/**
 * Get bookings by student ID
 * @param {string} studentId - Student ID
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status
 * @param {number} options.limit - Limit results
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getBookingsByStudent = async (studentId, options = {}) => {
  try {
    let query = supabase
      .from('bookings')
      .select('*')
      .eq('student_id', studentId)
      .order('start_time', { ascending: false });

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching bookings:', error);
    return { data: null, error };
  }
};

/**
 * Get booking by ID
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getBookingById = async (bookingId) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error) {
      console.error('Error fetching booking:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching booking:', error);
    return { data: null, error };
  }
};

/**
 * Update booking
 * @param {string} bookingId - Booking ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Result object with data and error
 */
export const updateBooking = async (bookingId, updates) => {
  try {
    // Convert Date objects to ISO strings if present
    const processedUpdates = { ...updates };
    if (updates.start_time instanceof Date) {
      processedUpdates.start_time = updates.start_time.toISOString();
    }
    if (updates.end_time instanceof Date) {
      processedUpdates.end_time = updates.end_time.toISOString();
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(processedUpdates)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      console.error('Error updating booking:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception updating booking:', error);
    return { data: null, error };
  }
};

/**
 * Cancel booking
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const cancelBooking = async (bookingId) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'CANCELLED' })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      console.error('Error cancelling booking:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception cancelling booking:', error);
    return { data: null, error };
  }
};

