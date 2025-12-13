import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

const DriverNotificationsModal = ({
  visible,
  onClose,
  driverId,
  language = 'en',
  notifications = [],
}) => {
  const translations = {
    en: {
      title: 'Notifications',
      noNotifications: 'No notifications',
      noNotificationsDesc: 'You have no notifications yet',
      tripAssigned: 'Trip Assigned',
      pickupReminder: 'Pickup Reminder',
      ok: 'OK',
    },
    ar: {
      title: 'الإشعارات',
      noNotifications: 'لا توجد إشعارات',
      noNotificationsDesc: 'ليس لديك إشعارات حتى الآن',
      tripAssigned: 'تم تعيين رحلة',
      pickupReminder: 'تذكير بالاستلام',
      ok: 'حسناً',
    },
  };

  const t = translations[language];

  const renderNotificationItem = ({ item }) => {
    const getIcon = () => {
      switch (item.type) {
        case 'TRIP_ASSIGNED':
          return 'directions-car';
        case 'PICKUP_REMINDER':
          return 'schedule';
        default:
          return 'notifications';
      }
    };

    const getTitle = () => {
      switch (item.type) {
        case 'TRIP_ASSIGNED':
          return t.tripAssigned;
        case 'PICKUP_REMINDER':
          return t.pickupReminder;
        default:
          return item.title || 'Notification';
      }
    };

    return (
      <View style={[styles.notificationItem, !item.read && styles.unreadNotification]}>
        <View style={styles.iconContainer}>
          <MaterialIcons name={getIcon()} size={24} color="#3185FC" />
        </View>
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, language === 'ar' && styles.rtl]}>
            {getTitle()}
          </Text>
          <Text style={[styles.notificationMessage, language === 'ar' && styles.rtl]}>
            {item.message}
          </Text>
          {item.timestamp && (
            <Text style={[styles.notificationTime, language === 'ar' && styles.rtl]}>
              {item.timestamp}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, language === 'ar' && styles.rtl]}>
              {t.title}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="notifications-none" size={64} color="#D1D5DB" />
              <Text style={[styles.emptyTitle, language === 'ar' && styles.rtl]}>
                {t.noNotifications}
              </Text>
              <Text style={[styles.emptyDesc, language === 'ar' && styles.rtl]}>
                {t.noNotificationsDesc}
              </Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              renderItem={renderNotificationItem}
              keyExtractor={(item, index) => item.id || `notification-${index}`}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  unreadNotification: {
    backgroundColor: '#F0F7FF',
    borderColor: '#DBEAFE',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  rtl: {
    textAlign: 'right',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default DriverNotificationsModal;

