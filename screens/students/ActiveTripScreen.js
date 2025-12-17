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

const translations = {
  en: {
    title: 'Your Trip',
    busPath: 'Bus route',
    yourPathToStation: 'Walking route',
    estimatedArrival: 'Estimated arrival',
    minutes: 'min',
    km: 'km',
    tripStations: 'Trip Timeline',
    done: 'Done',
    now: 'Now',
    soon: 'Soon',
    captain: 'Driver',
    onlineNow: 'Online',
    call: 'Call',
    message: 'Message',
    leaveHome: 'Leave Home',
    reachPickup: 'Driver Arrives',
    arriveDestination: 'Arrive at School',
    walkingTo: 'walking to',
    pickupPoint: 'Pickup Point',
    timeUntil: 'Time Until',
    distance: 'Distance',
    driverArrival: 'Driver Arrival',
    readyIn: 'Get ready in',
    startLiveTracking: 'Start Live Tracking',
    tripReady: 'Trip Ready',
  },
  ar: {
    title: 'رحلتك',
    busPath: 'مسار الحافلة',
    yourPathToStation: 'مسار المشي',
    estimatedArrival: 'الوقت المقدر',
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
    leaveHome: 'مغادرة من المنزل',
    reachPickup: 'وصول السائق',
    arriveDestination: 'الوصول للمدرسة',
    walkingTo: 'مشي إلى',
    pickupPoint: 'نقطة الالتقاء',
    timeUntil: 'الوقت المتبقي',
    distance: 'المسافة',
    driverArrival: 'وصول السائق',
    readyIn: 'استعد خلال',
    startLiveTracking: 'بدء التتبع المباشر',
    tripReady: 'الرحلة جاهزة',
  },
};

const TripDetailsScreen = ({
  tripData,
  language = 'en',
  onBack,
}) => {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [showLiveTracking, setShowLiveTracking] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Animations
  const headerSlide = useRef(new Animated.Value(-100)).current;
  const cardSlide = useRef(new Animated.Value(50)).current;
  const stationsSlide = useRef(new Animated.Value(50)).current;
  const driverCardOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.9)).current;

  const t = translations[language];
  const isRTL = language === 'ar';

  // Extract trip data
  const homeLocation = tripData?.homeLocation || { latitude: 33.5731, longitude: -7.5898 };
  const pickupLocation = tripData?.pickupLocation || { latitude: 33.5750, longitude: -7.5900 };
  const destinationLocation = tripData?.destinationLocation || { latitude: 33.5800, longitude: -7.5920 };

  const routeCoordinates = tripData?.routeCoordinates || [
    homeLocation,
    { latitude: (homeLocation.latitude + pickupLocation.latitude) / 2, longitude: (homeLocation.longitude + pickupLocation.longitude) / 2 },
    pickupLocation,
    { latitude: (pickupLocation.latitude + destinationLocation.latitude) / 2, longitude: (pickupLocation.longitude + destinationLocation.longitude) / 2 },
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

  const driverName = tripData?.driverName || tripData?.driver?.name || 'Ahmed';
  const driverPhone = tripData?.driverPhone || tripData?.driver?.phone || null;
  const isDriverOnline = tripData?.isDriverOnline !== undefined ? tripData.isDriverOnline : true;

  const stations = tripData?.stations || [
    {
      id: 1,
      name: language === 'ar' ? 'محطة الكوب' : 'Al-Koub Station',
      time: new Date(leaveHomeTime.getTime() - 20 * 60 * 1000),
      status: 'done',
    },
    {
      id: 2,
      name: language === 'ar' ? 'الجامعة' : 'University',
      time: reachPickupTime,
      status: 'now',
    },
    {
      id: 3,
      name: language === 'ar' ? 'المركز التجاري' : 'Commercial Center',
      time: arriveDestinationTime,
      status: 'soon',
    },
  ];

  // Trigger animations on mount
  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(headerSlide, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(cardSlide, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(stationsSlide, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(driverCardOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Calculate countdown to driver arrival at pickup
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const arrival = new Date(reachPickupTime);
      const diff = Math.max(0, arrival - now);

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      setCountdown({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [reachPickupTime]);

  const getRegion = () => {
    const minLat = Math.min(homeLocation.latitude, pickupLocation.latitude, destinationLocation.latitude);
    const maxLat = Math.max(homeLocation.latitude, pickupLocation.latitude, destinationLocation.latitude);
    const minLng = Math.min(homeLocation.longitude, pickupLocation.longitude, destinationLocation.longitude);
    const maxLng = Math.max(homeLocation.longitude, pickupLocation.longitude, destinationLocation.longitude);

    const latDelta = (maxLat - minLat) * 1.5 || 0.01;
    const lngDelta = (maxLng - minLng) * 1.5 || 0.01;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(latDelta, 0.01),
      longitudeDelta: Math.max(lngDelta, 0.01),
    };
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (mapReady && mapRef.current) {
      const coordinates = [homeLocation, pickupLocation, destinationLocation];
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 80, right: 20, bottom: 20, left: 20 },
        animated: true,
      });
    }
  }, [mapReady]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasPermission(status === 'granted');
      if (status === 'granted') {
        getCurrentLocation();
      }
    } catch (err) {
      console.error('Error requesting location permission:', err);
      setHasPermission(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };

      setUserLocation(newLocation);

      if (mapRef.current) {
        mapRef.current.animateToRegion(
          { ...newLocation, latitudeDelta: 0.01, longitudeDelta: 0.01 },
          500
        );
      }
    } catch (err) {
      console.error('Error getting current location:', err);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return '--:--';
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatTimeWithPeriod = (date) => {
    if (!date) return '--:--';
    const d = new Date(date);
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    return `${displayHours.toString().padStart(2, '0')}:${minutes}`;
  };

  const rawTripId = tripData?.tripId || tripData?.bookingId || tripData?.id;
  const tripId = validateAndReturnUUID(rawTripId);
  const studentId = tripData?.studentId || 'demo-student-id';

  const handleNavigateToLiveTracking = () => {
    if (!tripId) {
      Alert.alert(
        language === 'ar' ? 'معرف الرحلة غير صالح' : 'Invalid Trip ID',
        language === 'ar'
          ? 'لا يمكن تتبع هذه الرحلة'
          : 'This trip cannot be tracked',
        [{ text: language === 'ar' ? 'موافق' : 'OK' }]
      );
      return;
    }

    setIsDemoMode(false);
    setShowLiveTracking(true);
  };

  const handleCall = () => {
    if (driverPhone) {
      Linking.openURL(`tel:${driverPhone}`);
    } else {
      Alert.alert(
        language === 'ar' ? 'رقم الهاتف غير متاح' : 'Phone not available'
      );
    }
  };

  const handleMessage = () => {
    if (driverPhone) {
      Linking.openURL(`sms:${driverPhone}`);
    } else {
      Alert.alert(
        language === 'ar' ? 'رقم الهاتف غير متاح' : 'Phone not available'
      );
    }
  };

  const getStationStatusColor = (status) => {
    switch (status) {
      case 'done': return '#10B981';
      case 'now': return '#3B82F6';
      case 'soon': return '#94A3B8';
      default: return '#94A3B8';
    }
  };

  const getStationStatusText = (status) => {
    switch (status) {
      case 'done': return t.done;
      case 'now': return t.now;
      case 'soon': return t.soon;
      default: return '';
    }
  };

  if (showLiveTracking) {
    return (
      <LiveTrackingScreen
        tripId={isDemoMode ? null : tripId}
        studentId={studentId}
        language={language}
        onBack={() => {
          setShowLiveTracking(false);
          setIsDemoMode(false);
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Full Background Map */}
      <View style={styles.mapBackground}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
              initialRegion={getRegion()}
              onMapReady={() => setMapReady(true)}
              showsUserLocation={hasPermission && userLocation !== null}
              showsMyLocationButton={false}
              scrollEnabled={true}
              zoomEnabled={true}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              {/* Bus Route */}
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#3B82F6"
                strokeWidth={3}
                lineCap="round"
                lineJoin="round"
              />

              {/* User Path */}
              <Polyline
                coordinates={userPathCoordinates}
                strokeColor="#F59E0B"
                strokeWidth={3}
                lineCap="round"
                lineJoin="round"
              />

              {/* Markers */}
              <Marker coordinate={homeLocation}>
                <View style={styles.markerContainer}>
                  <View style={[styles.markerPin, styles.homeMarker]}>
                    <MaterialIcons name="home" size={20} color="#FFFFFF" />
                  </View>
                </View>
              </Marker>

              <Marker coordinate={pickupLocation}>
                <View style={styles.markerContainer}>
                  <View style={[styles.markerPin, styles.pickupMarker]}>
                    <MaterialIcons name="directions-bus" size={20} color="#FFFFFF" />
                  </View>
                </View>
              </Marker>

              <Marker coordinate={destinationLocation}>
                <View style={styles.markerContainer}>
                  <View style={[styles.markerPin, styles.schoolMarker]}>
                    <MaterialIcons name="school" size={20} color="#FFFFFF" />
                  </View>
                </View>
              </Marker>
        </MapView>
      </View>

      {/* Overlay Header */}
      <SafeAreaView style={styles.overlayContainer} edges={['top']}>
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <View style={styles.backButtonContainer}>
              <MaterialIcons
                name={isRTL ? "arrow-forward" : "arrow-back"}
                size={24}
                color="#FFFFFF"
              />
            </View>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isRTL && styles.rtl]}>
            {t.title}
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Countdown Card */}
        <View style={[styles.countdownBanner, isRTL && styles.countdownBannerRTL]}>
          <View style={styles.countdownIconBox}>
            <MaterialIcons name="access-time" size={32} color="#3B82F6" />
          </View>
          <View style={styles.countdownInfo}>
            <Text style={[styles.countdownTitle, isRTL && styles.rtl]}>
              {t.readyIn}
            </Text>
            <View style={styles.countdownValues}>
              {countdown.hours > 0 && (
                <>
                  <Text style={[styles.countdownNumber, isRTL && styles.rtl]}>
                    {countdown.hours.toString().padStart(2, '0')}
                  </Text>
                  <Text style={[styles.countdownSeparator, isRTL && styles.rtl]}>:</Text>
                </>
              )}
              <Text style={[styles.countdownNumber, isRTL && styles.rtl]}>
                {countdown.minutes.toString().padStart(2, '0')}
              </Text>
              <Text style={[styles.countdownSeparator, isRTL && styles.rtl]}>:</Text>
              <Text style={[styles.countdownNumber, isRTL && styles.rtl]}>
                {countdown.seconds.toString().padStart(2, '0')}
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Bottom Info Panel */}
      <ScrollView
        style={styles.bottomPanel}
        contentContainerStyle={styles.bottomPanelContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Trip Info Cards */}
        <View style={[styles.infoCard, isRTL && styles.infoCardRTL]}>
          <View style={styles.infoCardItem}>
            <MaterialIcons name="home" size={20} color="#3B82F6" />
            <Text style={[styles.infoCardLabel, isRTL && styles.rtl]}>
              {t.leaveHome}
            </Text>
            <Text style={[styles.infoCardValue, isRTL && styles.rtl]}>
              {formatTime(leaveHomeTime)}
            </Text>
          </View>
          <View style={styles.infoCardDivider} />
          <View style={styles.infoCardItem}>
            <MaterialIcons name="straighten" size={20} color="#10B981" />
            <Text style={[styles.infoCardLabel, isRTL && styles.rtl]}>
              {t.distance}
            </Text>
            <Text style={[styles.infoCardValue, isRTL && styles.rtl]}>
              {distanceToStation.toFixed(1)} {t.km}
            </Text>
          </View>
        </View>

        {/* Driver Card */}
        <View style={[styles.driverCard, isRTL && styles.driverCardRTL]}>
          <View style={[styles.driverHeader, isRTL && styles.driverHeaderRTL]}>
            <View style={styles.driverAvatar}>
              <MaterialIcons name="person" size={28} color="#FFFFFF" />
            </View>
            <View style={[styles.driverDetails, isRTL && styles.driverDetailsRTL]}>
              <Text style={[styles.driverName, isRTL && styles.rtl]}>
                {t.captain} {driverName}
              </Text>
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
                <Text style={[styles.onlineText, isRTL && styles.rtl]}>
                  {t.onlineNow}
                </Text>
              </View>
            </View>
          </View>

          {/* Contact Buttons */}
          <View style={[styles.contactButtons, isRTL && styles.contactButtonsRTL]}>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleCall}
              activeOpacity={0.8}
            >
              <MaterialIcons name="phone" size={20} color="#3B82F6" />
              <Text style={[styles.contactButtonText, isRTL && styles.rtl]}>
                {t.call}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleMessage}
              activeOpacity={0.8}
            >
              <MaterialIcons name="message" size={20} color="#10B981" />
              <Text style={[styles.contactButtonText, isRTL && styles.rtl]}>
                {t.message}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Start Tracking Button */}
        <TouchableOpacity
          style={styles.startTrackingButton}
          onPress={() => setShowLiveTracking(true)}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            style={styles.startTrackingGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons name="navigation" size={24} color="#FFFFFF" />
            <Text style={[styles.startTrackingText, isRTL && styles.rtl]}>
              {t.startLiveTracking}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mapBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },

  // ========== HEADER ==========
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    padding: 8,
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: UbuntuFonts.bold,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerPlaceholder: {
    width: 40,
  },

  // ========== COUNTDOWN BANNER ==========
  countdownBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  countdownBannerRTL: {
    flexDirection: 'row-reverse',
  },
  countdownIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownInfo: {
    flex: 1,
  },
  countdownTitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: UbuntuFonts.semiBold,
    marginBottom: 8,
  },
  countdownValues: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#3B82F6',
    fontFamily: UbuntuFonts.bold,
    letterSpacing: -1,
  },
  countdownSeparator: {
    fontSize: 32,
    fontWeight: '800',
    color: '#3B82F6',
    marginHorizontal: 4,
  },

  // ========== BOTTOM PANEL ==========
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomPanelContent: {
    padding: 20,
    paddingBottom: 32,
    gap: 16,
  },

  // ========== INFO CARD ==========
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoCardRTL: {
    flexDirection: 'row-reverse',
  },
  infoCardItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  infoCardDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  infoCardLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    fontFamily: UbuntuFonts.medium,
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: UbuntuFonts.bold,
  },

  // ========== DRIVER CARD ==========
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  driverCardRTL: {
    flexDirection: 'row-reverse',
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  driverHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverDetails: {
    flex: 1,
  },
  driverDetailsRTL: {
    alignItems: 'flex-end',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: UbuntuFonts.bold,
    marginBottom: 4,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  onlineText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
    fontFamily: UbuntuFonts.semiBold,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  contactButtonsRTL: {
    flexDirection: 'row-reverse',
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    fontFamily: UbuntuFonts.semiBold,
  },

  // ========== START TRACKING BUTTON ==========
  startTrackingButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  startTrackingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  startTrackingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: UbuntuFonts.bold,
  },

  // ========== MAP CARD ==========
  mapCard: {
    marginBottom: 20,
  },
  mapContainer: {
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  map: {
    flex: 1,
  },

  // ========== LEGEND ==========
  legendBox: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  legendBoxRTL: {
    left: 'auto',
    right: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendIndicator: {
    width: 12,
    height: 3,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    fontFamily: UbuntuFonts.semiBold,
  },

  // ========== MAP CONTROLS ==========
  mapControls: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -24 }],
  },
  mapControlButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  // ========== MARKERS ==========
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  homeMarker: {
    backgroundColor: '#6366F1',
  },
  pickupMarker: {
    backgroundColor: '#3B82F6',
  },
  schoolMarker: {
    backgroundColor: '#F59E0B',
  },

  // ========== ARRIVAL CARD ==========
  arrivalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  arrivalLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  arrivalIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrivalTextBox: {
    flex: 1,
  },
  arrivalLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    fontFamily: UbuntuFonts.medium,
    marginBottom: 2,
  },
  arrivalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
    fontFamily: UbuntuFonts.bold,
  },
  dividerVertical: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  arrivalRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  distanceIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  distanceTextBox: {
    flex: 1,
  },
  distanceLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    fontFamily: UbuntuFonts.medium,
    marginBottom: 2,
  },
  distanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
    fontFamily: UbuntuFonts.bold,
  },

  // ========== STATIONS SECTION ==========
  stationsContainer: {
    marginBottom: 24,
  },
  stationsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  stationsIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: UbuntuFonts.bold,
  },

  stationsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  timelineItemRTL: {
    flexDirection: 'row-reverse',
  },
  timelineIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  timelineContent: {
    flex: 1,
  },
  timelineContentRTL: {
    alignItems: 'flex-end',
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: UbuntuFonts.bold,
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3B82F6',
    fontFamily: UbuntuFonts.semiBold,
  },
  walkingDurationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 28,
    paddingVertical: 16,
    gap: 16,
  },
  walkingDurationContainerRTL: {
    paddingLeft: 0,
    paddingRight: 28,
    flexDirection: 'row-reverse',
  },
  verticalLine: {
    width: 2,
    height: 50,
    backgroundColor: '#CBD5E1',
  },
  walkingDurationText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: UbuntuFonts.medium,
    fontStyle: 'italic',
  },

  // ========== DRIVER CARD ==========
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  driverContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverContentRTL: {
    flexDirection: 'row-reverse',
  },
  driverAvatarBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  driverAvatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: UbuntuFonts.bold,
    marginBottom: 4,
  },
  driverStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 'auto',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  driverStatus: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    fontFamily: UbuntuFonts.semiBold,
  },

  // ========== ACTION BUTTONS ==========
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  callButtonWrapper: {
    flex: 1,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  callButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: UbuntuFonts.bold,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    gap: 8,
  },
  messageButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3B82F6',
    fontFamily: UbuntuFonts.bold,
  },

  // ========== RTL ==========
  rtl: {
    textAlign: 'right',
  },
});

export default TripDetailsScreen;
