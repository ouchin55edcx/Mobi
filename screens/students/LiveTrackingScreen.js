import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from '../../src/lib/supabase';
import * as Notifications from 'expo-notifications';
import { isValidUUID, isExpoGo, validateAndReturnUUID } from '../../src/utils/validation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const translations = {
  en: {
    title: 'Live Tracking',
    driverArriving: 'Driver Arriving',
    driverOnWay: 'Driver On The Way',
    driverArrived: 'Driver Arrived',
    pickupIn: 'Pickup in',
    arrivalIn: 'Arrival in',
    minutes: 'min',
    seconds: 'sec',
    estimatedArrival: 'ETA',
    currentLocation: 'Current Location',
    driverLocation: 'Driver Location',
    tripStatus: 'Trip Status',
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled',
    back: 'Back',
    distance: 'Distance',
    km: 'km',
    timeElapsed: 'Time Elapsed',
    speed: 'Speed',
    kmh: 'km/h',
    callDriver: 'Call',
    messageDriver: 'Message',
    shareLocation: 'Share Location',
    centerOnMe: 'Center on Me',
    centerOnBus: 'Center on Bus',
    refresh: 'Refresh',
    driverInfo: 'Driver Information',
    vehicle: 'Vehicle',
    online: 'Online',
    offline: 'Offline',
    busRoute: 'Bus Route',
    yourRoute: 'Walking Route',
    tripProgress: 'Trip Progress',
    showDetails: 'Details',
    hideDetails: 'Hide',
  },
  ar: {
    title: 'التتبع المباشر',
    driverArriving: 'السائق قادم',
    driverOnWay: 'السائق في الطريق',
    driverArrived: 'وصل السائق',
    pickupIn: 'الاستلام خلال',
    arrivalIn: 'الوصول خلال',
    minutes: 'دقيقة',
    seconds: 'ثانية',
    estimatedArrival: 'وقت الوصول',
    currentLocation: 'الموقع الحالي',
    driverLocation: 'موقع السائق',
    tripStatus: 'حالة الرحلة',
    active: 'نشط',
    completed: 'مكتمل',
    cancelled: 'ملغي',
    back: 'رجوع',
    distance: 'المسافة',
    km: 'كم',
    timeElapsed: 'الوقت المنقضي',
    speed: 'السرعة',
    kmh: 'كم/س',
    callDriver: 'اتصال',
    messageDriver: 'رسالة',
    shareLocation: 'مشاركة الموقع',
    centerOnMe: 'موقعي',
    centerOnBus: 'موقع الحافلة',
    refresh: 'تحديث',
    driverInfo: 'معلومات السائق',
    vehicle: 'المركبة',
    online: 'متصل',
    offline: 'غير متصل',
    busRoute: 'مسار الحافلة',
    yourRoute: 'مسار المشي',
    tripProgress: 'تقدم الرحلة',
    showDetails: 'التفاصيل',
    hideDetails: 'إخفاء',
  },
};

// Configure notification handler (only if not in Expo Go)
if (!isExpoGo()) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (error) {
    console.warn('Could not configure notification handler:', error.message);
  }
}

const LiveTrackingScreen = ({
  tripId,
  studentId,
  language = 'en',
  onBack,
  tripData: providedTripData = null,
}) => {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [tripStatus, setTripStatus] = useState('PENDING');
  const [driverLocation, setDriverLocation] = useState(null);
  const [studentLocation, setStudentLocation] = useState(null);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [countdown, setCountdown] = useState({ minutes: 0, seconds: 0 });
  const [arrivalCountdown, setArrivalCountdown] = useState({ minutes: 0, seconds: 0 });
  const [estimatedArrival, setEstimatedArrival] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [distanceToPickup, setDistanceToPickup] = useState(2.5);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(30);
  const [tripProgress, setTripProgress] = useState(0);
  const [showDetails, setShowDetails] = useState(true);
  const [showPickupNotification, setShowPickupNotification] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const t = translations[language];
  const isRTL = language === 'ar';
  
  const validTripId = validateAndReturnUUID(tripId);
  const notificationsSupported = !isExpoGo();

  const driverMarkerAnimation = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  const tripSubscriptionRef = useRef(null);
  const driverLocationSubscriptionRef = useRef(null);
  const demoAnimationIntervalRef = useRef(null);

  // Initialize trip data
  useEffect(() => {
    if (!validTripId) {
      console.warn('Invalid tripId provided. Using demo mode.');
      setIsDemoMode(true);
      setLoading(false);
      handleDemoMode();
      return;
    }

    loadTripData();
    
    if (notificationsSupported) {
      requestNotificationPermissions();
    }
    
    return () => {
      if (tripSubscriptionRef.current) {
        supabase.removeChannel(tripSubscriptionRef.current);
      }
      if (driverLocationSubscriptionRef.current) {
        supabase.removeChannel(driverLocationSubscriptionRef.current);
      }
      if (demoAnimationIntervalRef.current) {
        clearInterval(demoAnimationIntervalRef.current);
      }
    };
  }, [tripId, validTripId, notificationsSupported]);

  const startDemoDriverAnimation = useCallback(() => {
    if (demoAnimationIntervalRef.current) {
      clearInterval(demoAnimationIntervalRef.current);
      demoAnimationIntervalRef.current = null;
    }
    
    const route = [
      { latitude: 33.5775, longitude: -7.5910 },
      { latitude: 33.5780, longitude: -7.5911 },
      { latitude: 33.5785, longitude: -7.5912 },
      { latitude: 33.5790, longitude: -7.5914 },
      { latitude: 33.5795, longitude: -7.5916 },
      { latitude: 33.5800, longitude: -7.5920 },
    ];
    
    let currentIndex = 0;
    
    demoAnimationIntervalRef.current = setInterval(() => {
      currentIndex = (currentIndex + 1) % route.length;
      const newLocation = route[currentIndex];
      
      setDriverLocation(newLocation);
      
      setDriverInfo(prev => ({
        ...prev,
        current_location: newLocation,
      }));
      
      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          1000
        );
      }
    }, 3000);
  }, []);

  const handleDemoMode = () => {
    setTripStatus('ACTIVE');
    
    const demoPickup = providedTripData?.pickupLocation || { latitude: 33.5750, longitude: -7.5900 };
    const demoDestination = providedTripData?.destinationLocation || { latitude: 33.5800, longitude: -7.5920 };
    const homeLocation = providedTripData?.homeLocation || { latitude: 33.5731, longitude: -7.5898 };
    
    const demoDriverStart = { 
      latitude: (homeLocation.latitude + demoPickup.latitude) / 2,
      longitude: (homeLocation.longitude + demoPickup.longitude) / 2,
    };
    
    setStudentLocation(homeLocation);
    setPickupLocation(demoPickup);
    setDestinationLocation(demoDestination);
    setDriverLocation(demoDriverStart);
    setEstimatedArrival(providedTripData?.reachPickupTime || new Date(Date.now() + 15 * 60 * 1000));
    
    const routeCoords = providedTripData?.routeCoordinates || [
      homeLocation,
      { latitude: 33.5760, longitude: -7.5905 },
      demoPickup,
      { latitude: 33.5770, longitude: -7.5908 },
      demoDriverStart,
      { latitude: 33.5785, longitude: -7.5912 },
      { latitude: 33.5795, longitude: -7.5916 },
      demoDestination,
    ];
    setRouteCoordinates(routeCoords);
    
    setDriverInfo({
      id: 'demo-driver-id',
      name: providedTripData?.driverName || (language === 'ar' ? 'أحمد محمود' : 'Ahmed Mahmoud'),
      phone: '+212 600-123-456',
      vehicle: providedTripData?.vehicleInfo || '',
      current_location: demoDriverStart,
    });
    
    setIsTracking(true);
    setLoading(false);
    setError(null);
  };
  
  useEffect(() => {
    if (isDemoMode && mapReady && driverLocation) {
      startDemoDriverAnimation();
    }
    
    return () => {
      if (demoAnimationIntervalRef.current) {
        clearInterval(demoAnimationIntervalRef.current);
        demoAnimationIntervalRef.current = null;
      }
    };
  }, [isDemoMode, mapReady, driverLocation, startDemoDriverAnimation]);

  useEffect(() => {
    if (isTracking && driverLocation) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isTracking, driverLocation]);

  useEffect(() => {
    if (tripStatus === 'ACTIVE' || tripStatus === 'IN_PROGRESS') {
      const timer = setTimeout(() => {
        setShowPickupNotification(true);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [tripStatus]);

  useEffect(() => {
    if (tripStatus === 'ACTIVE') {
      setCurrentStep(1);
      setTripProgress(50);
    } else if (tripStatus === 'IN_PROGRESS') {
      setCurrentStep(2);
      setTripProgress(75);
    } else if (tripStatus === 'COMPLETED') {
      setCurrentStep(2);
      setTripProgress(100);
    }
  }, [tripStatus]);

  const loadTripData = async () => {
    if (!validTripId) {
      setError('Invalid trip ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('trips')
        .select(`
          *,
          bookings (
            pickup_location,
            destination_location,
            start_time,
            end_time
          )
        `)
        .eq('id', validTripId)
        .single();

      let { data, error: queryError } = await query;

      if (queryError) {
        if (queryError.code === 'PGRST200') {
          console.warn('Bookings relationship not found, loading trip data without join');
          const fallbackQuery = supabase
            .from('trips')
            .select('*')
            .eq('id', validTripId)
            .single();
          
          const fallbackResult = await fallbackQuery;
          data = fallbackResult.data;
          queryError = fallbackResult.error;
        }
        
        if (queryError.code === 'PGRST116') {
          console.warn('Trip not found in database');
          setError('Trip not found');
          setLoading(false);
          return;
        }
        
        if (queryError.code === '22P02') {
          console.error('Invalid UUID format in trip query');
          setError('Invalid trip ID format');
          setLoading(false);
          return;
        }

        if (queryError && queryError.code !== 'PGRST200') {
          throw queryError;
        }
      }

      if (data) {
        setTripStatus(data.status || 'PENDING');
        
        const pickup = data.pickup_location || 
                      (data.bookings && data.bookings.pickup_location) ||
                      (data.pickup_point_location);
        const destination = data.destination_location || 
                           (data.bookings && data.bookings.destination_location);
        
        if (pickup) {
          setPickupLocation(
            pickup.latitude !== undefined 
              ? { latitude: pickup.latitude, longitude: pickup.longitude }
              : { latitude: pickup.lat, longitude: pickup.lng }
          );
        }
        
        if (destination) {
          setDestinationLocation(
            destination.latitude !== undefined
              ? { latitude: destination.latitude, longitude: destination.longitude }
              : { latitude: destination.lat, longitude: destination.lng }
          );
        }
        
        if (data.estimated_arrival_time) {
          setEstimatedArrival(new Date(data.estimated_arrival_time));
        }
        
        if (data.total_route?.coordinates) {
          setRouteCoordinates(data.total_route.coordinates);
        } else if (pickup && destination) {
          setRouteCoordinates([
            pickup.latitude !== undefined 
              ? { latitude: pickup.latitude, longitude: pickup.longitude }
              : { latitude: pickup.lat, longitude: pickup.lng },
            destination.latitude !== undefined
              ? { latitude: destination.latitude, longitude: destination.longitude }
              : { latitude: destination.lat, longitude: destination.lng }
          ]);
        }

        if (data.driver_id && isValidUUID(data.driver_id)) {
          loadDriverInfo(data.driver_id).catch(err => {
            console.warn('Could not load driver info:', err.message);
          });
          
          if (data.status === 'ACTIVE' || data.status === 'IN_PROGRESS') {
            subscribeToDriverLocation(data.driver_id).catch(err => {
              console.warn('Could not subscribe to driver location:', err.message);
            });
            setIsTracking(true);
          }
        }

        try {
          subscribeToTripUpdates(data.id);
        } catch (err) {
          console.warn('Could not subscribe to trip updates:', err.message);
        }
      } else {
        setError('No trip data found');
      }
    } catch (error) {
      console.error('Error loading trip data:', error);
      setError(error.message || 'Failed to load trip data');
    } finally {
      setLoading(false);
    }
  };

  const loadDriverInfo = async (driverId) => {
    if (!isValidUUID(driverId)) {
      console.warn('Invalid driver ID:', driverId);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('id, name, phone, current_location')
        .eq('id', driverId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('Driver not found:', driverId);
          return;
        }
        throw error;
      }

      if (data) {
        setDriverInfo(data);
        if (data.current_location) {
          const location = data.current_location.latitude !== undefined
            ? {
                latitude: data.current_location.latitude,
                longitude: data.current_location.longitude,
              }
            : {
                latitude: data.current_location.lat,
                longitude: data.current_location.lng,
              };
          setDriverLocation(location);
        }
      }
    } catch (error) {
      console.error('Error loading driver info:', error);
    }
  };

  const subscribeToTripUpdates = (tripId) => {
    if (!isValidUUID(tripId)) {
      console.warn('Cannot subscribe to trip updates: invalid tripId');
      return null;
    }

    try {
      const channel = supabase
        .channel(`trip:${tripId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'trips',
            filter: `id=eq.${tripId}`,
          },
          (payload) => {
            try {
              const updatedTrip = payload.new;
              const previousStatus = tripStatus;
              setTripStatus(updatedTrip.status || previousStatus);

              if (
                notificationsSupported &&
                updatedTrip.status === 'ACTIVE' && 
                previousStatus !== 'ACTIVE'
              ) {
                sendTripStartedNotification().catch(err => {
                  console.warn('Could not send notification:', err.message);
                });
                setIsTracking(true);
              }

              if (updatedTrip.estimated_arrival_time) {
                setEstimatedArrival(new Date(updatedTrip.estimated_arrival_time));
              }

              if (
                updatedTrip.status === 'ACTIVE' && 
                updatedTrip.driver_id &&
                isValidUUID(updatedTrip.driver_id)
              ) {
                subscribeToDriverLocation(updatedTrip.driver_id).catch(err => {
                  console.warn('Could not subscribe to driver location:', err.message);
                });
              }
            } catch (error) {
              console.error('Error handling trip update:', error);
            }
          }
        )
        .subscribe();

      tripSubscriptionRef.current = channel;
      return channel;
    } catch (error) {
      console.error('Error subscribing to trip updates:', error);
      return null;
    }
  };

  const subscribeToDriverLocation = useCallback((driverId) => {
    if (!isValidUUID(driverId)) {
      console.warn('Cannot subscribe to driver location: invalid driverId');
      return null;
    }

    if (driverLocationSubscriptionRef.current) {
      try {
        supabase.removeChannel(driverLocationSubscriptionRef.current);
      } catch (error) {
        console.warn('Error removing driver location subscription:', error);
      }
    }

    try {
      const channel = supabase
        .channel(`driver-location:${driverId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'drivers',
            filter: `id=eq.${driverId}`,
          },
          (payload) => {
            try {
              const driver = payload.new;
              if (driver && driver.current_location) {
                const location = driver.current_location.latitude !== undefined
                  ? {
                      latitude: driver.current_location.latitude,
                      longitude: driver.current_location.longitude,
                    }
                  : {
                      latitude: driver.current_location.lat,
                      longitude: driver.current_location.lng,
                    };
                setDriverLocation(location);
                updateMapToDriver(location);
              }
            } catch (error) {
              console.error('Error handling driver location update:', error);
            }
          }
        )
        .subscribe();

      driverLocationSubscriptionRef.current = channel;
      return channel;
    } catch (error) {
      console.error('Error subscribing to driver location:', error);
      return null;
    }
  }, []);

  const updateMapToDriver = useCallback((location) => {
    if (mapRef.current && location) {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
    }
  }, []);

  useEffect(() => {
    if (!estimatedArrival) return;

    const interval = setInterval(() => {
      const now = new Date();
      const arrival = new Date(estimatedArrival);
      const diff = Math.max(0, arrival - now);

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (tripStatus === 'ACTIVE' && pickupLocation) {
        setCountdown({ minutes, seconds });
      } else if (tripStatus === 'IN_PROGRESS') {
        setArrivalCountdown({ minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [estimatedArrival, tripStatus, pickupLocation]);

  const requestNotificationPermissions = async () => {
    if (isExpoGo()) {
      console.info('Notifications not supported in Expo Go. Use a development build for full notification support.');
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
      }
    } catch (error) {
      console.warn('Error requesting notification permissions:', error.message);
    }
  };

  const sendTripStartedNotification = async () => {
    if (isExpoGo()) {
      console.info('Trip started - notifications not available in Expo Go');
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: language === 'ar' ? 'بدأت الرحلة' : 'Trip Started',
          body: language === 'ar' 
            ? 'السائق في الطريق إليك' 
            : 'Driver is on the way to you',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
    } catch (error) {
      console.warn('Could not send notification:', error.message);
    }
  };

  const formatTime = (date) => {
    if (!date) return '--:--';
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getStatusDisplay = () => {
    switch (tripStatus) {
      case 'ACTIVE':
        return { text: t.driverOnWay, color: '#3B82F6', icon: 'directions-car' };
      case 'IN_PROGRESS':
        return { text: t.driverArriving, color: '#10B981', icon: 'location-on' };
      case 'COMPLETED':
        return { text: t.driverArrived, color: '#10B981', icon: 'check-circle' };
      default:
        return { text: t.tripStatus, color: '#64748B', icon: 'schedule' };
    }
  };

  const statusDisplay = getStatusDisplay();

  const handleCenterOnUser = () => {
    if (studentLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: studentLocation.latitude,
          longitude: studentLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
    }
  };

  const handleCenterOnBus = () => {
    if (driverLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
    }
  };

  const handleCallDriver = () => {
    if (driverInfo?.phone) {
      Alert.alert(
        language === 'ar' ? 'اتصال بالسائق' : 'Call Driver',
        `${driverInfo.phone}`,
        [
          { text: language === 'ar' ? 'إلغاء' : 'Cancel', style: 'cancel' },
          { text: language === 'ar' ? 'اتصال' : 'Call', onPress: () => console.log('Calling driver') },
        ]
      );
    }
  };

  const handleMessageDriver = () => {
    if (driverInfo?.phone) {
      Alert.alert(
        language === 'ar' ? 'رسالة للسائق' : 'Message Driver',
        language === 'ar' ? 'فتح تطبيق الرسائل؟' : 'Open messaging app?',
        [
          { text: language === 'ar' ? 'إلغاء' : 'Cancel', style: 'cancel' },
          { text: language === 'ar' ? 'فتح' : 'Open', onPress: () => console.log('Opening messages') },
        ]
      );
    }
  };

  const handleRefresh = () => {
    if (!isDemoMode && validTripId) {
      loadTripData();
    }
  };

  useEffect(() => {
    if (mapReady && (driverLocation || pickupLocation || destinationLocation)) {
      const coordinates = [];
      if (driverLocation) coordinates.push(driverLocation);
      if (pickupLocation) coordinates.push(pickupLocation);
      if (destinationLocation) coordinates.push(destinationLocation);

      if (coordinates.length > 0 && mapRef.current) {
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 150, right: 20, bottom: 300, left: 20 },
          animated: true,
        });
      }
    }
  }, [mapReady, driverLocation, pickupLocation, destinationLocation]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Map Background */}
      <View style={styles.mapBackground}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          initialRegion={{
            latitude: pickupLocation?.latitude || 33.5731,
            longitude: pickupLocation?.longitude || -7.5898,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          onMapReady={() => setMapReady(true)}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
        >
          {/* Routes */}
          {routeCoordinates.length > 1 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#3B82F6"
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {studentLocation && pickupLocation && (
            <Polyline
              coordinates={[studentLocation, pickupLocation]}
              strokeColor="#F59E0B"
              strokeWidth={3}
              strokeDashArray={[8, 6]}
              lineCap="round"
            />
          )}

          {/* Markers */}
          {studentLocation && (
            <Marker coordinate={studentLocation} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.markerContainer}>
                <View style={[styles.marker, styles.homeMarker]}>
                  <MaterialIcons name="home" size={18} color="#FFF" />
                </View>
              </View>
            </Marker>
          )}

          {pickupLocation && (
            <Marker coordinate={pickupLocation} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.markerContainer}>
                <View style={[styles.marker, styles.pickupMarker]}>
                  <MaterialIcons name="location-on" size={18} color="#FFF" />
                </View>
              </View>
            </Marker>
          )}

          {destinationLocation && (
            <Marker coordinate={destinationLocation} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.markerContainer}>
                <View style={[styles.marker, styles.destinationMarker]}>
                  <MaterialIcons name="school" size={18} color="#FFF" />
                </View>
              </View>
            </Marker>
          )}

          {driverLocation && isTracking && (
            <Marker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }}>
              <Animated.View
                style={[
                  styles.markerContainer,
                  { transform: [{ scale: pulseAnimation }] },
                ]}
              >
                <View style={styles.driverPulse} />
                <View style={[styles.marker, styles.driverMarker]}>
                  <MaterialIcons name="directions-car" size={20} color="#FFF" />
                </View>
              </Animated.View>
            </Marker>
          )}
        </MapView>

        {/* Map Controls */}
        {!loading && !error && (
          <View style={[styles.mapControls, isRTL && styles.mapControlsRTL]}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={handleCenterOnUser}
              activeOpacity={0.7}
            >
              <MaterialIcons name="my-location" size={18} color="#1E293B" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={handleCenterOnBus}
              activeOpacity={0.7}
            >
              <MaterialIcons name="directions-bus" size={18} color="#1E293B" />
            </TouchableOpacity>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        )}

        {/* Error */}
        {error && !loading && !isDemoMode && (
          <View style={styles.errorOverlay}>
            <MaterialIcons name="error-outline" size={40} color="#EF4444" />
            <Text style={[styles.errorText, isRTL && styles.rtl]}>{error}</Text>
          </View>
        )}
      </View>

      {/* Header */}
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name={isRTL ? "arrow-forward" : "arrow-back"} 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, isRTL && styles.rtl]}>
              {t.title}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <MaterialIcons name="refresh" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Status Bar */}
        {!loading && !error && (
          <View style={[styles.statusBar, isRTL && styles.statusBarRTL]}>
            <View style={[styles.statusDot, { backgroundColor: statusDisplay.color }]} />
            <Text style={[styles.statusText, { color: statusDisplay.color }]}>
              {statusDisplay.text}
            </Text>
            {estimatedArrival && (
              <>
                <View style={styles.statusDivider} />
                <MaterialIcons name="schedule" size={14} color="#64748B" />
                <Text style={styles.etaText}>{formatTime(estimatedArrival)}</Text>
              </>
            )}
          </View>
        )}
      </SafeAreaView>

      {/* Countdown Timer */}
      {(tripStatus === 'ACTIVE' || tripStatus === 'IN_PROGRESS') && !loading && !error && (
        <View style={[styles.timerContainer, isRTL && styles.timerContainerRTL]}>
          <View style={styles.timerCard}>
            <View style={[styles.timerLabelRow, isRTL && styles.timerLabelRowRTL]}>
              <MaterialIcons 
                name={tripStatus === 'ACTIVE' ? "access-time" : "location-on"} 
                size={16} 
                color="#FFFFFF" 
              />
              <Text style={[styles.timerLabel, isRTL && styles.rtl]}>
                {tripStatus === 'ACTIVE' ? t.pickupIn : t.arrivalIn}
              </Text>
            </View>
            <View style={styles.timerDisplay}>
              <View style={styles.timeBlock}>
                <Text style={styles.timeValue}>
                  {String(tripStatus === 'ACTIVE' ? countdown.minutes : arrivalCountdown.minutes).padStart(2, '0')}
                </Text>
                <Text style={[styles.timeUnit, isRTL && styles.rtl]}>{t.minutes}</Text>
              </View>
              <Text style={styles.timeSeparator}>:</Text>
              <View style={styles.timeBlock}>
                <Text style={styles.timeValue}>
                  {String(tripStatus === 'ACTIVE' ? countdown.seconds : arrivalCountdown.seconds).padStart(2, '0')}
                </Text>
                <Text style={[styles.timeUnit, isRTL && styles.rtl]}>{t.seconds}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Pickup Notification */}
      {showPickupNotification && !loading && !error && (
        <View style={[styles.notification, isRTL && styles.notificationRTL]}>
          <MaterialIcons name="info" size={20} color="#F59E0B" />
          <Text style={[styles.notificationText, isRTL && styles.rtl]}>
            {language === 'ar' 
              ? 'توجه إلى نقطة الالتقاط'
              : 'Head to pickup point'}
          </Text>
          <TouchableOpacity
            onPress={() => setShowPickupNotification(false)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="close" size={18} color="#92400E" />
          </TouchableOpacity>
        </View>
      )}

      {/* Details Panel Toggle */}
      {!loading && !error && (
        <TouchableOpacity
          style={[styles.toggleBtn, isRTL && styles.toggleBtnRTL]}
          onPress={() => setShowDetails(!showDetails)}
          activeOpacity={0.9}
        >
          <MaterialIcons 
            name={showDetails ? "expand-more" : "expand-less"} 
            size={24} 
            color="#64748B" 
          />
          <Text style={[styles.toggleText, isRTL && styles.rtl]}>
            {showDetails ? t.hideDetails : t.showDetails}
          </Text>
        </TouchableOpacity>
      )}

      {/* Info Panel */}
      {showDetails && !loading && !error && (
        <View style={styles.panel}>
          <View style={styles.panelHandle} />
          
          <ScrollView
            style={styles.panelScroll}
            contentContainerStyle={styles.panelContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Progress */}
            <View style={styles.section}>
              <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
                <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>
                  {t.tripProgress}
                </Text>
                <Text style={styles.progressPercent}>{Math.round(tripProgress)}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${tripProgress}%` }]} />
              </View>
            </View>

            {/* Steps */}
            <View style={styles.section}>
              <View style={styles.step}>
                <View style={styles.stepLine}>
                  <View style={[styles.stepDot, currentStep >= 1 && styles.stepDotActive]}>
                    {currentStep > 1 ? (
                      <MaterialIcons name="check" size={14} color="#FFF" />
                    ) : (
                      <MaterialIcons name="location-on" size={14} color={currentStep === 1 ? "#FFF" : "#94A3B8"} />
                    )}
                  </View>
                  {currentStep < 2 && <View style={styles.stepConnector} />}
                </View>
                <View style={styles.stepContent}>
                  <View style={[styles.stepHeader, isRTL && styles.stepHeaderRTL]}>
                    <MaterialIcons 
                      name="location-on" 
                      size={20} 
                      color={currentStep === 1 ? "#3B82F6" : "#94A3B8"} 
                    />
                    <Text style={[styles.stepTitle, currentStep === 1 && styles.stepTitleActive, isRTL && styles.rtl]}>
                      {language === 'ar' ? 'نقطة الالتقاط' : 'Pickup Point'}
                    </Text>
                  </View>
                  <Text style={[styles.stepDesc, isRTL && styles.rtl]}>
                    {language === 'ar' ? 'انتظر الحافلة في نقطة الالتقاط' : 'Wait for bus at pickup point'}
                  </Text>
                </View>
              </View>

              <View style={styles.step}>
                <View style={styles.stepLine}>
                  <View style={[styles.stepDot, currentStep >= 2 && styles.stepDotActive]}>
                    {tripStatus === 'COMPLETED' ? (
                      <MaterialIcons name="check" size={14} color="#FFF" />
                    ) : (
                      <MaterialIcons name="school" size={14} color={currentStep === 2 ? "#FFF" : "#94A3B8"} />
                    )}
                  </View>
                </View>
                <View style={styles.stepContent}>
                  <View style={[styles.stepHeader, isRTL && styles.stepHeaderRTL]}>
                    <MaterialIcons 
                      name="school" 
                      size={20} 
                      color={currentStep === 2 ? "#3B82F6" : "#94A3B8"} 
                    />
                    <Text style={[styles.stepTitle, currentStep === 2 && styles.stepTitleActive, isRTL && styles.rtl]}>
                      {language === 'ar' ? 'المدرسة' : 'School'}
                    </Text>
                  </View>
                  <Text style={[styles.stepDesc, isRTL && styles.rtl]}>
                    {language === 'ar' ? 'الوصول إلى المدرسة' : 'Arrive at school'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Metrics */}
            <View style={[styles.metrics, isRTL && styles.metricsRTL]}>
              <View style={styles.metric}>
                <MaterialIcons name="straighten" size={20} color="#3B82F6" />
                <View style={styles.metricInfo}>
                  <Text style={[styles.metricLabel, isRTL && styles.rtl]}>{t.distance}</Text>
                  <Text style={[styles.metricValue, isRTL && styles.rtl]}>
                    {distanceToPickup.toFixed(1)} {t.km}
                  </Text>
                </View>
              </View>
              
              <View style={styles.metricDivider} />
              
              <View style={styles.metric}>
                <MaterialIcons name="schedule" size={20} color="#10B981" />
                <View style={styles.metricInfo}>
                  <Text style={[styles.metricLabel, isRTL && styles.rtl]}>{t.estimatedArrival}</Text>
                  <Text style={[styles.metricValue, isRTL && styles.rtl]}>
                    {estimatedArrival ? formatTime(estimatedArrival) : '--:--'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Driver Info */}
            {driverInfo && (
              <View style={styles.section}>
                <View style={[styles.driver, isRTL && styles.driverRTL]}>
                  <View style={styles.driverAvatar}>
                    <MaterialIcons name="person" size={24} color="#FFF" />
                  </View>
                  <View style={styles.driverInfo}>
                    <View style={[styles.driverTop, isRTL && styles.driverTopRTL]}>
                      <Text style={[styles.driverName, isRTL && styles.rtl]}>
                        {driverInfo.name || 'Driver'}
                      </Text>
                      <View style={styles.onlineBadge}>
                        <View style={styles.onlineDot} />
                        <Text style={styles.onlineText}>{t.online}</Text>
                      </View>
                    </View>
                    {driverInfo.vehicle && (
                      <View style={[styles.vehicleRow, isRTL && styles.vehicleRowRTL]}>
                        <MaterialIcons name="directions-car" size={14} color="#64748B" />
                        <Text style={[styles.vehicleText, isRTL && styles.rtl]}>
                          {driverInfo.vehicle}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={[styles.actions, isRTL && styles.actionsRTL]}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleCallDriver}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="phone" size={18} color="#3B82F6" />
                    <Text style={[styles.actionText, isRTL && styles.rtl]}>{t.callDriver}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleMessageDriver}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="message" size={18} color="#10B981" />
                    <Text style={[styles.actionText, isRTL && styles.rtl]}>{t.messageDriver}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mapBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  
  // Markers
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  homeMarker: {
    backgroundColor: '#6366F1',
  },
  pickupMarker: {
    backgroundColor: '#3B82F6',
  },
  destinationMarker: {
    backgroundColor: '#F59E0B',
  },
  driverMarker: {
    backgroundColor: '#10B981',
  },
  driverPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
    opacity: 0.2,
  },
  
  // Controls
  mapControls: {
    position: 'absolute',
    right: 16,
    bottom: 420,
    gap: 8,
  },
  mapControlsRTL: {
    right: 'auto',
    left: 16,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Loading & Error
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    color: '#EF4444',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Header
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#3B82F6',
    marginTop: -46,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Status Bar
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    gap: 6,
  },
  statusBarRTL: {
    flexDirection: 'row-reverse',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  etaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  
  // Timer
  timerContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    left: 16,
    right: 'auto',
    zIndex: 9,
    maxWidth: 200,
  },
  timerContainerRTL: {
    left: 'auto',
    right: 16,
  },
  timerCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.95)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  timerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  timerLabelRowRTL: {
    flexDirection: 'row-reverse',
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timeBlock: {
    alignItems: 'center',
    minWidth: 60,
  },
  timeValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  timeUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timeSeparator: {
    fontSize: 36,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.8)',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  
  // Notification
  notification: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 280 : 260,
    left: 16,
    right: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    zIndex: 9,
  },
  notificationRTL: {
    flexDirection: 'row-reverse',
  },
  notificationText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#92400E',
  },
  
  // Toggle Button
  toggleBtn: {
    position: 'absolute',
    bottom: 370,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  toggleBtnRTL: {
    flexDirection: 'row-reverse',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  
  // Panel
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  panelHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  panelScroll: {
    flex: 1,
  },
  panelContent: {
    padding: 20,
    paddingBottom: 32,
    gap: 20,
  },
  
  // Section
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  
  // Progress
  progressPercent: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3B82F6',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  
  // Steps
  step: {
    flexDirection: 'row',
    gap: 12,
  },
  stepLine: {
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#3B82F6',
  },
  stepConnector: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
  },
  stepContent: {
    flex: 1,
    paddingTop: 2,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  stepHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 0,
  },
  stepTitleActive: {
    color: '#3B82F6',
  },
  stepDesc: {
    fontSize: 12,
    color: '#94A3B8',
  },
  
  // Metrics
  metrics: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
  metricsRTL: {
    flexDirection: 'row-reverse',
  },
  metric: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metricInfo: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  
  // Driver
  driver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  driverRTL: {
    flexDirection: 'row-reverse',
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInfo: {
    flex: 1,
  },
  driverTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  driverTopRTL: {
    flexDirection: 'row-reverse',
  },
  driverName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
  },
  onlineDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  onlineText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  vehicleRowRTL: {
    flexDirection: 'row-reverse',
  },
  vehicleText: {
    fontSize: 12,
    color: '#64748B',
  },
  
  // Actions
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionsRTL: {
    flexDirection: 'row-reverse',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  
  // RTL
  rtl: {
    textAlign: 'right',
  },
});

export default LiveTrackingScreen;