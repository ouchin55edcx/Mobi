import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { UbuntuFonts } from '../../src/utils/fonts';
import DateTimePicker from '@react-native-community/datetimepicker';
import BookingModal from '../../components/BookingModal';
import ActiveTripScreen from './ActiveTripScreen';
import { getActiveBooking } from '../../src/services/bookingService';
import { getDemoActiveTrip, DEMO_STUDENT, DEMO_SCHOOL } from '../../src/data/demoData';

const translations = {
  en: {
    title: 'Mobi - Student Transport',
    tagline: 'Book your daily trip to school',
    studentMap: 'Student Map',
    availableLocations: 'Available locations',
    tripDirection: 'Trip Direction',
    fromHomeToSchool: 'From Home → School',
    fromSchoolToHome: 'From School → Home',
    pickupPoint: 'Pickup Point',
    dropoffPoint: 'Dropoff Point',
    schoolEntryTime: 'School entry time',
    schoolEntryHint: 'Enter the time you enter school',
    schoolExitTime: 'School exit time',
    schoolExitHint: 'Enter the time you leave school',
    confirmBooking: 'Confirm Booking',
    location: 'Rabat, Morocco',
  },
  ar: {
    title: 'موبي - نقل الطلاب',
    tagline: 'احجز رحلتك اليومية للمدرسة',
    studentMap: 'خريطة الطلاب',
    availableLocations: 'المواقع المتاحة',
    tripDirection: 'اتجاه الرحلة',
    fromHomeToSchool: 'من المنزل → المدرسة',
    fromSchoolToHome: 'من المدرسة → المنزل',
    pickupPoint: 'نقطة الاستلام',
    dropoffPoint: 'نقطة النزول',
    schoolEntryTime: 'وقت دخول المدرسة',
    schoolEntryHint: 'أدخل الوقت الذي تدخل فيه المدرسة',
    schoolExitTime: 'وقت خروج المدرسة',
    schoolExitHint: 'أدخل الوقت الذي تخرج فيه من المدرسة',
    confirmBooking: 'تأكيد الحجز',
    location: 'الرباط، المغرب',
  },
};

const StudentHomeScreen = ({ studentId, isDemo = false, language = 'ar' }) => {
  // Use demo locations or real student data
  const homeLocation = isDemo 
    ? DEMO_STUDENT.home_location 
    : { latitude: 33.5731, longitude: -7.5898 }; // Rabat, Morocco
  const schoolLocation = isDemo 
    ? DEMO_SCHOOL.location 
    : { latitude: 33.5800, longitude: -7.5920 };

  const [activeBooking, setActiveBooking] = useState(null);
  const [schoolEntryTime, setSchoolEntryTime] = useState(null);
  const [schoolExitTime, setSchoolExitTime] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [availableLocations, setAvailableLocations] = useState(1);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showActiveTrip, setShowActiveTrip] = useState(false);
  const [confirmedTripData, setConfirmedTripData] = useState(null);
  const [tripDirection, setTripDirection] = useState('homeToSchool'); // 'homeToSchool' or 'schoolToHome'
  const mapRef = useRef(null);

  const t = translations[language];
  const isRTL = language === 'ar';

  // Load active booking
  useEffect(() => {
    const loadActiveBooking = async () => {
      if (isDemo) {
        const demoTrip = getDemoActiveTrip();
        setActiveBooking(demoTrip);
        return;
      }

      try {
        const { data, error } = await getActiveBooking(studentId);
        if (!error && data) {
          setActiveBooking(data);
        }
      } catch (err) {
        console.error('Exception loading active booking:', err);
      }
    };

    loadActiveBooking();
  }, [studentId, isDemo]);

  const formatTime = (date) => {
    if (!date) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Calculate route coordinates based on direction
  const getRouteCoordinates = () => {
    const markers = getMapMarkers();
    return [
      markers.start.location,
      markers.middle.location,
      markers.end.location,
    ];
  };

  // Get map markers based on direction
  const getMapMarkers = () => {
    // Calculate a midpoint for pickup/dropoff (slightly offset from direct route)
    const midLat = (homeLocation.latitude + schoolLocation.latitude) / 2;
    const midLng = (homeLocation.longitude + schoolLocation.longitude) / 2;
    const pickupDropoffLocation = {
      latitude: midLat + 0.001, // Slight offset for visual distinction
      longitude: midLng + 0.001,
    };

    if (tripDirection === 'homeToSchool') {
      return {
        start: { location: homeLocation, icon: 'home', label: language === 'ar' ? 'المنزل' : 'Home' },
        middle: { location: pickupDropoffLocation, icon: 'directions-bus', label: t.pickupPoint },
        end: { location: schoolLocation, icon: 'school', label: language === 'ar' ? 'المدرسة' : 'School' },
      };
    } else {
      return {
        start: { location: schoolLocation, icon: 'school', label: language === 'ar' ? 'المدرسة' : 'School' },
        middle: { location: pickupDropoffLocation, icon: 'directions-bus', label: t.dropoffPoint },
        end: { location: homeLocation, icon: 'home', label: language === 'ar' ? 'المنزل' : 'Home' },
      };
    }
  };

  // Animate map when direction changes
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
  }, [tripDirection]);

  const handleDirectionChange = (direction) => {
    setTripDirection(direction);
  };

  const handleConfirmBooking = () => {
    const timeToUse = tripDirection === 'homeToSchool' ? schoolEntryTime : schoolExitTime;
    if (!timeToUse) {
      // Show error or validation message
      return;
    }

    const routeCoords = getRouteCoordinates();
    const markers = getMapMarkers();

    // Create trip data for the active trip screen
    const tripData = {
      homeLocation,
      pickupLocation: tripDirection === 'homeToSchool' ? schoolLocation : homeLocation,
      destinationLocation: tripDirection === 'homeToSchool' ? schoolLocation : homeLocation,
      routeCoordinates: routeCoords,
      leaveHomeTime: tripDirection === 'homeToSchool' 
        ? new Date(timeToUse.getTime() - 50 * 60 * 1000)
        : new Date(timeToUse.getTime() - 10 * 60 * 1000),
      reachPickupTime: tripDirection === 'homeToSchool'
        ? new Date(timeToUse.getTime() - 10 * 60 * 1000)
        : new Date(timeToUse.getTime() - 5 * 60 * 1000),
      arriveDestinationTime: timeToUse,
      totalDurationMinutes: 20,
      totalDistanceKm: 20,
      direction: tripDirection,
    };

    setConfirmedTripData(tripData);
    setShowActiveTrip(true);
  };

  const handleGoFromActiveTrip = () => {
    // Navigate to live tracking or start the trip
    setShowActiveTrip(false);
    // You can add navigation to live tracking here
  };


  const handleBookingSuccess = (newBooking) => {
    setActiveBooking(newBooking);
    setShowBookingModal(false);
  };

  // Show active trip screen if confirmed
  if (showActiveTrip && confirmedTripData) {
    return (
      <ActiveTripScreen
        tripData={confirmedTripData}
        language={language}
        onBack={() => setShowActiveTrip(false)}
        onGo={handleGoFromActiveTrip}
        studentId={studentId}
        isDemo={isDemo}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, isRTL && styles.rtl]}>
              {t.title}
            </Text>
            <MaterialIcons name="directions-bus" size={24} color="#FFC107" />
          </View>
          <Text style={[styles.headerTagline, isRTL && styles.rtl]}>
            {t.tagline}
          </Text>
        </View>

        {/* Trip Direction Selector */}
        <View style={styles.directionSelectorContainer}>
          <Text style={[styles.directionLabel, isRTL && styles.rtl]}>
            {t.tripDirection}
          </Text>
          <View style={[styles.directionSelector, isRTL && styles.directionSelectorRTL]}>
            <TouchableOpacity
              style={[
                styles.directionOption,
                tripDirection === 'homeToSchool' && styles.directionOptionActive,
                isRTL && styles.directionOptionRTL,
              ]}
              onPress={() => handleDirectionChange('homeToSchool')}
              activeOpacity={0.7}
            >
              <MaterialIcons name="home" size={20} color={tripDirection === 'homeToSchool' ? '#FFFFFF' : '#3185FC'} />
              <MaterialIcons name="arrow-forward" size={16} color={tripDirection === 'homeToSchool' ? '#FFFFFF' : '#3185FC'} />
              <MaterialIcons name="school" size={20} color={tripDirection === 'homeToSchool' ? '#FFFFFF' : '#3185FC'} />
              <Text style={[
                styles.directionOptionText,
                tripDirection === 'homeToSchool' && styles.directionOptionTextActive,
                isRTL && styles.rtl,
              ]}>
                {t.fromHomeToSchool}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.directionOption,
                tripDirection === 'schoolToHome' && styles.directionOptionActive,
                isRTL && styles.directionOptionRTL,
              ]}
              onPress={() => handleDirectionChange('schoolToHome')}
              activeOpacity={0.7}
            >
              <MaterialIcons name="school" size={20} color={tripDirection === 'schoolToHome' ? '#FFFFFF' : '#3185FC'} />
              <MaterialIcons name="arrow-forward" size={16} color={tripDirection === 'schoolToHome' ? '#FFFFFF' : '#3185FC'} />
              <MaterialIcons name="home" size={20} color={tripDirection === 'schoolToHome' ? '#FFFFFF' : '#3185FC'} />
              <Text style={[
                styles.directionOptionText,
                tripDirection === 'schoolToHome' && styles.directionOptionTextActive,
                isRTL && styles.rtl,
              ]}>
                {t.fromSchoolToHome}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Map Card */}
        <View style={styles.mapCard}>
          <View style={styles.mapCardHeader}>
            <View style={styles.mapCardTitleContainer}>
              <MaterialIcons name="map" size={20} color="#3185FC" />
              <Text style={[styles.mapCardTitle, isRTL && styles.rtl]}>
                {t.studentMap}
              </Text>
            </View>
            <Text style={[styles.availableLocations, isRTL && styles.rtl]}>
              {t.availableLocations}: {availableLocations}
            </Text>
          </View>

          <View style={styles.locationContainer}>
            <View style={styles.locationDot} />
            <Text style={[styles.locationText, isRTL && styles.rtl]}>
              {t.location}
            </Text>
          </View>

          <View style={styles.mapContainer}>
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
              {/* Route Polyline */}
              <Polyline
                coordinates={getRouteCoordinates()}
                strokeColor="#3185FC"
                strokeWidth={4}
              />

              {/* Map Markers */}
              {(() => {
                const markers = getMapMarkers();
                return (
                  <>
                    {/* Start Marker */}
                    <Marker coordinate={markers.start.location}>
                      <View style={styles.markerContainer}>
                        <MaterialIcons name={markers.start.icon} size={24} color="#FFFFFF" />
                      </View>
                    </Marker>

                    {/* Middle Marker (Pickup/Dropoff) */}
                    <Marker coordinate={markers.middle.location}>
                      <View style={styles.middleMarkerContainer}>
                        <View style={styles.middleMarkerPulse} />
                        <View style={styles.middleMarkerInner}>
                          <MaterialIcons name={markers.middle.icon} size={20} color="#FFFFFF" />
                        </View>
                      </View>
                    </Marker>

                    {/* End Marker */}
                    <Marker coordinate={markers.end.location}>
                      <View style={styles.markerContainer}>
                        <MaterialIcons name={markers.end.icon} size={24} color="#FFFFFF" />
                      </View>
                    </Marker>
                  </>
                );
              })()}
            </MapView>
          </View>
        </View>

        {/* Time Input Fields */}
        <View style={styles.timeInputsContainer}>
          {/* Time Input - Changes based on direction */}
          <View style={styles.timeInputWrapper}>
            <View style={styles.timeInputLabelContainer}>
              <MaterialIcons name="access-time" size={18} color="#3185FC" />
              <Text style={[styles.timeInputLabel, isRTL && styles.rtl]}>
                {tripDirection === 'homeToSchool' ? t.schoolEntryTime : t.schoolExitTime}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.timeInputField}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.timeInputText,
                !(tripDirection === 'homeToSchool' ? schoolEntryTime : schoolExitTime) && styles.timeInputPlaceholder,
                isRTL && styles.rtl
              ]}>
                {(tripDirection === 'homeToSchool' ? schoolEntryTime : schoolExitTime) 
                  ? formatTime(tripDirection === 'homeToSchool' ? schoolEntryTime : schoolExitTime) 
                  : (language === 'ar' ? 'مثال: 08:00' : 'Example: 08:00')}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.timeInputHint, isRTL && styles.rtl]}>
              {tripDirection === 'homeToSchool' ? t.schoolEntryHint : t.schoolExitHint}
            </Text>
            {showTimePicker && (
              <DateTimePicker
                value={(tripDirection === 'homeToSchool' ? schoolEntryTime : schoolExitTime) || new Date()}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={(event, selectedTime) => {
                  setShowTimePicker(false);
                  if (selectedTime) {
                    if (tripDirection === 'homeToSchool') {
                      setSchoolEntryTime(selectedTime);
                    } else {
                      setSchoolExitTime(selectedTime);
                    }
                  }
                }}
              />
            )}
          </View>
        </View>

        {/* Confirm Booking Button */}
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirmBooking}
          activeOpacity={0.8}
        >
          <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
          <Text style={[styles.confirmButtonText, isRTL && styles.rtl]}>
            {t.confirmBooking}
          </Text>
        </TouchableOpacity>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 24,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    fontFamily: UbuntuFonts.bold,
  },
  headerTagline: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    fontFamily: UbuntuFonts.regular,
  },
  directionSelectorContainer: {
    marginBottom: 20,
  },
  directionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: UbuntuFonts.semiBold,
    marginBottom: 12,
  },
  directionSelector: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  directionSelectorRTL: {
    flexDirection: 'row-reverse',
  },
  directionOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  directionOptionRTL: {
    flexDirection: 'row-reverse',
  },
  directionOptionActive: {
    backgroundColor: '#3185FC',
    borderColor: '#3185FC',
  },
  directionOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3185FC',
    fontFamily: UbuntuFonts.semiBold,
    marginLeft: 4,
  },
  directionOptionTextActive: {
    color: '#FFFFFF',
  },
  mapCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  mapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapCardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: UbuntuFonts.semiBold,
  },
  availableLocations: {
    fontSize: 14,
    color: '#666666',
    fontFamily: UbuntuFonts.regular,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  locationText: {
    fontSize: 14,
    color: '#1A1A1A',
    fontFamily: UbuntuFonts.regular,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3185FC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  middleMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  middleMarkerPulse: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(49, 133, 252, 0.2)',
    borderWidth: 2,
    borderColor: '#3185FC',
  },
  middleMarkerInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3185FC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  timeInputsContainer: {
    marginBottom: 24,
  },
  timeInputWrapper: {
    marginBottom: 20,
  },
  timeInputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  timeInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: UbuntuFonts.semiBold,
  },
  timeInputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B3D9FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    justifyContent: 'center',
  },
  timeInputText: {
    fontSize: 16,
    color: '#1A1A1A',
    fontFamily: UbuntuFonts.regular,
  },
  timeInputPlaceholder: {
    color: '#999999',
  },
  timeInputHint: {
    fontSize: 12,
    color: '#999999',
    marginTop: 8,
    fontFamily: UbuntuFonts.regular,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3185FC',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
    shadowColor: '#3185FC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: UbuntuFonts.semiBold,
  },
  rtl: {
    textAlign: 'right',
  },
});

export default StudentHomeScreen;
