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
 * Get active booking for a student
 * Active booking = PENDING or CONFIRMED status, not completed/cancelled, and start_time is in the future or current
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getActiveBooking = async (studentId) => {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('student_id', studentId)
      .in('status', ['PENDING', 'CONFIRMED'])
      .gte('start_time', now)
      .order('start_time', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      // If no active booking found, return null (not an error)
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      console.error('Error fetching active booking:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching active booking:', error);
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

/**
 * Get bookings grouped by time slot for driver trips
 * Groups bookings by similar start times and destination
 * @param {Date} date - Date to get bookings for
 * @returns {Promise<Object>} - Grouped bookings
 */
export const getBookingsGroupedByTimeSlot = async (date = new Date()) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        students (
          id,
          fullname,
          phone,
          home_location,
          school
        )
      `)
      .in('status', ['PENDING', 'CONFIRMED'])
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching bookings:', error);
      return { data: null, error };
    }

    // Group bookings by time slot (within 30 minutes) and destination
    const grouped = {};
    
    if (data) {
      data.forEach(booking => {
        const startTime = new Date(booking.start_time);
        const timeSlot = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
        
        // Round to nearest 30 minutes for grouping
        const roundedMinutes = Math.floor(startTime.getMinutes() / 30) * 30;
        const slotTime = `${String(startTime.getHours()).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
        
        // Create time range (30 min window)
        const slotStart = new Date(startTime);
        slotStart.setMinutes(roundedMinutes, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + 30);
        
        const timeRange = `${slotStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${slotEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
        
        // Use school as destination key (assuming all students from same school go to same destination)
        const destination = booking.students?.school || 'Unknown';
        const key = `${destination}_${slotTime}`;
        
        if (!grouped[key]) {
          grouped[key] = {
            timeSlot: timeRange,
            destination: destination,
            destinationLocation: booking.students?.home_location || { latitude: 33.5800, longitude: -7.5920 },
            students: [],
            studentCount: 0,
            bookings: [],
          };
        }
        
        if (booking.students) {
          grouped[key].students.push({
            id: booking.students.id,
            name: booking.students.fullname,
            phone: booking.students.phone,
            homeLocation: booking.students.home_location,
          });
          grouped[key].bookings.push(booking);
          grouped[key].studentCount++;
        }
      });
    }

    return { data: Object.values(grouped), error: null };
  } catch (error) {
    console.error('Exception fetching grouped bookings:', error);
    return { data: null, error };
  }
};

