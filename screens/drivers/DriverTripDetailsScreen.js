import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Animated } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Dimensions,
  Linking,
  Vibration,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { UbuntuFonts } from '../../src/utils/fonts';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const translations = {
  en: {
    tripDetails: 'Trip Details',
    driverInfo: 'Driver Information',
    driverName: 'Driver Name',
    driverPhone: 'Phone Number',
    vehicleInfo: 'Vehicle Information',
    vehicleNumber: 'Vehicle Number',
    vehicleType: 'Vehicle Type',
    studentsList: 'Students List',
    student: 'Student',
    pickupPoint: 'Pickup Point',
    phone: 'Phone',
    call: 'Call',
    startTime: 'Start Time',
    estimatedDuration: 'Estimated Duration',
    totalDistance: 'Total Distance',
    destination: 'Destination',
    totalStudents: 'Total Students',
    route: 'Route',
    back: 'Back',
    startTrip: 'Start Trip',
    go: 'Go',
    viewOnMap: 'View on Map',
    minutes: 'min',
    km: 'km',
    order: 'Order',
    confirmStartTrip: 'Start Trip?',
    confirmStartTripMessage: 'Are you ready to start this trip?',
    confirm: 'Yes, Start',
    cancel: 'Cancel',
  },
  ar: {
    tripDetails: 'تفاصيل الرحلة',
    driverInfo: 'معلومات السائق',
    driverName: 'اسم السائق',
    driverPhone: 'رقم الهاتف',
    vehicleInfo: 'معلومات المركبة',
    vehicleNumber: 'رقم المركبة',
    vehicleType: 'نوع المركبة',
    studentsList: 'قائمة الطلاب',
    student: 'طالب',
    pickupPoint: 'نقطة الاستلام',
    phone: 'هاتف',
    call: 'اتصال',
    startTime: 'وقت البدء',
    estimatedDuration: 'المدة المتوقعة',
    totalDistance: 'المسافة الإجمالية',
    destination: 'الوجهة',
    totalStudents: 'إجمالي الطلاب',
    route: 'المسار',
    back: 'رجوع',
    startTrip: 'بدء الرحلة',
    go: 'ابدأ',
    viewOnMap: 'عرض على الخريطة',
    minutes: 'دقيقة',
    km: 'كم',
    order: 'الترتيب',
    confirmStartTrip: 'بدء الرحلة؟',
    confirmStartTripMessage: 'هل أنت مستعد لبدء هذه الرحلة؟',
    confirm: 'نعم، ابدأ',
    cancel: 'إلغاء',
  },
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const DriverTripDetailsScreen = ({
  tripData,
  driverData,
  language = 'en',
  onBack,
  onStartTrip,
}) => {
  const mapRef = useRef(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showMapInfo, setShowMapInfo] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const t = translations[language];
  const isRTL = language === 'ar';

  // Extract trip data
  const students = tripData?.students || [];
  const fadeAnimations = useRef(students.map(() => new Animated.Value(0))).current;

  // Staggered fade-in animation for student cards
  useEffect(() => {
    const animations = fadeAnimations.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      })
    );
    Animated.stagger(50, animations).start();
  }, []);
  const destination = tripData?.destination || 'Unknown Destination';
  const destinationLocation = tripData?.destinationLocation || {
    latitude: 33.5800,
    longitude: -7.5920,
  };
  const parkingLocation = tripData?.parkingLocation || tripData?.pickupLocation || null;
  const timeSlot = tripData?.timeSlot || '7:00 - 8:30';
  const startTime = timeSlot.split(' - ')[0] || '7:00';

  // Calculate total distance
  const totalDistance = useMemo(() => {
    if (!students || students.length === 0) return 0;
    
    let distance = 0;
    const sortedStudents = [...students];

    // Distance from parking to first pickup
    if (parkingLocation && sortedStudents[0]?.homeLocation) {
      distance += calculateDistance(
        parkingLocation.latitude,
        parkingLocation.longitude,
        sortedStudents[0].homeLocation.latitude,
        sortedStudents[0].homeLocation.longitude
      );
    }

    // Add distances between pickup points
    for (let i = 0; i < sortedStudents.length - 1; i++) {
      const loc1 = sortedStudents[i]?.homeLocation;
      const loc2 = sortedStudents[i + 1]?.homeLocation;
      if (loc1 && loc2) {
        distance += calculateDistance(
          loc1.latitude,
          loc1.longitude,
          loc2.latitude,
          loc2.longitude
        );
      }
    }

    // Distance from last pickup to destination
    const lastStudent = sortedStudents[sortedStudents.length - 1];
    if (lastStudent?.homeLocation) {
      distance += calculateDistance(
        lastStudent.homeLocation.latitude,
        lastStudent.homeLocation.longitude,
        destinationLocation.latitude,
        destinationLocation.longitude
      );
    }

    return Math.round(distance * 10) / 10; // Round to 1 decimal
  }, [students, destinationLocation]);

  // Estimated duration (assuming average speed of 40 km/h)
  const estimatedDuration = Math.round((totalDistance / 40) * 60); // in minutes

  // Get all coordinates for map
  const allCoordinates = useMemo(() => {
    const coords = [];
    if (parkingLocation) {
      coords.push(parkingLocation);
    }
    if (students && students.length > 0) {
      students.forEach(student => {
        if (student.homeLocation) {
          coords.push(student.homeLocation);
        }
      });
    }
    coords.push(destinationLocation);
    return coords;
  }, [students, destinationLocation, parkingLocation]);

  // Fit map to show all locations
  const fitMapToCoordinates = () => {
    if (mapRef.current && allCoordinates.length > 0) {
      mapRef.current.fitToCoordinates(allCoordinates, {
        edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
        animated: true,
      });
    }
  };

  const triggerHapticFeedback = () => {
    if (Platform.OS === 'ios') {
      Vibration.vibrate(50);
    } else {
      Vibration.vibrate(50);
    }
  };

  const handleCall = (phone) => {
    triggerHapticFeedback();
    Linking.openURL(`tel:${phone}`);
  };

  const handleViewOnMap = (location) => {
    triggerHapticFeedback();
    if (location && location.latitude && location.longitude) {
      const url = Platform.select({
        ios: `maps://app?daddr=${location.latitude},${location.longitude}`,
        android: `geo:${location.latitude},${location.longitude}?q=${location.latitude},${location.longitude}`,
      });
      if (url) {
        Linking.openURL(url).catch(err => console.error('Error opening map:', err));
      }
    }
  };

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
          <MaterialIcons 
            name={isRTL ? "arrow-forward" : "arrow-back"} 
            size={24} 
            color="#1A1A1A" 
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && styles.rtl]}>
          {t.tripDetails}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {/* Map View with Info Overlay */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            style={styles.map}
            initialRegion={{
              latitude: destinationLocation.latitude,
              longitude: destinationLocation.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            onMapReady={fitMapToCoordinates}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={false}
            toolbarEnabled={false}
          >
            {/* Parking / bus depot */}
            {parkingLocation && (
              <Marker
                coordinate={parkingLocation}
                title={language === 'ar' ? 'موقف الحافلة' : 'Bus parking'}
                pinColor="#6366F1"
              />
            )}

            {/* Student pickup points */}
            {students.map((student, index) => {
              if (!student.homeLocation) return null;
              return (
                <Marker
                  key={student.id || index}
                  coordinate={student.homeLocation}
                  title={student.name}
                >
                  <View style={styles.pickupMarker}>
                    <Text style={styles.markerNumber}>{index + 1}</Text>
                  </View>
                </Marker>
              );
            })}
            
            {/* Destination marker */}
            <Marker
              coordinate={destinationLocation}
              title={destination}
              pinColor="#10B981"
            />
            
            {/* Route polyline */}
            {students.length > 0 && (
              <Polyline
                coordinates={allCoordinates}
                strokeColor="#3185FC"
                strokeWidth={3}
              />
            )}
          </MapView>

          {/* Info Overlay on Right Side - Toggleable */}
          {showMapInfo && (
            <View style={[styles.mapInfoOverlay, isRTL && styles.mapInfoOverlayRTL]}>
              <TouchableOpacity
                style={[styles.closeInfoButton, isRTL && styles.closeInfoButtonRTL]}
                onPress={() => setShowMapInfo(false)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={18} color="#666666" />
              </TouchableOpacity>

              <View style={styles.tripInfoGrid}>
                <View style={styles.tripInfoRow}>
                  <View style={styles.tripInfoItem}>
                    <MaterialIcons name="schedule" size={20} color="#3185FC" />
                    <View style={styles.tripInfoContent}>
                      <Text style={[styles.tripInfoLabel, isRTL && styles.rtl]}>
                        {t.startTime}
                      </Text>
                      <Text style={[styles.tripInfoValue, isRTL && styles.rtl]}>
                        {startTime}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tripInfoItem}>
                    <MaterialIcons name="people" size={20} color="#10B981" />
                    <View style={styles.tripInfoContent}>
                      <Text style={[styles.tripInfoLabel, isRTL && styles.rtl]}>
                        {t.totalStudents}
                      </Text>
                      <Text style={[styles.tripInfoValue, isRTL && styles.rtl]}>
                        {students.length}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.tripInfoRow}>
                  <View style={styles.tripInfoItem}>
                    <MaterialIcons name="route" size={20} color="#F59E0B" />
                    <View style={styles.tripInfoContent}>
                      <Text style={[styles.tripInfoLabel, isRTL && styles.rtl]}>
                        {t.totalDistance}
                      </Text>
                      <Text style={[styles.tripInfoValue, isRTL && styles.rtl]}>
                        {totalDistance} {t.km}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tripInfoItem}>
                    <MaterialIcons name="timer" size={20} color="#EF4444" />
                    <View style={styles.tripInfoContent}>
                      <Text style={[styles.tripInfoLabel, isRTL && styles.rtl]}>
                        {t.estimatedDuration}
                      </Text>
                      <Text style={[styles.tripInfoValue, isRTL && styles.rtl]}>
                        {estimatedDuration} {t.minutes}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Toggle Button to Show Info */}
          {!showMapInfo && (
            <TouchableOpacity
              style={[styles.showInfoButton, isRTL && styles.showInfoButtonRTL]}
              onPress={() => setShowMapInfo(true)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="info" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>


        {/* Students List - Scrollable */}
        <View style={styles.section}>
          {/* Sticky Header - Modern Design */}
          <View style={[styles.stickyHeader, isRTL && styles.sectionHeaderRTL]}>
            <View style={styles.headerLeftSection}>
              <View style={styles.iconContainer}>
                <MaterialIcons name="people" size={22} color="#FFFFFF" />
              </View>
              <View>
                <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>
                  {t.studentsList}
                </Text>
                <Text style={[styles.nextStudentLabel, isRTL && styles.rtl]}>
                  Next student pickup
                </Text>
              </View>
            </View>
            <View style={styles.studentCountBadge}>
              <Text style={styles.studentCountText}>{students.length}</Text>
              <Text style={styles.studentCountLabel}>Students</Text>
            </View>
          </View>

          <ScrollView
            style={styles.studentsScrollView}
            contentContainerStyle={styles.studentsScrollContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {students.map((student, index) => (
              <Animated.View
                key={student.id || index}
                style={[styles.studentCard, { opacity: fadeAnimations[index] || 1 }]}
              >
                <TouchableOpacity
                  style={styles.studentCardTouchable}
                  activeOpacity={0.95}
                  onPress={() => {}}
                >
                  <View style={styles.studentCardContent}>
                  <View style={styles.studentOrderContainer}>
                    <View style={styles.studentOrder}>
                      <Text style={styles.studentOrderText}>{index + 1}</Text>
                    </View>
                    {index < students.length - 1 && (
                      <View style={styles.orderConnector} />
                    )}
                  </View>
                  
                  <View style={styles.studentMainContent}>
                    <View style={styles.studentHeader}>
                      <View style={styles.studentInfo}>
                        <Text style={[styles.studentName, isRTL && styles.rtl]}>
                          {student.name || `Student ${index + 1}`}
                        </Text>
                        {student.phone && (
                          <View style={[styles.studentPhoneRow, isRTL && styles.studentPhoneRowRTL]}>
                            <MaterialIcons name="phone" size={14} color="#666666" />
                            <Text style={[styles.studentPhone, isRTL && styles.rtl]}>
                              {student.phone}
                            </Text>
                          </View>
                        )}
                      </View>
                      {student.phone && (
                        <TouchableOpacity
                          style={styles.callButton}
                          onPress={() => handleCall(student.phone)}
                          activeOpacity={0.8}
                        >
                          <MaterialIcons name="phone" size={20} color="#FFFFFF" />
                          <Text style={styles.callButtonText}>{t.call}</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                  </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Go Button */}
      {onStartTrip && (
        <View style={[styles.buttonContainer, isRTL && styles.buttonContainerRTL]}>
          <TouchableOpacity
            style={styles.goButton}
            onPress={() => {
              triggerHapticFeedback();
              setShowConfirmModal(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.goButtonText, isRTL && styles.rtl]}>
              {t.go}
            </Text>
            <MaterialIcons
              name={isRTL ? "arrow-back" : "arrow-forward"}
              size={20}
              color="#FFFFFF"
              style={styles.goButtonIcon}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, isRTL && styles.modalContainerRTL]}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="directions-bus" size={48} color="#3185FC" />
            </View>
            
            <Text style={[styles.modalTitle, isRTL && styles.rtl]}>
              {t.confirmStartTrip}
            </Text>
            
            <Text style={[styles.modalMessage, isRTL && styles.rtl]}>
              {t.confirmStartTripMessage}
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  triggerHapticFeedback();
                  setShowConfirmModal(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelButtonText, isRTL && styles.rtl]}>
                  {t.cancel}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => {
                  triggerHapticFeedback();
                  setShowConfirmModal(false);
                  onStartTrip(tripData);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.confirmButtonText, isRTL && styles.rtl]}>
                  {t.confirm}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
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
    fontWeight: 'bold',
    color: '#1A1A1A',
    fontFamily: UbuntuFonts.bold,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  mapContainer: {
    height: SCREEN_HEIGHT * 0.5,
    width: '100%',
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  pickupMarker: {
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
    elevation: 5,
  },
  markerNumber: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: UbuntuFonts.bold,
  },
  mapInfoOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: 16,
    padding: 14,
    paddingTop: 10,
    width: SCREEN_WIDTH * 0.45,
    maxWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  mapInfoOverlayRTL: {
    right: undefined,
    left: 12,
  },
  closeInfoButton: {
    alignSelf: 'flex-end',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(243, 244, 246, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    marginTop: -4,
    marginRight: -4,
  },
  closeInfoButtonRTL: {
    alignSelf: 'flex-start',
    marginRight: 0,
    marginLeft: -4,
  },
  showInfoButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3185FC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3185FC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  showInfoButtonRTL: {
    right: undefined,
    left: 12,
  },
  tripInfoGrid: {
    gap: 10,
  },
  tripInfoRow: {
    flexDirection: 'column',
    gap: 10,
  },
  tripInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
  },
  tripInfoContent: {
    flex: 1,
    minWidth: 0,
  },
  tripInfoLabel: {
    fontSize: 9,
    color: '#666666',
    fontFamily: UbuntuFonts.regular,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tripInfoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
    fontFamily: UbuntuFonts.bold,
    flexWrap: 'wrap',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginHorizontal: -16,
    marginTop: 8,
    marginBottom: 20,
  },
  sectionHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  headerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1463ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1463ff',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: UbuntuFonts.bold,
    marginBottom: 2,
  },
  nextStudentLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: UbuntuFonts.regular,
    fontWeight: '500',
  },
  studentCountBadge: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  studentCountText: {
    color: '#1463ff',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: UbuntuFonts.bold,
    lineHeight: 24,
  },
  studentCountLabel: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: UbuntuFonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  studentsScrollView: {
    maxHeight: 500,
  },
  studentsScrollContent: {
    paddingBottom: 8,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666666',
    fontFamily: UbuntuFonts.medium,
  },
  infoValue: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '600',
    flex: 1,
    fontFamily: UbuntuFonts.semiBold,
  },
  destinationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: UbuntuFonts.semiBold,
  },
  studentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  studentCardTouchable: {
    flex: 1,
  },
  studentCardContent: {
    flexDirection: 'row',
    padding: 18,
    gap: 16,
  },
  studentOrderContainer: {
    alignItems: 'center',
    paddingTop: 4,
  },
  studentOrder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1463ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1463ff',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  studentOrderText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: UbuntuFonts.bold,
  },
  orderConnector: {
    width: 3,
    flex: 1,
    backgroundColor: '#E0E7FF',
    marginTop: 12,
    minHeight: 20,
    borderRadius: 2,
  },
  studentMainContent: {
    flex: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 14,
    marginHorizontal: -16,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  studentInfo: {
    flex: 1,
    gap: 8,
  },
  studentName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    fontFamily: UbuntuFonts.bold,
    lineHeight: 22,
  },
  studentPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  studentPhoneRowRTL: {
    flexDirection: 'row-reverse',
  },
  studentPhone: {
    fontSize: 13,
    color: '#4B5563',
    fontFamily: UbuntuFonts.medium,
    fontWeight: '600',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  callButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: UbuntuFonts.bold,
  },
  pickupInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pickupLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  locationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupLocationInfo: {
    flex: 1,
  },
  pickupLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontFamily: UbuntuFonts.medium,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  pickupValue: {
    fontSize: 13,
    color: '#374151',
    fontFamily: UbuntuFonts.regular,
    lineHeight: 18,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#DBEAFE',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  mapButtonText: {
    fontSize: 13,
    color: '#1D4ED8',
    fontFamily: UbuntuFonts.semiBold,
    fontWeight: '700',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
    alignItems: 'flex-end',
  },
  buttonContainerRTL: {
    alignItems: 'flex-start',
  },
  goButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 32,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 120,
  },
  goButtonIcon: {
    marginLeft: 4,
  },
  goButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: UbuntuFonts.bold,
  },
  rtl: {
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  modalContainerRTL: {
    // RTL handled by text alignment
  },
  modalHeader: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: UbuntuFonts.bold,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: UbuntuFonts.regular,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: UbuntuFonts.semiBold,
  },
  confirmButton: {
    backgroundColor: '#3185FC',
    shadowColor: '#3185FC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: UbuntuFonts.bold,
  },
});

export default DriverTripDetailsScreen;

