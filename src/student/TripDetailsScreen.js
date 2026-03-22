/**
 * TripDetailsScreen.js (Redesigned - Minimal Clean UI/UX)
 *
 * A refined, production-grade student trip tracking interface with:
 * - Elegant card-based timeline
 * - Subtle micro-interactions
 * - High-contrast, readable typography
 * - Generous whitespace
 * - Intuitive information hierarchy
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { MaterialIcons } from "@expo/vector-icons";

import MapboxRoutePreview from "../shared/components/common/MapboxRoutePreview";
import { DEMO_STUDENT } from "../shared/data/demoData";
import { supabase } from "../shared/lib/supabase";
import { getDirectionsRoute } from "../shared/services/mapboxService";
import {
  findOptimalPickupStation,
  formatWalkDistance,
  formatWalkTime,
} from "../shared/services/pickupStationService";
import {
  computeTripTimes,
  getTimeBadge,
} from "../shared/services/tripTimingService";
import { UbuntuFonts } from "../shared/utils/fonts";

/* ─────────────────────────────── Color Palette ────────────────────────────── */
const colors = {
  background: "#FAFBFC",
  surface: "#FFFFFF",
  surfaceSecondary: "#F8FAFC",
  text: "#1A202C",
  textSecondary: "#718096",
  textTertiary: "#A0AEC0",
  border: "#E2E8F0",
  primary: "#2563EB",
  primaryLight: "#DBEAFE",
  success: "#10B981",
  successLight: "#ECFDF5",
  warning: "#F59E0B",
  warningLight: "#FFFBEB",
  danger: "#EF4444",
  dangerLight: "#FEF2F2",

  // Timeline badges
  badges: {
    SOON: { bg: "#F0F9FF", text: "#0369A1" },
    NOW: { bg: "#ECFDF5", text: "#047857" },
    PASSED: { bg: "#F3E8FF", text: "#7E22CE" },
  },
};

/* ────────────────────────────── Text Content ────────────────────────────── */
const translations = {
  en: {
    back: "Back",
    eta: "Travel Time",
    distance: "Distance",
    pickupPoint: "Pickup Point",
    walkDistance: "Walk Distance",
    walkTime: "Walk Time",
    pickupLocation: "Pickup Location",
    driver: "Driver",
    captain: "Captain",
    driverStatus: "Driver Status",
    online: "Online",
    offline: "Offline",
    callDriver: "Call",
    messageDriver: "Message",
    trustedCaptain: "Verified captain",
    rating: "Rating",
    carModel: "Car",
    plateNumber: "Plate",
    tripActions: "Trip Actions",
    confirmTrip: "Confirm Trip",
    startTrip: "Start Trip",
    trackTrip: "Track Trip",
    cancelTrip: "Cancel Trip",
    pickupUnavailable: "Pickup location details will appear soon",
    returnHome: "Return Home",
    busToSchool: "Bus to School",
    timeline: "Journey Timeline",
    leaveHome: "Leave Home",
    home: "Your Location",
    pickup: "Pickup Station",
    waitForPickup: "Be Ready Here",
    school: "School",
    schoolArrival: "Expected Arrival",
    startTime: "Class Starts",
    walkToStation: "Walk to Pickup",
    loading: "Loading route...",
    noPhone: "Not available",
    inRangeTag: "✓ On Route",
    outOfRangeTag: "⚠ 500m+ away",
    pickupOrder: "Your Stop #",
  },
  ar: {
    back: "رجوع",
    eta: "وقت السفر",
    distance: "المسافة",
    pickupPoint: "نقطة الالتقاط",
    walkDistance: "مسافة المشي",
    walkTime: "وقت المشي",
    pickupLocation: "موقع الالتقاط",
    driver: "السائق",
    captain: "الكابتن",
    driverStatus: "حالة السائق",
    online: "متصل",
    offline: "غير متصل",
    callDriver: "اتصال",
    messageDriver: "رسالة",
    trustedCaptain: "كابتن موثوق",
    rating: "التقييم",
    carModel: "المركبة",
    plateNumber: "اللوحة",
    tripActions: "إجراءات الرحلة",
    confirmTrip: "تأكيد الرحلة",
    startTrip: "بدء الرحلة",
    trackTrip: "تتبع الرحلة",
    cancelTrip: "إلغاء الرحلة",
    pickupUnavailable: "ستظهر تفاصيل موقع الالتقاط قريباً",
    returnHome: "العودة للرئيسية",
    busToSchool: "الحافلة إلى المدرسة",
    timeline: "خط الرحلة",
    leaveHome: "اترك المنزل",
    home: "موقعك",
    pickup: "محطة الالتقاط",
    waitForPickup: "كن مستعداً هنا",
    school: "المدرسة",
    schoolArrival: "الوصول المتوقع",
    startTime: "بدء الدرس",
    walkToStation: "المشي إلى الالتقاط",
    loading: "جاري تحميل المسار...",
    noPhone: "غير متوفر",
    inRangeTag: "✓ على الطريق",
    outOfRangeTag: "⚠ 500م+ بعيداً",
    pickupOrder: "محطتك #",
  },
};

/* ─────────────────────────────── Helpers ────────────────────────────────── */
const isValidCoord = (p) =>
  p &&
  Number.isFinite(Number(p.latitude)) &&
  Number.isFinite(Number(p.longitude));

const normalizeCoord = (p, fallback) =>
  isValidCoord(p)
    ? { latitude: Number(p.latitude), longitude: Number(p.longitude) }
    : fallback;

const formatTimeCompact = (date) => {
  if (!date) return "—";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/* ═════════════════════════════ Main Component ════════════════════════════ */
const TripDetailsScreen = ({ tripData, language = "en", onBack }) => {
  const t = translations[language] || translations.en;
  const isRTL = language === "ar";
  const [activeTab, setActiveTab] = useState("aller");
  const [driverLiveLocation, setDriverLiveLocation] = useState(null);
  const [demoLive, setDemoLive] = useState(false);

  /* ── Coordinate Normalization ──────────────────────────────────────── */
  const studentLoc = useMemo(
    () =>
      normalizeCoord(tripData?.homeLocation, {
        latitude: 33.5731,
        longitude: -7.5898,
      }),
    [tripData?.homeLocation],
  );

  const schoolLoc = useMemo(
    () =>
      normalizeCoord(tripData?.destinationLocation, {
        latitude: 33.58,
        longitude: -7.592,
      }),
    [tripData?.destinationLocation],
  );

  /* ── Data Extraction ────────────────────────────────────────────────── */
  const driverName = tripData?.driverName || "Captain Ahmed";
  const driverPhone = tripData?.driverPhone || null;
  const driverAvatar =
    tripData?.driverAvatar ||
    tripData?.driverPhoto ||
    tripData?.drivers?.avatar_url ||
    null;
  const driverRating = Number.isFinite(Number(tripData?.driverRating))
    ? Number(tripData.driverRating)
    : 4.8;
  const carModel =
    tripData?.carModel || tripData?.busModel || tripData?.buses?.model || "Van";
  const plateNumber =
    tripData?.plateNumber ||
    tripData?.busPlate ||
    tripData?.buses?.plate_number;
  const isOnline = ["IN_PROGRESS", "STARTED"].includes(tripData?.status);
  const schoolName =
    tripData?.schoolName || tripData?.destinationName || t.school;
  const studentOrder = Number.isFinite(tripData?.studentOrder)
    ? tripData.studentOrder
    : 1;
  const isDemo =
    tripData?.isDemo === true || tripData?.studentId === DEMO_STUDENT.id;
  const liveTripId = tripData?.tripId || tripData?.trip_id || tripData?.id;
  const isLive =
    ["IN_PROGRESS", "STARTED", "trip_started"].includes(tripData?.status) ||
    demoLive;
  const initialDriverLiveLocation = useMemo(() => {
    const source = tripData?.liveLocation || tripData?.live_location || null;
    if (
      Number.isFinite(Number(source?.latitude)) &&
      Number.isFinite(Number(source?.longitude))
    ) {
      return {
        latitude: Number(source.latitude),
        longitude: Number(source.longitude),
      };
    }
    return null;
  }, [tripData?.liveLocation, tripData?.live_location]);
  const isRetour = activeTab === "retour";
  const originLoc = isRetour ? schoolLoc : studentLoc;
  const destLoc = isRetour ? studentLoc : schoolLoc;
  const originLabel = isRetour ? schoolName : t.home;
  const destLabel = isRetour ? t.home : schoolName;
  const pickupLabel = t.pickup;

  /* ── Route State ────────────────────────────────────────────────────── */
  const [routeCoords, setRouteCoords] = useState([]);
  const [distanceKm, setDistanceKm] = useState(
    tripData?.totalDistanceKm || 2.5,
  );
  const [etaMinutes, setEtaMinutes] = useState(
    tripData?.estimatedArrivalMinutes || 10,
  );
  const [etaToSchoolSecs, setEtaToSchoolSecs] = useState(null);
  const [liveEtaMinutes, setLiveEtaMinutes] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);

  useEffect(() => {
    if (!isDemo) return undefined;

    const timer = setTimeout(() => {
      setDemoLive(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [isDemo]);

  useEffect(() => {
    setDriverLiveLocation(initialDriverLiveLocation);
  }, [initialDriverLiveLocation]);

  useEffect(() => {
    if (!isLive || driverLiveLocation) return;

    const studentLat = studentLoc?.latitude ?? 33.5731;
    const studentLng = studentLoc?.longitude ?? -7.5898;

    setDriverLiveLocation({
      latitude: studentLat + 0.004,
      longitude: studentLng + 0.003,
    });
  }, [isLive, driverLiveLocation, studentLoc]);

  useEffect(() => {
    if (!isLive || !liveTripId) return undefined;

    let mounted = true;

    const loadDriverLocation = async () => {
      const { data } = await supabase
        .from("transport_trips")
        .select("live_location")
        .eq("id", liveTripId)
        .maybeSingle();

      if (
        mounted &&
        Number.isFinite(Number(data?.live_location?.latitude)) &&
        Number.isFinite(Number(data?.live_location?.longitude))
      ) {
        setDriverLiveLocation({
          latitude: Number(data.live_location.latitude),
          longitude: Number(data.live_location.longitude),
        });
      }
    };

    loadDriverLocation();

    const channel = supabase
      .channel(`driver-loc-${liveTripId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "transport_trips",
          filter: `id=eq.${liveTripId}`,
        },
        (payload) => {
          const location = payload?.new?.live_location;
          if (
            Number.isFinite(Number(location?.latitude)) &&
            Number.isFinite(Number(location?.longitude))
          ) {
            setDriverLiveLocation({
              latitude: Number(location.latitude),
              longitude: Number(location.longitude),
            });
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [isLive, liveTripId]);

  /* ── Route Resolution ──────────────────────────────────────────────── */
  useEffect(() => {
    let active = true;
    const resolve = async () => {
      if (!isValidCoord(originLoc) || !isValidCoord(destLoc)) return;
      setIsResolving(true);
      try {
        if (isLive && driverLiveLocation) {
          const liveRoute = await getDirectionsRoute({
            origin: driverLiveLocation,
            waypoints: [originLoc],
            destination: destLoc,
          });
          if (!active) return;
          if (liveRoute?.coordinates?.length) {
            setRouteCoords(liveRoute.coordinates);
            setDistanceKm(liveRoute.distanceMeters / 1000);
            setEtaMinutes(
              Math.max(1, Math.round(liveRoute.durationSeconds / 60)),
            );
          }
          return;
        }

        const route = await getDirectionsRoute({
          origin: originLoc,
          destination: destLoc,
        });
        if (!active) return;
        if (route?.coordinates?.length) {
          setRouteCoords(route.coordinates);
          setDistanceKm(route.distanceMeters / 1000);
          setEtaMinutes(Math.max(1, Math.round(route.durationSeconds / 60)));
        }
      } catch (_) {
        /* silent fail */
      } finally {
        if (active) setIsResolving(false);
      }
    };
    resolve();
    return () => {
      active = false;
    };
  }, [originLoc, destLoc, activeTab, driverLiveLocation, isLive]);

  useEffect(() => {
    setRouteCoords([]);
    setDistanceKm(tripData?.totalDistanceKm || 2.5);
    setEtaMinutes(tripData?.estimatedArrivalMinutes || 10);
    setEtaToSchoolSecs(null);
    setLiveEtaMinutes(null);
  }, [activeTab, tripData?.estimatedArrivalMinutes, tripData?.totalDistanceKm]);

  /* ── Pickup Station ────────────────────────────────────────────────── */
  const pickupStation = useMemo(() => {
    if (routeCoords.length < 2) return null;
    return findOptimalPickupStation(originLoc, routeCoords);
  }, [routeCoords, originLoc]);

  /* ── Driver ETA to School ──────────────────────────────────────────── */
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
      } catch (_) {
        /* silent fail */
      }
    };
    resolve();
    return () => {
      active = false;
    };
  }, [pickupStation, schoolLoc]);

  useEffect(() => {
    let active = true;

    const resolveLiveEta = async () => {
      if (!isLive || !driverLiveLocation || !isValidCoord(originLoc)) {
        if (active) setLiveEtaMinutes(null);
        return;
      }

      try {
        const route = await getDirectionsRoute({
          origin: driverLiveLocation,
          destination: originLoc,
        });
        if (!active) return;
        setLiveEtaMinutes(Math.max(1, Math.round(route.durationSeconds / 60)));
      } catch (_error) {
        if (active) setLiveEtaMinutes(null);
      }
    };

    resolveLiveEta();

    return () => {
      active = false;
    };
  }, [driverLiveLocation, isLive, originLoc]);

  /* ── Timing Computation ────────────────────────────────────────────── */
  const timing = useMemo(() => {
    return computeTripTimes({
      startTime: tripData?.startTime || tripData?.start_time || null,
      walkDistMeters: pickupStation?.walkDistMeters ?? 400,
      driverEtaToSchoolSecs: etaToSchoolSecs,
      pickupToSchoolDistMeters: distanceKm * 1_000 * 0.6,
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

  /* ── Badge States ──────────────────────────────────────────────────── */
  const homeBadge = getTimeBadge(timing.leaveHomeTime);
  const pickupBadge = getTimeBadge(timing.pickupTime);
  const schoolBadge = getTimeBadge(timing.schoolTime);
  const busEtaMinutes = useMemo(() => {
    if (!etaToSchoolSecs) return null;
    return Math.max(1, Math.round(etaToSchoolSecs / 60));
  }, [etaToSchoolSecs]);
  const pickupAddress = useMemo(() => {
    if (tripData?.pickupAddress) return tripData.pickupAddress;
    if (tripData?.pickupName) return tripData.pickupName;
    return t.pickupUnavailable;
  }, [t.pickupUnavailable, tripData?.pickupAddress, tripData?.pickupName]);

  /* ── Contact Handlers ──────────────────────────────────────────────── */
  const handleCall = () => driverPhone && Linking.openURL(`tel:${driverPhone}`);
  const handleMessage = () =>
    driverPhone && Linking.openURL(`sms:${driverPhone}`);
  /* ═════════════════════════════ Render ════════════════════════════════ */
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* ────── MAP SECTION ──────────────────────────────────────── */}
      <View
        style={[styles.mapContainer, mapExpanded && styles.mapContainerFull]}
      >
        <MapboxRoutePreview
          style={styles.map}
          homeLocation={originLoc}
          destinationLocation={destLoc}
          pickupLocation={pickupStation?.pickupPoint ?? null}
          routeCoordinates={routeCoords}
          driverLocation={isLive ? driverLiveLocation : null}
          driverLabel={
            isLive ? (language === "ar" ? "السائق" : "Driver") : undefined
          }
          interactive
          showRoute
          studentLabel={originLabel}
          schoolLabel={destLabel}
          pickupLabel={pickupLabel}
          fitPadding={{ top: 90, right: 48, bottom: 140, left: 48 }}
        />

        {/* Header with Return Home + Travel Time */}
        <View style={styles.mapHeader}>
          <TouchableOpacity
            onPress={onBack}
            style={[styles.returnHomeButton, isRTL && styles.rowReverse]}
            activeOpacity={0.6}
          >
            <MaterialIcons
              name={isRTL ? "chevron-right" : "chevron-left"}
              size={20}
              color={colors.text}
            />
            <Text style={styles.returnHomeText}>{t.returnHome}</Text>
          </TouchableOpacity>
          <View style={[styles.mapHeaderStats, isRTL && styles.rowReverse]}>
            <View
              style={[styles.mapHeaderStatChip, isRTL && styles.rowReverse]}
            >
              <View style={styles.mapHeaderStatIcon}>
                <MaterialIcons name="access-time" size={14} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.mapHeaderStatLabel}>{t.eta}</Text>
                <Text style={styles.mapHeaderStatValue}>
                  {isLive && liveEtaMinutes ? liveEtaMinutes : etaMinutes} min
                </Text>
              </View>
            </View>
            {isLive && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>
                  {language === "ar" ? "مباشر" : "LIVE"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Left-Middle Distance Chip */}
        <View style={[styles.distanceChip, isRTL && styles.distanceChipRtl]}>
          <View style={styles.mapHeaderStatIcon}>
            <MaterialIcons name="straighten" size={14} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.mapHeaderStatLabel}>{t.distance}</Text>
            <Text style={styles.mapHeaderStatValue}>
              {distanceKm.toFixed(1)} km
            </Text>
          </View>
        </View>

        {/* Loading Indicator */}
        {isResolving && (
          <View style={styles.loadingBadge}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>{t.loading}</Text>
          </View>
        )}
      </View>

      {/* ────── BOTTOM SHEET ──────────────────────────────────── */}
      <View style={styles.bottomSheet}>
        {/* Handle */}
        <TouchableOpacity
          onPress={() => setMapExpanded(!mapExpanded)}
          activeOpacity={0.8}
          style={styles.handleWrapper}
        >
          <View style={styles.handle} />
        </TouchableOpacity>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "aller" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("aller")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabTxt,
                activeTab === "aller" && styles.tabTxtActive,
              ]}
            >
              ذهاب
            </Text>
            <Text
              style={[
                styles.tabSubTxt,
                activeTab === "aller" && styles.tabSubTxtActive,
              ]}
            >
              🏠 ← 🏫
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "retour" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("retour")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabTxt,
                activeTab === "retour" && styles.tabTxtActive,
              ]}
            >
              إياب
            </Text>
            <Text
              style={[
                styles.tabSubTxt,
                activeTab === "retour" && styles.tabSubTxtActive,
              ]}
            >
              🏫 ← 🏠
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ────── DRIVER CARD ──────────────────────────────── */}
          <DriverCard
            name={driverName}
            isOnline={isOnline}
            avatarUri={driverAvatar}
            rating={driverRating}
            carModel={carModel}
            plateNumber={plateNumber}
            onCall={handleCall}
            onMessage={handleMessage}
            hasPhone={!!driverPhone}
            translations={t}
            isRTL={isRTL}
          />

          {/* ────── PICKUP STATION CARD ──────────────────────── */}
          {pickupStation && (
            <PickupCard
              station={pickupStation}
              timing={timing}
              address={pickupAddress}
              translations={t}
              isRTL={isRTL}
              studentOrder={studentOrder}
            />
          )}
          {/* ────── JOURNEY TIMELINE ──────────────────────────── */}
          <View style={styles.timelineWrapper}>
            <Text style={[styles.timelineSectionTitle, isRTL && styles.rtl]}>
              {t.timeline}
            </Text>

            <TimelineStop
              icon={isRetour ? "school" : "home"}
              title={isRetour ? schoolName : t.home}
              subtitle={t.leaveHome}
              time={timing.formatted.leaveHomeTime}
              badge={homeBadge}
              isFirst
              hasNext
              isRTL={isRTL}
            />
            {pickupStation && (
              <TimelineTravelHint
                icon="directions-walk"
                text={`${t.walkToStation} • ${formatWalkDistance(
                  pickupStation.walkDistMeters,
                )} • ${formatWalkTime(timing.walkTimeMinutes)}`}
                isRTL={isRTL}
              />
            )}

            <TimelineStop
              icon="location-on"
              title={t.pickup}
              subtitle={t.waitForPickup}
              time={timing.formatted.pickupTime}
              badge={pickupBadge}
              isFirst={false}
              hasNext
              isRTL={isRTL}
            />
            <TimelineTravelHint
              icon="directions-bus"
              text={
                busEtaMinutes
                  ? `${t.busToSchool} • ${busEtaMinutes} min`
                  : t.busToSchool
              }
              isRTL={isRTL}
            />

            <TimelineStop
              icon={isRetour ? "home" : "school"}
              title={isRetour ? t.home : schoolName}
              subtitle={t.schoolArrival}
              time={timing.formatted.schoolTime}
              badge={schoolBadge}
              isFirst={false}
              hasNext={false}
              isRTL={isRTL}
            />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

/* ──────────────────── DriverCard Sub-Component ──────────────────────── */
const DriverCard = ({
  name,
  isOnline,
  avatarUri,
  rating,
  carModel,
  plateNumber,
  onCall,
  onMessage,
  hasPhone,
  translations,
  isRTL,
}) => {
  const filledStars = Math.round(Math.max(0, Math.min(5, rating)));

  return (
    <View style={[styles.card, styles.driverCard]}>
      <View style={[styles.driverTopRow, isRTL && styles.rowReverse]}>
        <View style={styles.driverAvatarWrapper}>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.driverAvatarImage}
            />
          ) : (
            <View style={styles.driverAvatarFallback}>
              <MaterialIcons name="person" size={24} color={colors.surface} />
            </View>
          )}
          <View
            style={[
              styles.onlineDot,
              {
                backgroundColor: isOnline
                  ? colors.success
                  : colors.textTertiary,
              },
            ]}
          />
        </View>

        <View style={styles.driverInfo}>
          <View style={[styles.driverTitleRow, isRTL && styles.rowReverse]}>
            <Text style={[styles.cardLabel, isRTL && styles.rtl]}>
              {translations.captain}
            </Text>
            <View
              style={[
                styles.trustBadge,
                isRTL && { flexDirection: "row-reverse" },
              ]}
            >
              <MaterialIcons name="verified" size={12} color={colors.primary} />
              <Text style={styles.trustBadgeText}>
                {translations.trustedCaptain}
              </Text>
            </View>
          </View>
          <Text style={[styles.driverName, isRTL && styles.rtl]}>{name}</Text>
          <View style={[styles.ratingRow, isRTL && styles.rowReverse]}>
            <View
              style={[
                styles.starRow,
                isRTL && { flexDirection: "row-reverse" },
              ]}
            >
              {Array.from({ length: 5 }).map((_, index) => (
                <MaterialIcons
                  key={`star-${index + 1}`}
                  name={index < filledStars ? "star" : "star-border"}
                  size={14}
                  color="#F59E0B"
                />
              ))}
            </View>
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            <Text style={styles.ratingLabel}>{translations.rating}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.driverMetaRow, isRTL && styles.rowReverse]}>
        <View style={[styles.driverMetaItem, isRTL && styles.rowReverse]}>
          <MaterialIcons
            name="directions-car"
            size={15}
            color={colors.primary}
          />
          <Text style={styles.driverMetaText} numberOfLines={1}>
            {translations.carModel}: {carModel}
          </Text>
        </View>
        <View style={[styles.driverMetaItem, isRTL && styles.rowReverse]}>
          <MaterialIcons name="push-pin" size={15} color={colors.primary} />
          <Text style={styles.driverMetaText} numberOfLines={1}>
            {translations.plateNumber}: {plateNumber || "—"}
          </Text>
        </View>
      </View>

      <View style={styles.contactActionsRow}>
        <TouchableOpacity
          style={[
            styles.contactPrimaryButton,
            !hasPhone && styles.actionButtonDisabled,
          ]}
          onPress={onCall}
          disabled={!hasPhone}
          activeOpacity={0.8}
        >
          <MaterialIcons name="call" size={18} color={colors.surface} />
          <Text style={styles.contactPrimaryText}>
            {translations.callDriver}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.contactSecondaryButton,
            !hasPhone && styles.actionButtonDisabled,
          ]}
          onPress={onMessage}
          disabled={!hasPhone}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="message"
            size={18}
            color={hasPhone ? colors.primary : colors.textTertiary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* ──────────────────── PickupCard Sub-Component ──────────────────────── */
const PickupCard = ({
  station,
  timing,
  address,
  translations,
  isRTL,
  studentOrder,
}) => (
  <View style={[styles.card, styles.pickupCardBorder]}>
    <View
      style={[
        styles.pickupCardHeader,
        isRTL && { flexDirection: "row-reverse" },
      ]}
    >
      <View style={styles.pickupIcon}>
        <MaterialIcons name="location-on" size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, isRTL && styles.rtl]}>
          {translations.pickupLocation}
        </Text>
        <Text style={[styles.pickupSubtitle, isRTL && styles.rtl]}>
          {translations.pickupOrder} {studentOrder}
        </Text>
      </View>
    </View>
    <View style={styles.pickupAddressBlock}>
      <Text
        style={[styles.pickupAddressText, isRTL && styles.rtl]}
        numberOfLines={2}
      >
        {address}
      </Text>
    </View>

    <View
      style={[styles.pickupStatsRow, isRTL && { flexDirection: "row-reverse" }]}
    >
      <View style={[styles.pickupInlineStat, isRTL && styles.rowReverse]}>
        <MaterialIcons
          name="directions-walk"
          size={14}
          color={colors.primary}
        />
        <Text style={styles.pickupInlineText}>
          {formatWalkTime(timing.walkTimeMinutes)}
        </Text>
      </View>
      <View style={[styles.pickupInlineStat, isRTL && styles.rowReverse]}>
        <MaterialIcons name="near-me" size={14} color={colors.primary} />
        <Text style={styles.pickupInlineText}>
          {formatWalkDistance(station.walkDistMeters)}
        </Text>
      </View>
      <View
        style={[
          styles.pickupRangeTag,
          !station.withinConstraint && styles.pickupRangeTagWarning,
        ]}
      >
        <Text
          style={[
            styles.pickupRangeText,
            !station.withinConstraint && { color: colors.warning },
          ]}
        >
          {formatWalkDistance(station.walkDistMeters)}
        </Text>
      </View>
    </View>
  </View>
);

/* ──────────────────── TimelineStop Sub-Component ──────────────────── */
const TimelineStop = ({
  icon,
  title,
  subtitle,
  time,
  badge,
  isFirst,
  hasNext,
  isRTL,
  detail,
}) => {
  const badgeColors = colors.badges[badge] || colors.badges.SOON;

  return (
    <View style={styles.timelineItem}>
      {/* Left column: Icon and line */}
      <View style={styles.timelineLeft}>
        <View
          style={[
            styles.timelineIcon,
            badge === "NOW" && styles.timelineIconActive,
          ]}
        >
          <MaterialIcons name={icon} size={18} color={colors.surface} />
        </View>
        {hasNext && <View style={styles.timelineLine} />}
      </View>

      {/* Right column: Content */}
      <View
        style={[
          styles.timelineRight,
          isRTL && { paddingRight: 12, paddingLeft: 0 },
        ]}
      >
        <View
          style={[
            styles.timelineHeader,
            isRTL && { flexDirection: "row-reverse" },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.timelineTime, isRTL && styles.rtl]}>
              {time}
            </Text>
            <Text style={[styles.timelineStopTitle, isRTL && styles.rtl]}>
              {title}
            </Text>
            <Text style={[styles.timelineSubtitle, isRTL && styles.rtl]}>
              {subtitle}
            </Text>
          </View>
          <View style={[styles.badgeBox, { backgroundColor: badgeColors.bg }]}>
            <Text style={[styles.badgeText, { color: badgeColors.text }]}>
              {badge}
            </Text>
          </View>
        </View>
        {detail}
      </View>
    </View>
  );
};

/* ──────────────────── TimelineTravelHint Sub-Component ──────────────────── */
const TimelineTravelHint = ({ icon, text, isRTL }) => (
  <View style={styles.timelineTravelRow}>
    <View style={styles.timelineLeft}>
      <View style={styles.timelineTravelDot} />
    </View>
    <View
      style={[
        styles.timelineTravelRight,
        isRTL && { paddingRight: 12, paddingLeft: 0 },
      ]}
    >
      <View style={[styles.timelineTravelPill, isRTL && styles.rowReverse]}>
        <MaterialIcons name={icon} size={14} color={colors.primary} />
        <Text style={[styles.timelineTravelText, isRTL && styles.rtl]}>
          {text}
        </Text>
      </View>
    </View>
  </View>
);

/* ═════════════════════════════ Styles ════════════════════════════════ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* ──── MAP SECTION ──── */
  mapContainer: {
    height: "60%",
    position: "relative",
  },
  mapContainerFull: {
    height: "75%",
  },
  map: {
    flex: 1,
  },
  mapHeader: {
    position: "absolute",
    top: Platform.OS === "ios" ? 12 : 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: UbuntuFonts.bold,
    color: colors.text,
    flex: 1,
    textAlign: "center",
  },
  returnHomeButton: {
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 14,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingBadge: {
    position: "absolute",
    top: 126,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingText: {
    fontSize: 12,
    fontFamily: UbuntuFonts.medium,
    color: colors.primary,
  },

  /* ──── MAP HEADER STAT ──── */
  mapHeaderStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0F172A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
  },
  liveText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: UbuntuFonts.bold,
    letterSpacing: 1,
  },
  mapHeaderStatChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 4,
  },
  mapHeaderStatIcon: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  mapHeaderStatLabel: {
    fontSize: 9,
    fontFamily: UbuntuFonts.semiBold,
    color: "rgba(255, 255, 255, 0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  mapHeaderStatValue: {
    fontSize: 12,
    fontFamily: UbuntuFonts.bold,
    color: "#FFFFFF",
    marginTop: 1,
  },
  distanceChip: {
    position: "absolute",
    top: "50%",
    left: 14,
    transform: [{ translateY: -24 }],
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 4,
  },
  distanceChipRtl: {
    left: undefined,
    right: 14,
  },
  returnHomeText: {
    fontSize: 13,
    fontFamily: UbuntuFonts.bold,
    color: colors.text,
  },

  /* ──── BOTTOM SHEET ──── */
  bottomSheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 20,
    zIndex: 2,
  },
  handleWrapper: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: "center",
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: colors.surfaceSecondary,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
    gap: 2,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  tabTxt: {
    fontSize: 13,
    fontFamily: UbuntuFonts.bold,
    color: colors.textSecondary,
  },
  tabTxtActive: {
    color: "#FFFFFF",
  },
  tabSubTxt: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  tabSubTxtActive: {
    color: "rgba(255,255,255,0.75)",
  },

  /* ──── CARDS ──── */
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: UbuntuFonts.bold,
    color: colors.text,
  },
  cardLabel: {
    fontSize: 11,
    fontFamily: UbuntuFonts.semiBold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  /* ──── DRIVER CARD ──── */
  driverCard: {
    borderColor: "#DBEAFE",
  },
  driverTopRow: {
    flexDirection: "row",
    gap: 12,
  },
  driverAvatarWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    position: "relative",
  },
  driverAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
  },
  driverAvatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.surface,
    right: 1,
    bottom: 1,
  },
  driverInfo: {
    flex: 1,
  },
  driverTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trustBadgeText: {
    fontSize: 10,
    fontFamily: UbuntuFonts.semiBold,
    color: colors.primary,
  },
  driverName: {
    fontSize: 18,
    fontFamily: UbuntuFonts.bold,
    color: colors.text,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: UbuntuFonts.bold,
    color: colors.text,
  },
  ratingLabel: {
    fontSize: 11,
    fontFamily: UbuntuFonts.medium,
    color: colors.textSecondary,
  },
  driverMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  driverMetaItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  driverMetaText: {
    flex: 1,
    fontSize: 11,
    fontFamily: UbuntuFonts.medium,
    color: colors.text,
  },
  contactActionsRow: {
    flexDirection: "row",
    marginTop: 14,
    gap: 10,
  },
  contactPrimaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  contactPrimaryText: {
    fontSize: 14,
    fontFamily: UbuntuFonts.bold,
    color: colors.surface,
  },
  contactSecondaryButton: {
    width: 52,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },

  /* ──── PICKUP CARD ──── */
  pickupCardBorder: {
    borderColor: "#DBEAFE",
    backgroundColor: "#F8FBFF",
    borderRadius: 24,
  },
  pickupCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  pickupIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  pickupSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: UbuntuFonts.medium,
    marginTop: 2,
  },
  pickupAddressBlock: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  pickupAddressText: {
    fontSize: 14,
    fontFamily: UbuntuFonts.bold,
    color: colors.text,
  },
  pickupStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickupInlineStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  pickupInlineText: {
    fontSize: 12,
    fontFamily: UbuntuFonts.semiBold,
    color: colors.text,
  },
  pickupRangeTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.successLight,
  },
  pickupRangeTagWarning: {
    backgroundColor: colors.warningLight,
  },
  pickupRangeText: {
    fontSize: 11,
    fontFamily: UbuntuFonts.bold,
    color: colors.success,
  },

  /* ──── TIMELINE ──── */
  timelineWrapper: {
    marginTop: 4,
  },
  timelineSectionTitle: {
    fontSize: 14,
    fontFamily: UbuntuFonts.bold,
    color: colors.text,
    marginBottom: 14,
  },
  timelineItem: {
    flexDirection: "row",
    minHeight: 90,
  },
  timelineLeft: {
    width: 40,
    alignItems: "center",
    paddingTop: 8,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.textSecondary,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  timelineIconActive: {
    backgroundColor: colors.success,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  timelineRight: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 14,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  timelineTime: {
    fontSize: 15,
    fontFamily: UbuntuFonts.bold,
    color: colors.text,
    marginBottom: 2,
  },
  timelineStopTitle: {
    fontSize: 13,
    fontFamily: UbuntuFonts.bold,
    color: colors.text,
    marginBottom: 2,
  },
  timelineSubtitle: {
    fontSize: 11,
    fontFamily: UbuntuFonts.medium,
    color: colors.textSecondary,
  },
  timelineDetail: {
    fontSize: 11,
    fontFamily: UbuntuFonts.medium,
    color: colors.primary,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timelineTravelRow: {
    flexDirection: "row",
    marginTop: -4,
    marginBottom: 8,
  },
  timelineTravelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary,
    marginTop: 10,
  },
  timelineTravelRight: {
    flex: 1,
    paddingLeft: 12,
  },
  timelineTravelPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timelineTravelText: {
    fontSize: 11,
    fontFamily: UbuntuFonts.semiBold,
    color: colors.textSecondary,
  },
  badgeBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: UbuntuFonts.bold,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  /* ──── RTL SUPPORT ──── */
  rtl: {
    textAlign: "right",
  },
});

export default TripDetailsScreen;
