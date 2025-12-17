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
    title: 'Trip Details',
    busPath: 'Bus route',
    yourPathToStation: 'Your route',
    estimatedArrival: 'Estimated arrival',
    minutes: 'min',
    km: 'km',
    tripStations: 'Trip Stops',
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
  },
  ar: {
    title: 'تفاصيل الرحلة',
    busPath: 'مسار الحافلة',
    yourPathToStation: 'مسارك',
    estimatedArrival: 'الوقت المقدر',
    minutes: 'دقيقة',
    km: 'كم',
    tripStations: 'محطات الرحلة',
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* HEADER */}
      <Animated.View 
        style={[
          styles.header,
          { transform: [{ translateY: headerSlide }] }
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <View style={styles.backButtonInner}>
            <MaterialIcons
              name={isRTL ? "arrow-forward" : "arrow-back"}
              size={24}
              color="#1F2937"
            />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && styles.rtl]}>
          {t.title}
        </Text>
        <View style={styles.headerPlaceholder} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* MAP SECTION */}
        <Animated.View 
          style={[
            styles.mapCard,
            { transform: [{ translateY: cardSlide }] }
          ]}
        >
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

            {/* Legend */}
            <View style={[styles.legendBox, isRTL && styles.legendBoxRTL]}>
              <View style={styles.legendItem}>
                <View style={[styles.legendIndicator, { backgroundColor: '#3B82F6' }]} />
                <Text style={[styles.legendLabel, isRTL && styles.rtl]}>
                  {t.busPath}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendIndicator, { backgroundColor: '#F59E0B' }]} />
                <Text style={[styles.legendLabel, isRTL && styles.rtl]}>
                  {t.yourPathToStation}
                </Text>
              </View>
            </View>

            {/* Map Controls */}
            <View style={styles.mapControls}>
              <TouchableOpacity
                style={styles.mapControlButton}
                onPress={getCurrentLocation}
                disabled={isLoadingLocation}
                activeOpacity={0.8}
              >
                {isLoadingLocation ? (
                  <ActivityIndicator color="#3B82F6" size="small" />
                ) : (
                  <MaterialIcons name="my-location" size={22} color="#3B82F6" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* ESTIMATED ARRIVAL CARD - Modern Design */}
        <Animated.View 
          style={[
            styles.arrivalCard,
            { transform: [{ translateY: cardSlide }] }
          ]}
        >
          <View style={styles.arrivalLeft}>
            <View style={styles.arrivalIconBox}>
              <MaterialIcons name="schedule" size={24} color="#3B82F6" />
            </View>
            <View style={styles.arrivalTextBox}>
              <Text style={[styles.arrivalLabel, isRTL && styles.rtl]}>
                {t.estimatedArrival}
              </Text>
              <Text style={[styles.arrivalValue, isRTL && styles.rtl]}>
                {estimatedArrivalMinutes} {t.minutes}
              </Text>
            </View>
          </View>
          <View style={styles.dividerVertical} />
          <View style={styles.arrivalRight}>
            <View style={styles.distanceIconBox}>
              <MaterialIcons name="directions" size={24} color="#10B981" />
            </View>
            <View style={styles.distanceTextBox}>
              <Text style={[styles.distanceLabel, isRTL && styles.rtl]}>
                {language === 'ar' ? 'المسافة' : 'Distance'}
              </Text>
              <Text style={[styles.distanceValue, isRTL && styles.rtl]}>
                {distanceToStation.toFixed(1)} {t.km}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* TRIP STATIONS */}
        <Animated.View 
          style={[
            styles.stationsContainer,
            { transform: [{ translateY: stationsSlide }] }
          ]}
        >
          <View style={styles.stationsSectionHeader}>
            <View style={styles.stationsIconBox}>
              <MaterialIcons name="location-on" size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.stationsTitle, isRTL && styles.rtl]}>
              {t.tripStations}
            </Text>
          </View>

          <View style={styles.stationsBox}>
            {stations.map((station, index) => {
              const statusColor = getStationStatusColor(station.status);
              const isLast = index === stations.length - 1;

              return (
                <View key={station.id}>
                  <View style={[styles.stationItem, isRTL && styles.stationItemRTL]}>
                    {/* Timeline Dot */}
                    <View style={styles.stationTimeline}>
                      <View
                        style={[
                          styles.stationDot,
                          { backgroundColor: statusColor, borderColor: statusColor }
                        ]}
                      />
                      {!isLast && (
                        <View
                          style={[
                            styles.stationConnector,
                            { backgroundColor: statusColor }
                          ]}
                        />
                      )}
                    </View>

                    {/* Station Info */}
                    <View style={[styles.stationInfo, isRTL && styles.stationInfoRTL]}>
                      <Text style={[styles.stationName, isRTL && styles.rtl]}>
                        {station.name}
                      </Text>
                      <Text style={[styles.stationTime, isRTL && styles.rtl]}>
                        {formatTimeWithPeriod(station.time)}
                      </Text>
                    </View>

                    {/* Status Badge */}
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                      <Text style={styles.statusBadgeText}>
                        {getStationStatusText(station.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* DRIVER INFORMATION */}
        <Animated.View 
          style={[
            styles.driverCard,
            { opacity: driverCardOpacity }
          ]}
        >
          <View style={[styles.driverContent, isRTL && styles.driverContentRTL]}>
            <View style={styles.driverAvatarBox}>
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.driverAvatarGradient}
              >
                <MaterialIcons name="person" size={28} color="#FFFFFF" />
              </LinearGradient>
            </View>

            <View style={styles.driverInfo}>
              <Text style={[styles.driverName, isRTL && styles.rtl]}>
                {t.captain} {driverName}
              </Text>
              <View style={styles.driverStatusPill}>
                <View style={styles.statusDot} />
                <Text style={[styles.driverStatus, isRTL && styles.rtl]}>
                  {t.onlineNow}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ACTION BUTTONS */}
        <Animated.View 
          style={[
            styles.actionButtonsContainer,
            { transform: [{ scale: buttonScale }] }
          ]}
        >
          <TouchableOpacity
            style={styles.callButtonWrapper}
            onPress={handleCall}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.callButton}
            >
              <MaterialIcons name="phone" size={22} color="#FFFFFF" />
              <Text style={styles.callButtonText}>{t.call}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.messageButton}
            onPress={handleMessage}
            activeOpacity={0.85}
          >
            <MaterialIcons name="chat-bubble-outline" size={22} color="#3B82F6" />
            <Text style={styles.messageButtonText}>{t.message}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // ========== HEADER ==========
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: UbuntuFonts.bold,
  },
  headerPlaceholder: {
    width: 40,
  },

  // ========== SCROLL VIEW ==========
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
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
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  stationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  stationItemRTL: {
    flexDirection: 'row-reverse',
  },
  stationTimeline: {
    alignItems: 'center',
    width: 32,
    minHeight: 60,
  },
  stationDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
  },
  stationConnector: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  stationInfo: {
    flex: 1,
  },
  stationInfoRTL: {
    alignItems: 'flex-end',
  },
  stationName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: UbuntuFonts.bold,
    marginBottom: 2,
  },
  stationTime: {
    fontSize: 13,
    color: '#9CA3AF',
    fontFamily: UbuntuFonts.regular,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: UbuntuFonts.bold,
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
