import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import StudentPickupModal from '../../components/StudentPickupModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const translations = {
  en: {
    tripStatus: 'Trip Status',
    scheduled: 'Scheduled',
    live: 'LIVE',
    completed: 'Completed',
    pickupTime: 'Pickup Time',
    remainingStudents: 'Remaining Students',
    estimatedArrival: 'Estimated Arrival',
    go: 'GO',
    startTrip: 'Start Trip',
    tripStarted: 'Trip Started',
    tripStartedMessage: 'Your trip has started. Students will be notified.',
    ok: 'OK',
    back: 'Back',
    minutes: 'min',
    students: 'students',
    student: 'student',
  },
  ar: {
    tripStatus: 'حالة الرحلة',
    scheduled: 'مجدولة',
    live: 'مباشر',
    completed: 'مكتملة',
    pickupTime: 'وقت الاستلام',
    remainingStudents: 'الطلاب المتبقون',
    estimatedArrival: 'الوصول المتوقع',
    go: 'ابدأ',
    startTrip: 'بدء الرحلة',
    tripStarted: 'تم بدء الرحلة',
    tripStartedMessage: 'تم بدء رحلتك. سيتم إشعار الطلاب.',
    ok: 'حسناً',
    back: 'رجوع',
    minutes: 'دقيقة',
    students: 'طلاب',
    student: 'طالب',
  },
};

// Trip Status Enum
const TRIP_STATUS = {
  SCHEDULED: 'SCHEDULED',
  LIVE: 'LIVE',
  COMPLETED: 'COMPLETED',
};

// Demo data generator
const generateDemoTripData = (tripId) => {
  const schoolLocation = { latitude: 33.5800, longitude: -7.5920, name: 'Casablanca International School' };
  
  // Generate student pickup points along a route
  const students = [
    {
      id: 'student-1',
      name: 'Ahmed Alami',
      phone: '+212612345678',
      pickupLocation: { latitude: 33.5750, longitude: -7.5900 },
      status: 'pending',
      order: 1,
    },
    {
      id: 'student-2',
      name: 'Fatima Zahra',
      phone: '+212612345679',
      pickupLocation: { latitude: 33.5760, longitude: -7.5905 },
      status: 'pending',
      order: 2,
    },
    {
      id: 'student-3',
      name: 'Youssef Benali',
      phone: '+212612345680',
      pickupLocation: { latitude: 33.5770, longitude: -7.5910 },
      status: 'pending',
      order: 3,
    },
    {
      id: 'student-4',
      name: 'Aicha Mansouri',
      phone: '+212612345681',
      pickupLocation: { latitude: 33.5775, longitude: -7.5912 },
      status: 'pending',
      order: 4,
    },
    {
      id: 'student-5',
      name: 'Mohamed Tazi',
      phone: '+212612345682',
      pickupLocation: { latitude: 33.5780, longitude: -7.5914 },
      status: 'pending',
      order: 5,
    },
    {
      id: 'student-6',
      name: 'Sanae El Fassi',
      phone: '+212612345683',
      pickupLocation: { latitude: 33.5785, longitude: -7.5916 },
      status: 'pending',
      order: 6,
    },
    {
      id: 'student-7',
      name: 'Omar Idrissi',
      phone: '+212612345684',
      pickupLocation: { latitude: 33.5790, longitude: -7.5918 },
      status: 'pending',
      order: 7,
    },
    {
      id: 'student-8',
      name: 'Layla Amrani',
      phone: '+212612345685',
      pickupLocation: { latitude: 33.5795, longitude: -7.5920 },
      status: 'pending',
      order: 8,
    },
  ];

  // Generate route coordinates (simplified polyline)
  const routeCoordinates = [
    ...students.map(s => s.pickupLocation),
    schoolLocation,
  ];

  // Initial bus location (start of route)
  const initialBusLocation = students[0].pickupLocation;

  return {
    id: tripId || 'demo-trip-001',
    status: TRIP_STATUS.SCHEDULED,
    pickupTime: '07:30',
    students,
    schoolLocation,
    routeCoordinates,
    busLocation: initialBusLocation,
    estimatedArrivalMinutes: 45,
    startTime: null,
  };
};

const TripLiveViewScreen = ({
  tripData,
  language = 'en',
  onBack,
  isDemo = true,
}) => {
  const t = translations[language];
  const isRTL = language === 'ar';

  // Initialize trip data
  const [trip, setTrip] = useState(() => {
    if (tripData) {
      const demoData = generateDemoTripData(tripData.id);
      // Merge tripData with demo data, preserving students if provided
      const mergedTrip = {
        ...demoData,
        ...tripData,
        students: tripData.students || demoData.students,
        schoolLocation: tripData.schoolLocation || tripData.destinationLocation || demoData.schoolLocation,
      };
      // Regenerate route coordinates based on merged data
      mergedTrip.routeCoordinates = [
        ...mergedTrip.students.map(s => s.pickupLocation),
        mergedTrip.schoolLocation,
      ];
      return mergedTrip;
    }
    return generateDemoTripData();
  });

  const [tripStatus, setTripStatus] = useState(trip.status);
  const [busLocation, setBusLocation] = useState(trip.busLocation);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(trip.estimatedArrivalMinutes * 60);
  const [startTime, setStartTime] = useState(null);

  const mapRef = useRef(null);
  const animationIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const panelAnimation = useRef(new Animated.Value(0)).current;
  const liveIndicatorAnimation = useRef(new Animated.Value(1)).current;

  // Animate panel expansion
  useEffect(() => {
    Animated.spring(panelAnimation, {
      toValue: panelExpanded ? 1 : 0,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
  }, [panelExpanded]);

  // Animate LIVE indicator
  useEffect(() => {
    if (tripStatus === TRIP_STATUS.LIVE) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(liveIndicatorAnimation, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(liveIndicatorAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [tripStatus]);

  // Countdown timer
  useEffect(() => {
    if (tripStatus === TRIP_STATUS.LIVE && startTime) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 0) {
            setTripStatus(TRIP_STATUS.COMPLETED);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [tripStatus, startTime]);

  // Bus movement animation (demo mode)
  useEffect(() => {
    if (tripStatus === TRIP_STATUS.LIVE && isDemo) {
      const route = trip.routeCoordinates;
      let currentIndex = 0;

      animationIntervalRef.current = setInterval(() => {
        if (currentIndex < route.length - 1) {
          currentIndex++;
          const newLocation = route[currentIndex];
          setBusLocation(newLocation);

          // Update map camera to follow bus
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: newLocation.latitude,
              longitude: newLocation.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }, 1000);
          }

          // Mark student as picked up when bus reaches their location
          if (currentIndex < trip.students.length) {
            setTrip((prev) => ({
              ...prev,
              students: prev.students.map((student, idx) =>
                idx === currentIndex - 1
                  ? { ...student, status: 'picked' }
                  : student
              ),
            }));
          }
        } else {
          // Reached destination
          setTripStatus(TRIP_STATUS.COMPLETED);
        }
      }, 3000); // Move every 3 seconds
    }

    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    };
  }, [tripStatus, isDemo]);

  // Fit map to show all markers
  useEffect(() => {
    if (mapRef.current && trip.routeCoordinates.length > 0) {
      const coordinates = [
        ...trip.students.map(s => s.pickupLocation),
        trip.schoolLocation,
        busLocation,
      ];

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
        animated: true,
      });
    }
  }, []);

  const handleGoPress = () => {
    if (tripStatus === TRIP_STATUS.SCHEDULED) {
      setTripStatus(TRIP_STATUS.LIVE);
      setStartTime(new Date());
      setCountdownSeconds(trip.estimatedArrivalMinutes * 60);

      Alert.alert(
        t.tripStarted,
        t.tripStartedMessage,
        [{ text: t.ok }]
      );
    }
  };

  const handleStudentCountPress = () => {
    setShowStudentModal(true);
  };

  const handleCallStudent = (phone) => {
    Linking.openURL(`tel:${phone}`).catch((err) => {
      Alert.alert('Error', `Could not open phone: ${phone}`);
    });
  };

  const remainingStudents = trip.students.filter(s => s.status === 'pending').length;
  const pickedStudents = trip.students.filter(s => s.status === 'picked').length;

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const panelHeight = panelAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [180, 320],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Full-Screen Map */}
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={{
          latitude: busLocation.latitude,
          longitude: busLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {/* Route Polyline */}
        <Polyline
          coordinates={trip.routeCoordinates}
          strokeColor="#3185FC"
          strokeWidth={4}
          lineDashPattern={tripStatus === TRIP_STATUS.SCHEDULED ? [5, 5] : []}
        />

        {/* Student Pickup Points */}
        {trip.students.map((student, index) => (
          <Marker
            key={student.id}
            coordinate={student.pickupLocation}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[
              styles.studentMarker,
              student.status === 'picked' && styles.studentMarkerPicked,
            ]}>
              <View style={[
                styles.studentMarkerInner,
                student.status === 'picked' && styles.studentMarkerInnerPicked,
              ]}>
                <Text style={[
                  styles.studentMarkerNumber,
                  student.status === 'picked' && styles.studentMarkerNumberPicked,
                ]}>
                  {student.order}
                </Text>
              </View>
            </View>
          </Marker>
        ))}

        {/* School Destination */}
        <Marker
          coordinate={trip.schoolLocation}
          anchor={{ x: 0.5, y: 1 }}
        >
          <View style={styles.schoolMarker}>
            <MaterialIcons name="school" size={32} color="#10B981" />
            <View style={styles.schoolMarkerBadge}>
              <Text style={styles.schoolMarkerText}>
                {language === 'ar' ? 'المدرسة' : 'School'}
              </Text>
            </View>
          </View>
        </Marker>

        {/* Bus Location */}
        <Marker
          coordinate={busLocation}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <Animated.View
            style={[
              styles.busMarker,
              {
                transform: [{ scale: liveIndicatorAnimation }],
              },
            ]}
          >
            <MaterialIcons name="directions-bus" size={40} color="#FFFFFF" />
            <View style={styles.busMarkerShadow} />
          </Animated.View>
        </Marker>
      </MapView>

      {/* Top Bar - Back Button & Status */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {tripStatus === TRIP_STATUS.LIVE && (
          <Animated.View
            style={[
              styles.liveIndicator,
              {
                transform: [{ scale: liveIndicatorAnimation }],
              },
            ]}
          >
            <View style={styles.liveIndicatorDot} />
            <Text style={styles.liveIndicatorText}>{t.live}</Text>
          </Animated.View>
        )}
      </SafeAreaView>

      {/* Bottom Floating Panel */}
      <Animated.View
        style={[
          styles.bottomPanel,
          { height: panelHeight },
        ]}
      >
        <TouchableOpacity
          style={styles.panelHandle}
          onPress={() => setPanelExpanded(!panelExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.panelHandleBar} />
        </TouchableOpacity>

        <View style={styles.panelContent}>
          {/* Status Badge */}
          <View style={[
            styles.statusBadge,
            tripStatus === TRIP_STATUS.LIVE && styles.statusBadgeLive,
            tripStatus === TRIP_STATUS.COMPLETED && styles.statusBadgeCompleted,
          ]}>
            <Text style={[
              styles.statusText,
              tripStatus === TRIP_STATUS.LIVE && styles.statusTextLive,
            ]}>
              {tripStatus === TRIP_STATUS.SCHEDULED && t.scheduled}
              {tripStatus === TRIP_STATUS.LIVE && t.live}
              {tripStatus === TRIP_STATUS.COMPLETED && t.completed}
            </Text>
          </View>

          {/* Trip Info */}
          <View style={styles.tripInfoRow}>
            <MaterialIcons name="schedule" size={20} color="#666666" />
            <Text style={[styles.tripInfoLabel, isRTL && styles.rtl]}>
              {t.pickupTime}:
            </Text>
            <Text style={[styles.tripInfoValue, isRTL && styles.rtl]}>
              {trip.pickupTime}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.tripInfoRow}
            onPress={handleStudentCountPress}
            activeOpacity={0.7}
          >
            <MaterialIcons name="people" size={20} color="#666666" />
            <Text style={[styles.tripInfoLabel, isRTL && styles.rtl]}>
              {t.remainingStudents}:
            </Text>
            <Text style={[styles.tripInfoValue, styles.tripInfoValueClickable, isRTL && styles.rtl]}>
              {remainingStudents} / {trip.students.length}
            </Text>
          </TouchableOpacity>

          {tripStatus === TRIP_STATUS.LIVE && (
            <View style={styles.tripInfoRow}>
              <MaterialIcons name="timer" size={20} color="#666666" />
              <Text style={[styles.tripInfoLabel, isRTL && styles.rtl]}>
                {t.estimatedArrival}:
              </Text>
              <Text style={[styles.tripInfoValue, isRTL && styles.rtl]}>
                {formatCountdown(countdownSeconds)} {t.minutes}
              </Text>
            </View>
          )}

          {panelExpanded && (
            <View style={styles.expandedContent}>
              <Text style={[styles.expandedTitle, isRTL && styles.rtl]}>
                {pickedStudents} {pickedStudents === 1 ? t.student : t.students} {language === 'ar' ? 'تم استلامهم' : 'picked up'}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* GO Button */}
      {tripStatus === TRIP_STATUS.SCHEDULED && (
        <TouchableOpacity
          style={styles.goButton}
          onPress={handleGoPress}
          activeOpacity={0.8}
        >
          <Text style={styles.goButtonText}>{t.go}</Text>
        </TouchableOpacity>
      )}

      {/* Student Pickup Modal */}
      <StudentPickupModal
        visible={showStudentModal}
        onClose={() => setShowStudentModal(false)}
        students={trip.students}
        language={language}
        onCall={handleCallStudent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  liveIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 10,
  },
  panelHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  panelHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
  },
  panelContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusBadgeLive: {
    backgroundColor: '#FEF2F2',
  },
  statusBadgeCompleted: {
    backgroundColor: '#ECFDF5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTextLive: {
    color: '#EF4444',
  },
  tripInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  tripInfoLabel: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  tripInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  tripInfoValueClickable: {
    color: '#3185FC',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  expandedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  goButton: {
    position: 'absolute',
    bottom: 220,
    right: 24,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3185FC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3185FC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 20,
  },
  goButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  studentMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3185FC',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  studentMarkerPicked: {
    backgroundColor: '#10B981',
  },
  studentMarkerInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentMarkerInnerPicked: {
    backgroundColor: '#ECFDF5',
  },
  studentMarkerNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3185FC',
  },
  studentMarkerNumberPicked: {
    color: '#10B981',
  },
  schoolMarker: {
    alignItems: 'center',
  },
  schoolMarkerBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  schoolMarkerText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  busMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3185FC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  busMarkerShadow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(49, 133, 252, 0.2)',
    zIndex: -1,
  },
  rtl: {
    textAlign: 'right',
  },
});

export default TripLiveViewScreen;

