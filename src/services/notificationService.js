import { supabase } from '../lib/supabase';

/**
 * Notification Service
 * Handles all Supabase operations for notifications
 */

/**
 * Create a new notification
 * @param {Object} notificationData - Notification data object
 * @param {string} notificationData.studentId - Student ID
 * @param {string} notificationData.type - Notification type
 * @param {string} notificationData.title - Notification title
 * @param {string} notificationData.body - Notification body
 * @param {Object} notificationData.data - Additional data (optional)
 * @returns {Promise<Object>} - Result object with data and error
 */
export const createNotification = async (notificationData) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          student_id: notificationData.studentId,
          type: notificationData.type,
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception creating notification:', error);
    return { data: null, error };
  }
};

/**
 * Get all notifications for a student
 * @param {string} studentId - Student ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Limit number of results
 * @param {number} options.offset - Offset for pagination
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getStudentNotifications = async (studentId, options = {}) => {
  try {
    const { limit = 50, offset = 0 } = options;
    
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Exception fetching notifications:', error);
    return { data: null, error };
  }
};

/**
 * Get unread notifications count for a student
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} - Result object with count and error
 */
export const getUnreadNotificationsCount = async (studentId) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('read', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      return { count: 0, error };
    }

    return { count: count || 0, error: null };
  } catch (error) {
    console.error('Exception fetching unread count:', error);
    return { count: 0, error };
  }
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) {
      console.error('Error marking notification as read:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception marking notification as read:', error);
    return { data: null, error };
  }
};

/**
 * Mark all notifications as read for a student
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const markAllNotificationsAsRead = async (studentId) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('student_id', studentId)
      .eq('read', false)
      .select();

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception marking all notifications as read:', error);
    return { data: null, error };
  }
};

/**
 * Subscribe to notifications for a student (real-time)
 * @param {string} studentId - Student ID
 * @param {Function} callback - Callback function for new notifications
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToNotifications = (studentId, callback) => {
  try {
    const channel = supabase
      .channel(`notifications:${studentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `student_id=eq.${studentId}`,
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    return () => {}; // Return no-op unsubscribe function
  }
};
