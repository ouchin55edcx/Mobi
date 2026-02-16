import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { MaterialIcons } from "@expo/vector-icons";

import MapboxRoutePreview from "../../components/MapboxRoutePreview";
import { getDirectionsRoute } from "../../src/services/mapboxService";
import { UbuntuFonts } from "../../src/utils/fonts";

const COLORS = {
  primary: "#1E88E5",
  primaryDark: "#1565C0",
  accent: "#E3F2FD",
  white: "#FFFFFF",
  bg: "#F5F9FF",
  text: "#0F172A",
  subtext: "#64748B",
  border: "#D6E9FF",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#DC2626",
};

const COPY = {
  en: {
    title: "Trip Details",
    liveTrip: "Live Trip",
    loading: "Loading trip details...",
    invalid: "Trip data is incomplete. Please go back and try again.",
    routeToSchool: "Route to school",
    from: "From",
    to: "To",
    pickupTime: "Pickup Time",
    eta: "ETA",
    distance: "Distance",
    busCapacity: "Bus",
    schoolName: "School",
    onTheWay: "On the way",
    routeSync: "Syncing best route...",
    grouping: "Assigning a group",
    call: "Call",
    message: "Message",
    noPhone: "Phone unavailable",
  },
  ar: {
    title: "تفاصيل الرحلة",
    liveTrip: "رحلة مباشرة",
    loading: "جاري تحميل تفاصيل الرحلة...",
    invalid: "بيانات الرحلة غير مكتملة. ارجع وحاول مرة أخرى.",
    routeToSchool: "المسار إلى المدرسة",
    from: "من",
    to: "إلى",
    pickupTime: "وقت الالتقاط",
    eta: "وقت الوصول",
    distance: "المسافة",
    busCapacity: "الحافلة",
    schoolName: "المدرسة",
    onTheWay: "في الطريق",
    routeSync: "جاري مزامنة أفضل مسار...",
    grouping: "جاري تعيين المجموعة",
    call: "اتصال",
    message: "رسالة",
    noPhone: "رقم غير متوفر",
  },
};

const isValidCoordinate = (point) => {
  if (!point) return false;
  const lat = Number(point.latitude);
  const lng = Number(point.longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
};

const normalizeCoordinate = (point, fallback = null) => {
  if (isValidCoordinate(point)) {
    return {
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
    };
  }
  return fallback;
};

const sanitizeLine = (line, start, end) => {
  if (!Array.isArray(line)) return [start, end].filter(Boolean);
  const points = line
    .map((point) => normalizeCoordinate(point, null))
    .filter(Boolean);
  if (points.length >= 2) return points;
  return [start, end].filter(Boolean);
};

const toRadians = (value) => (value * Math.PI) / 180;
const haversineKm = (a, b) => {
  if (!a || !b) return 0;
  const R = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const routeDistanceKm = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < coordinates.length - 1; i += 1) {
    total += haversineKm(coordinates[i], coordinates[i + 1]);
  }
  return total;
};

const formatTime = (value) => {
  if (!value) return "--:--";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const formatDistance = (distanceKm) => {
  if (!Number.isFinite(distanceKm)) return "--";
  return `${distanceKm.toFixed(distanceKm >= 10 ? 0 : 1)} km`;
};

const TripDetailsScreen = ({ tripData, language = "en", onBack }) => {
  const text = COPY[language] || COPY.en;
  const isRTL = language === "ar";
  const handleBack = onBack || (() => {});

  const [isHydrating, setIsHydrating] = useState(true);
  const [isResolvingRoute, setIsResolvingRoute] = useState(false);
  const mountedRef = useRef(true);

  const safeTrip = useMemo(() => {
    const fallbackHome = { latitude: 33.5731, longitude: -7.5898 };
    const fallbackSchool = { latitude: 33.58, longitude: -7.592 };

    const studentLocation = normalizeCoordinate(
      tripData?.homeLocation,
      fallbackHome,
    );
    const schoolLocation = normalizeCoordinate(
      tripData?.destinationLocation,
      fallbackSchool,
    );
    const pickupLocation = normalizeCoordinate(
      tripData?.pickupLocation,
      studentLocation,
    );

    const routeCoordinates = sanitizeLine(
      tripData?.routeCoordinates,
      pickupLocation,
      schoolLocation,
    );

    const estimatedDistanceKm = Number.isFinite(tripData?.totalDistanceKm)
      ? tripData.totalDistanceKm
      : routeDistanceKm(routeCoordinates);

    const etaMinutes = Number.isFinite(tripData?.estimatedArrivalMinutes)
      ? tripData.estimatedArrivalMinutes
      : Math.max(1, Math.round((estimatedDistanceKm / 24) * 60));

    return {
      studentLocation,
      schoolLocation,
      pickupLocation,
      routeCoordinates,
      pickupTime: tripData?.leaveHomeTime || tripData?.startTime || null,
      schoolName:
        tripData?.schoolName || tripData?.destinationName || text.schoolName,
      etaMinutes,
      distanceKm: estimatedDistanceKm,
      busUsed: Number.isFinite(tripData?.membersCount)
        ? tripData.membersCount
        : Number.isFinite(tripData?.busUsed)
          ? tripData.busUsed
          : 1,
      busTotal: Number.isFinite(tripData?.capacity)
        ? tripData.capacity
        : Number.isFinite(tripData?.busCapacity)
          ? tripData.busCapacity
          : 12,
      driverName: tripData?.driverName || "Mobi Driver",
      driverPhone: tripData?.driverPhone || null,
      busNumber: tripData?.vehicleInfo || tripData?.busNumber || "BUS-01",
      processingState: tripData?.processingState || null,
    };
  }, [tripData, text.schoolName]);

  const [displayRoute, setDisplayRoute] = useState(safeTrip.routeCoordinates);
  const [distanceKm, setDistanceKm] = useState(safeTrip.distanceKm);
  const [etaMinutes, setEtaMinutes] = useState(safeTrip.etaMinutes);

  const canRenderMap =
    isValidCoordinate(safeTrip.pickupLocation) &&
    isValidCoordinate(safeTrip.schoolLocation) &&
    Array.isArray(displayRoute) &&
    displayRoute.length >= 2;

  useEffect(() => {
    mountedRef.current = true;
    const timer = setTimeout(() => {
      if (mountedRef.current) setIsHydrating(false);
    }, 240);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const fallbackLine = sanitizeLine(
      safeTrip.routeCoordinates,
      safeTrip.pickupLocation,
      safeTrip.schoolLocation,
    );
    setDisplayRoute(fallbackLine);
    setDistanceKm(safeTrip.distanceKm);
    setEtaMinutes(safeTrip.etaMinutes);

    const resolveRoute = async () => {
      if (
        !isValidCoordinate(safeTrip.pickupLocation) ||
        !isValidCoordinate(safeTrip.schoolLocation)
      ) {
        return;
      }

      setIsResolvingRoute(true);
      try {
        const route = await getDirectionsRoute({
          origin: safeTrip.pickupLocation,
          destination: safeTrip.schoolLocation,
        });

        if (!active) return;

        const bestLine = sanitizeLine(
          route?.coordinates,
          safeTrip.pickupLocation,
          safeTrip.schoolLocation,
        );

        setDisplayRoute(bestLine);

        const resolvedDistanceKm =
          route?.distanceMeters > 0
            ? route.distanceMeters / 1000
            : routeDistanceKm(bestLine);

        const resolvedEtaMinutes =
          route?.durationSeconds > 0
            ? Math.max(1, Math.round(route.durationSeconds / 60))
            : Math.max(1, Math.round((resolvedDistanceKm / 24) * 60));

        setDistanceKm(resolvedDistanceKm);
        setEtaMinutes(resolvedEtaMinutes);
      } catch (_error) {
        if (!active) return;
        setDisplayRoute(fallbackLine);
      } finally {
        if (active) setIsResolvingRoute(false);
      }
    };

    resolveRoute();

    return () => {
      active = false;
    };
  }, [
    safeTrip.pickupLocation,
    safeTrip.schoolLocation,
    safeTrip.routeCoordinates,
    safeTrip.distanceKm,
    safeTrip.etaMinutes,
  ]);

  const openCall = async () => {
    if (!safeTrip.driverPhone) return;
    const url = `tel:${safeTrip.driverPhone}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) Linking.openURL(url);
  };

  const openMessage = async () => {
    if (!safeTrip.driverPhone) return;
    const url = `sms:${safeTrip.driverPhone}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) Linking.openURL(url);
  };

  if (isHydrating) {
    return (
      <SafeAreaView style={styles.loaderScreen}>
        <StatusBar style="dark" />
        <View style={styles.skeletonMap} />
        <View style={styles.skeletonCard} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>{text.loading}</Text>
      </SafeAreaView>
    );
  }

  if (!canRenderMap) {
    return (
      <SafeAreaView style={styles.loaderScreen}>
        <StatusBar style="dark" />
        <MaterialIcons name="error-outline" size={36} color={COLORS.danger} />
        <Text style={styles.errorText}>{text.invalid}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />

      <View style={styles.mapStage}>
        <MapboxRoutePreview
          style={styles.map}
          homeLocation={safeTrip.pickupLocation}
          destinationLocation={safeTrip.schoolLocation}
          routeCoordinates={displayRoute}
          interactive
          showRoute
          studentLabel={language === "ar" ? "نقطة الانطلاق" : "Pickup"}
          schoolLabel={language === "ar" ? "المدرسة" : "School"}
        />

        <View style={styles.topOverlay}>
          <TouchableOpacity style={styles.topBarBtn} onPress={handleBack}>
            <MaterialIcons
              name={isRTL ? "arrow-forward-ios" : "arrow-back-ios"}
              size={16}
              color={COLORS.text}
            />
          </TouchableOpacity>

          <View style={styles.topTitleWrap}>
            <Text
              style={[styles.topBarTitle, isRTL && styles.rtl]}
              numberOfLines={1}
            >
              {text.title}
            </Text>
            <Text
              style={[styles.topBarSub, isRTL && styles.rtl]}
              numberOfLines={1}
            >
              {text.liveTrip}
            </Text>
          </View>

          <View style={styles.topStatusChip}>
            <View style={styles.statusDot} />
            <Text style={styles.topStatusText}>{text.onTheWay}</Text>
          </View>
        </View>

        {isResolvingRoute && (
          <View style={styles.mapSyncChip}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.mapSyncText}>{text.routeSync}</Text>
          </View>
        )}
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandleArea}>
          <View style={styles.sheetHandle} />
        </View>

        <ScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.routeCard}>
            <Text style={styles.routeCardTitle}>{text.routeToSchool}</Text>

            <View style={styles.routeLine}>
              <View style={styles.routeDotStart} />
              <View style={styles.routeLineDivider} />
              <View style={styles.routeDotEnd} />
            </View>

            <View style={styles.routeRows}>
              <View style={styles.routeRow}>
                <Text style={styles.routeLabel}>{text.from}</Text>
                <Text style={styles.routeValue} numberOfLines={1}>
                  {formatTime(safeTrip.pickupTime)}
                </Text>
              </View>

              <View style={styles.routeRow}>
                <Text style={styles.routeLabel}>{text.to}</Text>
                <Text style={styles.routeValue} numberOfLines={1}>
                  {safeTrip.schoolName}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.quickStatsRow}>
            <View style={styles.statPill}>
              <MaterialIcons name="schedule" size={15} color={COLORS.primary} />
              <Text style={styles.statLabel}>{text.eta}</Text>
              <Text style={styles.statValue}>{etaMinutes} min</Text>
            </View>

            <View style={styles.statPill}>
              <MaterialIcons name="route" size={15} color={COLORS.primary} />
              <Text style={styles.statLabel}>{text.distance}</Text>
              <Text style={styles.statValue}>{formatDistance(distanceKm)}</Text>
            </View>

            <View style={styles.statPill}>
              <MaterialIcons
                name="directions-bus"
                size={15}
                color={COLORS.primary}
              />
              <Text style={styles.statLabel}>{text.busCapacity}</Text>
              <Text style={styles.statValue}>
                {safeTrip.busUsed}/{safeTrip.busTotal}
              </Text>
            </View>
          </View>

          <View style={styles.driverCard}>
            <View style={styles.driverLeft}>
              <View style={styles.driverAvatar}>
                <MaterialIcons name="person" size={20} color={COLORS.white} />
              </View>

              <View style={styles.driverMeta}>
                <Text style={styles.driverName} numberOfLines={1}>
                  {safeTrip.driverName}
                </Text>
                <Text style={styles.driverBus} numberOfLines={1}>
                  {safeTrip.busNumber}
                </Text>
                {safeTrip.processingState === "grouping_in_progress" ? (
                  <Text style={styles.groupingHint}>{text.grouping}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.contactBtn,
                  !safeTrip.driverPhone && styles.disabledBtn,
                ]}
                onPress={openCall}
                disabled={!safeTrip.driverPhone}
              >
                <MaterialIcons
                  name="call"
                  size={18}
                  color={safeTrip.driverPhone ? COLORS.primary : "#94A3B8"}
                />
                <Text
                  style={[
                    styles.contactText,
                    !safeTrip.driverPhone && styles.disabledText,
                  ]}
                >
                  {safeTrip.driverPhone ? text.call : text.noPhone}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.contactBtn,
                  !safeTrip.driverPhone && styles.disabledBtn,
                ]}
                onPress={openMessage}
                disabled={!safeTrip.driverPhone}
              >
                <MaterialIcons
                  name="chat-bubble-outline"
                  size={18}
                  color={safeTrip.driverPhone ? COLORS.primary : "#94A3B8"}
                />
                <Text
                  style={[
                    styles.contactText,
                    !safeTrip.driverPhone && styles.disabledText,
                  ]}
                >
                  {safeTrip.driverPhone ? text.message : text.noPhone}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loaderScreen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  skeletonMap: {
    width: "100%",
    height: 190,
    borderRadius: 18,
    backgroundColor: "#EAF3FF",
  },
  skeletonCard: {
    width: "100%",
    height: 160,
    borderRadius: 18,
    backgroundColor: "#EAF3FF",
  },
  loaderText: {
    color: COLORS.subtext,
    fontFamily: UbuntuFonts.medium,
    fontSize: 14,
  },
  errorText: {
    color: COLORS.text,
    textAlign: "center",
    fontFamily: UbuntuFonts.medium,
    fontSize: 14,
  },
  backBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtnText: {
    color: COLORS.white,
    fontFamily: UbuntuFonts.semiBold,
    fontSize: 13,
  },
  rtl: {
    textAlign: "right",
  },
  mapStage: {
    width: "100%",
    flex: 7,
  },
  map: {
    flex: 1,
  },
  topOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  topBarBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF6FF",
  },
  topTitleWrap: {
    flex: 1,
  },
  topBarTitle: {
    color: COLORS.text,
    fontFamily: UbuntuFonts.bold,
    fontSize: 15,
    marginBottom: 1,
  },
  topBarSub: {
    color: COLORS.subtext,
    fontFamily: UbuntuFonts.medium,
    fontSize: 11,
  },
  topStatusChip: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  topStatusText: {
    color: "#047857",
    fontFamily: UbuntuFonts.semiBold,
    fontSize: 11,
  },
  mapSyncChip: {
    position: "absolute",
    top: 74,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapSyncText: {
    color: COLORS.primaryDark,
    fontFamily: UbuntuFonts.medium,
    fontSize: 12,
  },
  bottomSheet: {
    flex: 3,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: Platform.OS === "ios" ? 0.14 : 0,
    shadowRadius: 12,
    elevation: 14,
  },
  sheetHandleArea: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 6,
  },
  sheetHandle: {
    width: 52,
    height: 5,
    borderRadius: 4,
    backgroundColor: "#C6DEFF",
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 22,
  },
  routeCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#F8FBFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  routeCardTitle: {
    color: COLORS.text,
    fontFamily: UbuntuFonts.semiBold,
    fontSize: 14,
    marginBottom: 10,
  },
  routeLine: {
    position: "absolute",
    left: 18,
    top: 41,
    bottom: 14,
    alignItems: "center",
  },
  routeDotStart: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  routeLineDivider: {
    width: 2,
    flex: 1,
    marginVertical: 3,
    backgroundColor: "#BFDBFE",
  },
  routeDotEnd: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
  },
  routeRows: {
    marginLeft: 24,
    gap: 12,
  },
  routeRow: {
    gap: 2,
  },
  routeLabel: {
    color: COLORS.subtext,
    fontFamily: UbuntuFonts.medium,
    fontSize: 11,
  },
  routeValue: {
    color: COLORS.text,
    fontFamily: UbuntuFonts.semiBold,
    fontSize: 13,
  },
  quickStatsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 2,
  },
  statLabel: {
    color: COLORS.subtext,
    fontFamily: UbuntuFonts.medium,
    fontSize: 11,
  },
  statValue: {
    color: COLORS.primaryDark,
    fontFamily: UbuntuFonts.bold,
    fontSize: 13,
  },
  driverCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    padding: 12,
  },
  driverLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  driverAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  driverMeta: {
    flex: 1,
  },
  driverName: {
    color: COLORS.text,
    fontFamily: UbuntuFonts.semiBold,
    fontSize: 14,
    marginBottom: 1,
  },
  driverBus: {
    color: COLORS.subtext,
    fontFamily: UbuntuFonts.medium,
    fontSize: 12,
  },
  groupingHint: {
    marginTop: 3,
    color: COLORS.warning,
    fontFamily: UbuntuFonts.medium,
    fontSize: 11,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  contactBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: "#F8FBFF",
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  contactText: {
    color: COLORS.primary,
    fontFamily: UbuntuFonts.semiBold,
    fontSize: 13,
  },
  disabledBtn: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  disabledText: {
    color: "#94A3B8",
  },
});

export default TripDetailsScreen;
