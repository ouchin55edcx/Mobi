import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Animated, Linking } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import DriverNotificationsModal from '../../components/DriverNotificationsModal';
import { UbuntuFonts } from '../../src/utils/fonts';
import mockDriverScenario, {
  mockTrip,
  mockAvailability,
  mockNotifications,
  mockDriver,
} from '../../src/mock/mockDriverData';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const translations = {
  en: {
    availableTrips: 'Available Trips',
    students: 'students',
    student: 'student',
    startNow: 'Start Now',
    skipToProfile: 'Go to Profile',
    back: 'Back',
  },
  ar: {
    availableTrips: 'الرحلات المتاحة',
    students: 'طلاب',
    student: 'طالب',
    startNow: 'إبدأ الان',
    skipToProfile: 'الذهاب إلى الملف الشخصي',
    back: 'رجوع',
  },
};

const DriverHomeScreen = ({
  driverId,
  language = 'en',
  isDemo = false,
  onTripPress,
  onBack,
  trip,
  onSkipToProfile,
}) => {
  const [assignedTrip, setAssignedTrip] = useState(trip || null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications] = useState(mockNotifications);
  const [unreadCount] = useState(
    mockNotifications.filter((n) => !n.read).length || 0
  );

  // Animations
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const checkmarkRotation = useRef(new Animated.Value(0)).current;
  const cardSlideUp = useRef(new Animated.Value(30)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  const checkmarkRotateInterpolate = checkmarkRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const t = translations[language];
  const isRTL = language === 'ar';

  useEffect(() => {
    const dataTrip = trip || mockTrip;
    setAssignedTrip(dataTrip);
    setLoading(false);

    // Trigger card entrance animation
    Animated.parallel([
      Animated.timing(cardSlideUp, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [trip, cardSlideUp, cardOpacity]);

  const handleStartTrip = useCallback(() => {
    Animated.parallel([
      Animated.spring(checkmarkScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(checkmarkRotation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(checkmarkScale, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.timing(checkmarkRotation, {
            toValue: 0,
            useNativeDriver: true,
          }),
        ]).start();
      }, 1000);
    });

    if (assignedTrip && onTripPress) {
      onTripPress(assignedTrip);
    }
  }, [assignedTrip, onTripPress, checkmarkScale, checkmarkRotation]);

  const handleSkipToProfile = useCallback(() => {
    if (onSkipToProfile) {
      onSkipToProfile();
    }
  }, [onSkipToProfile]);

  if (!assignedTrip) {
    return null;
  }

  const studentCount = assignedTrip.students?.length || assignedTrip.studentCount || 0;
  const pickupCity = assignedTrip.pickupLocation?.city || 'Pickup';
  const destination = assignedTrip.destination || 'School';
  const startTime = assignedTrip.timeSlot?.split(' - ')[0] || '07:15';
  const endTime = assignedTrip.timeSlot?.split(' - ')[1] || '08:15';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* ========== FIXED HEADER AT TOP ========== */}
      <LinearGradient
        colors={['#326cde', '#2557c4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fixedHeader}
      >
        <View style={styles.headerContent}>
          {/* Left Section */}
          <View style={[styles.headerLeft, isRTL && styles.headerLeftRTL]}>
            {onBack && (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={onBack}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={isRTL ? 'arrow-forward' : 'arrow-back'}
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            )}
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, isRTL && styles.rtl]}>
                {t.availableTrips}
              </Text>
              <Text style={[styles.headerSubtitle, isRTL && styles.rtl]}>
                {language === 'ar' ? 'اليوم' : 'Today'}
              </Text>
            </View>
          </View>

          {/* Right Section - Notification */}
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => setShowNotifications(true)}
            activeOpacity={0.8}
          >
            <View style={styles.notificationIconContainer}>
              <MaterialIcons name="notifications-active" size={24} color="#FFFFFF" />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Status Indicator Pill */}
        <View style={[styles.statusPillContainer, isRTL && styles.statusPillContainerRTL]}>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={[styles.statusText, isRTL && styles.rtl]}>
              {language === 'ar' ? 'متاح' : 'Available'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* ========== MAP VIEW ========== */}
      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={{
          latitude:
            (assignedTrip.pickupLocation.latitude +
              assignedTrip.destinationLocation.latitude) /
            2,
          longitude:
            (assignedTrip.pickupLocation.longitude +
              assignedTrip.destinationLocation.longitude) /
            2,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        <Marker
          coordinate={assignedTrip.pickupLocation}
          pinColor="#3B82F6"
          title="Pickup Point"
        />
        <Marker
          coordinate={assignedTrip.destinationLocation}
          pinColor="#10B981"
          title="Destination"
        />
        <Polyline
          coordinates={[
            assignedTrip.pickupLocation,
            assignedTrip.destinationLocation,
          ]}
          strokeColor="#3B82F6"
          strokeWidth={4}
          lineCap="round"
          lineJoin="round"
        />
      </MapView>

      {/* ========== COMPACT TRIP INFO CARD - TRANSPARENT ========== */}
      <Animated.View
        style={[
          styles.tripInfoCard,
          {
            transform: [{ translateY: cardSlideUp }],
            opacity: cardOpacity,
          },
        ]}
      >
        {/* Main Route Information - Single Horizontal Line */}
        <View style={styles.routeLineContainer}>
          {/* Start Time */}
          <Text style={[styles.timeText, isRTL && styles.rtl]}>
            {startTime}
          </Text>

          {/* Pickup Location */}
          <View style={styles.pickupLocationBox}>
            <MaterialIcons name="location-on" size={14} color="#3B82F6" />
            <Text style={[styles.locationText, isRTL && styles.rtl]} numberOfLines={1}>
              {pickupCity}
            </Text>
          </View>

          {/* Arrow */}
          <MaterialIcons name="arrow-forward" size={16} color="#9CA3AF" />

          {/* Destination */}
          <View style={styles.destinationLocationBox}>
            <MaterialIcons name="school" size={14} color="#10B981" />
            <Text style={[styles.locationText, isRTL && styles.rtl]} numberOfLines={1}>
              {destination}
            </Text>
          </View>

          {/* End Time */}
          <Text style={[styles.timeText, isRTL && styles.rtl]}>
            {endTime}
          </Text>
        </View>

        {/* Student Count - Below Route */}
        <View style={[styles.studentCountContainer, isRTL && styles.studentCountContainerRTL]}>
          <View style={styles.avatarStack}>
            {Array.from({ length: Math.min(studentCount, 3) }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.avatar,
                  { marginLeft: index > 0 ? -10 : 0, zIndex: 10 - index },
                ]}
              >
                <MaterialIcons name="person" size={12} color="#FFFFFF" />
              </View>
            ))}
            {studentCount > 3 && (
              <View style={[styles.avatar, styles.avatarMore, { zIndex: 7 }]}>
                <Text style={styles.avatarMoreText}>+{studentCount - 3}</Text>
              </View>
            )}
          </View>

          <Text style={[styles.studentCountText, isRTL && styles.rtl]}>
            {studentCount} {studentCount === 1 ? t.student : t.students}
          </Text>
        </View>
      </Animated.View>

      {/* ========== BUTTONS CONTAINER ========== */}
      <View style={[styles.buttonsContainer, isRTL && styles.buttonsContainerRTL]}>
        {/* Start Now Button - Primary CTA */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleStartTrip}
          activeOpacity={0.85}
        >
          <Animated.View
            style={{
              transform: [
                { scale: checkmarkScale },
                { rotate: checkmarkRotateInterpolate },
              ],
            }}
          >
            <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
          </Animated.View>
          <Text style={[styles.primaryButtonText, isRTL && styles.rtl]}>
            {t.startNow}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications Modal */}
      <DriverNotificationsModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        driverId={driverId || mockDriver.driverId}
        language={language}
        notifications={notifications}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  // ========== FIXED HEADER AT TOP ==========
  fixedHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 100,
    marginTop: -44,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  headerLeftRTL: {
    flexDirection: 'row-reverse',
  },
  backBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: UbuntuFonts.bold,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 3,
    fontFamily: UbuntuFonts.regular,
  },
  notificationBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIconContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#1F2937',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: UbuntuFonts.bold,
  },
  statusPillContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statusPillContainerRTL: {
    justifyContent: 'flex-start',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: UbuntuFonts.bold,
  },

  // ========== MAP STYLES ==========
  map: {
    flex: 1,
    width: '100%',
  },

  // ========== TRIP INFO CARD - TRANSPARENT ==========
  tripInfoCard: {
    position: 'absolute',
    bottom: 130,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(20px)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
    zIndex: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },

  // ========== ROUTE LINE CONTAINER ==========
  routeLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },

  // Time Text (no background box)
  timeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: UbuntuFonts.bold,
  },

  // Pickup Location Box
  pickupLocationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 6,
    flex: 1,
  },
  
  // Destination Location Box
  destinationLocationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 6,
    flex: 1,
  },
  
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: UbuntuFonts.semiBold,
    flex: 1,
  },

  // Student Count Container
  studentCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 231, 235, 0.5)',
  },
  studentCountContainerRTL: {
    flexDirection: 'row-reverse',
  },

  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  avatarMore: {
    backgroundColor: '#F59E0B',
  },
  avatarMoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: UbuntuFonts.bold,
  },
  studentCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: UbuntuFonts.bold,
  },

  // ========== BUTTONS CONTAINER ==========
  buttonsContainer: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    gap: 12,
    zIndex: 45,
  },
  buttonsContainerRTL: {
    // RTL handled by individual buttons
  },

  // Secondary Button (Go to Profile)
  secondaryButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButtonText: {
    color: '#4B5563',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: UbuntuFonts.semiBold,
  },

  // Primary Button (Start Now)
  primaryButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: UbuntuFonts.bold,
  },

  // ========== RTL SUPPORT ==========
  rtl: {
    textAlign: 'right',
  },
});

export default DriverHomeScreen;

