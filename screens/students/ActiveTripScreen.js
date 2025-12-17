import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Dimensions,
  Modal,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { UbuntuFonts } from '../../src/utils/fonts';
import LiveTripScreen from './LiveTripScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const translations = {
  en: {
    tripDistance: 'Trip Distance',
    tripDuration: 'Trip Duration',
    time: 'Time',
    go: 'GO',
    confirmStartTrip: 'Start Tracking?',
    confirmStartTripMessage: 'Start tracking your trip now?',
    confirm: 'Yes, Start',
    cancel: 'Cancel',
  },
  ar: {
    tripDistance: 'المسافة الرحلة',
    tripDuration: 'مدة الرحلة',
    time: 'وقت',
    go: 'ابدأ',
    confirmStartTrip: 'بدء التتبع؟',
    confirmStartTripMessage: 'هل تريد بدء تتبع رحلتك الآن؟',
    confirm: 'نعم، ابدأ',
    cancel: 'إلغاء',
  },
};

const ActiveTripScreen = ({
  tripData,
  language = 'ar',
  onBack,
  onGo,
  studentId,
  isDemo = false,
}) => {
  const mapRef = useRef(null);
  const [showLiveTrip, setShowLiveTrip] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const isRTL = language === 'ar';
  const t = translations[language];

  // Extract trip data with defaults
  const homeLocation = tripData?.homeLocation || { latitude: 33.5731, longitude: -7.5898 };
  const pickupLocation = tripData?.pickupLocation || { latitude: 33.5750, longitude: -7.5900 };
  const destinationLocation = tripData?.destinationLocation || { latitude: 33.5800, longitude: -7.5920 };

  // Route coordinates for the polyline
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
  const totalDurationMinutes = tripData?.totalDurationMinutes || 20;
  const totalDistanceKm = tripData?.totalDistanceKm || 20;

  const formatTime = (date) => {
    if (!date) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Fit map to show all markers
  useEffect(() => {
    if (mapRef.current && routeCoordinates.length > 0) {
      const coordinates = routeCoordinates.map(coord => ({
        latitude: coord.latitude,
        longitude: coord.longitude,
      }));

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, []);

  const triggerHapticFeedback = () => {
    if (Platform.OS === 'ios') {
      Vibration.vibrate(50);
    } else {
      Vibration.vibrate(50);
    }
  };

  const handleGo = () => {
    triggerHapticFeedback();
    setShowConfirmModal(true);
  };

  const handleConfirmGo = () => {
    setShowConfirmModal(false);
    setShowLiveTrip(true);
  };

  // Show live trip screen if GO is clicked
  if (showLiveTrip) {
    return (
      <LiveTripScreen
        tripData={tripData}
        language={language}
        onBack={() => setShowLiveTrip(false)}
        driverName="CAPTAIN AHMAD"
        driverPhone="+212612345678"
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
        {/* Map Section */}
        <View style={styles.mapSection}>
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
              coordinates={routeCoordinates}
              strokeColor="#3185FC"
              strokeWidth={4}
            />

            {/* Home Marker */}
            <Marker coordinate={homeLocation}>
              <View style={styles.markerContainer}>
                <MaterialIcons name="home" size={24} color="#3185FC" />
              </View>
            </Marker>

            {/* Pickup/Car Marker */}
            <Marker coordinate={pickupLocation}>
              <View style={styles.markerContainer}>
                <MaterialIcons name="directions-car" size={24} color="#3185FC" />
              </View>
            </Marker>

            {/* Destination Marker (Teardrop) */}
            <Marker coordinate={destinationLocation}>
              <View style={styles.teardropMarker}>
                <View style={styles.teardropPin} />
              </View>
            </Marker>
          </MapView>
          
          {/* Arrow indicator */}
          <TouchableOpacity style={styles.arrowButton} activeOpacity={0.7}>
            <MaterialIcons name="arrow-forward" size={24} color="#3185FC" />
          </TouchableOpacity>
        </View>

        {/* Trip Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, isRTL && styles.rtl]}>
              {t.tripDistance}
            </Text>
            <Text style={styles.summaryValue}>{totalDistanceKm} KM</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, isRTL && styles.rtl]}>
              {t.tripDuration}
            </Text>
            <Text style={styles.summaryValue}>{totalDurationMinutes} MIN</Text>
          </View>
        </View>

        {/* Timeline Section */}
        <View style={styles.timelineContainer}>
          {/* Leave Home - 07:40 */}
          <View style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={styles.timelineTimeOval}>
                <Text style={styles.timelineTimeText}>
                  {formatTime(leaveHomeTime)}
                </Text>
              </View>
              <View style={styles.timelineLine} />
            </View>
            <View style={styles.timelineRight}>
              <View style={styles.timelineIconContainer}>
                <MaterialIcons name="home" size={20} color="#3185FC" />
              </View>
              <Text style={[styles.timelineLabel, isRTL && styles.rtl]}>
                {t.time}
              </Text>
            </View>
          </View>

          {/* Reach Pickup - 07:50 */}
          <View style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={styles.timelineTimeOval}>
                <Text style={styles.timelineTimeText}>
                  {formatTime(reachPickupTime)}
                </Text>
              </View>
              <View style={styles.timelineLine} />
            </View>
            <View style={styles.timelineRight}>
              <View style={styles.timelineIconContainer}>
                <MaterialIcons name="directions-car" size={20} color="#3185FC" />
              </View>
              <Text style={[styles.timelineLabel, isRTL && styles.rtl]}>
                {t.time}
              </Text>
            </View>
          </View>

          {/* Arrive Destination - 08:30 */}
          <View style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={styles.timelineTimeOval}>
                <Text style={styles.timelineTimeText}>
                  {formatTime(arriveDestinationTime)}
                </Text>
              </View>
            </View>
            <View style={styles.timelineRight}>
              <View style={styles.timelineIconContainer}>
                <MaterialIcons name="person" size={20} color="#3185FC" />
              </View>
              <Text style={[styles.timelineLabel, isRTL && styles.rtl]}>
                {t.time}
              </Text>
            </View>
          </View>
        </View>

        {/* GO Button */}
        <TouchableOpacity
          style={styles.goButton}
          onPress={handleGo}
          activeOpacity={0.8}
        >
          <Text style={styles.goButtonText}>{t.go}</Text>
        </TouchableOpacity>
      </ScrollView>

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
              <MaterialIcons name="location-on" size={48} color="#3185FC" />
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
                  handleConfirmGo();
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
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  mapSection: {
    height: 250,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  arrowButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
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
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3185FC',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  teardropMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  teardropPin: {
    width: 24,
    height: 32,
    backgroundColor: '#3185FC',
    borderRadius: 12,
    borderWidth: 3,
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
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    fontFamily: UbuntuFonts.regular,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    fontFamily: UbuntuFonts.bold,
  },
  timelineContainer: {
    marginHorizontal: 20,
    marginBottom: 32,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  timelineLeft: {
    width: 100,
    alignItems: 'center',
    marginRight: 16,
  },
  timelineTimeOval: {
    backgroundColor: '#3185FC',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  timelineTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: UbuntuFonts.semiBold,
  },
  timelineLine: {
    width: 2,
    height: 50,
    backgroundColor: '#E0E0E0',
    marginTop: 4,
  },
  timelineRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timelineIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLabel: {
    fontSize: 16,
    color: '#1A1A1A',
    fontFamily: UbuntuFonts.regular,
  },
  goButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3185FC',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: '#3185FC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  goButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
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

export default ActiveTripScreen;

