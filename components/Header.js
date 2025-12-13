import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getUnreadNotificationsCount, subscribeToNotifications } from '../src/services/notificationService';
import NotificationsModal from './NotificationsModal';

const Header = ({
  title,
  subtitle,
  language = 'en',
  studentId,
  isDemo = false,
  showNotifications = true,
  onNotificationPress,
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load unread count
  useEffect(() => {
    if (!studentId || isDemo || !showNotifications) return;

    const loadUnreadCount = async () => {
      try {
        setLoading(true);
        const { count, error } = await getUnreadNotificationsCount(studentId);
        if (!error && count !== undefined) {
          setUnreadCount(count);
        }
      } catch (error) {
        console.warn('Error loading unread count:', error);
        // Don't crash - just don't show count
      } finally {
        setLoading(false);
      }
    };

    loadUnreadCount();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToNotifications(studentId, () => {
      // Refresh count when new notification arrives
      loadUnreadCount();
    });

    // Refresh count periodically (every 30 seconds)
    const interval = setInterval(loadUnreadCount, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [studentId, isDemo, showNotifications]);

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      setShowNotificationsModal(true);
    }
  };

  return (
    <>
      <View style={styles.header}>
        {isDemo && (
          <View style={styles.demoBanner}>
            <MaterialIcons name="info" size={16} color="#F59E0B" />
            <Text style={styles.demoBannerText}>
              {language === 'ar' ? 'وضع العرض التوضيحي' : 'Demo Mode'}
            </Text>
          </View>
        )}
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, language === 'ar' && styles.rtl]}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.subtitle, language === 'ar' && styles.rtl]}>
                {subtitle}
              </Text>
            )}
          </View>
          <View style={styles.actionsContainer}>
            {showNotifications && !isDemo && studentId && (
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={handleNotificationPress}
                activeOpacity={0.7}
              >
                <MaterialIcons name="notifications" size={24} color="#666666" />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {showNotificationsModal && (
        <NotificationsModal
          studentId={studentId}
          language={language}
          visible={showNotificationsModal}
          onClose={() => setShowNotificationsModal(false)}
          onNotificationRead={() => {
            // Refresh count when notification is read
            if (studentId && !isDemo) {
              getUnreadNotificationsCount(studentId).then(({ count }) => {
                if (count !== undefined) setUnreadCount(count);
              });
            }
          }}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  demoBannerText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3185FC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
  },
  rtl: {
    textAlign: 'right',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default Header;

