/**
 * DriverTripDetailsScreen.js
 * 
 * Minimalist redesign requested by the user.
 * Features:
 *  - Map view in top 50-60% of screen.
 *  - Categorized/simple list of students below the map.
 *  - Prominent "Start Trip" button in the footer.
 */
import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  ScrollView, Dimensions, Linking, Vibration, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { UbuntuFonts } from '../shared/utils/fonts';

const { width: SW, height: SH } = Dimensions.get('window');

const C = {
  primary: '#2196F3',
  success: '#4CAF50',
  white: '#FFFFFF',
  bg: '#F8F9FB',
  text: '#212121',
  subtext: '#757575',
  border: '#EEEEEE',
  card: '#FFFFFF',
};

const T = {
  en: {
    tripDetails: 'Trip Details',
    call: 'Call',
    startTrip: 'Start Trip Now',
    students: 'Students List',
    confirmTitle: 'Start Trip?',
    confirmMsg: 'Are you ready to begin this live trip?',
    yes: 'Yes, Start',
    cancel: 'Cancel',
  },
  ar: {
    tripDetails: 'تفاصيل الرحلة',
    call: 'اتصال',
    startTrip: 'بدء الرحلة الآن',
    students: 'قائمة الطلاب',
    confirmTitle: 'بدء الرحلة؟',
    confirmMsg: 'هل أنت مستعد لبدء هذه الرحلة المباشرة؟',
    yes: 'نعم، ابدأ',
    cancel: 'إلغاء',
  },
};

const DriverTripDetailsScreen = ({
  tripData,
  language = 'en',
  onBack,
  onStartTrip,
}) => {
  const mapRef = useRef(null);
  const t = T[language] || T.en;
  const isRTL = language === 'ar';
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const students = tripData?.students || [];
  const destinationLocation = tripData?.destinationLocation || { latitude: 33.58, longitude: -7.592 };
  const parkingLocation = tripData?.parkingLocation || null;

  const allCoords = useMemo(() => {
    const c = [];
    if (parkingLocation) c.push(parkingLocation);
    students.forEach(s => s.homeLocation && c.push(s.homeLocation));
    c.push(destinationLocation);
    return c;
  }, [students, destinationLocation, parkingLocation]);

  const fitMap = () => {
    if (mapRef.current && allCoords.length > 0) {
      mapRef.current.fitToCoordinates(allCoords, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    }
  };

  const callPhone = (phone) => { Vibration.vibrate(50); Linking.openURL(`tel:${phone}`); };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, isRTL && styles.rowRev]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <MaterialIcons name={isRTL ? 'chevron-right' : 'chevron-left'} size={28} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.tripDetails}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Map Section (60% height) */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          initialRegion={{
            latitude: allCoords[0]?.latitude || 33.58,
            longitude: allCoords[0]?.longitude || -7.592,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onMapReady={fitMap}
          showsUserLocation={false}
          showsCompass={false}
          toolbarEnabled={false}
        >
          {parkingLocation && (
            <Marker coordinate={parkingLocation} title="Start Point" pinColor="#6366F1" />
          )}
          {students.map((s, idx) => s.homeLocation && (
            <Marker key={idx} coordinate={s.homeLocation} title={s.name}>
              <View style={styles.markerCircle}>
                <Text style={styles.markerText}>{idx + 1}</Text>
              </View>
            </Marker>
          ))}
          <Marker coordinate={destinationLocation} title="School" pinColor={C.success} />
          {allCoords.length > 1 && (
            <Polyline coordinates={allCoords} strokeColor={C.primary} strokeWidth={4} />
          )}
        </MapView>
      </View>

      {/* Student List Section */}
      <View style={styles.listSection}>
        <View style={[styles.listHeader, isRTL && styles.rowRev]}>
          <MaterialIcons name="people" size={20} color={C.primary} />
          <Text style={styles.listTitle}>{t.students} ({students.length})</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {students.map((student, idx) => (
            <View key={idx} style={[styles.studentItem, isRTL && styles.rowRev]}>
              <View style={styles.itemOrder}>
                <Text style={styles.itemOrderText}>{idx + 1}</Text>
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, isRTL && styles.rtl]} numberOfLines={1}>
                  {student.name || `Student ${idx + 1}`}
                </Text>
                <Text style={[styles.itemSub, isRTL && styles.rtl]} numberOfLines={1}>
                  {student.homeAddress || 'Pickup Point'}
                </Text>
              </View>
              {student.phone && (
                <TouchableOpacity style={styles.callBtn} onPress={() => callPhone(student.phone)}>
                  <MaterialIcons name="phone" size={20} color={C.white} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Footer Start Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.startBtn}
          activeOpacity={0.8}
          onPress={() => { Vibration.vibrate(50); setShowConfirmModal(true); }}
        >
          <MaterialIcons name="play-circle-outline" size={26} color={C.white} />
          <Text style={styles.startBtnText}>{t.startTrip}</Text>
        </TouchableOpacity>
      </View>

      {/* Confirm Modal */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialIcons name="directions-bus" size={50} color={C.primary} style={{ marginBottom: 15 }} />
            <Text style={styles.modalTitle}>{t.confirmTitle}</Text>
            <Text style={styles.modalMsg}>{t.confirmMsg}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowConfirmModal(false)}>
                <Text style={styles.modalCancelText}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={() => {
                  setShowConfirmModal(false);
                  onStartTrip && onStartTrip(tripData);
                }}
              >
                <Text style={styles.modalConfirmText}>{t.yes}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  rowRev: { flexDirection: 'row-reverse' },
  rtl: { textAlign: 'right' },

  header: {
    height: 60, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16,
    backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: UbuntuFonts.bold, color: C.text },

  mapContainer: { height: SH * 0.55, width: '100%' },
  map: { flex: 1 },
  markerCircle: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: C.primary,
    borderWidth: 2, borderColor: C.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 2, elevation: 4,
  },
  markerText: { color: C.white, fontSize: 10, fontFamily: UbuntuFonts.bold },

  listSection: { flex: 1, backgroundColor: C.bg },
  listHeader: {
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  listTitle: { fontSize: 16, fontFamily: UbuntuFonts.bold, color: C.text },

  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },

  studentItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
    padding: 12, borderRadius: 12, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
  },
  itemOrder: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#E3F2FD',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  itemOrderText: { color: C.primary, fontSize: 14, fontFamily: UbuntuFonts.bold },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontFamily: UbuntuFonts.bold, color: C.text },
  itemSub: { fontSize: 12, color: C.subtext, marginTop: 2, fontFamily: UbuntuFonts.regular },

  callBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.success,
    alignItems: 'center', justifyContent: 'center', marginLeft: 10,
    shadowColor: C.success, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },

  footer: {
    padding: 16, backgroundColor: C.white,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  startBtn: {
    backgroundColor: C.primary, height: 56, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  startBtnText: { color: C.white, fontSize: 18, fontFamily: UbuntuFonts.bold },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalContent: {
    backgroundColor: C.white, borderRadius: 24, padding: 24,
    width: '100%', alignItems: 'center',
  },
  modalTitle: { fontSize: 20, fontFamily: UbuntuFonts.bold, color: C.text, marginBottom: 8 },
  modalMsg: { fontSize: 15, color: C.subtext, textAlign: 'center', marginBottom: 24, fontFamily: UbuntuFonts.regular },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancel: { flex: 1, height: 50, borderRadius: 12, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontSize: 15, fontFamily: UbuntuFonts.bold, color: C.subtext },
  modalConfirm: { flex: 1, height: 50, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  modalConfirmText: { fontSize: 15, fontFamily: UbuntuFonts.bold, color: C.white },
});

export default DriverTripDetailsScreen;
