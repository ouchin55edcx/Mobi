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
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import LiveTrackingScreen from './LiveTrackingScreen';
import { isValidUUID, validateAndReturnUUID } from '../../src/utils/validation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const translations = {
  en: {
    title: 'Your Trip',
    leaveHome: 'Leave Home',
    reachPickup: 'Reach Pickup Point',
    arriveDestination: 'Arrive at Destination',
    totalDuration: 'Total Duration',
    totalDistance: 'Total Distance',
    home: 'Home',
    pickupPoint: 'Pickup Point',
    destination: 'Destination',
    back: 'Back',
    viewDetails: 'View Details',
    liveTracking: 'Live Tracking',
    trackTrip: 'Track Trip',
    viewDemo: 'View Live Trip Demo',
    demoDescription: 'See how live tracking works',
  },
  ar: {
    title: 'رحلتك',
    leaveHome: 'مغادرة المنزل',
    reachPickup: 'الوصول إلى نقطة الاستلام',
    arriveDestination: 'الوصول إلى الوجهة',
    totalDuration: 'المدة الإجمالية',
    totalDistance: 'المسافة الإجمالية',
    home: 'المنزل',
    pickupPoint: 'نقطة الاستلام',
    destination: 'الوجهة',
    back: 'رجوع',
    viewDetails: 'عرض التفاصيل',
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
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);
  const [showLiveTracking, setShowLiveTracking] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const t = translations[language];
  const isRTL = language === 'ar';

  // Extract trip data (for demo, using mock data structure)
  const homeLocation = tripData?.homeLocation || { latitude: 33.5731, longitude: -7.5898 };
  const pickupLocation = tripData?.pickupLocation || { latitude: 33.5750, longitude: -7.5900 };
  const destinationLocation = tripData?.destinationLocation || { latitude: 33.5800, longitude: -7.5920 };

  // Route coordinates (for demo - in production, decode from polyline)
  const routeCoordinates = tripData?.routeCoordinates || [
    homeLocation,
    pickupLocation,
    destinationLocation,
  ];

  // Trip timing (for demo)
  const leaveHomeTime = tripData?.leaveHomeTime || new Date(Date.now() + 30 * 60 * 1000);
  const reachPickupTime = tripData?.reachPickupTime || new Date(Date.now() + 45 * 60 * 1000);
  const arriveDestinationTime = tripData?.arriveDestinationTime || new Date(Date.now() + 60 * 60 * 1000);

  // Calculate total duration and distance
  const totalDurationMinutes = tripData?.totalDurationMinutes || 30;
  const totalDistanceKm = tripData?.totalDistanceKm || 5.2;

  useEffect(() => {
    if (mapReady && mapRef.current) {
      // Fit map to show all markers with better padding
      const coordinates = [homeLocation, pickupLocation, destinationLocation];
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { 
          top: 120, 
          right: 20, 
          bottom: SCREEN_HEIGHT * 0.45, 
          left: 20 
        },
        animated: true,
      });
    }
  }, [mapReady, homeLocation, pickupLocation, destinationLocation]);

  const handleMarkerPress = (markerType) => {
    setSelectedMarker(selectedMarker === markerType ? null : markerType);
  };

  const handleMapPress = () => {
    setSelectedMarker(null);
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
  const tripId = validateAndReturnUUID(rawTripId); // Will be null if invalid
  const studentId = tripData?.studentId || 'demo-student-id';

  // Handle navigation to Live Tracking
  const handleNavigateToLiveTracking = () => {
    if (!tripId) {
      // Show alert if tripId is invalid
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
      
      {/* Header with Gradient Effect */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <View style={styles.backButtonContainer}>
            <MaterialIcons 
              name={isRTL ? "arrow-forward" : "arrow-back"} 
              size={22} 
              color="#3185FC" 
            />
          </View>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, isRTL && styles.rtl]}>
            {t.title}
          </Text>
          <Text style={[styles.headerSubtitle, isRTL && styles.rtl]}>
            {formatTime(arriveDestinationTime)}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Map View with Enhanced Styling */}
      <View style={styles.mapContainer}>
        {/* Mini Summary Cards - Floating Above Map */}
        <View style={[styles.summaryCardsOverlay, isRTL && styles.summaryCardsOverlayRTL]}>
          <View style={[styles.miniSummaryCard, styles.miniDurationCard]}>
            <MaterialIcons name="access-time" size={18} color="#3185FC" />
            <View style={styles.miniSummaryContent}>
              <Text style={[styles.miniSummaryLabel, isRTL && styles.rtl]}>
                {t.totalDuration}
              </Text>
              <Text style={[styles.miniSummaryValue, isRTL && styles.rtl]}>
                {formatDuration(totalDurationMinutes)}
              </Text>
            </View>
          </View>

          <View style={[styles.miniSummaryCard, styles.miniDistanceCard]}>
            <MaterialIcons name="straighten" size={18} color="#10B981" />
            <View style={styles.miniSummaryContent}>
              <Text style={[styles.miniSummaryLabel, isRTL && styles.rtl]}>
                {t.totalDistance}
              </Text>
              <Text style={[styles.miniSummaryValue, isRTL && styles.rtl]}>
                {totalDistanceKm.toFixed(1)} {language === 'ar' ? 'كم' : 'km'}
              </Text>
            </View>
          </View>
        </View>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          initialRegion={{
            latitude: homeLocation.latitude,
            longitude: homeLocation.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          onMapReady={() => setMapReady(true)}
          onPress={handleMapPress}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
          mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          {/* Enhanced Route Polyline */}
          {routeCoordinates.length > 1 && (
            <>
              {/* Shadow/Outline Polyline */}
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="rgba(49, 133, 252, 0.3)"
                strokeWidth={8}
                lineCap="round"
                lineJoin="round"
              />
              {/* Main Route Polyline */}
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#3185FC"
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
              />
            </>
          )}

          {/* Enhanced Home Marker */}
          <Marker
            coordinate={homeLocation}
            onPress={() => handleMarkerPress('home')}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.markerWrapper}>
              {selectedMarker === 'home' && (
                <View style={[styles.markerPulse, styles.homePulse]} />
              )}
              <View style={[styles.markerPin, styles.homeMarker]}>
                <MaterialIcons name="home" size={22} color="#FFFFFF" />
              </View>
              <View style={[styles.markerLabel, styles.homeLabel]}>
                <Text style={styles.markerLabelText}>{t.home}</Text>
                <Text style={styles.markerLabelTime}>{formatTime(leaveHomeTime)}</Text>
              </View>
            </View>
          </Marker>

          {/* Enhanced Pickup Point Marker */}
          <Marker
            coordinate={pickupLocation}
            onPress={() => handleMarkerPress('pickup')}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.markerWrapper}>
              {selectedMarker === 'pickup' && (
                <View style={[styles.markerPulse, styles.pickupPulse]} />
              )}
              <View style={[styles.markerPin, styles.pickupMarker]}>
                <MaterialIcons name="directions-bus" size={22} color="#FFFFFF" />
              </View>
              <View style={[styles.markerLabel, styles.pickupLabel]}>
                <Text style={styles.markerLabelText}>{t.pickupPoint}</Text>
                <Text style={styles.markerLabelTime}>{formatTime(reachPickupTime)}</Text>
              </View>
            </View>
          </Marker>

          {/* Enhanced Destination Marker */}
          <Marker
            coordinate={destinationLocation}
            onPress={() => handleMarkerPress('destination')}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.markerWrapper}>
              {selectedMarker === 'destination' && (
                <View style={[styles.markerPulse, styles.destinationPulse]} />
              )}
              <View style={[styles.markerPin, styles.destinationMarker]}>
                <MaterialIcons name="school" size={22} color="#FFFFFF" />
              </View>
              <View style={[styles.markerLabel, styles.destinationLabel]}>
                <Text style={styles.markerLabelText}>{t.destination}</Text>
                <Text style={styles.markerLabelTime}>{formatTime(arriveDestinationTime)}</Text>
              </View>
            </View>
          </Marker>
        </MapView>

        {/* Enhanced Map Controls */}
        <View style={[styles.mapControls, isRTL && styles.mapControlsRTL]}>
          <TouchableOpacity
            style={styles.mapControlButton}
            onPress={() => {
              if (mapRef.current) {
                const coordinates = [homeLocation, pickupLocation, destinationLocation];
                mapRef.current.fitToCoordinates(coordinates, {
                  edgePadding: { 
                    top: 120, 
                    right: 20, 
                    bottom: SCREEN_HEIGHT * 0.45, 
                    left: 20 
                  },
                  animated: true,
                });
              }
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="fit-screen" size={20} color="#3185FC" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Trip Information - Enhanced Design */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Timeline Section */}
        <View style={styles.timingSection}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>
            {language === 'ar' ? 'جدول الرحلة' : 'Trip Timeline'}
          </Text>

          {/* Timeline Container */}
          <View style={styles.timelineContainer}>
            {/* Leave Home */}
            <View style={[styles.timelineItem, isRTL && styles.timelineItemRTL]}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, styles.homeTimelineDot]}>
                  <MaterialIcons name="home" size={16} color="#FFFFFF" />
                </View>
                {selectedMarker !== 'home' && (
                  <View style={styles.timelineLine} />
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.timingCard,
                  selectedMarker === 'home' && styles.timingCardSelected,
                  isRTL && styles.timingCardRTL
                ]}
                onPress={() => handleMarkerPress('home')}
                activeOpacity={0.7}
              >
                <View style={[styles.timingCardHeader, isRTL && styles.timingCardHeaderRTL]}>
                  <View style={styles.timingCardContent}>
                    <Text style={[styles.timingLabel, isRTL && styles.rtl]}>
                      {t.leaveHome}
                    </Text>
                    <Text style={[styles.timingValue, isRTL && styles.rtl]}>
                      {formatTime(leaveHomeTime)}
                    </Text>
                  </View>
                  <View style={[styles.timingIcon, styles.homeIcon]}>
                    <MaterialIcons name="home" size={24} color="#3185FC" />
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Reach Pickup */}
            <View style={[styles.timelineItem, isRTL && styles.timelineItemRTL]}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, styles.pickupTimelineDot]}>
                  <MaterialIcons name="directions-bus" size={16} color="#FFFFFF" />
                </View>
                {selectedMarker !== 'pickup' && (
                  <View style={styles.timelineLine} />
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.timingCard,
                  selectedMarker === 'pickup' && styles.timingCardSelected,
                  isRTL && styles.timingCardRTL
                ]}
                onPress={() => handleMarkerPress('pickup')}
                activeOpacity={0.7}
              >
                <View style={[styles.timingCardHeader, isRTL && styles.timingCardHeaderRTL]}>
                  <View style={styles.timingCardContent}>
                    <Text style={[styles.timingLabel, isRTL && styles.rtl]}>
                      {t.reachPickup}
                    </Text>
                    <Text style={[styles.timingValue, isRTL && styles.rtl]}>
                      {formatTime(reachPickupTime)}
                    </Text>
                  </View>
                  <View style={[styles.timingIcon, styles.pickupIcon]}>
                    <MaterialIcons name="directions-bus" size={24} color="#10B981" />
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Arrive Destination */}
            <View style={[styles.timelineItem, isRTL && styles.timelineItemRTL]}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, styles.destinationTimelineDot]}>
                  <MaterialIcons name="school" size={16} color="#FFFFFF" />
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.timingCard,
                  selectedMarker === 'destination' && styles.timingCardSelected,
                  isRTL && styles.timingCardRTL
                ]}
                onPress={() => handleMarkerPress('destination')}
                activeOpacity={0.7}
              >
                <View style={[styles.timingCardHeader, isRTL && styles.timingCardHeaderRTL]}>
                  <View style={styles.timingCardContent}>
                    <Text style={[styles.timingLabel, isRTL && styles.rtl]}>
                      {t.arriveDestination}
                    </Text>
                    <Text style={[styles.timingValue, isRTL && styles.rtl]}>
                      {formatTime(arriveDestinationTime)}
                    </Text>
                  </View>
                  <View style={[styles.timingIcon, styles.destinationIcon]}>
                    <MaterialIcons name="school" size={24} color="#F59E0B" />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Live Tracking Button */}
        {tripId && (
          <TouchableOpacity
            style={[
              styles.liveTrackingButton, 
              isRTL && styles.liveTrackingButtonRTL
            ]}
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
          style={[
            styles.demoButton, 
            isRTL && styles.demoButtonRTL
          ]}
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
    backgroundColor: '#F9FAFB',
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    padding: 8,
  },
  backButtonContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
    fontWeight: '500',
  },
  placeholder: {
    width: 52,
  },
  // Map Styles
  mapContainer: {
    height: SCREEN_HEIGHT * 0.45,
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  map: {
    flex: 1,
  },
  // Mini Summary Cards Overlay
  summaryCardsOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 10,
    zIndex: 1000,
  },
  summaryCardsOverlayRTL: {
    flexDirection: 'row-reverse',
  },
  miniSummaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
  },
  miniDurationCard: {
    borderColor: '#E0F2FE',
    backgroundColor: '#FFFFFF',
  },
  miniDistanceCard: {
    borderColor: '#D1FAE5',
    backgroundColor: '#FFFFFF',
  },
  miniSummaryContent: {
    flex: 1,
  },
  miniSummaryLabel: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 2,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  miniSummaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  mapControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 8,
  },
  mapControlsRTL: {
    right: undefined,
    left: 16,
  },
  mapControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  // Marker Styles
  markerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.3,
  },
  homePulse: {
    backgroundColor: '#3185FC',
  },
  pickupPulse: {
    backgroundColor: '#10B981',
  },
  destinationPulse: {
    backgroundColor: '#F59E0B',
  },
  markerPin: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  homeMarker: {
    backgroundColor: '#3185FC',
  },
  pickupMarker: {
    backgroundColor: '#10B981',
  },
  destinationMarker: {
    backgroundColor: '#F59E0B',
  },
  markerLabel: {
    position: 'absolute',
    top: 56,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  homeLabel: {
    borderLeftWidth: 3,
    borderLeftColor: '#3185FC',
  },
  pickupLabel: {
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  destinationLabel: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  markerLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  markerLabelTime: {
    fontSize: 10,
    color: '#666666',
    fontWeight: '500',
  },
  // Content Styles
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  // Summary Section
  summarySection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summarySectionRTL: {
    flexDirection: 'row-reverse',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryCardPrimary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#F0F7FF',
  },
  summaryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  durationIconContainer: {
    backgroundColor: '#F0F7FF',
  },
  distanceIconContainer: {
    backgroundColor: '#ECFDF5',
  },
  summaryContent: {
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 6,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  // Timeline Section
  timingSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  timelineContainer: {
    paddingLeft: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
    position: 'relative',
  },
  timelineItemRTL: {
    flexDirection: 'row-reverse',
    paddingRight: 12,
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
  },
  homeTimelineDot: {
    backgroundColor: '#3185FC',
  },
  pickupTimelineDot: {
    backgroundColor: '#10B981',
  },
  destinationTimelineDot: {
    backgroundColor: '#F59E0B',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
    marginBottom: 4,
  },
  // Timing Card Styles
  timingCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
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
  timingCardRTL: {
    marginRight: 0,
    marginLeft: 0,
  },
  timingCardSelected: {
    borderColor: '#3185FC',
    borderWidth: 2,
    backgroundColor: '#F0F7FF',
    shadowColor: '#3185FC',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  timingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timingCardHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  timingCardContent: {
    flex: 1,
  },
  timingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeIcon: {
    backgroundColor: '#F0F7FF',
  },
  pickupIcon: {
    backgroundColor: '#ECFDF5',
  },
  destinationIcon: {
    backgroundColor: '#FFFBEB',
  },
  timingLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 6,
    fontWeight: '500',
  },
  timingValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  // Live Tracking Button
  liveTrackingButton: {
    backgroundColor: '#3185FC',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
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
  liveTrackingButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0.1,
    opacity: 0.6,
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
    marginTop: 12,
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

