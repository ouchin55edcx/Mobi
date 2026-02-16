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
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { UbuntuFonts } from '../../src/utils/fonts';

const translations = {
  en: {
    title: 'Trip Details',
    readyIn: 'Your bus is arriving in',
    km: 'km',
    leaveHome: 'Departure',
    distance: 'Distance',
    captain: 'Captain',
    onlineNow: 'Active',
    call: 'Call',
    message: 'Message',
    startLiveTracking: 'Track Live',
  },
  ar: {
    title: 'تفاصيل الرحلة',
    readyIn: 'حافلتك ستصل خلال',
    km: 'كم',
    leaveHome: 'وقت التحرك',
    distance: 'المسافة',
    captain: 'كابتن',
    onlineNow: 'نشط الآن',
    call: 'اتصال',
    message: 'رسالة',
    startLiveTracking: 'تتبع مباشر',
  },
};

const TripDetailsScreen = ({ tripData, language = 'en', onBack }) => {
  const isRTL = language === 'ar';
  const t = translations[language];
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [showLiveTracking, setShowLiveTracking] = useState(false);

  const [countdown, setCountdown] = useState({ hours: 0, minutes: 12, seconds: 45 });

  const homeLocation = tripData?.homeLocation || { latitude: 33.5731, longitude: -7.5898 };
  const pickupLocation = tripData?.pickupLocation || { latitude: 33.5750, longitude: -7.5900 };
  const destinationLocation = tripData?.destinationLocation || { latitude: 33.5800, longitude: -7.5920 };

  const routeCoordinates = [homeLocation, pickupLocation, destinationLocation];
  const userPathCoordinates = [homeLocation, pickupLocation];

  const leaveHomeTime = new Date();
  const distanceToStation = 1.2;
  const driverName = "Mohammed";
  const driverPhone = "+212600000000";

  const getRegion = () => ({
    latitude: 33.5750,
    longitude: -7.5900,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  const formatTime = (date) => "07:30 AM";

  const handleCall = () => Linking.openURL(`tel:${driverPhone}`);
  const handleMessage = () => Linking.openURL(`sms:${driverPhone}`);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Full Background Map */}
      <View style={styles.mapBackground}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          initialRegion={getRegion()}
          onMapReady={() => setMapReady(true)}
        >
          <Polyline coordinates={routeCoordinates} strokeColor="#3B82F6" strokeWidth={3} />
          <Polyline coordinates={userPathCoordinates} strokeColor="#F59E0B" strokeWidth={3} />

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
      </View>

      {/* Overlay Header */}
      <SafeAreaView style={styles.overlayContainer} edges={['top']}>
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <View style={styles.backButtonContainer}>
              <MaterialIcons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color="#0F172A" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isRTL && styles.rtl]}>{t.title}</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Countdown Card */}
        <View style={[styles.countdownBanner, isRTL && styles.countdownBannerRTL]}>
          <View style={styles.countdownIconBox}>
            <MaterialIcons name="access-time" size={28} color="#3B82F6" />
          </View>
          <View style={styles.countdownInfo}>
            <Text style={[styles.countdownTitle, isRTL && styles.rtl]}>{t.readyIn}</Text>
            <View style={styles.countdownValues}>
              <Text style={styles.countdownNumber}>{countdown.minutes.toString().padStart(2, '0')}</Text>
              <Text style={styles.countdownSeparator}>:</Text>
              <Text style={styles.countdownNumber}>{countdown.seconds.toString().padStart(2, '0')}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Bottom Info Panel */}
      <ScrollView
        style={styles.bottomPanel}
        contentContainerStyle={styles.bottomPanelContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.infoCard, isRTL && styles.infoCardRTL]}>
          <View style={styles.infoCardItem}>
            <MaterialIcons name="home" size={20} color="#3B82F6" />
            <Text style={styles.infoCardLabel}>{t.leaveHome}</Text>
            <Text style={styles.infoCardValue}>{formatTime(leaveHomeTime)}</Text>
          </View>
          <View style={styles.infoCardDivider} />
          <View style={styles.infoCardItem}>
            <MaterialIcons name="straighten" size={20} color="#10B981" />
            <Text style={styles.infoCardLabel}>{t.distance}</Text>
            <Text style={styles.infoCardValue}>{distanceToStation.toFixed(1)} {t.km}</Text>
          </View>
        </View>

        <View style={styles.driverCard}>
          <View style={[styles.driverHeader, isRTL && styles.driverHeaderRTL]}>
            <View style={styles.driverAvatar}>
              <MaterialIcons name="person" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{t.captain} {driverName}</Text>
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>{t.onlineNow}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.contactButtons, isRTL && styles.contactButtonsRTL]}>
            <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
              <MaterialIcons name="phone" size={18} color="#3B82F6" />
              <Text style={styles.contactButtonText}>{t.call}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactButton} onPress={handleMessage}>
              <MaterialIcons name="message" size={18} color="#10B981" />
              <Text style={styles.contactButtonText}>{t.message}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.startTrackingButton} onPress={() => setShowLiveTracking(true)}>
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            style={styles.startTrackingGradient}
          >
            <MaterialIcons name="navigation" size={22} color="#FFFFFF" />
            <Text style={styles.startTrackingText}>{t.startLiveTracking}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mapBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayContainer: {
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    padding: 8,
  },
  backButtonContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: UbuntuFonts.bold,
  },
  headerPlaceholder: {
    width: 44,
  },
  countdownBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  countdownBannerRTL: {
    flexDirection: 'row-reverse',
  },
  countdownIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownInfo: {
    flex: 1,
  },
  countdownTitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  countdownValues: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  countdownSeparator: {
    fontSize: 20,
    fontWeight: '800',
    color: '#CBD5E1',
    marginHorizontal: 4,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: 380,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomPanelContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  infoCardRTL: {
    flexDirection: 'row-reverse',
  },
  infoCardItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  infoCardDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  infoCardLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  driverHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  onlineText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '700',
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButtonsRTL: {
    flexDirection: 'row-reverse',
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  startTrackingButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  startTrackingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  startTrackingText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  homeMarker: { backgroundColor: '#6366F1' },
  pickupMarker: { backgroundColor: '#3B82F6' },
  schoolMarker: { backgroundColor: '#F59E0B' },
  rtl: { textAlign: 'right' },
});

export default TripDetailsScreen;
