import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { UbuntuFonts } from '../../src/utils/fonts';
import DateTimePicker from '@react-native-community/datetimepicker';
import BookingModal from '../../components/BookingModal';
import ActiveTripScreen from './ActiveTripScreen';
import TripNotification from '../../components/TripNotification';
import LiveTrackingScreen from './LiveTrackingScreen';
import { getActiveBooking } from '../../src/services/bookingService';
import { getDemoActiveTrip, DEMO_STUDENT, DEMO_SCHOOL } from '../../src/data/demoData';

const translations = {
  en: {
    title: 'Mobi',
    tagline: 'Smart school transportation',
    studentMap: 'Your Route',
    availableLocations: 'Available',
    pickupPoint: 'Pickup Point',
    dropoffPoint: 'Dropoff Point',
    schoolEntryTime: 'Departure',
    schoolEntryHint: 'When do you leave?',
    schoolExitTime: 'Return',
    schoolExitHint: 'When do you return?',
    confirmBooking: 'Book Trip',
    location: 'Rabat, Morocco',
  },
  ar: {
    title: 'موبي',
    tagline: 'النقل المدرسي الذكي',
    studentMap: 'مسارك',
    availableLocations: 'متاح',
    pickupPoint: 'نقطة الالتقاط',
    dropoffPoint: 'نقطة النزول',
    schoolEntryTime: 'المغادرة',
    schoolEntryHint: 'متى تغادر؟',
    schoolExitTime: 'العودة',
    schoolExitHint: 'متى تعود؟',
    confirmBooking: 'احجز الرحلة',
    location: 'الرباط، المغرب',
  },
};

const StudentHomeScreen = ({ studentId, isDemo = false, language = 'ar' }) => {
  const homeLocation = isDemo 
    ? DEMO_STUDENT.home_location 
    : { latitude: 33.5731, longitude: -7.5898 };
  const schoolLocation = isDemo 
    ? DEMO_SCHOOL.location 
    : { latitude: 33.5800, longitude: -7.5920 };

  const [activeBooking, setActiveBooking] = useState(null);
  const [schoolEntryTime, setSchoolEntryTime] = useState(null);
  const [schoolExitTime, setSchoolExitTime] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [availableLocations, setAvailableLocations] = useState(1);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showExitTimePicker, setShowExitTimePicker] = useState(false);
  const [confirmedTripData, setConfirmedTripData] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [showLiveTracking, setShowLiveTracking] = useState(false);
  const [tripStatus, setTripStatus] = useState(null); // 'active', 'completed', 'cancelled'
  const mapRef = useRef(null);
  const notificationTimeoutRef = useRef(null);

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  const t = translations[language];
  const isRTL = language === 'ar';

  // Load active booking
  useEffect(() => {
    const loadActiveBooking = async () => {
      if (isDemo) {
        const demoTrip = getDemoActiveTrip();
        setActiveBooking(demoTrip);
        if (demoTrip && demoTrip.status !== 'COMPLETED' && demoTrip.status !== 'CANCELLED') {
          setTripStatus('active');
        }
        return;
      }

      try {
        const { data, error } = await getActiveBooking(studentId);
        if (!error && data) {
          setActiveBooking(data);
          if (data.status !== 'COMPLETED' && data.status !== 'CANCELLED') {
            setTripStatus('active');
          }
        }
      } catch (err) {
        console.error('Exception loading active booking:', err);
      }
    };

    loadActiveBooking();

    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [studentId, isDemo]);

  // Trigger animations on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatTime = (date) => {
    if (!date) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getRouteCoordinates = () => {
    const markers = getMapMarkers();
    return [
      markers.start.location,
      markers.middle.location,
      markers.end.location,
    ];
  };

  const getMapMarkers = () => {
    const midLat = (homeLocation.latitude + schoolLocation.latitude) / 2;
    const midLng = (homeLocation.longitude + schoolLocation.longitude) / 2;
    const pickupDropoffLocation = {
      latitude: midLat + 0.001,
      longitude: midLng + 0.001,
    };

    return {
      start: { location: homeLocation, icon: 'home', label: language === 'ar' ? 'المنزل' : 'Home' },
      middle: { location: pickupDropoffLocation, icon: 'directions-bus', label: t.pickupPoint },
      end: { location: schoolLocation, icon: 'school', label: language === 'ar' ? 'المدرسة' : 'School' },
    };
  };

  useEffect(() => {
    if (mapRef.current) {
      const routeCoords = getRouteCoordinates();
      const allCoordinates = routeCoords.map(coord => ({
        latitude: coord.latitude,
        longitude: coord.longitude,
      }));

      mapRef.current.fitToCoordinates(allCoordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, []);

  const handleConfirmBooking = () => {
    if (!schoolEntryTime) {
      return;
    }

    const routeCoords = getRouteCoordinates();
    const markers = getMapMarkers();

    const tripData = {
      homeLocation,
      pickupLocation: markers.middle.location,
      destinationLocation: schoolLocation,
      routeCoordinates: routeCoords,
      leaveHomeTime: new Date(schoolEntryTime.getTime() - 50 * 60 * 1000),
      reachPickupTime: new Date(schoolEntryTime.getTime() - 10 * 60 * 1000),
      arriveDestinationTime: schoolEntryTime,
      totalDurationMinutes: 20,
      totalDistanceKm: 20,
      direction: 'homeToSchool',
      driverName: language === 'ar' ? 'أحمد محمود' : 'Ahmed Mahmoud',
      vehicleInfo: language === 'ar' ? 'حافلة مدرسية - AB 1234' : 'School Bus - AB 1234',
    };

    setConfirmedTripData(tripData);
    setTripStatus('active');

    notificationTimeoutRef.current = setTimeout(() => {
      setShowNotification(true);
    }, 10000);
  };

  const handleBookingSuccess = (newBooking) => {
    setActiveBooking(newBooking);
    setShowBookingModal(false);
  };

  const handleViewLiveTrip = () => {
    setShowNotification(false);
    // Use confirmedTripData if available, otherwise create from activeBooking
    const tripDataForTracking = confirmedTripData || (activeBooking ? {
      homeLocation,
      pickupLocation: activeBooking.pickup_location || getMapMarkers().middle.location,
      destinationLocation: schoolLocation,
      routeCoordinates: getRouteCoordinates(),
      leaveHomeTime: activeBooking.start_time ? new Date(activeBooking.start_time) : new Date(),
      reachPickupTime: activeBooking.pickup_time ? new Date(activeBooking.pickup_time) : new Date(),
      arriveDestinationTime: activeBooking.end_time ? new Date(activeBooking.end_time) : new Date(),
      driverName: activeBooking.driver?.name || (language === 'ar' ? 'أحمد محمود' : 'Ahmed Mahmoud'),
      vehicleInfo: activeBooking.vehicle?.plate_number || '',
    } : null);
    
    if (tripDataForTracking) {
      setConfirmedTripData(tripDataForTracking);
    }
    setShowLiveTracking(true);
  };

  const handleDismissNotification = () => {
    setShowNotification(false);
  };

  // Show Live Tracking Screen
  if (showLiveTracking && confirmedTripData) {
    return (
      <LiveTrackingScreen
        tripId={null}
        studentId={studentId}
        language={language}
        tripData={confirmedTripData}
        onBack={() => setShowLiveTracking(false)}
      />
    );
  }

  // Check if there's an active trip (either from confirmed booking or existing active booking)
  // Check if there's an active trip (either from confirmed booking or existing active booking)
  const hasActiveTrip = (confirmedTripData && tripStatus === 'active') || 
                        (activeBooking && activeBooking.status !== 'COMPLETED' && activeBooking.status !== 'CANCELLED');

  // Get current trip data (prefer confirmedTripData, fallback to activeBooking)
  const getCurrentTripData = () => {
    if (confirmedTripData) return confirmedTripData;
    if (activeBooking) {
      // Convert activeBooking to tripData format
      return {
        leaveHomeTime: activeBooking.start_time ? new Date(activeBooking.start_time) : null,
        reachPickupTime: activeBooking.pickup_time ? new Date(activeBooking.pickup_time) : null,
        arriveDestinationTime: activeBooking.end_time ? new Date(activeBooking.end_time) : null,
        driverName: activeBooking.driver?.name || (language === 'ar' ? 'أحمد محمود' : 'Ahmed Mahmoud'),
        vehicleInfo: activeBooking.vehicle?.plate_number || '',
      };
    }
    return null;
  };

  const currentTripData = getCurrentTripData();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER - Minimal Clean */}
        <Animated.View style={[styles.header, { opacity: fadeIn }]}>
          <View style={[styles.headerContent, isRTL && styles.headerContentRTL]}>
            <View style={styles.logoCircle}>
              <MaterialIcons name="directions-bus" size={24} color="#FFF" />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.title, isRTL && styles.rtl]}>{t.title}</Text>
              <Text style={[styles.tagline, isRTL && styles.rtl]}>{t.tagline}</Text>
            </View>
          </View>
        </Animated.View>

        {/* MAP CARD - Clean Modern */}
        <Animated.View 
          style={[
            styles.mapCard,
            { opacity: fadeIn, transform: [{ translateY: slideUp }] }
          ]}
        >
          {/* Card Header */}
          <View style={[styles.cardHeader, isRTL && styles.cardHeaderRTL]}>
            <View style={styles.cardTitleBox}>
              <View style={styles.iconBox}>
                <MaterialIcons name="map" size={16} color="#3B82F6" />
              </View>
              <Text style={[styles.cardTitle, isRTL && styles.rtl]}>
                {t.studentMap}
              </Text>
            </View>
            <View style={styles.badge}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>{availableLocations}</Text>
            </View>
          </View>

          {/* Map */}
          <View style={styles.mapWrapper}>
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
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Polyline
                coordinates={getRouteCoordinates()}
                strokeColor="#3B82F6"
                strokeWidth={3}
                lineCap="round"
              />

              {(() => {
                const markers = getMapMarkers();
                return (
                  <>
                    <Marker coordinate={markers.start.location}>
                      <View style={[styles.marker, styles.homeMarker]}>
                        <MaterialIcons name={markers.start.icon} size={18} color="#FFF" />
                      </View>
                    </Marker>

                    <Marker coordinate={markers.middle.location}>
                      <View style={styles.busMarkerWrapper}>
                        <View style={styles.busMarkerPulse} />
                        <View style={[styles.marker, styles.busMarker]}>
                          <MaterialIcons name={markers.middle.icon} size={18} color="#FFF" />
                        </View>
                      </View>
                    </Marker>

                    <Marker coordinate={markers.end.location}>
                      <View style={[styles.marker, styles.schoolMarker]}>
                        <MaterialIcons name={markers.end.icon} size={18} color="#FFF" />
                      </View>
                    </Marker>
                  </>
                );
              })()}
            </MapView>
          </View>

          {/* Location Info */}
          <View style={[styles.locationInfo, isRTL && styles.locationInfoRTL]}>
            <MaterialIcons name="location-on" size={14} color="#10B981" />
            <Text style={[styles.locationText, isRTL && styles.rtl]}>
              {t.location}
            </Text>
          </View>
        </Animated.View>

        {/* ACTIVE TRIP DETAILS */}
        {hasActiveTrip && (
          <Animated.View 
            style={[
              styles.tripCard,
              { opacity: fadeIn, transform: [{ translateY: slideUp }] }
            ]}
          >
            <View style={[styles.tripHeader, isRTL && styles.tripHeaderRTL]}>
              <View style={styles.tripIconBox}>
                <MaterialIcons name="check-circle" size={20} color="#10B981" />
              </View>
              <View style={styles.tripHeaderText}>
                <Text style={[styles.tripTitle, isRTL && styles.rtl]}>
                  {language === 'ar' ? 'رحلتك المحجوزة' : 'Your Booked Trip'}
                </Text>
                <Text style={[styles.tripSubtitle, isRTL && styles.rtl]}>
                  {language === 'ar' ? 'جاهز للانطلاق' : 'Ready to go'}
                </Text>
              </View>
              <View style={styles.tripStatusBadge}>
                <View style={styles.tripStatusDot} />
                <Text style={styles.tripStatusText}>
                  {language === 'ar' ? 'نشط' : 'Active'}
                </Text>
              </View>
            </View>

            {/* Trip Info */}
            <View style={styles.tripDetails}>
              <View style={[styles.tripDetailRow, isRTL && styles.tripDetailRowRTL]}>
                <MaterialIcons name="schedule" size={18} color="#3B82F6" />
                <Text style={[styles.tripDetailLabel, isRTL && styles.rtl]}>
                  {language === 'ar' ? 'وقت المغادرة' : 'Departure Time'}
                </Text>
                <Text style={[styles.tripDetailValue, isRTL && styles.rtl]}>
                  {currentTripData?.leaveHomeTime ? formatTime(currentTripData.leaveHomeTime) : '--:--'}
                </Text>
              </View>

              <View style={[styles.tripDetailRow, isRTL && styles.tripDetailRowRTL]}>
                <MaterialIcons name="location-on" size={18} color="#F59E0B" />
                <Text style={[styles.tripDetailLabel, isRTL && styles.rtl]}>
                  {language === 'ar' ? 'نقطة الالتقاط' : 'Pickup Point'}
                </Text>
                <Text style={[styles.tripDetailValue, isRTL && styles.rtl]}>
                  {currentTripData?.reachPickupTime ? formatTime(currentTripData.reachPickupTime) : '--:--'}
                </Text>
              </View>

              <View style={[styles.tripDetailRow, isRTL && styles.tripDetailRowRTL]}>
                <MaterialIcons name="school" size={18} color="#10B981" />
                <Text style={[styles.tripDetailLabel, isRTL && styles.rtl]}>
                  {language === 'ar' ? 'الوصول إلى المدرسة' : 'Arrive at School'}
                </Text>
                <Text style={[styles.tripDetailValue, isRTL && styles.rtl]}>
                  {currentTripData?.arriveDestinationTime ? formatTime(currentTripData.arriveDestinationTime) : '--:--'}
                </Text>
              </View>
            </View>

            {/* Driver Info */}
            <View style={styles.tripDriverSection}>
              <View style={[styles.tripDriverRow, isRTL && styles.tripDriverRowRTL]}>
                <View style={styles.driverAvatarSmall}>
                  <MaterialIcons name="person" size={20} color="#FFF" />
                </View>
                <View style={styles.tripDriverInfo}>
                  <Text style={[styles.tripDriverName, isRTL && styles.rtl]}>
                    {currentTripData?.driverName || (language === 'ar' ? 'السائق' : 'Driver')}
                  </Text>
                  <Text style={[styles.tripVehicleInfo, isRTL && styles.rtl]}>
                    {currentTripData?.vehicleInfo || (language === 'ar' ? 'المركبة' : 'Vehicle')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={[styles.tripActions, isRTL && styles.tripActionsRTL]}>
              <TouchableOpacity
                style={styles.trackButton}
                onPress={handleViewLiveTrip}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.trackGradient}
                >
                  <MaterialIcons name="my-location" size={18} color="#FFF" />
                  <Text style={[styles.trackButtonText, isRTL && styles.rtl]}>
                    {language === 'ar' ? 'تتبع الرحلة' : 'Track Trip'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setTripStatus('cancelled');
                  setConfirmedTripData(null);
                }}
                activeOpacity={0.8}
              >
                <MaterialIcons name="close" size={18} color="#EF4444" />
                <Text style={[styles.cancelButtonText, isRTL && styles.rtl]}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* TIME INPUTS - Clean Minimal (Hidden when trip is active) */}
        {!hasActiveTrip && (
          <Animated.View 
            style={[
              styles.timesSection,
              { opacity: fadeIn, transform: [{ translateY: slideUp }] }
            ]}
          >
          {/* Departure Time */}
          <View style={styles.timeCard}>
            <View style={[styles.timeHeader, isRTL && styles.timeHeaderRTL]}>
              <View style={[styles.timeIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <MaterialIcons name="login" size={16} color="#3B82F6" />
              </View>
              <View style={styles.timeInfo}>
                <Text style={[styles.timeLabel, isRTL && styles.rtl]}>
                  {t.schoolEntryTime}
                </Text>
                <Text style={[styles.timeHint, isRTL && styles.rtl]}>
                  {t.schoolEntryHint}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.timeField,
                schoolEntryTime && styles.timeFieldActive
              ]}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <MaterialIcons 
                name="schedule" 
                size={18} 
                color={schoolEntryTime ? '#3B82F6' : '#D1D5DB'}
              />
              <Text style={[
                styles.timeValue,
                !schoolEntryTime && styles.timePlaceholder,
                isRTL && styles.rtl
              ]}>
                {schoolEntryTime ? formatTime(schoolEntryTime) : '08:00'}
              </Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={schoolEntryTime || new Date()}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={(event, selectedTime) => {
                  setShowTimePicker(false);
                  if (selectedTime) {
                    setSchoolEntryTime(selectedTime);
                  }
                }}
              />
            )}
          </View>

          {/* Return Time */}
          <View style={styles.timeCard}>
            <View style={[styles.timeHeader, isRTL && styles.timeHeaderRTL]}>
              <View style={[styles.timeIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <MaterialIcons name="logout" size={16} color="#10B981" />
              </View>
              <View style={styles.timeInfo}>
                <Text style={[styles.timeLabel, isRTL && styles.rtl]}>
                  {t.schoolExitTime}
                </Text>
                <Text style={[styles.timeHint, isRTL && styles.rtl]}>
                  {t.schoolExitHint}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.timeField,
                schoolExitTime && styles.timeFieldActive
              ]}
              onPress={() => setShowExitTimePicker(true)}
              activeOpacity={0.7}
            >
              <MaterialIcons 
                name="schedule" 
                size={18} 
                color={schoolExitTime ? '#10B981' : '#D1D5DB'}
              />
              <Text style={[
                styles.timeValue,
                !schoolExitTime && styles.timePlaceholder,
                isRTL && styles.rtl
              ]}>
                {schoolExitTime ? formatTime(schoolExitTime) : '16:00'}
              </Text>
            </TouchableOpacity>

            {showExitTimePicker && (
              <DateTimePicker
                value={schoolExitTime || new Date()}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={(event, selectedTime) => {
                  setShowExitTimePicker(false);
                  if (selectedTime) {
                    setSchoolExitTime(selectedTime);
                  }
                }}
              />
            )}
          </View>
        </Animated.View>
        )}

        {/* CONFIRM BUTTON - Clean CTA (Hidden when trip is active) */}
        {!hasActiveTrip && (
          <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
            <TouchableOpacity
              style={[
                styles.bookButton,
                !schoolEntryTime && styles.bookButtonDisabled
              ]}
              onPress={handleConfirmBooking}
              disabled={!schoolEntryTime}
              activeOpacity={0.8}
            >
            <LinearGradient
              colors={schoolEntryTime ? ['#3B82F6', '#2563EB'] : ['#E5E7EB', '#D1D5DB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.bookGradient}
            >
              <MaterialIcons 
                name="check-circle" 
                size={20} 
                color={schoolEntryTime ? "#FFF" : "#9CA3AF"} 
              />
              <Text style={[
                styles.bookText,
                !schoolEntryTime && styles.bookTextDisabled,
                isRTL && styles.rtl
              ]}>
                {t.confirmBooking}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
        )}
      </ScrollView>

      {/* Booking Modal */}
      <BookingModal
        visible={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        studentId={studentId}
        language={language}
        onBookingSuccess={handleBookingSuccess}
        isDemo={isDemo}
        schoolEntryTime={schoolEntryTime}
        schoolExitTime={schoolExitTime}
      />

      {/* Trip Started Notification */}
      <TripNotification
        visible={showNotification}
        driverName={currentTripData?.driverName || (language === 'ar' ? 'أحمد محمود' : 'Ahmed Mahmoud')}
        vehicleInfo={currentTripData?.vehicleInfo || ''}
        onViewTrip={handleViewLiveTrip}
        onDismiss={handleDismissNotification}
        language={language}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Header
  header: {
    marginBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerContentRTL: {
    flexDirection: 'row-reverse',
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: UbuntuFonts.bold,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontFamily: UbuntuFonts.regular,
  },

  // Map Card
  mapCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  cardTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: UbuntuFonts.semiBold,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    fontFamily: UbuntuFonts.semiBold,
  },
  mapWrapper: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  map: {
    flex: 1,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  locationInfoRTL: {
    flexDirection: 'row-reverse',
  },
  locationText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
    fontFamily: UbuntuFonts.medium,
  },

  // Markers
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  homeMarker: {
    backgroundColor: '#6366F1',
  },
  busMarkerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  busMarkerPulse: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  busMarker: {
    backgroundColor: '#3B82F6',
  },
  schoolMarker: {
    backgroundColor: '#F59E0B',
  },

  // Time Section
  timesSection: {
    gap: 16,
    marginBottom: 24,
  },
  timeCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  timeHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  timeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeInfo: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: UbuntuFonts.semiBold,
    marginBottom: 2,
  },
  timeHint: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: UbuntuFonts.regular,
  },
  timeField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeFieldActive: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  timeValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: UbuntuFonts.semiBold,
  },
  timePlaceholder: {
    color: '#CBD5E1',
    fontWeight: '400',
  },

  // Book Button
  bookButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bookButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  bookGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  bookText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: UbuntuFonts.semiBold,
  },
  bookTextDisabled: {
    color: '#9CA3AF',
  },

  // Trip Details Card
  tripCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  tripHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  tripIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripHeaderText: {
    flex: 1,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: UbuntuFonts.bold,
    marginBottom: 2,
  },
  tripSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: UbuntuFonts.regular,
  },
  tripStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
  },
  tripStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  tripStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    fontFamily: UbuntuFonts.semiBold,
  },
  tripDetails: {
    gap: 14,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tripDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tripDetailRowRTL: {
    flexDirection: 'row-reverse',
  },
  tripDetailLabel: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
    fontFamily: UbuntuFonts.medium,
  },
  tripDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: UbuntuFonts.semiBold,
  },
  tripDriverSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tripDriverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tripDriverRowRTL: {
    flexDirection: 'row-reverse',
  },
  driverAvatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripDriverInfo: {
    flex: 1,
  },
  tripDriverName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: UbuntuFonts.semiBold,
    marginBottom: 2,
  },
  tripVehicleInfo: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: UbuntuFonts.regular,
  },
  tripActions: {
    flexDirection: 'row',
    gap: 12,
  },
  tripActionsRTL: {
    flexDirection: 'row-reverse',
  },
  trackButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  trackGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  trackButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: UbuntuFonts.semiBold,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
    fontFamily: UbuntuFonts.semiBold,
  },

  // RTL
  rtl: {
    textAlign: 'right',
  },
});

export default StudentHomeScreen;