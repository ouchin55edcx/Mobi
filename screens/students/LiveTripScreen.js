import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Linking,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { UbuntuFonts } from '../../src/utils/fonts';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.6;
const BOTTOM_SHEET_HEIGHT = SCREEN_HEIGHT * 0.4;

const translations = {
  en: {
    leaveHome: 'Leave Home',
    pickupPoint: 'Pickup Point',
    arriveUniversity: 'Arrive at University',
    schoolBus: 'School Bus',
    call: 'Call',
    message: 'Message',
    minutes: 'min',
    estimatedTime: 'Estimated',
  },
  ar: {
    leaveHome: 'مغادرة المنزل',
    pickupPoint: 'نقطة الركوب',
    arriveUniversity: 'الوصول إلى الجامعة',
    schoolBus: 'حافلة المدرسة',
    call: 'اتصل',
    message: 'رسالة',
    minutes: 'دقيقة',
    estimatedTime: 'متوقع',
  },
};

const LiveTripScreen = ({
  tripData,
  language = 'ar',
  onBack,
  driverName = 'CAPTAIN AHMAD',
  driverPhone = '+212612345678',
}) => {
  const mapRef = useRef(null);
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
  const leaveHomeTime = tripData?.leaveHomeTime || new Date(Date.now() - 20 * 60 * 1000);
  const reachPickupTime = tripData?.reachPickupTime || new Date(Date.now() + 10 * 60 * 1000);
  const arriveDestinationTime = tripData?.arriveDestinationTime || new Date(Date.now() + 50 * 60 * 1000);

  // Calculate remaining time (10 minutes)
  const [remainingMinutes, setRemainingMinutes] = useState(10);

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
        edgePadding: { top: 50, right: 50, bottom: 300, left: 50 },
        animated: true,
      });
    }
  }, []);

  const handleCall = () => {
    const url = `tel:${driverPhone}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert(
            language === 'ar' ? 'خطأ' : 'Error',
            language === 'ar' ? 'لا يمكن فتح تطبيق الهاتف' : 'Cannot open phone app'
          );
        }
      })
      .catch((err) => console.error('Error opening phone:', err));
  };

  const handleMessage = () => {
    const url = `sms:${driverPhone}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert(
            language === 'ar' ? 'خطأ' : 'Error',
            language === 'ar' ? 'لا يمكن فتح تطبيق الرسائل' : 'Cannot open messaging app'
          );
        }
      })
      .catch((err) => console.error('Error opening SMS:', err));
  };

  const timelineSteps = [
    {
      id: 'home',
      icon: 'home',
      title: t.leaveHome,
      time: formatTime(leaveHomeTime),
      completed: true,
    },
    {
      id: 'pickup',
      icon: 'directions-bus',
      title: t.pickupPoint,
      time: formatTime(reachPickupTime),
      estimatedTime: `${remainingMinutes} ${t.minutes}`,
      completed: false,
      active: true,
    },
    {
      id: 'destination',
      icon: 'school',
      title: t.arriveUniversity,
      time: formatTime(arriveDestinationTime),
      completed: false,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      
      {/* Top Map Section (60% height) */}
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
          scrollEnabled={true}
          zoomEnabled={true}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          {/* Route Polyline */}
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#3185FC"
            strokeWidth={5}
          />

          {/* Home Marker */}
          <Marker coordinate={homeLocation}>
            <View style={styles.markerContainer}>
              <MaterialIcons name="home" size={28} color="#FFFFFF" />
            </View>
          </Marker>

          {/* Pickup Marker */}
          <Marker coordinate={pickupLocation}>
            <View style={styles.pickupMarkerContainer}>
              <View style={styles.pickupMarkerPulse} />
              <View style={styles.pickupMarkerInner}>
                <MaterialIcons name="directions-bus" size={28} color="#FFFFFF" />
              </View>
            </View>
          </Marker>

          {/* Destination Marker */}
          <Marker coordinate={destinationLocation}>
            <View style={styles.markerContainer}>
              <MaterialIcons name="school" size={28} color="#FFFFFF" />
            </View>
          </Marker>
        </MapView>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <View style={styles.backButtonInner}>
            <MaterialIcons
              name={isRTL ? "arrow-forward" : "arrow-back"}
              size={24}
              color="#1A1A1A"
            />
          </View>
        </TouchableOpacity>

        {/* Compass/Location Button */}
        <TouchableOpacity style={styles.compassButton} activeOpacity={0.7}>
          <MaterialIcons name="explore" size={24} color="#3185FC" />
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Card (40% height) */}
      <View style={styles.bottomSheet}>
        {/* Drag Handle */}
        <View style={styles.dragHandle} />

        <ScrollView
          style={styles.bottomSheetScroll}
          contentContainerStyle={styles.bottomSheetContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Timeline Section */}
          <View style={styles.timelineContainer}>
            {timelineSteps.map((step, index) => (
              <View key={step.id} style={styles.timelineStep}>
                {/* Timeline Line & Dot */}
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.timelineDot,
                    step.completed && styles.timelineDotCompleted,
                    step.active && styles.timelineDotActive,
                  ]}>
                    <MaterialIcons
                      name={step.icon}
                      size={16}
                      color={step.completed || step.active ? "#FFFFFF" : "#9CA3AF"}
                    />
                  </View>
                  {index < timelineSteps.length - 1 && (
                    <View style={[
                      styles.timelineLine,
                      step.completed && styles.timelineLineCompleted,
                    ]} />
                  )}
                </View>

                {/* Timeline Content */}
                <View style={styles.timelineContent}>
                  <View style={styles.timelineTextContainer}>
                    <Text style={[
                      styles.timelineTitle,
                      isRTL && styles.rtl,
                      step.completed && styles.timelineTitleCompleted,
                    ]}>
                      {step.title}
                    </Text>
                    {step.estimatedTime && (
                      <Text style={[styles.estimatedTime, isRTL && styles.rtl]}>
                        {step.estimatedTime}
                      </Text>
                    )}
                  </View>
                  <View style={styles.timeBadge}>
                    <Text style={styles.timeBadgeText}>{step.time}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Driver & Bus Info Card */}
          <View style={styles.driverInfoCard}>
            <View style={styles.driverInfoLeft}>
              <View style={styles.driverAvatar}>
                <MaterialIcons name="person" size={32} color="#3185FC" />
              </View>
              <View style={styles.driverInfoText}>
                <Text style={styles.driverName}>{driverName}</Text>
                <View style={styles.busLabelContainer}>
                  <MaterialIcons name="directions-bus" size={16} color="#666666" />
                  <Text style={styles.busLabel}>{t.schoolBus}</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons - Fixed at bottom */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.callButton]}
            onPress={handleCall}
            activeOpacity={0.8}
          >
            <MaterialIcons name="phone" size={24} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>{t.call}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.messageButton]}
            onPress={handleMessage}
            activeOpacity={0.8}
          >
            <MaterialIcons name="message" size={24} color="#3185FC" />
            <Text style={[styles.actionButtonText, styles.messageButtonText]}>
              {t.message}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapContainer: {
    height: MAP_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  map: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 16,
    left: 16,
    zIndex: 10,
  },
  backButtonInner: {
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
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  compassButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 16,
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
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pickupMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pickupMarkerPulse: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(49, 133, 252, 0.2)',
    borderWidth: 2,
    borderColor: '#3185FC',
  },
  pickupMarkerInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3185FC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomSheet: {
    height: BOTTOM_SHEET_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  bottomSheetScroll: {
    flex: 1,
  },
  bottomSheetContent: {
    paddingBottom: 16,
  },
  timelineContainer: {
    marginBottom: 16,
  },
  timelineStep: {
    flexDirection: 'row',
    marginBottom: 16,
    minHeight: 60,
  },
  timelineLeft: {
    width: 40,
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  timelineDotCompleted: {
    backgroundColor: '#3185FC',
    borderColor: '#3185FC',
  },
  timelineDotActive: {
    backgroundColor: '#3185FC',
    borderColor: '#3185FC',
    shadowColor: '#3185FC',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  timelineLine: {
    width: 2,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
  },
  timelineLineCompleted: {
    backgroundColor: '#3185FC',
  },
  timelineContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineTextContainer: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: UbuntuFonts.semiBold,
    marginBottom: 4,
  },
  timelineTitleCompleted: {
    color: '#666666',
  },
  estimatedTime: {
    fontSize: 14,
    color: '#3185FC',
    fontFamily: UbuntuFonts.medium,
    marginTop: 2,
  },
  timeBadge: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  timeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3185FC',
    fontFamily: UbuntuFonts.semiBold,
  },
  driverInfoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  driverInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverInfoText: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    fontFamily: UbuntuFonts.bold,
    marginBottom: 4,
  },
  busLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  busLabel: {
    fontSize: 14,
    color: '#666666',
    fontFamily: UbuntuFonts.regular,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 0,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  callButton: {
    backgroundColor: '#3185FC',
    shadowColor: '#3185FC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  messageButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3185FC',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: UbuntuFonts.semiBold,
  },
  messageButtonText: {
    color: '#3185FC',
  },
  rtl: {
    textAlign: 'right',
  },
});

export default LiveTripScreen;
