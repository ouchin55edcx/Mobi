import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert,
  Linking,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import LiveTrackingScreen from './LiveTrackingScreen';
import { validateAndReturnUUID } from '../../src/utils/validation';
import { UbuntuFonts } from '../../src/utils/fonts';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// =================================================================
// 1. MODERN COLOR PALETTE & TYPOGRAPHY (Consistent with previous task)
// =================================================================
const COLORS = {
  primary: '#007AFF', // Vibrant Blue
  secondary: '#34C759', // Success Green
  warning: '#FF9500', // Warning Orange
  danger: '#FF3B30', // Danger Red
  background: '#F2F2F7', // Light Gray Background
  card: '#FFFFFF', // White Card Background
  textPrimary: '#1C1C1E', // Dark Text
  textSecondary: '#6A6A6A', // Secondary Gray Text
  border: '#E5E5EA', // Light Border
  shadow: 'rgba(0, 0, 0, 0.1)',
};

const TYPOGRAPHY = {
  h1: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  h2: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  body: { fontSize: 15, fontWeight: '400', color: COLORS.textPrimary },
  caption: { fontSize: 12, fontWeight: '500', color: COLORS.textSecondary },
};

// =================================================================
// 2. TRANSLATIONS (Simplified/Kept as is)
// =================================================================
const translations = {
  en: {
    title: 'Trip Details',
    busPath: 'Bus route',
    yourPathToStation: 'Your route',
    estimatedArrival: 'ETA',
    minutes: 'min',
    km: 'km',
    tripStations: 'Journey Timeline',
    done: 'Done',
    now: 'Now',
    soon: 'Soon',
    captain: 'Driver',
    onlineNow: 'Online',
    call: 'Call',
    message: 'Message',
    leaveHome: 'Leave Home',
    reachPickup: 'Reach Pickup',
    arriveDestination: 'Arrive at School',
    liveTracking: 'Start Live Tracking',
    distance: 'Distance',
    pickupStation: 'Pickup Station',
    destination: 'School',
    walkToStation: 'Walk to station',
    finalDestination: 'Final destination',
    home: 'Home',
  },
  ar: {
    title: 'تفاصيل الرحلة',
    busPath: 'مسار الحافلة',
    yourPathToStation: 'مسارك',
    estimatedArrival: 'الوقت',
    minutes: 'دقيقة',
    km: 'كم',
    tripStations: 'الجدول الزمني',
    done: 'تم',
    now: 'الآن',
    soon: 'قريباً',
    captain: 'السائق',
    onlineNow: 'متصل',
    call: 'اتصال',
    message: 'رسالة',
    leaveHome: 'مغادرة',
    reachPickup: 'الوصول',
    arriveDestination: 'الوصول للمدرسة',
    liveTracking: 'بدء التتبع المباشر',
    distance: 'المسافة',
    pickupStation: 'محطة الركوب',
    destination: 'المدرسة',
    walkToStation: 'مشي إلى المحطة',
    finalDestination: 'الوجهة النهائية',
    home: 'المنزل',
  },
};

// =================================================================
// 3. HELPER FUNCTIONS (Simplified/Kept as is)
// =================================================================
const formatTime = (date) => {
  if (!date) return '--:--';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// =================================================================
// 4. REDESIGNED COMPONENTS
// =================================================================

// Component for the minimal timeline
const MinimalTimeline = ({ t, isRTL, leaveHomeTime, reachPickupTime, arriveDestinationTime, estimatedArrivalMinutes }) => {
  const timelineData = [
    {
      time: formatTime(leaveHomeTime),
      label: t.home,
      subLabel: t.leaveHome,
      icon: 'home',
      color: COLORS.primary,
      status: 'done', // Assuming this screen shows the plan, so the first step is done/planned
    },
    {
      time: formatTime(reachPickupTime),
      label: t.pickupStation,
      subLabel: t.reachPickup,
      icon: 'location-on',
      color: COLORS.primary,
      status: 'now', // Assuming this is the current focus
      extra: {
        label: t.walkToStation,
        value: `${estimatedArrivalMinutes} ${t.minutes}`,
      }
    },
    {
      time: formatTime(arriveDestinationTime),
      label: t.destination,
      subLabel: t.finalDestination,
      icon: 'school',
      color: COLORS.secondary,
      status: 'soon',
    },
  ];

  const getStatusStyle = (status) => {
    switch (status) {
      case 'done':
        return { dot: COLORS.secondary, text: COLORS.secondary, badgeBg: 'rgba(52, 199, 89, 0.1)' };
      case 'now':
        return { dot: COLORS.primary, text: COLORS.primary, badgeBg: 'rgba(0, 122, 255, 0.1)' };
      case 'soon':
      default:
        return { dot: COLORS.textSecondary, text: COLORS.textSecondary, badgeBg: 'rgba(106, 106, 106, 0.1)' };
    }
  };

  return (
    <View style={timelineStyles.container}>
      <Text style={[TYPOGRAPHY.h2, { marginBottom: 15 }, isRTL && timelineStyles.rtlText]}>
        {t.tripStations}
      </Text>
      <View style={timelineStyles.timelineWrapper}>
        {timelineData.map((item, index) => {
          const isLast = index === timelineData.length - 1;
          const statusStyle = getStatusStyle(item.status);

          return (
            <View key={index} style={timelineStyles.item}>
              {/* Left Column: Icon and Connector */}
              <View style={timelineStyles.leftColumn}>
                <View style={[timelineStyles.iconWrapper, { backgroundColor: statusStyle.dot }]}>
                  <MaterialIcons name={item.icon} size={20} color={COLORS.card} />
                </View>
                {!isLast && (
                  <View style={[
                    timelineStyles.connector,
                    { backgroundColor: statusStyle.dot }
                  ]} />
                )}
              </View>

              {/* Right Column: Details */}
              <View style={[timelineStyles.rightColumn, isRTL && timelineStyles.rtlRightColumn]}>
                <View style={timelineStyles.timeRow}>
                  <Text style={[timelineStyles.time, isRTL && timelineStyles.rtlText]}>
                    {item.time}
                  </Text>
                  <View style={[timelineStyles.statusBadge, { backgroundColor: statusStyle.badgeBg }]}>
                    <Text style={[timelineStyles.statusText, { color: statusStyle.text }]}>
                      {t[item.status]}
                    </Text>
                  </View>
                </View>
                <Text style={[timelineStyles.label, isRTL && timelineStyles.rtlText]}>
                  {item.label}
                </Text>
                <Text style={[timelineStyles.subLabel, isRTL && timelineStyles.rtlText]}>
                  {item.subLabel}
                </Text>

                {/* Extra Card for Walking Duration */}
                {item.extra && (
                  <View style={timelineStyles.extraCard}>
                    <MaterialIcons name="directions-walk" size={16} color={COLORS.primary} />
                    <Text style={[timelineStyles.extraText, isRTL && timelineStyles.rtlText]}>
                      {item.extra.label}: <Text style={{ fontWeight: '700' }}>{item.extra.value}</Text>
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// Component for Driver/Action Card
const DriverActionCard = ({ t, driverName, driverPhone, isDriverOnline, isRTL, handleCall, handleMessage }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isDriverOnline) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isDriverOnline]);

  const ActionButton = ({ icon, label, onPress }) => (
    <TouchableOpacity style={driverActionStyles.actionBtn} onPress={onPress}>
      <MaterialIcons name={icon} size={20} color={COLORS.primary} />
      <Text style={[driverActionStyles.actionText, isRTL && driverActionStyles.rtlText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={driverActionStyles.container}>
      <Text style={[TYPOGRAPHY.h2, { marginBottom: 15 }, isRTL && driverActionStyles.rtlText]}>
        {t.captain}
      </Text>
      
      <View style={[driverActionStyles.driverRow, isRTL && driverActionStyles.driverRowRTL]}>
        <View style={driverActionStyles.avatar}>
          <MaterialIcons name="person" size={24} color={COLORS.card} />
        </View>
        <View style={driverActionStyles.info}>
          <Text style={[TYPOGRAPHY.h2, driverActionStyles.name, isRTL && driverActionStyles.rtlText]}>
            {driverName || 'Driver Name'}
          </Text>
          <View style={[driverActionStyles.statusRow, isRTL && driverActionStyles.statusRowRTL]}>
            <Animated.View style={[
              driverActionStyles.statusDot,
              { backgroundColor: isDriverOnline ? COLORS.secondary : COLORS.textSecondary },
              { transform: [{ scale: pulseAnim }] }
            ]} />
            <Text style={[driverActionStyles.statusText, { color: isDriverOnline ? COLORS.secondary : COLORS.textSecondary }, isRTL && driverActionStyles.rtlText]}>
              {t.onlineNow}
            </Text>
          </View>
        </View>
      </View>

      <View style={[driverActionStyles.actionsRow, isRTL && driverActionStyles.actionsRowRTL]}>
        <ActionButton 
          icon="call" 
          label={t.call} 
          onPress={handleCall} 
        />
        <ActionButton 
          icon="message" 
          label={t.message} 
          onPress={handleMessage} 
        />
      </View>
    </View>
  );
};

// =================================================================
// 5. MAIN COMPONENT (Refactored)
// =================================================================
const TripDetailsScreen = ({
  tripData,
  language = 'en',
  onBack,
}) => {
  // State variables (kept as is for logic)
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [showLiveTracking, setShowLiveTracking] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Animations (simplified to just entrance)
  const headerSlide = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const ctaButtonTranslate = useRef(new Animated.Value(100)).current;

  const t = translations[language];
  const isRTL = language === 'ar';

  // Extract trip data (mocked for UI focus)
  const homeLocation = tripData?.homeLocation || { latitude: 33.5731, longitude: -7.5898 };
  const pickupLocation = tripData?.pickupLocation || { latitude: 33.5750, longitude: -7.5900 };
  const destinationLocation = tripData?.destinationLocation || { latitude: 33.5800, longitude: -7.5920 };
  const routeCoordinates = tripData?.routeCoordinates || [
    homeLocation,
    { latitude: 33.5760, longitude: -7.5905 },
    pickupLocation,
    { latitude: 33.5770, longitude: -7.5908 },
    destinationLocation,
  ];
  const userPathCoordinates = tripData?.userPathCoordinates || [
    homeLocation,
    { latitude: (homeLocation.latitude + pickupLocation.latitude) / 2, longitude: (homeLocation.longitude + pickupLocation.longitude) / 2 },
    pickupLocation,
  ];
  const leaveHomeTime = tripData?.leaveHomeTime || new Date(Date.now() + 30 * 60 * 1000);
  const reachPickupTime = tripData?.reachPickupTime || new Date(Date.now() + 45 * 60 * 1000);
  const arriveDestinationTime = tripData?.arriveDestinationTime || new Date(Date.now() + 60 * 60 * 1000);
  const estimatedArrivalMinutes = tripData?.estimatedArrivalMinutes || 10;
  const distanceToStation = tripData?.distanceToStation || 2.5;
  const driverName = tripData?.driverName || 'Ahmed Mahmoud';
  const driverPhone = tripData?.driverPhone || '+212600123456';
  const isDriverOnline = tripData?.isDriverOnline !== undefined ? tripData.isDriverOnline : true;

  // Entrance animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 500,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(ctaButtonTranslate, {
        toValue: 0,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Map region calculation (kept as is)
  const getRegion = () => {
    const allLats = [homeLocation.latitude, pickupLocation.latitude, destinationLocation.latitude];
    const allLngs = [homeLocation.longitude, pickupLocation.longitude, destinationLocation.longitude];
    
    const minLat = Math.min(...allLats);
    const maxLat = Math.max(...allLats);
    const minLng = Math.min(...allLngs);
    const maxLng = Math.max(...allLngs);

    const latitude = (minLat + maxLat) / 2;
    const longitude = (minLng + maxLng) / 2;
    const latitudeDelta = (maxLat - minLat) * 1.5 || 0.01;
    const longitudeDelta = (maxLng - minLng) * 1.5 || 0.01;

    return { latitude, longitude, latitudeDelta, longitudeDelta };
  };

  // Location logic (kept as is)
  const requestLocationPermission = async () => { /* ... */ };
  const getCurrentLocation = async () => { /* ... */ };

  // Navigation logic
  const rawTripId = tripData?.tripId || tripData?.bookingId || tripData?.id;
  const tripId = validateAndReturnUUID(rawTripId);
  const studentId = tripData?.studentId || 'demo-student-id';

  const handleNavigateToLiveTracking = () => {
    // Navigate to LiveTrackingScreen
    // If no valid tripId, use demo mode
    if (!tripId || rawTripId === null || rawTripId === undefined) {
      setIsDemoMode(true);
    } else {
      setIsDemoMode(false);
    }
    setShowLiveTracking(true);
  };

  const handleCall = () => {
    if (driverPhone) {
      Linking.openURL(`tel:${driverPhone}`);
    } else {
      Alert.alert(t.title, t.language === 'ar' ? 'رقم الهاتف غير متاح' : 'Phone not available');
    }
  };

  const handleMessage = () => {
    if (driverPhone) {
      Linking.openURL(`sms:${driverPhone}`);
    } else {
      Alert.alert(t.title, t.language === 'ar' ? 'رقم الهاتف غير متاح' : 'Phone not available');
    }
  };

  if (showLiveTracking) {
    return (
      <LiveTrackingScreen
        tripId={isDemoMode ? null : tripId}
        studentId={studentId}
        language={language}
        tripData={tripData}
        onBack={() => {
          setShowLiveTracking(false);
          setIsDemoMode(false);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* MINIMALIST HEADER */}
      <Animated.View 
        style={[
          styles.header,
          { transform: [{ translateY: headerSlide }] }
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack || (() => Alert.alert('Go Back'))}
          activeOpacity={0.7}
        >
          <MaterialIcons name={isRTL ? "arrow-forward-ios" : "arrow-back-ios"} size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>{t.title}</Text>
        <View style={styles.headerPlaceholder} />
      </Animated.View>

      {/* CONTENT SCROLL VIEW */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: contentOpacity }}>
          {/* MAP CARD */}
          <View style={styles.mapCard}>
            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={getRegion()}
                onLayout={() => setMapReady(true)}
              >
                {/* Bus Route */}
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor={COLORS.primary}
                  strokeWidth={4}
                  lineDashPattern={[1]}
                />
                {/* User Path to Pickup */}
                <Polyline
                  coordinates={userPathCoordinates}
                  strokeColor={COLORS.secondary}
                  strokeWidth={4}
                />

                {/* Markers */}
                <Marker coordinate={homeLocation} title={t.home}>
                  <View style={[styles.markerPin, { backgroundColor: COLORS.secondary }]}>
                    <MaterialIcons name="home" size={20} color={COLORS.card} />
                  </View>
                </Marker>
                <Marker coordinate={pickupLocation} title={t.pickupStation}>
                  <View style={[styles.markerPin, { backgroundColor: COLORS.primary }]}>
                    <MaterialIcons name="location-on" size={20} color={COLORS.card} />
                  </View>
                </Marker>
                <Marker coordinate={destinationLocation} title={t.destination}>
                  <View style={[styles.markerPin, { backgroundColor: COLORS.textSecondary }]}>
                    <MaterialIcons name="school" size={20} color={COLORS.card} />
                  </View>
                </Marker>
                {userLocation && (
                  <Marker coordinate={userLocation} title="You">
                    <MaterialIcons name="person-pin-circle" size={30} color={COLORS.primary} />
                  </Marker>
                )}
              </MapView>

              {/* Legend */}
              <View style={[styles.legendBox, isRTL && styles.legendBoxRTL]}>
                <View style={[styles.legendRow, { marginBottom: 8 }, isRTL && styles.legendRowRTL]}>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                  <Text style={[TYPOGRAPHY.caption, isRTL && styles.rtlText]}>{t.busPath}</Text>
                </View>
                <View style={[styles.legendRow, isRTL && styles.legendRowRTL]}>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.secondary }]} />
                  <Text style={[TYPOGRAPHY.caption, isRTL && styles.rtlText]}>{t.yourPathToStation}</Text>
                </View>
              </View>

              {/* My Location Button */}
              <TouchableOpacity
                style={styles.myLocationButton}
                onPress={getCurrentLocation}
                disabled={isLoadingLocation}
              >
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <MaterialIcons name="my-location" size={24} color={COLORS.textPrimary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* INFO CARDS ROW */}
          <View style={[styles.infoRow, isRTL && styles.infoRowRTL]}>
            {/* ETA Card */}
            <View style={styles.infoCard}>
              <MaterialIcons name="schedule" size={24} color={COLORS.primary} />
              <View style={styles.infoCardContent}>
                <Text style={[styles.infoCardLabel, isRTL && styles.rtlText]}>{t.estimatedArrival}</Text>
                <Text style={[styles.infoCardValue, isRTL && styles.rtlText]}>
                  {estimatedArrivalMinutes} <Text style={styles.infoCardUnit}>{t.minutes}</Text>
                </Text>
              </View>
            </View>
            {/* Distance Card */}
            <View style={styles.infoCard}>
              <MaterialIcons name="straighten" size={24} color={COLORS.secondary} />
              <View style={styles.infoCardContent}>
                <Text style={[styles.infoCardLabel, isRTL && styles.rtlText]}>{t.distance}</Text>
                <Text style={[styles.infoCardValue, isRTL && styles.rtlText]}>
                  {distanceToStation.toFixed(1)} <Text style={styles.infoCardUnit}>{t.km}</Text>
                </Text>
              </View>
            </View>
          </View>

          {/* DRIVER INFO - COMPACT CARD */}
          <DriverActionCard 
            t={t}
            driverName={driverName}
            driverPhone={driverPhone}
            isDriverOnline={isDriverOnline}
            isRTL={isRTL}
            handleCall={handleCall}
            handleMessage={handleMessage}
          />

          {/* JOURNEY TIMELINE */}
          <View style={styles.timelineSection}>
            <MinimalTimeline 
              t={t} 
              isRTL={isRTL} 
              leaveHomeTime={leaveHomeTime}
              reachPickupTime={reachPickupTime}
              arriveDestinationTime={arriveDestinationTime}
              estimatedArrivalMinutes={estimatedArrivalMinutes}
            />
          </View>
        </Animated.View>
      </ScrollView>

      {/* PRIMARY CTA - FIXED BOTTOM BUTTON */}
      <Animated.View 
        style={[
          styles.ctaContainer,
          { transform: [{ translateY: ctaButtonTranslate }] }
        ]}
      >
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleNavigateToLiveTracking}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[COLORS.primary, '#0056B3']} // Darker shade for gradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.ctaGradient, isRTL && styles.ctaGradientRTL]}
          >
            <Text style={[styles.ctaButtonText, isRTL && styles.rtlText]}>
              {t.liveTracking}
            </Text>
            <MaterialIcons name={isRTL ? "arrow-back" : "arrow-forward"} size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

// =================================================================
// 6. STYLES (Redesigned)
// =================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  rtlText: {
    textAlign: 'right',
  },

  // ========== HEADER ==========
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    fontWeight: '700',
  },
  headerPlaceholder: {
    width: 36, // To balance the back button
  },

  // ========== SCROLL VIEW ==========
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Space for the fixed CTA button
  },

  // ========== MAP CARD ==========
  mapCard: {
    marginBottom: 20,
  },
  mapContainer: {
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  map: {
    flex: 1,
  },

  // Legend
  legendBox: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 10,
  },
  legendBoxRTL: {
    left: 'auto',
    right: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendRowRTL: {
    flexDirection: 'row-reverse',
  },
  legendDot: {
    width: 16,
    height: 4,
    borderRadius: 2,
  },

  // My Location Button
  myLocationButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  // Markers
  markerPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.card,
  },

  // ========== INFO CARDS ROW ==========
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  infoRowRTL: {
    flexDirection: 'row-reverse',
  },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  infoCardUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },

  // ========== TIMELINE SECTION ==========
  timelineSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // ========== CTA BUTTON (Fixed Bottom) ==========
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  ctaButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  ctaGradientRTL: {
    flexDirection: 'row-reverse',
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.card,
    letterSpacing: 0.5,
  },
});

// =================================================================
// 7. TIMELINE STYLES
// =================================================================
const timelineStyles = StyleSheet.create({
  container: {
    // No extra padding here, contained by timelineSection style
  },
  rtlText: {
    textAlign: 'right',
  },
  timelineWrapper: {
    paddingHorizontal: 5,
  },
  item: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  leftColumn: {
    alignItems: 'center',
    width: 30, // Smaller width for minimal look
  },
  iconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  connector: {
    width: 2,
    flex: 1,
    marginTop: 5,
    marginBottom: -5,
  },
  rightColumn: {
    flex: 1,
    marginLeft: 15,
    paddingBottom: 10,
  },
  rtlRightColumn: {
    marginRight: 15,
    marginLeft: 0,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  time: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  subLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  extraCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  extraText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
  }
});

// =================================================================
// 8. DRIVER ACTION STYLES
// =================================================================
const driverActionStyles = StyleSheet.create({
  container: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rtlText: {
    textAlign: 'right',
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 15,
  },
  driverRowRTL: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusRowRTL: {
    flexDirection: 'row-reverse',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionsRowRTL: {
    flexDirection: 'row-reverse',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

export default TripDetailsScreen;
