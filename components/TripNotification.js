import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UbuntuFonts } from '../src/utils/fonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TripNotification = ({ 
  visible, 
  driverName = 'Driver',
  vehicleInfo = '',
  onViewTrip,
  onDismiss,
  language = 'en'
}) => {
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const translations = {
    en: {
      tripStarted: 'Trip Started!',
      driverStatus: 'Driver has started the trip',
      headingTo: 'Heading to pickup point',
      driver: 'Driver',
      vehicle: 'Vehicle',
      viewLiveTrip: 'View Live Trip',
      dismiss: 'Dismiss',
    },
    ar: {
      tripStarted: 'بدأت الرحلة!',
      driverStatus: 'بدأ السائق الرحلة',
      headingTo: 'في الطريق إلى نقطة الالتقاط',
      driver: 'السائق',
      vehicle: 'المركبة',
      viewLiveTrip: 'عرض الرحلة المباشرة',
      dismiss: 'إغلاق',
    },
  };

  const t = translations[language];
  const isRTL = language === 'ar';

  useEffect(() => {
    if (visible) {
      // Vibrate on notification
      Vibration.vibrate([0, 100, 50, 100]);

      // Slide in animation
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();

      // Pulse animation for status icon
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Slide out animation
      Animated.timing(slideAnim, {
        toValue: -200,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Notification Card */}
      <View style={styles.card}>
        {/* Header */}
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <View style={styles.iconContainer}>
            <Animated.View
              style={[
                styles.pulseCircle,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
            <View style={styles.iconCircle}>
              <MaterialIcons name="directions-bus" size={24} color="#FFFFFF" />
            </View>
          </View>
          
          <View style={[styles.headerContent, isRTL && styles.headerContentRTL]}>
            <Text style={[styles.title, isRTL && styles.rtl]}>
              {t.tripStarted}
            </Text>
            <View style={[styles.statusBadge, isRTL && styles.statusBadgeRTL]}>
              <View style={styles.statusDot} />
              <Text style={[styles.statusText, isRTL && styles.rtl]}>
                {t.headingTo}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
            <MaterialIcons name="person" size={20} color="#3B82F6" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, isRTL && styles.rtl]}>
                {t.driver}
              </Text>
              <Text style={[styles.infoValue, isRTL && styles.rtl]}>
                {driverName}
              </Text>
            </View>
          </View>

          {vehicleInfo && (
            <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
              <MaterialIcons name="directions-car" size={20} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, isRTL && styles.rtl]}>
                  {t.vehicle}
                </Text>
                <Text style={[styles.infoValue, isRTL && styles.rtl]}>
                  {vehicleInfo}
                </Text>
              </View>
            </View>
          )}

          <Text style={[styles.message, isRTL && styles.rtl]}>
            {t.driverStatus}
          </Text>
        </View>

        {/* Actions */}
        <View style={[styles.actions, isRTL && styles.actionsRTL]}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onViewTrip}
            activeOpacity={0.8}
          >
            <MaterialIcons name="navigation" size={20} color="#FFFFFF" />
            <Text style={[styles.primaryButtonText, isRTL && styles.rtl]}>
              {t.viewLiveTrip}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  headerContent: {
    flex: 1,
  },
  headerContentRTL: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: UbuntuFonts.bold,
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusBadgeRTL: {
    flexDirection: 'row-reverse',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    fontFamily: UbuntuFonts.semiBold,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    marginBottom: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  infoRowRTL: {
    flexDirection: 'row-reverse',
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: UbuntuFonts.medium,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: UbuntuFonts.semiBold,
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    fontFamily: UbuntuFonts.regular,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionsRTL: {
    flexDirection: 'row-reverse',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: UbuntuFonts.bold,
  },
  rtl: {
    textAlign: 'right',
  },
});

export default TripNotification;

