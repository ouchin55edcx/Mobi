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
    estimatedArrival: 'Estimated Arrival',
    currentLocation: 'Current Location',
    driverLocation: 'Driver Location',
    tripStatus: 'Trip Status',
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled',
    back: 'Back',
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
    estimatedArrival: 'الوصول المتوقع',
    currentLocation: 'الموقع الحالي',
    driverLocation: 'موقع السائق',
    tripStatus: 'حالة الرحلة',
    active: 'نشط',
    completed: 'مكتمل',
    cancelled: 'ملغي',
    back: 'رجوع',
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
    // Silently fail if notifications aren't available
    console.warn('Could not configure notification handler:', error.message);
  }
}

const LiveTrackingScreen = ({
  tripId,
  studentId,
  language = 'en',
  onBack,
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

  const t = translations[language];
  const isRTL = language === 'ar';
  
  // Validate tripId - check if it's a valid UUID
  const validTripId = validateAndReturnUUID(tripId);
  const notificationsSupported = !isExpoGo();

  // Animation for driver marker
  const driverMarkerAnimation = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  const tripSubscriptionRef = useRef(null);
  const driverLocationSubscriptionRef = useRef(null);
  const demoAnimationIntervalRef = useRef(null);

  // Initialize trip data
  useEffect(() => {
    // Validate tripId before attempting to load data
    if (!validTripId) {
      console.warn('Invalid tripId provided. Using demo mode.');
      setIsDemoMode(true);
      setLoading(false);
      // Use mock data for demo
      handleDemoMode();
      return;
    }

    loadTripData();
    
    // Only request notification permissions if supported
    if (notificationsSupported) {
      requestNotificationPermissions();
    }
    
    return () => {
      // Cleanup subscriptions
      if (tripSubscriptionRef.current) {
        supabase.removeChannel(tripSubscriptionRef.current);
      }
      if (driverLocationSubscriptionRef.current) {
        supabase.removeChannel(driverLocationSubscriptionRef.current);
      }
      // Cleanup demo animation
      if (demoAnimationIntervalRef.current) {
        clearInterval(demoAnimationIntervalRef.current);
      }
    };
  }, [tripId, validTripId, notificationsSupported]);

  // Simulate driver movement for demo (static example)
  const startDemoDriverAnimation = useCallback(() => {
    // Clear any existing interval
    if (demoAnimationIntervalRef.current) {
      clearInterval(demoAnimationIntervalRef.current);
      demoAnimationIntervalRef.current = null;
    }
    
    const route = [
      { latitude: 33.5775, longitude: -7.5910 }, // Start
      { latitude: 33.5780, longitude: -7.5911 }, // Point 1
      { latitude: 33.5785, longitude: -7.5912 }, // Point 2
      { latitude: 33.5790, longitude: -7.5914 }, // Point 3
      { latitude: 33.5795, longitude: -7.5916 }, // Point 4
      { latitude: 33.5800, longitude: -7.5920 }, // Destination
    ];
    
    let currentIndex = 0;
    
    // Update driver position every 3 seconds to show example tracking
    demoAnimationIntervalRef.current = setInterval(() => {
      currentIndex = (currentIndex + 1) % route.length;
      const newLocation = route[currentIndex];
      
      setDriverLocation(newLocation);
      
      // Update driver info with new location
      setDriverInfo(prev => ({
        ...prev,
        current_location: newLocation,
      }));
      
      // Update map to follow driver
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
    }, 3000); // Update every 3 seconds
  }, []);

  // Handle demo mode with static example data
  const handleDemoMode = () => {
    // Set demo trip data with static example locations
    setTripStatus('ACTIVE');
    
    // Example locations in Casablanca
    const demoPickup = { latitude: 33.5750, longitude: -7.5900 };
    const demoDestination = { latitude: 33.5800, longitude: -7.5920 };
    
    // Example driver starting position (between pickup and destination)
    const demoDriverStart = { 
      latitude: 33.5775, 
      longitude: -7.5910 
    };
    
    setPickupLocation(demoPickup);
    setDestinationLocation(demoDestination);
    setDriverLocation(demoDriverStart);
    setEstimatedArrival(new Date(Date.now() + 15 * 60 * 1000));
    
    // Example route with multiple waypoints
    setRouteCoordinates([
      demoPickup,
      { latitude: 33.5760, longitude: -7.5905 },
      { latitude: 33.5770, longitude: -7.5908 },
      demoDriverStart,
      { latitude: 33.5785, longitude: -7.5912 },
      { latitude: 33.5795, longitude: -7.5916 },
      demoDestination,
    ]);
    
    // Set example driver info
    setDriverInfo({
      id: 'demo-driver-id',
      name: language === 'ar' ? 'أحمد محمود' : 'Ahmed Mahmoud',
      phone: '+212 600-123-456',
      current_location: demoDriverStart,
    });
    
    setIsTracking(true);
    setLoading(false);
    setError(null);
  };
  
  // Start demo animation when in demo mode and map is ready
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

  // Start pulse animation
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

  // Load initial trip data
  const loadTripData = async () => {
    if (!validTripId) {
      setError('Invalid trip ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, try to load trip data with bookings relationship
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

      // Handle specific Supabase errors gracefully
      if (queryError) {
        // PGRST200: Relationship not found (foreign key missing)
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
        
        // PGRST116: No rows returned (trip doesn't exist)
        if (queryError.code === 'PGRST116') {
          console.warn('Trip not found in database');
          setError('Trip not found');
          setLoading(false);
          return;
        }
        
        // 22P02: Invalid UUID format
        if (queryError.code === '22P02') {
          console.error('Invalid UUID format in trip query');
          setError('Invalid trip ID format');
          setLoading(false);
          return;
        }

        // If we still have an error after fallback, throw it
        if (queryError && queryError.code !== 'PGRST200') {
          throw queryError;
        }
      }

      if (data) {
        setTripStatus(data.status || 'PENDING');
        
        // Extract locations with fallback logic
        const pickup = data.pickup_location || 
                      (data.bookings && data.bookings.pickup_location) ||
                      (data.pickup_point_location);
        const destination = data.destination_location || 
                           (data.bookings && data.bookings.destination_location);
        
        if (pickup) {
          // Handle both {lat, lng} and {latitude, longitude} formats
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
        
        // Set route if available
        if (data.total_route?.coordinates) {
          setRouteCoordinates(data.total_route.coordinates);
        } else if (pickup && destination) {
          // Fallback: create simple route between pickup and destination
          setRouteCoordinates([
            pickup.latitude !== undefined 
              ? { latitude: pickup.latitude, longitude: pickup.longitude }
              : { latitude: pickup.lat, longitude: pickup.lng },
            destination.latitude !== undefined
              ? { latitude: destination.latitude, longitude: destination.longitude }
              : { latitude: destination.lat, longitude: destination.lng }
          ]);
        }

        // Set driver info if available and driver_id is valid UUID
        if (data.driver_id && isValidUUID(data.driver_id)) {
          loadDriverInfo(data.driver_id).catch(err => {
            console.warn('Could not load driver info:', err.message);
            // Continue without driver info - don't break the UI
          });
          
          if (data.status === 'ACTIVE' || data.status === 'IN_PROGRESS') {
            subscribeToDriverLocation(data.driver_id).catch(err => {
              console.warn('Could not subscribe to driver location:', err.message);
            });
            setIsTracking(true);
          }
        }

        // Subscribe to trip updates
        try {
          subscribeToTripUpdates(data.id);
        } catch (err) {
          console.warn('Could not subscribe to trip updates:', err.message);
          // Continue without real-time updates
        }
      } else {
        setError('No trip data found');
      }
    } catch (error) {
      console.error('Error loading trip data:', error);
      setError(error.message || 'Failed to load trip data');
      // Don't crash - show error state
    } finally {
      setLoading(false);
    }
  };

  // Load driver information
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
        // PGRST116: No rows found - driver doesn't exist
        if (error.code === 'PGRST116') {
          console.warn('Driver not found:', driverId);
          return;
        }
        throw error;
      }

      if (data) {
        setDriverInfo(data);
        if (data.current_location) {
          // Handle both location formats
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
      // Don't throw - allow UI to continue without driver info
    }
  };

  // Subscribe to trip status updates
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

              // Send notification when trip starts (only if notifications supported)
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

              // Update estimated arrival
              if (updatedTrip.estimated_arrival_time) {
                setEstimatedArrival(new Date(updatedTrip.estimated_arrival_time));
              }

              // Subscribe to driver location if trip is active
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
              // Continue processing - don't break on update errors
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

  // Subscribe to driver location updates
  const subscribeToDriverLocation = useCallback((driverId) => {
    if (!isValidUUID(driverId)) {
      console.warn('Cannot subscribe to driver location: invalid driverId');
      return null;
    }

    // Remove existing subscription if any
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
                // Handle both location formats
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
              // Continue - don't break on location update errors
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
  }, [updateMapToDriver]);

  // Update map to follow driver
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

  // Calculate countdown timers
  useEffect(() => {
    if (!estimatedArrival) return;

    const interval = setInterval(() => {
      const now = new Date();
      const arrival = new Date(estimatedArrival);
      const diff = Math.max(0, arrival - now);

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (tripStatus === 'ACTIVE' && pickupLocation) {
        // Countdown to pickup
        setCountdown({ minutes, seconds });
      } else if (tripStatus === 'IN_PROGRESS') {
        // Countdown to destination
        setArrivalCountdown({ minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [estimatedArrival, tripStatus, pickupLocation]);

  // Request notification permissions (only if not in Expo Go)
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
      // Don't throw - continue without notifications
    }
  };

  // Send trip started notification (only if notifications supported)
  const sendTripStartedNotification = async () => {
    if (isExpoGo()) {
      // In Expo Go, just log - notifications aren't supported
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
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.warn('Could not send notification:', error.message);
      // Don't throw - continue without notification
    }
  };

  // Format time for display
  const formatTime = (date) => {
    if (!date) return '--:--';
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Get status display
  const getStatusDisplay = () => {
    switch (tripStatus) {
      case 'ACTIVE':
        return { text: t.driverOnWay, color: '#3185FC', icon: 'directions-car' };
      case 'IN_PROGRESS':
        return { text: t.driverArriving, color: '#10B981', icon: 'location-on' };
      case 'COMPLETED':
        return { text: t.driverArrived, color: '#10B981', icon: 'check-circle' };
      default:
        return { text: t.tripStatus, color: '#666666', icon: 'schedule' };
    }
  };

  const statusDisplay = getStatusDisplay();

  // Fit map to show all relevant locations
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      
      {/* Header */}
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
          <View style={styles.statusBadge}>
            <MaterialIcons name={statusDisplay.icon} size={14} color={statusDisplay.color} />
            <Text style={[styles.statusText, { color: statusDisplay.color }]}>
              {statusDisplay.text}
            </Text>
          </View>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Countdown Timer */}
      {(tripStatus === 'ACTIVE' || tripStatus === 'IN_PROGRESS') && (
        <View style={[styles.countdownContainer, isRTL && styles.countdownContainerRTL]}>
          <View style={styles.countdownCard}>
            <MaterialIcons 
              name={tripStatus === 'ACTIVE' ? 'schedule' : 'location-on'} 
              size={20} 
              color="#3185FC" 
            />
            <View style={styles.countdownContent}>
              <Text style={[styles.countdownLabel, isRTL && styles.rtl]}>
                {tripStatus === 'ACTIVE' ? t.pickupIn : t.arrivalIn}
              </Text>
              <View style={styles.countdownTime}>
                <Text style={[styles.countdownValue, isRTL && styles.rtl]}>
                  {tripStatus === 'ACTIVE' ? countdown.minutes : arrivalCountdown.minutes}
                </Text>
                <Text style={[styles.countdownUnit, isRTL && styles.rtl]}>
                  {t.minutes}
                </Text>
                <Text style={[styles.countdownValue, isRTL && styles.rtl]}>
                  {tripStatus === 'ACTIVE' ? countdown.seconds : arrivalCountdown.seconds}
                </Text>
                <Text style={[styles.countdownUnit, isRTL && styles.rtl]}>
                  {t.seconds}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Map View */}
      <View style={styles.mapContainer}>
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
          {/* Route Polyline */}
          {routeCoordinates.length > 1 && (
            <>
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="rgba(49, 133, 252, 0.3)"
                strokeWidth={8}
                lineCap="round"
                lineJoin="round"
              />
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#3185FC"
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
              />
            </>
          )}

          {/* Pickup Location Marker */}
          {pickupLocation && (
            <Marker
              coordinate={pickupLocation}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.markerWrapper}>
                <View style={[styles.markerPin, styles.pickupMarker]}>
                  <MaterialIcons name="location-on" size={22} color="#FFFFFF" />
                </View>
              </View>
            </Marker>
          )}

          {/* Destination Marker */}
          {destinationLocation && (
            <Marker
              coordinate={destinationLocation}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.markerWrapper}>
                <View style={[styles.markerPin, styles.destinationMarker]}>
                  <MaterialIcons name="place" size={22} color="#FFFFFF" />
                </View>
              </View>
            </Marker>
          )}

          {/* Driver Location Marker - Animated */}
          {driverLocation && isTracking && (
            <Marker
              coordinate={driverLocation}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <Animated.View
                style={[
                  styles.markerWrapper,
                  {
                    transform: [{ scale: pulseAnimation }],
                  },
                ]}
              >
                <View style={[styles.markerPulse, styles.driverPulse]} />
                <View style={[styles.markerPin, styles.driverMarker]}>
                  <MaterialIcons name="directions-car" size={24} color="#FFFFFF" />
                </View>
              </Animated.View>
            </Marker>
          )}
        </MapView>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#3185FC" />
            <Text style={[styles.loadingText, isRTL && styles.rtl]}>
              {language === 'ar' ? 'جاري التحميل...' : 'Loading trip...'}
            </Text>
          </View>
        )}

        {/* Demo Mode Banner */}
        {isDemoMode && !error && (
          <View style={styles.demoBanner}>
            <MaterialIcons name="info-outline" size={20} color="#10B981" />
            <Text style={[styles.demoBannerText, isRTL && styles.rtl]}>
              {language === 'ar' 
                ? 'وضع العرض التوضيحي - مثال على تتبع السائق'
                : 'Demo Mode - Example driver tracking'}
            </Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && !isDemoMode && (
          <View style={styles.errorOverlay}>
            <MaterialIcons name="error-outline" size={48} color="#EF4444" />
            <Text style={[styles.errorText, isRTL && styles.rtl]}>
              {error}
            </Text>
          </View>
        )}

        {/* Loading driver location indicator */}
        {!loading && !error && !driverLocation && tripStatus === 'ACTIVE' && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#3185FC" />
            <Text style={[styles.loadingText, isRTL && styles.rtl]}>
              {language === 'ar' ? 'جاري التتبع...' : 'Tracking driver...'}
            </Text>
          </View>
        )}
      </View>

      {/* Trip Info Panel */}
      <ScrollView
        style={styles.infoPanel}
        contentContainerStyle={styles.infoPanelContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Estimated Arrival */}
        {estimatedArrival && (
          <View style={[styles.infoCard, isRTL && styles.infoCardRTL]}>
            <View style={[styles.infoIcon, styles.arrivalIcon]}>
              <MaterialIcons name="schedule" size={24} color="#3185FC" />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, isRTL && styles.rtl]}>
                {t.estimatedArrival}
              </Text>
              <Text style={[styles.infoValue, isRTL && styles.rtl]}>
                {formatTime(estimatedArrival)}
              </Text>
            </View>
          </View>
        )}

        {/* Driver Info */}
        {driverInfo && (
          <View style={[styles.infoCard, isRTL && styles.infoCardRTL]}>
            <View style={[styles.infoIcon, styles.driverIcon]}>
              <MaterialIcons name="person" size={24} color="#10B981" />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, isRTL && styles.rtl]}>
                {language === 'ar' ? 'السائق' : 'Driver'}
              </Text>
              <Text style={[styles.infoValue, isRTL && styles.rtl]}>
                {driverInfo.name || 'Driver'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
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
    shadowOffset: { width: 0, height: 2 },
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
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F0F7FF',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  placeholder: {
    width: 52,
  },
  countdownContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  countdownContainerRTL: {
    flexDirection: 'row-reverse',
  },
  countdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  countdownContent: {
    flex: 1,
  },
  countdownLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 6,
    fontWeight: '500',
  },
  countdownTime: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  countdownValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3185FC',
  },
  countdownUnit: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  map: {
    flex: 1,
  },
  markerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3185FC',
    opacity: 0.3,
  },
  driverPulse: {
    backgroundColor: '#10B981',
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pickupMarker: {
    backgroundColor: '#3185FC',
  },
  destinationMarker: {
    backgroundColor: '#F59E0B',
  },
  driverMarker: {
    backgroundColor: '#10B981',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
    textAlign: 'center',
  },
  demoModeText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
  demoBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    zIndex: 1000,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  demoBannerText: {
    fontSize: 13,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
  infoPanel: {
    maxHeight: 200,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  infoPanelContent: {
    padding: 20,
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoCardRTL: {
    flexDirection: 'row-reverse',
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrivalIcon: {
    backgroundColor: '#F0F7FF',
  },
  driverIcon: {
    backgroundColor: '#ECFDF5',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  rtl: {
    textAlign: 'right',
  },
});

export default LiveTrackingScreen;

