import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import {
  getStudentNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../services/notificationService';

const NotificationsModal = ({
  visible,
  onClose,
  studentId,
  language = 'en',
  onNotificationRead,
}) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const translations = {
    en: {
      title: 'Notifications',
      markAllRead: 'Mark all as read',
      noNotifications: 'No notifications',
      noNotificationsDesc: 'You have no notifications yet',
      tripAssigned: 'Trip Assigned',
      tripStarted: 'Trip Started',
      driverArriving: 'Driver Arriving',
      tripCompleted: 'Trip Completed',
      error: 'Error',
      errorMessage: 'Failed to load notifications',
      ok: 'OK',
    },
    ar: {
      title: 'الإشعارات',
      markAllRead: 'تعليم الكل كمقروء',
      noNotifications: 'لا توجد إشعارات',
      noNotificationsDesc: 'ليس لديك إشعارات حتى الآن',
      tripAssigned: 'تم تعيين رحلة',
      tripStarted: 'بدأت الرحلة',
      driverArriving: 'السائق قادم',
      tripCompleted: 'اكتملت الرحلة',
      error: 'خطأ',
      errorMessage: 'فشل تحميل الإشعارات',
      ok: 'حسناً',
    },
  };

  const t = translations[language];

  useEffect(() => {
    if (visible && studentId) {
      loadNotifications();
    }
  }, [visible, studentId]);

  const loadNotifications = async () => {
    if (!studentId) return;

    try {
      setLoading(true);
      const { data, error } = await getStudentNotifications(studentId, { limit: 50 });

      if (error) {
        console.error('Error loading notifications:', error);
        // Don't crash - just show empty state
        setNotifications([]);
      } else {
        setNotifications(data || []);
      }
    } catch (error) {
      console.error('Exception loading notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const { error } = await markNotificationAsRead(notificationId);
      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
        if (onNotificationRead) {
          onNotificationRead();
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!studentId) return;

    try {
      const { error } = await markAllNotificationsAsRead(studentId);
      if (!error) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        if (onNotificationRead) {
          onNotificationRead();
        }
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'TRIP_ASSIGNED':
        return 'assignment';
      case 'TRIP_STARTED':
        return 'play-circle';
      case 'DRIVER_ARRIVING':
        return 'directions-car';
      case 'TRIP_COMPLETED':
        return 'check-circle';
      default:
        return 'notifications';
    }
  };

  const getNotificationTypeLabel = (type) => {
    switch (type) {
      case 'TRIP_ASSIGNED':
        return t.tripAssigned;
      case 'TRIP_STARTED':
        return t.tripStarted;
      case 'DRIVER_ARRIVING':
        return t.driverArriving;
      case 'TRIP_COMPLETED':
        return t.tripCompleted;
      default:
        return '';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return language === 'ar' ? 'الآن' : 'Just now';
    } else if (diffMins < 60) {
      return language === 'ar' ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return language === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return language === 'ar' ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const renderNotification = ({ item }) => {
    const isUnread = !item.read;

    return (
      <TouchableOpacity
        style={[styles.notificationItem, isUnread && styles.unreadNotification]}
        onPress={() => {
          if (isUnread) {
            handleMarkAsRead(item.id);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.notificationIconContainer}>
          <MaterialIcons
            name={getNotificationIcon(item.type)}
            size={24}
            color={isUnread ? '#3185FC' : '#9CA3AF'}
          />
        </View>
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationType, isUnread && styles.unreadText]}>
              {getNotificationTypeLabel(item.type)}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationBody}>{item.body}</Text>
          <Text style={styles.notificationTime}>{formatDate(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="notifications-none" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>{t.noNotifications}</Text>
      <Text style={styles.emptyDesc}>{t.noNotificationsDesc}</Text>
    </View>
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, language === 'ar' && styles.rtl]}>
            {t.title}
          </Text>
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={styles.markAllButton}
                onPress={handleMarkAllAsRead}
                activeOpacity={0.7}
              >
                <Text style={styles.markAllText}>{t.markAllRead}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={24} color="#666666" />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3185FC" />
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id}
            contentContainerStyle={
              notifications.length === 0 ? styles.emptyList : styles.list
            }
            ListEmptyComponent={renderEmpty}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3185FC',
  },
  rtl: {
    textAlign: 'right',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  markAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markAllText: {
    fontSize: 14,
    color: '#3185FC',
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  unreadNotification: {
    backgroundColor: '#F0F9FF',
  },
  notificationIconContainer: {
    marginRight: 16,
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  notificationType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  unreadText: {
    color: '#3185FC',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3185FC',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 48,
  },
});

export default NotificationsModal;

