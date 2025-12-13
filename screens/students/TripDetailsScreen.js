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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import LiveTrackingScreen from './LiveTrackingScreen';
import { validateAndReturnUUID } from '../../src/utils/validation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const translations = {
  en: {
    title: 'Your Trip',
    leaveHome: 'Leave Home',
    reachPickup: 'Reach Pickup Point',
    arriveDestination: 'Arrive at School',
    totalDuration: 'Total Duration',
    totalDistance: 'Total Distance',
    home: 'Home',
    pickupPoint: 'Pickup Point',
    destination: 'School',
    liveTracking: 'Live Tracking',
    trackTrip: 'Track Trip',
    viewDemo: 'View Live Trip Demo',
    demoDescription: 'See how live tracking works',
  },
  ar: {
    title: 'رحلتك',
    leaveHome: 'مغادرة المنزل',
    reachPickup: 'الوصول إلى نقطة الاستلام',
    arriveDestination: 'الوصول إلى المدرسة',
    totalDuration: 'المدة الإجمالية',
    totalDistance: 'المسافة الإجمالية',
    home: 'المنزل',
    pickupPoint: 'نقطة الاستلام',
    destination: 'المدرسة',
    liveTracking: 'التتبع المباشر',
    trackTrip: 'تتبع الرحلة',
    viewDemo: 'عرض تجريبي للتتبع المباشر',
    demoDescription: 'شاهد كيف يعمل التتبع المباشر',
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

  const t = translations[language];
  const isRTL = language === 'ar';

  // Extract trip data
  const homeLocation = tripData?.homeLocation || { latitude: 33.5731, longitude: -7.5898 };
  const pickupLocation = tripData?.pickupLocation || { latitude: 33.5750, longitude: -7.5900 };
  const destinationLocation = tripData?.destinationLocation || { latitude: 33.5800, longitude: -7.5920 };

  // Route coordinates
  const routeCoordinates = tripData?.routeCoordinates || [
    homeLocation,
    {
      latitude: (homeLocation.latitude + pickupLocation.latitude) / 2,
      longitude: (homeLocation.longitude + pickupLocation.longitude) / 2,
    },
    pickupLocation,
    {
      latitude: (pickupLocation.latitude + destinationLocation.latitude) / 2,
      longitude: (pickupLocation.longitude + destinationLocation.longitude) / 2,
    },
    destinationLocation,
  ];

  // Trip timing
  const leaveHomeTime = tripData?.leaveHomeTime || new Date(Date.now() + 30 * 60 * 1000);
  const reachPickupTime = tripData?.reachPickupTime || new Date(Date.now() + 45 * 60 * 1000);
  const arriveDestinationTime = tripData?.arriveDestinationTime || new Date(Date.now() + 60 * 60 * 1000);

  // Calculate total duration and distance
  const totalDurationMinutes = tripData?.totalDurationMinutes || 45;
  const totalDistanceKm = tripData?.totalDistanceKm || 5.2;

  // Calculate region to fit all markers
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
        edgePadding: {
          top: 80,
          right: 20,
          bottom: 20,
          left: 20,
        },
        animated: true,
      });
    }
  }, [mapReady, homeLocation, pickupLocation, destinationLocation]);

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
          {
            ...newLocation,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
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

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes} ${language === 'ar' ? 'دقيقة' : 'min'}`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins > 0 ? `${mins}min` : ''}`;
  };

  // Extract and validate tripId and studentId for LiveTrackingScreen
  const rawTripId = tripData?.tripId || tripData?.bookingId || tripData?.id;
  const tripId = validateAndReturnUUID(rawTripId);
  const studentId = tripData?.studentId || 'demo-student-id';

  // Handle navigation to Live Tracking
  const handleNavigateToLiveTracking = () => {
    if (!tripId) {
      Alert.alert(
        language === 'ar' ? 'معرف الرحلة غير صالح' : 'Invalid Trip ID',
        language === 'ar'
          ? 'لا يمكن تتبع هذه الرحلة لأن معرف الرحلة غير صالح. يرجى إنشاء رحلة جديدة.'
          : 'This trip cannot be tracked because the trip ID is invalid. Please create a new trip.',
        [{ text: language === 'ar' ? 'موافق' : 'OK' }]
      );
      return;
    }

    setIsDemoMode(false);
    setShowLiveTracking(true);
  };

  // Handle navigation to Live Tracking Demo
  const handleNavigateToDemo = () => {
    setIsDemoMode(true);
    setShowLiveTracking(true);
  };

  // Show LiveTrackingScreen if enabled
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Page Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={24}
            color="#1A1A1A"
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && styles.rtl]}>
          {t.title}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Map Section */}
        <View style={styles.mapSection}>
          <View style={styles.mapContainer}>
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
              {/* Route Line */}
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#3185FC"
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
              />

              {/* Home Marker */}
              <Marker
                coordinate={homeLocation}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.markerContainer}>
                  <View style={styles.markerPulse} />
                  <View style={[styles.markerPin, styles.homeMarker]}>
                    <View style={styles.markerInnerDot} />
                  </View>
                </View>
              </Marker>

              {/* Pickup Marker */}
              <Marker
                coordinate={pickupLocation}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.markerContainer}>
                  <View style={[styles.markerPin, styles.pickupMarker]}>
                    <MaterialIcons name="directions-bus" size={18} color="#FFFFFF" />
                  </View>
                  <View style={styles.markerLabelContainer}>
                    <Text style={styles.markerLabelText}>{t.pickupPoint}</Text>
                  </View>
                </View>
              </Marker>

              {/* School Marker */}
              <Marker
                coordinate={destinationLocation}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.markerContainer}>
                  <View style={[styles.markerPin, styles.schoolMarker]}>
                    <MaterialIcons name="school" size={18} color="#FFFFFF" />
                  </View>
                  <View style={styles.markerLabelContainer}>
                    <Text style={styles.markerLabelText}>{t.destination}</Text>
                  </View>
                </View>
              </Marker>
            </MapView>

            {/* My Location Button */}
            <TouchableOpacity
              style={styles.locationButton}
              onPress={getCurrentLocation}
              disabled={isLoadingLocation}
              activeOpacity={0.7}
            >
              {isLoadingLocation ? (
                <ActivityIndicator color="#3185FC" size="small" />
              ) : (
                <View style={styles.locationButtonContent}>
                  <MaterialIcons name="send" size={18} color="#3185FC" />
                  <Text style={styles.locationButtonText}>
                    {language === 'ar' ? 'موقعي' : 'My Location'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Trip Summary Cards */}
        <View style={[styles.summaryCards, isRTL && styles.summaryCardsRTL]}>
          <View style={[styles.summaryCard, styles.durationCard]}>
            <View style={styles.summaryIconContainer}>
              <MaterialIcons name="access-time" size={24} color="#3185FC" />
            </View>
            <View style={styles.summaryContent}>
              <Text style={[styles.summaryLabel, isRTL && styles.rtl]}>
                {t.totalDuration}
              </Text>
              <Text style={[styles.summaryValue, isRTL && styles.rtl]}>
                {formatDuration(totalDurationMinutes)}
              </Text>
            </View>
          </View>

          <View style={[styles.summaryCard, styles.distanceCard]}>
            <View style={styles.summaryIconContainer}>
              <MaterialIcons name="straighten" size={24} color="#3185FC" />
            </View>
            <View style={styles.summaryContent}>
              <Text style={[styles.summaryLabel, isRTL && styles.rtl]}>
                {t.totalDistance}
              </Text>
              <Text style={[styles.summaryValue, isRTL && styles.rtl]}>
                {totalDistanceKm.toFixed(1)} {language === 'ar' ? 'كم' : 'km'}
              </Text>
            </View>
          </View>
        </View>

        {/* Trip Timeline */}
        <View style={styles.timelineSection}>
          <View style={styles.timelineContainer}>
            {/* Leave Home */}
            <View style={[styles.timelineItem, isRTL && styles.timelineItemRTL]}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, styles.blueDot]}>
                  <MaterialIcons name="home" size={16} color="#FFFFFF" />
                </View>
                <View style={styles.timelineLine} />
              </View>
              <View style={[styles.timelineCard, isRTL && styles.timelineCardRTL]}>
                <View style={[styles.timelineCardContent, isRTL && styles.timelineCardContentRTL]}>
                  <Text style={[styles.timelineLabel, isRTL && styles.rtl]}>
                    {t.leaveHome}
                  </Text>
                  <Text style={[styles.timelineTime, isRTL && styles.timelineTimeRTL]}>
                    {formatTime(leaveHomeTime)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Reach Pickup */}
            <View style={[styles.timelineItem, isRTL && styles.timelineItemRTL]}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, styles.blueDot]}>
                  <MaterialIcons name="directions-bus" size={16} color="#FFFFFF" />
                </View>
                <View style={styles.timelineLine} />
              </View>
              <View style={[styles.timelineCard, isRTL && styles.timelineCardRTL]}>
                <View style={[styles.timelineCardContent, isRTL && styles.timelineCardContentRTL]}>
                  <Text style={[styles.timelineLabel, isRTL && styles.rtl]}>
                    {t.reachPickup}
                  </Text>
                  <Text style={[styles.timelineTime, isRTL && styles.timelineTimeRTL]}>
                    {formatTime(reachPickupTime)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Arrive at School */}
            <View style={[styles.timelineItem, isRTL && styles.timelineItemRTL]}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, styles.blueDot]}>
                  <MaterialIcons name="school" size={16} color="#FFFFFF" />
                </View>
              </View>
              <View style={[styles.timelineCard, isRTL && styles.timelineCardRTL]}>
                <View style={[styles.timelineCardContent, isRTL && styles.timelineCardContentRTL]}>
                  <Text style={[styles.timelineLabel, isRTL && styles.rtl]}>
                    {t.arriveDestination}
                  </Text>
                  <Text style={[styles.timelineTime, isRTL && styles.timelineTimeRTL]}>
                    {formatTime(arriveDestinationTime)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Live Tracking Button */}
        {tripId && (
          <TouchableOpacity
            style={[styles.liveTrackingButton, isRTL && styles.liveTrackingButtonRTL]}
            onPress={handleNavigateToLiveTracking}
            activeOpacity={0.8}
          >
            <View style={styles.liveTrackingButtonContent}>
              <View style={styles.liveTrackingIconContainer}>
                <MaterialIcons name="gps-fixed" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.liveTrackingTextContainer}>
                <Text style={[styles.liveTrackingTitle, isRTL && styles.rtl]}>
                  {t.liveTracking}
                </Text>
                <Text style={[styles.liveTrackingSubtitle, isRTL && styles.rtl]}>
                  {t.trackTrip}
                </Text>
              </View>
              <MaterialIcons
                name={isRTL ? "arrow-forward" : "arrow-forward"}
                size={24}
                color="#FFFFFF"
              />
            </View>
          </TouchableOpacity>
        )}

        {/* Live Trip Demo Button */}
        <TouchableOpacity
          style={[styles.demoButton, isRTL && styles.demoButtonRTL]}
          onPress={handleNavigateToDemo}
          activeOpacity={0.8}
        >
          <View style={styles.demoButtonContent}>
            <View style={styles.demoIconContainer}>
              <MaterialIcons name="play-circle-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.demoTextContainer}>
              <Text style={[styles.demoTitle, isRTL && styles.rtl]}>
                {t.viewDemo}
              </Text>
              <Text style={[styles.demoSubtitle, isRTL && styles.rtl]}>
                {t.demoDescription}
              </Text>
            </View>
            <MaterialIcons
              name={isRTL ? "arrow-forward" : "arrow-forward"}
              size={24}
              color="#FFFFFF"
            />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  // Map Section
  mapSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    marginBottom: 24,
  },
  mapContainer: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  map: {
    flex: 1,
  },
  locationButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  locationButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3185FC',
  },
  // Marker Styles
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  markerPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3185FC',
    opacity: 0.3,
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1,
  },
  markerInnerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3185FC',
  },
  homeMarker: {
    backgroundColor: '#FFFFFF',
  },
  pickupMarker: {
    backgroundColor: '#3185FC',
  },
  schoolMarker: {
    backgroundColor: '#8B4513',
  },
  markerLabelContainer: {
    position: 'absolute',
    top: 48,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  markerLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  // Summary Cards
  summaryCards: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 32,
  },
  summaryCardsRTL: {
    flexDirection: 'row-reverse',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#F0F7FF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#3185FC',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  durationCard: {
    backgroundColor: '#F0F7FF',
  },
  distanceCard: {
    backgroundColor: '#F0F7FF',
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  // Timeline Section
  timelineSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  timelineContainer: {
    paddingLeft: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineItemRTL: {
    flexDirection: 'row-reverse',
    paddingRight: 20,
    paddingLeft: 0,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1,
  },
  blueDot: {
    backgroundColor: '#3185FC',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
    marginBottom: 4,
    minHeight: 20,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  timelineCardRTL: {
    marginRight: 0,
    marginLeft: 0,
  },
  timelineCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineCardContentRTL: {
    flexDirection: 'row-reverse',
  },
  timelineLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
    flex: 1,
  },
  timelineTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 12,
  },
  timelineTimeRTL: {
    marginLeft: 0,
    marginRight: 12,
  },
  // Live Tracking Button
  liveTrackingButton: {
    backgroundColor: '#3185FC',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 12,
    shadowColor: '#3185FC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  liveTrackingButtonRTL: {
    flexDirection: 'row-reverse',
  },
  liveTrackingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveTrackingIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveTrackingTextContainer: {
    flex: 1,
    marginLeft: 16,
    marginRight: 16,
  },
  liveTrackingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  liveTrackingSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  // Demo Button
  demoButton: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  demoButtonRTL: {
    flexDirection: 'row-reverse',
  },
  demoButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  demoIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoTextContainer: {
    flex: 1,
    marginLeft: 16,
    marginRight: 16,
  },
  demoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  demoSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  // RTL Support
  rtl: {
    textAlign: 'right',
  },
});

export default TripDetailsScreen;
