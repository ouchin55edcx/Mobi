import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Notification Service
 * Handles all Supabase operations for notifications
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
      console.warn('Supabase not available, creating notification locally');

      const localNotification = {
        id: generateUUID(),
        student_id: notificationData.studentId,
        type: notificationData.type,
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data || null,
        read: false,
        created_at: new Date().toISOString(),
      };

      // Store notification
      await AsyncStorage.setItem(`notification_${localNotification.id}`, JSON.stringify(localNotification));

      // Update student's list of notifications
      const studentNotifsStr = await AsyncStorage.getItem(`student_notifications_${notificationData.studentId}`);
      const studentNotifs = studentNotifsStr ? JSON.parse(studentNotifsStr) : [];
      studentNotifs.push(localNotification.id);
      await AsyncStorage.setItem(`student_notifications_${notificationData.studentId}`, JSON.stringify(studentNotifs));

      return { data: localNotification, error: null };
    }

    return { data, error: null };
  } catch (error) {
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
      console.warn('Supabase not available, fetching notifications locally');
      const studentNotifsStr = await AsyncStorage.getItem(`student_notifications_${studentId}`);
      if (!studentNotifsStr) return { data: [], error: null };

      const notifIds = JSON.parse(studentNotifsStr);
      const notifications = [];

      for (const id of notifIds) {
        const n = await AsyncStorage.getItem(`notification_${id}`);
        if (n) notifications.push(JSON.parse(n));
      }

      // Sort by created_at descending
      notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const pagedNotifs = notifications.slice(offset, offset + limit);
      return { data: pagedNotifs, error: null };
    }

    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: null };
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
      const studentNotifsStr = await AsyncStorage.getItem(`student_notifications_${studentId}`);
      if (!studentNotifsStr) return { count: 0, error: null };

      const notifIds = JSON.parse(studentNotifsStr);
      let unreadCount = 0;

      for (const id of notifIds) {
        const n = await AsyncStorage.getItem(`notification_${id}`);
        if (n && !JSON.parse(n).read) {
          unreadCount++;
        }
      }
      return { count: unreadCount, error: null };
    }

    return { count: count || 0, error: null };
  } catch (error) {
    return { count: 0, error: null };
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
      const n = await AsyncStorage.getItem(`notification_${notificationId}`);
      if (n) {
        const notif = JSON.parse(n);
        notif.read = true;
        await AsyncStorage.setItem(`notification_${notificationId}`, JSON.stringify(notif));
        return { data: notif, error: null };
      }
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
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
      const studentNotifsStr = await AsyncStorage.getItem(`student_notifications_${studentId}`);
      if (studentNotifsStr) {
        const notifIds = JSON.parse(studentNotifsStr);
        for (const id of notifIds) {
          const n = await AsyncStorage.getItem(`notification_${id}`);
          if (n) {
            const notif = JSON.parse(n);
            notif.read = true;
            await AsyncStorage.setItem(`notification_${id}`, JSON.stringify(notif));
          }
        }
      }
      return { data: null, error: null };
    }

    return { data, error: null };
  } catch (error) {
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

  // Mock interval for local updates
  const interval = setInterval(async () => {
    // Logic for mock local notifications could go here
  }, 10000);

  return () => {
    supabase.removeChannel(channel);
    clearInterval(interval);
  };
};

