/**
 * DriverTripDetailsScreen.js
 *
 * Driver view of a trip.
 * Map section: 100% preserved from original (react-native-maps with markers, polyline, info overlay).
 * Bottom sheet: redesigned to match the shared Trip Details design:
 *   – ETA / Distance / Students stat pills
 *   – Destination card  (mirrors "Driver" card from student screen)
 *   – Journey Timeline  (Depot → First Pickup → School)
 *   – Students list     (ordered pickup cards with Call action)
 *   – Start Trip sticky footer button
 */
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Animated } from 'react-native';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  ScrollView, Dimensions, Linking, Vibration, Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { UbuntuFonts } from '../../src/utils/fonts';

const { width: SW, height: SH } = Dimensions.get('window');

/* ─────────────────────────────── colours ───────────────────────────────── */
const C = {
  primary: '#2196F3',
  success: '#4CAF50',
  orange: '#F97316',
  warning: '#FF9800',
  danger: '#F44336',
  gray: '#9E9E9E',
  lightGray: '#F5F5F5',
  white: '#FFFFFF',
  bg: '#F8F9FB',
  text: '#212121',
  subtext: '#757575',
  border: '#EEEEEE',
  cardBg: '#FFFFFF',
  doneBg: '#E8F5E9',
  doneColor: '#4CAF50',
  nowBg: '#E3F2FD',
  nowColor: '#2196F3',
  soonBg: '#F5F5F5',
  soonColor: '#9E9E9E',
};

/* ─────────────────────────────── i18n ──────────────────────────────────── */
const T = {
  en: {
    tripDetails: 'Trip Details',
    eta: 'ETA',
    distance: 'DISTANCE',
    students: 'STUDENTS',
    destination: 'Destination',
    online: 'Active Trip',
    offline: 'Scheduled',
    call: 'Call',
    message: 'Message',
    timeline: 'Journey Timeline',
    depot: 'Bus Depot',
    leaveDepot: 'Start from depot',
    firstPickup: 'First Pickup',
    boardStudents: 'Board students',
    school: 'School',
    finalDest: 'Drop off',
    startTrip: 'Start Trip',
    confirmTitle: 'Start Trip?',
    confirmMsg: 'Are you ready to begin this trip?',
    yes: 'Yes, Start',
    cancel: 'Cancel',
    studentsList: 'Students List',
    order: '#',
    minutes: 'min',
    km: 'km',
    pickupOrder: 'Pickup order',
    nextPickup: 'Next student pickup',
    viewOnMap: 'Map',
  },
  ar: {
    tripDetails: 'تفاصيل الرحلة',
    eta: 'وقت الوصول',
    distance: 'المسافة',
    students: 'الطلاب',
    destination: 'الوجهة',
    online: 'رحلة نشطة',
    offline: 'مجدولة',
    call: 'اتصال',
    message: 'رسالة',
    timeline: 'مسار الرحلة',
    depot: 'موقف الحافلة',
    leaveDepot: 'الانطلاق من الموقف',
    firstPickup: 'أول التقاط',
    boardStudents: 'ركوب الطلاب',
    school: 'المدرسة',
    finalDest: 'إنزال الطلاب',
    startTrip: 'بدء الرحلة',
    confirmTitle: 'بدء الرحلة؟',
    confirmMsg: 'هل أنت مستعد لبدء هذه الرحلة؟',
    yes: 'نعم، ابدأ',
    cancel: 'إلغاء',
    studentsList: 'قائمة الطلاب',
    order: '#',
    minutes: 'دقيقة',
    km: 'كم',
    pickupOrder: 'ترتيب الالتقاط',
    nextPickup: 'الطالب التالي',
    viewOnMap: 'الخريطة',
  },
};

/* ─────────────────────────────── helpers ───────────────────────────────── */
const haversineKm = (a, b) => {
  if (!a || !b) return 0;
  const R = 6371;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLon = (b.longitude - a.longitude) * Math.PI / 180;
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * Math.PI / 180) *
    Math.cos(b.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
};

const fmtTime = (v) => {
  if (!v) return '--:--';
  const d = typeof v === 'string' ? new Date(v) : v;
  if (isNaN(d.getTime())) return v.toString().slice(0, 5);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/* ═══════════════════════════════ component ════════════════════════════════ */
const DriverTripDetailsScreen = ({
  tripData,
  driverData,
  language = 'en',
  onBack,
  onStartTrip,
}) => {
  const mapRef = useRef(null);
  const t = T[language] || T.en;
  const isRTL = language === 'ar';

  const [showMapInfo, setShowMapInfo] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  /* ── data extraction ─────────────────────────────────────────────── */
  const students = tripData?.students || [];
  const destination = tripData?.destination || tripData?.schoolName || 'School';
  const destinationLocation = tripData?.destinationLocation || { latitude: 33.58, longitude: -7.592 };
  const parkingLocation = tripData?.parkingLocation || tripData?.pickupLocation || null;
  const timeSlot = tripData?.timeSlot || tripData?.startTime || '07:00';
  const isActive = ['IN_PROGRESS', 'STARTED', 'ACTIVE'].includes(tripData?.status);

  /* ── computed distances ──────────────────────────────────────────── */
  const totalDistanceKm = useMemo(() => {
    const pts = [
      parkingLocation,
      ...students.map(s => s.homeLocation).filter(Boolean),
      destinationLocation,
    ].filter(Boolean);
    let d = 0;
    for (let i = 0; i < pts.length - 1; i++) d += haversineKm(pts[i], pts[i + 1]);
    return Math.round(d * 10) / 10;
  }, [students, destinationLocation, parkingLocation]);

  const etaMinutes = Math.round((totalDistanceKm / 40) * 60);

  /* ── map coordinates ─────────────────────────────────────────────── */
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
        edgePadding: { top: 80, right: 50, bottom: 180, left: 50 },
        animated: true,
      });
    }
  };

  /* ── staggered animation for student cards ───────────────────────── */
  const fadeAnims = useRef(students.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(60,
      fadeAnims.map((a, i) =>
        Animated.timing(a, { toValue: 1, duration: 400, delay: i * 80, useNativeDriver: true })
      )
    ).start();
  }, []);

  /* ── actions ─────────────────────────────────────────────────────── */
  const vibrate = () => Vibration.vibrate(50);
  const callPhone = (phone) => { vibrate(); Linking.openURL(`tel:${phone}`); };
  const openMap = (loc) => {
    vibrate();
    if (!loc) return;
    const url = Platform.select({
      ios: `maps://app?daddr=${loc.latitude},${loc.longitude}`,
      android: `geo:${loc.latitude},${loc.longitude}?q=${loc.latitude},${loc.longitude}`,
    });
    if (url) Linking.openURL(url).catch(() => { });
  };

  /* ─────────────────────────────── timeline badges ──────────────────── */
  const getHomeBadge = () => isActive ? 'DONE' : 'SOON';
  const getPickupBadge = () => isActive ? 'NOW' : 'SOON';
  const getSchoolBadge = () => 'SOON';

  const BADGE = {
    DONE: { bg: C.doneBg, color: C.doneColor },
    NOW: { bg: C.nowBg, color: C.nowColor },
    SOON: { bg: C.soonBg, color: C.soonColor },
  };

  /* ═══════════════════════════════ render ════════════════════════════ */
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* ══════════ MAP SECTION (unchanged from original) ══════════ */}
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
          onMapReady={fitMap}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
        >
          {parkingLocation && (
            <Marker
              coordinate={parkingLocation}
              title={language === 'ar' ? 'موقف الحافلة' : 'Bus parking'}
              pinColor="#6366F1"
            />
          )}
          {students.map((s, idx) =>
            s.homeLocation ? (
              <Marker key={s.id || idx} coordinate={s.homeLocation} title={s.name}>
                <View style={styles.pickupMarker}>
                  <Text style={styles.markerNumber}>{idx + 1}</Text>
                </View>
              </Marker>
            ) : null
          )}
          <Marker coordinate={destinationLocation} title={destination} pinColor="#10B981" />
          {students.length > 0 && (
            <Polyline coordinates={allCoords} strokeColor="#3185FC" strokeWidth={3} />
          )}
        </MapView>

        {/* Info overlay (unchanged) */}
        {showMapInfo && (
          <View style={[styles.mapInfoOverlay, isRTL && styles.mapInfoOverlayRTL]}>
            <TouchableOpacity
              style={[styles.closeInfoBtn, isRTL && styles.closeInfoBtnRTL]}
              onPress={() => setShowMapInfo(false)}
            >
              <MaterialIcons name="close" size={16} color="#666" />
            </TouchableOpacity>
            <View style={styles.infoGrid}>
              <InfoItem icon="schedule" color="#3185FC" label={t.eta} value={`${etaMinutes} ${t.minutes}`} />
              <InfoItem icon="people" color="#10B981" label={t.students} value={`${students.length}`} />
              <InfoItem icon="route" color="#F59E0B" label={t.distance} value={`${totalDistanceKm} ${t.km}`} />
            </View>
          </View>
        )}
        {!showMapInfo && (
          <TouchableOpacity
            style={[styles.showInfoBtn, isRTL && styles.showInfoBtnRTL]}
            onPress={() => setShowMapInfo(true)}
          >
            <MaterialIcons name="info" size={20} color="#FFF" />
          </TouchableOpacity>
        )}

        {/* Map header overlay (back btn + title) */}
        <View style={styles.headerOverlay}>
          <TouchableOpacity onPress={onBack} style={styles.backArea}>
            <View style={styles.backBtn}>
              <MaterialIcons name={isRTL ? 'chevron-right' : 'chevron-left'} size={26} color={C.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.tripDetails}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* ══════════ BOTTOM SHEET ══════════ */}
      <View style={styles.bottomSheet}>
        <View style={styles.handleArea}><View style={styles.handle} /></View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Stat pills ─────────────────────────────────────────── */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                <MaterialIcons name="access-time" size={20} color={C.primary} />
              </View>
              <View>
                <Text style={styles.statLabel}>{t.eta}</Text>
                <View style={styles.statValueRow}>
                  <Text style={styles.statNum}>{etaMinutes}</Text>
                  <Text style={styles.statUnit}>{t.minutes}</Text>
                </View>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                <MaterialCommunityIcons name="ruler" size={20} color={C.success} />
              </View>
              <View>
                <Text style={styles.statLabel}>{t.distance}</Text>
                <View style={styles.statValueRow}>
                  <Text style={styles.statNum}>{totalDistanceKm.toFixed(1)}</Text>
                  <Text style={styles.statUnit}>{t.km}</Text>
                </View>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
                <MaterialIcons name="people" size={20} color={C.warning} />
              </View>
              <View>
                <Text style={styles.statLabel}>{t.students}</Text>
                <View style={styles.statValueRow}>
                  <Text style={styles.statNum}>{students.length}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Destination card (mirrors "Driver" card in student screen) */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, isRTL && styles.rtl]}>{t.destination}</Text>
            <View style={[styles.row, { gap: 12, marginBottom: 14 }, isRTL && styles.rowRev]}>
              <View style={styles.destAvatar}>
                <MaterialIcons name="school" size={24} color={C.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.driverName, isRTL && styles.rtl]} numberOfLines={1}>
                  {destination}
                </Text>
                <View style={[styles.row, isRTL && styles.rowRev]}>
                  <View style={[styles.dot, { backgroundColor: isActive ? C.success : C.gray }]} />
                  <Text style={[styles.statusTxt, { color: isActive ? C.success : C.gray }]}>
                    {isActive ? t.online : t.offline}
                  </Text>
                </View>
              </View>
            </View>
            <View style={[styles.row, { gap: 12 }, isRTL && styles.rowRev]}>
              <TouchableOpacity style={styles.contactBtn} onPress={() => openMap(destinationLocation)}>
                <MaterialIcons name="map" size={18} color={C.primary} />
                <Text style={styles.contactTxt}>{t.viewOnMap}</Text>
              </TouchableOpacity>
              <View style={[styles.timeBadge]}>
                <MaterialIcons name="schedule" size={14} color={C.primary} />
                <Text style={styles.timeBadgeTxt}>{fmtTime(tripData?.startTime || timeSlot)}</Text>
              </View>
            </View>
          </View>

          {/* ── Journey Timeline ─────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, isRTL && styles.rtl]}>{t.timeline}</Text>

            {/* Segment 1: Depot */}
            <TLRow
              icon="local-parking" iconBg="#6366F1"
              time={fmtTime(tripData?.depotLeaveTime || null)}
              badge={getHomeBadge()} badgeMap={BADGE}
              title={t.depot} sub={t.leaveDepot}
              hasLine isRTL={isRTL}
            />

            {/* Segment 2: First Pickup */}
            <TLRow
              icon="location-on" iconBg={C.primary}
              time={fmtTime(
                students[0]?.pickupTime ||
                tripData?.firstPickupTime ||
                null
              )}
              badge={getPickupBadge()} badgeMap={BADGE}
              title={t.firstPickup} sub={`${t.boardStudents} (${students.length})`}
              hasLine isRTL={isRTL}
            />

            {/* Segment 3: School */}
            <TLRow
              icon="school" iconBg={C.success}
              time={fmtTime(tripData?.arrivalTime || tripData?.endTime || null)}
              badge={getSchoolBadge()} badgeMap={BADGE}
              title={destination} sub={t.finalDest}
              hasLine={false} isRTL={isRTL}
            />
          </View>

          {/* ── Students list ─────────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 16 }, isRTL && styles.rowRev]}>
              <View style={[styles.row, { gap: 10 }]}>
                <View style={styles.studentsIconWrap}>
                  <MaterialIcons name="people" size={20} color={C.white} />
                </View>
                <View>
                  <Text style={[styles.cardTitle, { marginBottom: 0 }]}>{t.studentsList}</Text>
                  <Text style={styles.subLabel}>{t.nextPickup}</Text>
                </View>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countNum}>{students.length}</Text>
                <Text style={styles.countLabel}>{t.students}</Text>
              </View>
            </View>

            {students.map((student, idx) => (
              <Animated.View
                key={student.id || idx}
                style={[styles.studentCard, { opacity: fadeAnims[idx] || 1 }]}
              >
                {/* Order + connector */}
                <View style={styles.studentCardInner}>
                  <View style={styles.orderCol}>
                    <View style={styles.orderCircle}>
                      <Text style={styles.orderNum}>{idx + 1}</Text>
                    </View>
                    {idx < students.length - 1 && <View style={styles.orderLine} />}
                  </View>

                  {/* Info */}
                  <View style={styles.studentInfo}>
                    <View style={[styles.row, { justifyContent: 'space-between' }, isRTL && styles.rowRev]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.studentName, isRTL && styles.rtl]} numberOfLines={1}>
                          {student.name || `Student ${idx + 1}`}
                        </Text>
                        {student.phone && (
                          <View style={[styles.row, { gap: 4, marginTop: 2 }, isRTL && styles.rowRev]}>
                            <MaterialIcons name="phone" size={13} color={C.gray} />
                            <Text style={styles.studentPhone}>{student.phone}</Text>
                          </View>
                        )}
                      </View>
                      {student.phone && (
                        <TouchableOpacity
                          style={styles.callBtn}
                          onPress={() => callPhone(student.phone)}
                          activeOpacity={0.8}
                        >
                          <MaterialIcons name="phone" size={18} color={C.white} />
                          <Text style={styles.callBtnTxt}>{t.call}</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Pickup location hint */}
                    {student.homeLocation && (
                      <TouchableOpacity
                        style={styles.pickupRow}
                        onPress={() => openMap(student.homeLocation)}
                        activeOpacity={0.75}
                      >
                        <MaterialIcons name="location-on" size={14} color={C.primary} />
                        <Text style={styles.pickupTxt} numberOfLines={1}>
                          {student.homeAddress ||
                            `${student.homeLocation.latitude.toFixed(4)}, ${student.homeLocation.longitude.toFixed(4)}`}
                        </Text>
                        <MaterialIcons name="launch" size={13} color={C.primary} style={{ marginLeft: 'auto' }} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>

        </ScrollView>
      </View>

      {/* ── Sticky footer ──────────────────────────────────────────────── */}
      {onStartTrip && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.mainBtn, isRTL && styles.rowRev]}
            onPress={() => { vibrate(); setShowConfirmModal(true); }}
            activeOpacity={0.85}
          >
            <Text style={styles.mainBtnTxt}>{t.startTrip}</Text>
            <MaterialIcons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={22} color={C.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Confirm Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconWrap}>
              <MaterialIcons name="directions-bus" size={48} color={C.primary} />
            </View>
            <Text style={styles.modalTitle}>{t.confirmTitle}</Text>
            <Text style={styles.modalMsg}>{t.confirmMsg}</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelModalBtn]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelModalTxt}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmModalBtn]}
                onPress={() => {
                  vibrate();
                  setShowConfirmModal(false);
                  onStartTrip(tripData);
                }}
              >
                <Text style={styles.confirmModalTxt}>{t.yes}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

/* ─────────────────────── sub-components ──────────────────────────────── */
const InfoItem = ({ icon, color, label, value }) => (
  <View style={styles.infoItem}>
    <MaterialIcons name={icon} size={18} color={color} />
    <View>
      <Text style={styles.infoItemLabel}>{label}</Text>
      <Text style={styles.infoItemValue}>{value}</Text>
    </View>
  </View>
);

const TLRow = ({ icon, iconBg, time, badge, badgeMap, title, sub, hasLine, isRTL, children }) => {
  const bs = badgeMap[badge] || badgeMap.SOON;
  return (
    <View style={[styles.tlItem, isRTL && styles.rowRev]}>
      <View style={styles.tlLeft}>
        <View style={[styles.tlIconCircle, { backgroundColor: iconBg }]}>
          <MaterialIcons name={icon} size={18} color="#FFF" />
        </View>
        {hasLine && <View style={[styles.tlLine, { backgroundColor: iconBg, opacity: 0.3 }]} />}
      </View>
      <View style={[styles.tlRight, isRTL && { paddingLeft: 0, paddingRight: 8 }]}>
        <View style={[styles.row, { justifyContent: 'space-between' }, isRTL && styles.rowRev]}>
          <Text style={styles.tlTime}>{time !== '--:--' ? time : '--:--'}</Text>
          <View style={[styles.badge, { backgroundColor: bs.bg }]}>
            <Text style={[styles.badgeTxt, { color: bs.color }]}>{badge}</Text>
          </View>
        </View>
        <Text style={[styles.tlTitle, isRTL && styles.rtl]}>{title}</Text>
        <Text style={[styles.tlSub, isRTL && styles.rtl]}>{sub}</Text>
        {children}
      </View>
    </View>
  );
};

/* ─────────────────────────────── styles ─────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  /* ── Map (100% from original) ──────────────────────────── */
  mapContainer: { height: SH * 0.42, width: '100%', position: 'relative' },
  map: { width: '100%', height: '100%' },
  pickupMarker: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#3185FC', borderWidth: 3, borderColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  markerNumber: { color: '#FFF', fontSize: 12, fontWeight: 'bold', fontFamily: UbuntuFonts.bold },

  /* Map info overlay (from original) */
  mapInfoOverlay: {
    position: 'absolute', top: 56, right: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14, padding: 12, paddingTop: 8,
    width: SW * 0.45, maxWidth: 196,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 14, elevation: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)',
  },
  mapInfoOverlayRTL: { right: undefined, left: 12 },
  closeInfoBtn: {
    alignSelf: 'flex-end', width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
    marginBottom: 6, marginTop: -4, marginRight: -4,
  },
  closeInfoBtnRTL: { alignSelf: 'flex-start', marginRight: 0, marginLeft: -4 },
  showInfoBtn: {
    position: 'absolute', top: 56, right: 12, width: 44, height: 44,
    borderRadius: 22, backgroundColor: '#3185FC', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3185FC', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3,
    shadowRadius: 4, elevation: 5,
  },
  showInfoBtnRTL: { right: undefined, left: 12 },
  infoGrid: { gap: 6 },
  infoItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 8, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 9,
  },
  infoItemLabel: { fontSize: 9, color: '#666', fontFamily: UbuntuFonts.regular, textTransform: 'uppercase', letterSpacing: 0.3 },
  infoItemValue: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', fontFamily: UbuntuFonts.bold },

  /* Header floating overlay */
  headerOverlay: {
    position: 'absolute', top: Platform.OS === 'ios' ? 10 : 12, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 16, paddingHorizontal: 8, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(238,238,238,0.9)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  backArea: { padding: 4 },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F4F8',
  },
  headerTitle: { fontSize: 16, fontFamily: UbuntuFonts.bold, color: C.text },

  /* ── Bottom Sheet ──────────────────────────────────────── */
  bottomSheet: {
    flex: 1, backgroundColor: C.bg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    marginTop: -20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 10,
  },
  handleArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: { width: 48, height: 5, borderRadius: 3, backgroundColor: '#E0E0E0' },
  scroll: { padding: 16, paddingBottom: 32 },

  /* Stat pills */
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: C.white, borderRadius: 14, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  iconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 9, color: C.gray, fontFamily: UbuntuFonts.semiBold, letterSpacing: 0.5 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  statNum: { fontSize: 16, fontFamily: UbuntuFonts.bold, color: C.text },
  statUnit: { fontSize: 11, fontFamily: UbuntuFonts.regular, color: C.gray },

  /* Cards */
  card: {
    backgroundColor: C.white, borderRadius: 20, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontFamily: UbuntuFonts.bold, color: C.text, marginBottom: 14 },

  /* Destination card */
  destAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.success, alignItems: 'center', justifyContent: 'center',
  },
  driverName: { fontSize: 15, fontFamily: UbuntuFonts.bold, color: C.text, marginBottom: 2 },
  statusTxt: { fontSize: 12, fontFamily: UbuntuFonts.medium },
  dot: { width: 8, height: 8, borderRadius: 4 },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: C.lightGray, paddingVertical: 11, borderRadius: 12,
  },
  contactTxt: { fontSize: 13, fontFamily: UbuntuFonts.semiBold, color: C.primary },
  timeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#E3F2FD', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  timeBadgeTxt: { fontSize: 14, fontFamily: UbuntuFonts.bold, color: C.primary },

  /* Timeline */
  tlItem: { flexDirection: 'row', minHeight: 76 },
  tlLeft: { width: 38, alignItems: 'center' },
  tlIconCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  tlLine: { width: 2, flex: 1, marginTop: -4, marginBottom: -4 },
  tlRight: { flex: 1, paddingBottom: 18, paddingLeft: 10 },
  tlTime: { fontSize: 16, fontFamily: UbuntuFonts.bold, color: C.text },
  tlTitle: { fontSize: 13, fontFamily: UbuntuFonts.bold, color: C.text, marginTop: 2 },
  tlSub: { fontSize: 11, fontFamily: UbuntuFonts.medium, color: C.gray, marginBottom: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeTxt: { fontSize: 10, fontFamily: UbuntuFonts.bold },

  /* Students list header */
  studentsIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  subLabel: { fontSize: 11, color: C.gray, fontFamily: UbuntuFonts.medium },
  countBadge: {
    backgroundColor: '#F0F9FF', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  countNum: { fontSize: 20, fontFamily: UbuntuFonts.bold, color: C.primary, lineHeight: 24 },
  countLabel: { fontSize: 9, color: '#60A5FA', fontFamily: UbuntuFonts.semiBold, textTransform: 'uppercase', letterSpacing: 0.5 },

  /* Student cards */
  studentCard: { marginBottom: 0 },
  studentCardInner: { flexDirection: 'row', paddingVertical: 12 },
  orderCol: { alignItems: 'center', marginRight: 14, width: 36 },
  orderCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 3,
  },
  orderNum: { color: '#FFF', fontSize: 15, fontFamily: UbuntuFonts.bold },
  orderLine: { width: 2, flex: 1, backgroundColor: '#BFDBFE', marginTop: 6, minHeight: 24, borderRadius: 2 },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontFamily: UbuntuFonts.bold, color: C.text },
  studentPhone: { fontSize: 12, color: C.subtext, fontFamily: UbuntuFonts.medium },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: C.success,
    shadowColor: C.success, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 3,
  },
  callBtnTxt: { fontSize: 13, fontFamily: UbuntuFonts.bold, color: '#FFF' },
  pickupRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F0F9FF', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 6, marginTop: 8,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  pickupTxt: { fontSize: 11, color: C.primary, fontFamily: UbuntuFonts.medium, flex: 1 },

  /* Footer */
  footer: {
    padding: 16, backgroundColor: C.white,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  mainBtn: {
    backgroundColor: C.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 15, borderRadius: 16,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  mainBtnTxt: { fontSize: 16, fontFamily: UbuntuFonts.bold, color: C.white },

  /* Modal */
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalBox: {
    backgroundColor: C.white, borderRadius: 24, padding: 28,
    width: '100%', maxWidth: 400, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 20, elevation: 14,
  },
  modalIconWrap: { marginBottom: 16 },
  modalTitle: { fontSize: 22, fontFamily: UbuntuFonts.bold, color: C.text, marginBottom: 10, textAlign: 'center' },
  modalMsg: { fontSize: 15, color: C.subtext, fontFamily: UbuntuFonts.regular, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: { flex: 1, paddingVertical: 15, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cancelModalBtn: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  cancelModalTxt: { fontSize: 15, fontFamily: UbuntuFonts.semiBold, color: C.subtext },
  confirmModalBtn: {
    backgroundColor: C.primary,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  confirmModalTxt: { fontSize: 15, fontFamily: UbuntuFonts.bold, color: C.white },

  /* Utilities */
  row: { flexDirection: 'row', alignItems: 'center' },
  rowRev: { flexDirection: 'row-reverse' },
  rtl: { textAlign: 'right' },
});

export default DriverTripDetailsScreen;
