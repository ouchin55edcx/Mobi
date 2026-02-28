/**
 * TripDetailsScreen.js  (Students)
 *
 * Shows the journey timeline with THREE dynamically-computed times:
 *
 *   1. leaveHomeTime  → when student must leave home
 *   2. pickupTime     → when student must be at pickup station
 *   3. schoolTime     → target school arrival (≈ student's start_time)
 *
 * Timing formula (backward from school start):
 *   schoolTime    = tripData.startTime
 *   pickupTime    = schoolTime − driverEtaToSchool
 *   leaveHomeTime = pickupTime − walkTime − 2min buffer + orderOffset
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";

import MapboxRoutePreview from "../shared/components/common/MapboxRoutePreview";
import { getDirectionsRoute } from "../shared/services/mapboxService";
import { findOptimalPickupStation, formatWalkDistance, formatWalkTime } from "../shared/services/pickupStationService";
import { computeTripTimes, getTimeBadge, BADGE_STYLE } from "../shared/services/tripTimingService";
import { UbuntuFonts } from "../shared/utils/fonts";

/* ─────────────────────────────── constants ─────────────────────────────── */
const C = {
  primary: "#2196F3",
  success: "#4CAF50",
  warning: "#FF9800",
  danger: "#F44336",
  orange: "#F97316",
  gray: "#9E9E9E",
  lightGray: "#F5F5F5",
  white: "#FFFFFF",
  bg: "#F8F9FB",
  text: "#212121",
  subtext: "#757575",
  border: "#EEEEEE",
  pickupBg: "#FFF7ED",
  pickupBorder: "#FDBA74",
  alertBg: "#F1F8FF",
  alertBorder: "#2196F3",
};

const COPY = {
  en: {
    title: "Trip Details",
    eta: "ETA",
    distance: "DISTANCE",
    driver: "Driver",
    timeline: "Journey Timeline",
    call: "Call",
    message: "Message",
    startLive: "Start Live Tracking",
    online: "Online",
    offline: "Offline",
    home: "Home",
    leaveHome: "Leave Home",
    pickup: "Pickup Station",
    reachPickup: "Be Here",
    school: "School",
    finalDest: "Final destination",
    walkToStation: "Walk to station",
    loading: "Resolving route…",
    noPhone: "Phone unavailable",
    pickupCard: "Your Pickup Point",
    walkDist: "Walk distance",
    walkTime: "Walk time",
    outOfRange: "⚠ Beyond 500 m",
    withinRange: "✓ On driver's route",
    order: "Pickup #",
    schoolTarget: "Target arrival",
  },
  ar: {
    title: "تفاصيل الرحلة",
    eta: "وقت الوصول",
    distance: "المسافة",
    driver: "السائق",
    timeline: "مسار الرحلة",
    call: "اتصال",
    message: "رسالة",
    startLive: "بدء التتبع المباشر",
    online: "متصل",
    offline: "غير متصل",
    home: "المنزل",
    leaveHome: "مغادرة المنزل",
    pickup: "نقطة الالتقاط",
    reachPickup: "تواجد هنا",
    school: "المدرسة",
    finalDest: "الوجهة النهائية",
    walkToStation: "المشي للنقطة",
    loading: "جاري تحميل المسار…",
    noPhone: "رقم غير متوفر",
    pickupCard: "نقطة الالتقاط الخاصة بك",
    walkDist: "مسافة المشي",
    walkTime: "وقت المشي",
    outOfRange: "⚠ أبعد من 500م",
    withinRange: "✓ على مسار السائق",
    order: "ترتيب الالتقاط #",
    schoolTarget: "وقت الوصول المستهدف",
  },
};

/* ─────────────────────────────── helpers ───────────────────────────────── */
const isValidCoord = (p) =>
  p && Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude));

const normalizeCoord = (p, fallback) =>
  isValidCoord(p)
    ? { latitude: Number(p.latitude), longitude: Number(p.longitude) }
    : fallback;

/* ═══════════════════════════════ component ════════════════════════════════ */
const TripDetailsScreen = ({ tripData, language = "en", onBack }) => {
  const t = COPY[language] || COPY.en;
  const isRTL = language === "ar";

  /* ── sanitise coordinates ──────────────────────────────────────────── */
  const studentLoc = useMemo(
    () => normalizeCoord(tripData?.homeLocation, { latitude: 33.5731, longitude: -7.5898 }),
    [tripData?.homeLocation],
  );
  const schoolLoc = useMemo(
    () => normalizeCoord(tripData?.destinationLocation, { latitude: 33.58, longitude: -7.592 }),
    [tripData?.destinationLocation],
  );
  const driverName = tripData?.driverName || "Captain Ahmed";
  const driverPhone = tripData?.driverPhone || null;
  const isOnline = ["IN_PROGRESS", "STARTED"].includes(tripData?.status);
  const schoolName = tripData?.schoolName || tripData?.destinationName || t.school;
  const studentOrder = Number.isFinite(tripData?.studentOrder) ? tripData.studentOrder : 1;

  /* ── route resolution ──────────────────────────────────────────────── */
  const [routeCoords, setRouteCoords] = useState([]);
  const [distanceKm, setDistanceKm] = useState(tripData?.totalDistanceKm || 2.5);
  const [etaMinutes, setEtaMinutes] = useState(tripData?.estimatedArrivalMinutes || 10);
  const [etaToSchoolSecs, setEtaToSchoolSecs] = useState(null);  // driver pickup→school
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    let active = true;
    const resolve = async () => {
      if (!isValidCoord(studentLoc) || !isValidCoord(schoolLoc)) return;
      setIsResolving(true);
      try {
        /* Full route student-home → school (for map display) */
        const route = await getDirectionsRoute({ origin: studentLoc, destination: schoolLoc });
        if (!active) return;
        if (route?.coordinates?.length) {
          setRouteCoords(route.coordinates);
          setDistanceKm(route.distanceMeters / 1000);
          setEtaMinutes(Math.max(1, Math.round(route.durationSeconds / 60)));
        }
      } catch (_) { /* silent */ }
      finally { if (active) setIsResolving(false); }
    };
    resolve();
    return () => { active = false; };
  }, [studentLoc, schoolLoc]);

  /* ── pickup station (projected on route) ──────────────────────────── */
  const pickupStation = useMemo(() => {
    if (routeCoords.length < 2) return null;
    return findOptimalPickupStation(studentLoc, routeCoords);
  }, [routeCoords, studentLoc]);

  /* ── driver ETA from pickup point to school ───────────────────────── */
  useEffect(() => {
    if (!pickupStation?.pickupPoint || !isValidCoord(schoolLoc)) return;
    let active = true;
    const resolve = async () => {
      try {
        const leg = await getDirectionsRoute({
          origin: pickupStation.pickupPoint,
          destination: schoolLoc,
          profile: "driving",
        });
        if (active && leg?.durationSeconds > 0) {
          setEtaToSchoolSecs(leg.durationSeconds);
        }
      } catch (_) { /* silent */ }
    };
    resolve();
    return () => { active = false; };
  }, [pickupStation, schoolLoc]);

  /* ── timing computation (re-runs whenever inputs change) ──────────── */
  const timing = useMemo(() => {
    return computeTripTimes({
      startTime: tripData?.startTime || tripData?.start_time || null,
      walkDistMeters: pickupStation?.walkDistMeters ?? 400,
      driverEtaToSchoolSecs: etaToSchoolSecs,
      pickupToSchoolDistMeters: distanceKm * 1_000 * 0.6, // rough pickup→school portion
      studentOrder,
    });
  }, [
    tripData?.startTime,
    tripData?.start_time,
    pickupStation?.walkDistMeters,
    etaToSchoolSecs,
    distanceKm,
    studentOrder,
  ]);

  /* ── badge states based on real clock ─────────────────────────────── */
  const homeBadge = getTimeBadge(timing.leaveHomeTime);
  const pickupBadge = getTimeBadge(timing.pickupTime);
  const schoolBadge = getTimeBadge(timing.schoolTime);

  /* ── contact ───────────────────────────────────────────────────────── */
  const handleCall = () => driverPhone && Linking.openURL(`tel:${driverPhone}`);
  const handleMessage = () => driverPhone && Linking.openURL(`sms:${driverPhone}`);

  /* ═══════════════════════════════ render ═══════════════════════════════ */
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      {/* ── MAP ─────────────────────────────────────────────────────── */}
      <View style={styles.mapStage}>
        <MapboxRoutePreview
          style={styles.map}
          homeLocation={studentLoc}
          destinationLocation={schoolLoc}
          pickupLocation={pickupStation?.pickupPoint ?? null}
          routeCoordinates={routeCoords}
          interactive
          showRoute
          studentLabel={t.home}
          schoolLabel={schoolName}
          pickupLabel={t.pickup}
        />

        {/* floating header */}
        <View style={styles.headerOverlay}>
          <TouchableOpacity onPress={onBack} style={styles.backArea}>
            <View style={styles.backBtn}>
              <MaterialIcons name={isRTL ? "chevron-right" : "chevron-left"} size={26} color={C.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.title}</Text>
          <View style={{ width: 40 }} />
        </View>

        {isResolving && (
          <View style={styles.syncChip}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={styles.syncText}>{t.loading}</Text>
          </View>
        )}
      </View>

      {/* ── BOTTOM SHEET ────────────────────────────────────────────── */}
      <View style={styles.bottomSheet}>
        <View style={styles.handleArea}>
          <View style={styles.handle} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ETA / Distance pills */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.iconCircle, { backgroundColor: "#E3F2FD" }]}>
                <MaterialIcons name="access-time" size={20} color={C.primary} />
              </View>
              <View>
                <Text style={styles.statLabel}>{t.eta}</Text>
                <View style={styles.statValueRow}>
                  <Text style={styles.statNum}>{etaMinutes}</Text>
                  <Text style={styles.statUnit}>min</Text>
                </View>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.iconCircle, { backgroundColor: "#E8F5E9" }]}>
                <MaterialCommunityIcons name="ruler" size={20} color={C.success} />
              </View>
              <View>
                <Text style={styles.statLabel}>{t.distance}</Text>
                <View style={styles.statValueRow}>
                  <Text style={styles.statNum}>{distanceKm.toFixed(1)}</Text>
                  <Text style={styles.statUnit}>km</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Pickup Station card ─────────────────────────────────── */}
          {pickupStation && (
            <View style={[styles.card, styles.pickupCard]}>
              <View style={styles.pickupCardHeader}>
                <View style={styles.pickupIconWrap}>
                  <MaterialIcons name="location-on" size={22} color={C.orange} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: C.orange, marginBottom: 2 }]}>
                    {t.pickupCard}
                  </Text>
                  <Text style={[
                    styles.rangeTag,
                    { color: pickupStation.withinConstraint ? C.success : C.warning },
                  ]}>
                    {pickupStation.withinConstraint ? t.withinRange : t.outOfRange}
                  </Text>
                </View>
                {studentOrder > 1 && (
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderBadgeTxt}>{t.order}{studentOrder}</Text>
                  </View>
                )}
              </View>

              <View style={styles.pickupStatsRow}>
                <View style={styles.pickupStat}>
                  <MaterialIcons name="directions-walk" size={18} color={C.orange} />
                  <View>
                    <Text style={styles.pickupStatLabel}>{t.walkDist}</Text>
                    <Text style={styles.pickupStatValue}>
                      {formatWalkDistance(pickupStation.walkDistMeters)}
                    </Text>
                  </View>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.pickupStat}>
                  <MaterialIcons name="timer" size={18} color={C.orange} />
                  <View>
                    <Text style={styles.pickupStatLabel}>{t.walkTime}</Text>
                    <Text style={styles.pickupStatValue}>
                      {formatWalkTime(timing.walkTimeMinutes)}
                    </Text>
                  </View>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.pickupStat}>
                  <MaterialIcons name="school" size={18} color={C.primary} />
                  <View>
                    <Text style={styles.pickupStatLabel}>{t.schoolTarget}</Text>
                    <Text style={[styles.pickupStatValue, { color: C.primary }]}>
                      {timing.formatted.schoolTime}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* ── Driver card ─────────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, isRTL && styles.rtl]}>{t.driver}</Text>
            <View style={[styles.row, { gap: 12, marginBottom: 14 }, isRTL && styles.rowRev]}>
              <View style={styles.driverAvatar}>
                <MaterialIcons name="person" size={24} color={C.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.driverName, isRTL && styles.rtl]}>{driverName}</Text>
                <View style={[styles.row, isRTL && styles.rowRev]}>
                  <View style={[styles.dot, { backgroundColor: isOnline ? C.success : C.gray }]} />
                  <Text style={[styles.statusTxt, { color: isOnline ? C.success : C.gray }]}>
                    {isOnline ? t.online : t.offline}
                  </Text>
                </View>
              </View>
            </View>
            <View style={[styles.row, { gap: 12 }, isRTL && styles.rowRev]}>
              <TouchableOpacity
                style={[styles.contactBtn, !driverPhone && styles.disabledBtn]}
                onPress={handleCall}
                disabled={!driverPhone}
              >
                <MaterialIcons name="call" size={18} color={driverPhone ? C.primary : C.gray} />
                <Text style={[styles.contactTxt, !driverPhone && { color: C.gray }]}>
                  {driverPhone ? t.call : t.noPhone}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactBtn, !driverPhone && styles.disabledBtn]}
                onPress={handleMessage}
                disabled={!driverPhone}
              >
                <MaterialIcons name="message" size={18} color={driverPhone ? C.primary : C.gray} />
                <Text style={[styles.contactTxt, !driverPhone && { color: C.gray }]}>
                  {driverPhone ? t.message : t.noPhone}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Journey Timeline ─────────────────────────────────────── */}
          <View style={styles.card}>
            <Text style={[styles.cardTitle, isRTL && styles.rtl]}>{t.timeline}</Text>

            {/* 1 – Leave Home */}
            <TLRow
              icon="home" iconBg={BADGE_STYLE[homeBadge].color}
              time={timing.formatted.leaveHomeTime}
              badge={homeBadge}
              title={t.home} sub={t.leaveHome}
              hasLine isRTL={isRTL}
            />

            {/* 2 – Pickup Station */}
            <TLRow
              icon="location-on" iconBg={C.primary}
              time={timing.formatted.pickupTime}
              badge={pickupBadge}
              title={t.pickup} sub={t.reachPickup}
              hasLine isRTL={isRTL}
            >
              {pickupStation && (
                <View style={[styles.inlineAlert, isRTL && styles.rowRev]}>
                  <MaterialIcons name="directions-walk" size={16} color={C.primary} />
                  <Text style={[styles.inlineAlertTxt, isRTL && styles.rtl]}>
                    {t.walkToStation}:{" "}
                    <Text style={{ fontFamily: UbuntuFonts.bold }}>
                      {formatWalkDistance(pickupStation.walkDistMeters)} · {formatWalkTime(timing.walkTimeMinutes)}
                    </Text>
                  </Text>
                </View>
              )}
            </TLRow>

            {/* 3 – School */}
            <TLRow
              icon="school" iconBg={BADGE_STYLE[schoolBadge].color}
              time={timing.formatted.schoolTime}
              badge={schoolBadge}
              title={schoolName} sub={t.finalDest}
              hasLine={false} isRTL={isRTL}
            />
          </View>

        </ScrollView>
      </View>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.mainBtn, isRTL && styles.rowRev]} activeOpacity={0.85}>
          <Text style={styles.mainBtnTxt}>{t.startLive}</Text>
          <MaterialIcons name={isRTL ? "arrow-back" : "arrow-forward"} size={22} color={C.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

/* ──────────────────── Timeline Row sub-component ───────────────────────── */
const TLRow = ({ icon, iconBg, time, badge, title, sub, hasLine, isRTL, children }) => {
  const bs = BADGE_STYLE[badge] || BADGE_STYLE.SOON;
  return (
    <View style={[styles.tlItem, isRTL && styles.rowRev]}>
      <View style={styles.tlLeft}>
        <View style={[styles.tlIconCircle, { backgroundColor: iconBg }]}>
          <MaterialIcons name={icon} size={18} color={C.white} />
        </View>
        {hasLine && <View style={[styles.tlLine, { backgroundColor: iconBg, opacity: 0.35 }]} />}
      </View>
      <View style={[styles.tlRight, isRTL && { paddingLeft: 0, paddingRight: 8 }]}>
        <View style={[styles.row, { justifyContent: "space-between" }, isRTL && styles.rowRev]}>
          <Text style={styles.tlTime}>{time}</Text>
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

/* ───────────────────────────────── styles ──────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  mapStage: { height: 300, width: "100%" },
  map: { flex: 1 },

  headerOverlay: {
    position: "absolute",
    top: Platform.OS === "ios" ? 10 : 20,
    left: 16, right: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.93)",
    borderRadius: 16,
    paddingHorizontal: 8, paddingVertical: 8,
    borderWidth: 1, borderColor: "rgba(238,238,238,0.9)",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  backArea: { padding: 4 },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#F0F4F8",
  },
  headerTitle: { fontSize: 16, fontFamily: UbuntuFonts.bold, color: C.text },

  syncChip: {
    position: "absolute", top: 80, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
    elevation: 3,
  },
  syncText: { fontFamily: UbuntuFonts.medium, fontSize: 12, color: C.primary },

  bottomSheet: {
    flex: 1, backgroundColor: C.bg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    marginTop: -20, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 10,
  },
  handleArea: { alignItems: "center", paddingTop: 10, paddingBottom: 4 },
  handle: { width: 48, height: 5, borderRadius: 3, backgroundColor: "#E0E0E0" },
  scroll: { padding: 16, paddingBottom: 32 },

  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: C.white, borderRadius: 16, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  statLabel: { fontSize: 10, color: C.gray, fontFamily: UbuntuFonts.semiBold, letterSpacing: 0.5 },
  statValueRow: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  statNum: { fontSize: 18, fontFamily: UbuntuFonts.bold, color: C.text },
  statUnit: { fontSize: 12, fontFamily: UbuntuFonts.regular, color: C.gray },

  card: {
    backgroundColor: C.white, borderRadius: 20, padding: 18, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  pickupCard: { borderWidth: 1, borderColor: C.pickupBorder, backgroundColor: C.pickupBg },

  pickupCardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 14 },
  pickupIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#FFF0E0", alignItems: "center", justifyContent: "center",
  },
  rangeTag: { fontSize: 11, fontFamily: UbuntuFonts.semiBold, marginTop: 2 },
  orderBadge: {
    backgroundColor: "#E3F2FD", borderRadius: 99,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  orderBadgeTxt: { fontSize: 11, fontFamily: UbuntuFonts.bold, color: C.primary },

  pickupStatsRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.white, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  pickupStat: { flex: 1, flexDirection: "row", alignItems: "center", gap: 7 },
  statDivider: { width: 1, height: 36, backgroundColor: C.border },
  pickupStatLabel: { fontSize: 9, color: C.gray, fontFamily: UbuntuFonts.medium },
  pickupStatValue: { fontSize: 13, fontFamily: UbuntuFonts.bold, color: C.text },

  cardTitle: { fontSize: 15, fontFamily: UbuntuFonts.bold, color: C.text, marginBottom: 14 },
  driverAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.primary, alignItems: "center", justifyContent: "center",
  },
  driverName: { fontSize: 15, fontFamily: UbuntuFonts.bold, color: C.text, marginBottom: 2 },
  statusTxt: { fontSize: 12, fontFamily: UbuntuFonts.medium },
  dot: { width: 8, height: 8, borderRadius: 4 },
  contactBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: C.lightGray, paddingVertical: 11, borderRadius: 12,
  },
  contactTxt: { fontSize: 13, fontFamily: UbuntuFonts.semiBold, color: C.primary },
  disabledBtn: { opacity: 0.5 },

  tlItem: { flexDirection: "row", minHeight: 80 },
  tlLeft: { width: 38, alignItems: "center" },
  tlIconCircle: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center", zIndex: 1,
  },
  tlLine: { width: 2, flex: 1, marginTop: -4, marginBottom: -4 },
  tlRight: { flex: 1, paddingBottom: 20, paddingLeft: 10 },
  tlTime: { fontSize: 16, fontFamily: UbuntuFonts.bold, color: C.text },
  tlTitle: { fontSize: 13, fontFamily: UbuntuFonts.bold, color: C.text, marginTop: 2 },
  tlSub: { fontSize: 11, fontFamily: UbuntuFonts.medium, color: C.gray, marginBottom: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeTxt: { fontSize: 10, fontFamily: UbuntuFonts.bold },

  inlineAlert: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.alertBg, borderWidth: 1, borderColor: C.alertBorder,
    borderRadius: 10, padding: 9, marginTop: 8, borderLeftWidth: 4,
  },
  inlineAlertTxt: { fontSize: 11, fontFamily: UbuntuFonts.medium, color: "#1565C0", flex: 1 },

  footer: { padding: 16, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border },
  mainBtn: {
    backgroundColor: C.primary,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 15, borderRadius: 16,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  mainBtnTxt: { fontSize: 16, fontFamily: UbuntuFonts.bold, color: C.white },

  row: { flexDirection: "row", alignItems: "center" },
  rowRev: { flexDirection: "row-reverse" },
  rtl: { textAlign: "right" },
});

export default TripDetailsScreen;
