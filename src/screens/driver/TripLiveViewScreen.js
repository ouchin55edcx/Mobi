import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Linking,
  Animated,
  Vibration,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import MapView, { Marker, Callout, Polyline, UrlTile } from "react-native-maps";
import { UbuntuFonts } from "../../shared/utils/fonts";
import { getDirectionsRoute, getOptimizedRoute } from "../../shared/services/mapboxService";
import { mockTrip } from "../../mocks/mockDriverData";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const STATUS_WAITING = "waiting";
const STATUS_PICKED = "picked";
const STATUS_SKIPPED = "skipped";
const PICKUP_RADIUS_KM = 0.06;

// ─── Design tokens ────────────────────────────────────────────────────────────
const COLORS = {
  primary: "#1D4ED8",
  primaryLight: "#3B82F6",
  primarySurface: "#EFF6FF",
  success: "#16A34A",
  successLight: "#DCFCE7",
  danger: "#DC2626",
  dangerLight: "#FEE2E2",
  warning: "#D97706",
  warningLight: "#FEF3C7",
  neutral900: "#0F172A",
  neutral700: "#334155",
  neutral500: "#64748B",
  neutral300: "#CBD5E1",
  neutral100: "#F1F5F9",
  white: "#FFFFFF",
  overlay: "rgba(15,23,42,0.55)",
};
// ──────────────────────────────────────────────────────────────────────────────

const translations = {
  en: {
    live: "LIVE",
    nextStop: "Next Stop",
    noStopsLeft: "All students picked up",
    distanceRemaining: "Distance",
    etaRemaining: "ETA",
    elapsed: "Elapsed",
    waiting: "Waiting",
    picked: "Picked",
    skipped: "Skipped",
    status: "Status",
    pickupTime: "Pickup ETA",
    toPickup: "To Pickup",
    call: "Call",
    endTrip: "End Trip",
    back: "Back",
    km: "km",
    min: "min",
    atPickupPoint: "At pickup point",
    notAtPickupPoint: "Not at pickup",
    enRoute: "En route",
    school: "School",
    bus: "Bus",
    students: "Students",
    tripProgress: "Trip Progress",
    stops: "stops",
    completed: "completed",
  },
  ar: {
    live: "مباشر",
    nextStop: "المحطة التالية",
    noStopsLeft: "تم استلام جميع الطلاب",
    distanceRemaining: "المسافة",
    etaRemaining: "الوقت المتبقي",
    elapsed: "المنقضي",
    waiting: "بانتظار",
    picked: "تم الاستلام",
    skipped: "تم التخطي",
    status: "الحالة",
    pickupTime: "وقت الوصول",
    toPickup: "حتى نقطة الاستلام",
    call: "اتصال",
    endTrip: "إنهاء الرحلة",
    back: "رجوع",
    km: "كم",
    min: "د",
    atPickupPoint: "عند نقطة الاستلام",
    notAtPickupPoint: "ليس عند النقطة",
    enRoute: "في الطريق",
    school: "المدرسة",
    bus: "الحافلة",
    students: "الطلاب",
    tripProgress: "تقدم الرحلة",
    stops: "محطات",
    completed: "مكتملة",
  },
};

const normalizeStatus = (status) => {
  if (status === STATUS_PICKED) return STATUS_PICKED;
  if (status === STATUS_SKIPPED) return STATUS_SKIPPED;
  return STATUS_WAITING;
};

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDistance = (km) => {
  if (!Number.isFinite(km) || km <= 0) return "0.0";
  return km < 10 ? km.toFixed(1) : km.toFixed(0);
};

const formatDuration = (minutes) => {
  if (!Number.isFinite(minutes) || minutes <= 0) return "1";
  return String(Math.max(1, Math.round(minutes)));
};

const formatClockFromNow = (etaSeconds, locale) => {
  if (!Number.isFinite(etaSeconds)) return "--:--";
  const d = new Date(Date.now() + etaSeconds * 1000);
  return d.toLocaleTimeString(locale === "ar" ? "ar-MA" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatElapsed = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

const getStatusColor = (status) => {
  if (status === STATUS_PICKED) return COLORS.success;
  if (status === STATUS_SKIPPED) return COLORS.danger;
  return COLORS.primary;
};

const getStudentInitials = (name) => {
  if (!name || typeof name !== "string") return "ST";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const buildLiveTripSeed = (incomingTripData, isDemo) => {
  const demoSeed = {
    ...mockTrip,
    students: (mockTrip.students || []).map((student) => ({
      ...student,
      status: normalizeStatus(student?.status),
      etaSeconds: student?.etaSeconds ?? null,
    })),
  };

  if (isDemo) {
    if (!incomingTripData) return demoSeed;
    return {
      ...demoSeed,
      ...incomingTripData,
      students: (incomingTripData.students?.length
        ? incomingTripData.students
        : demoSeed.students
      ).map((student) => ({
        ...student,
        status: normalizeStatus(student?.status),
      })),
      destinationLocation:
        incomingTripData.destinationLocation || demoSeed.destinationLocation,
      parkingLocation:
        incomingTripData.parkingLocation || demoSeed.parkingLocation,
      destination: incomingTripData.destination || demoSeed.destination,
    };
  }

  if (!incomingTripData) {
    return {
      students: [],
      destinationLocation: { latitude: 33.58, longitude: -7.592 },
    };
  }

  return {
    ...incomingTripData,
    students: (incomingTripData.students || []).map((student) => ({
      ...student,
      status: normalizeStatus(student?.status),
    })),
    destinationLocation: incomingTripData.destinationLocation || {
      latitude: 33.58,
      longitude: -7.592,
    },
  };
};

// ─── Map Markers ──────────────────────────────────────────────────────────────

const DriverMarker = React.memo(() => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.15,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={markerStyles.driverWrapper}>
      <Animated.View
        style={[markerStyles.driverPulse, { transform: [{ scale: pulse }] }]}
      />
      <View style={markerStyles.driverCore}>
        <MaterialIcons name="directions-bus" size={20} color={COLORS.white} />
      </View>
    </View>
  );
});

const SchoolMarker = React.memo(({ label }) => (
  <View style={markerStyles.schoolWrapper}>
    <View style={markerStyles.schoolCore}>
      <MaterialIcons name="school" size={16} color={COLORS.white} />
    </View>
    <View style={markerStyles.schoolTail} />
    {label ? (
      <View style={markerStyles.schoolLabel}>
        <Text style={markerStyles.schoolLabelText} numberOfLines={1}>
          {label}
        </Text>
      </View>
    ) : null}
  </View>
));

const StudentMarker = React.memo(
  ({ name, status, isNext }) => {
    const scale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 0.85,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();
    }, [status]);

    const initials = getStudentInitials(name);
    const isPicked = status === STATUS_PICKED;
    const isSkipped = status === STATUS_SKIPPED;

    const bgColor = isPicked
      ? COLORS.success
      : isSkipped
        ? COLORS.danger
        : isNext
          ? COLORS.primary
          : "#64748B";

    return (
      <View
        style={[
          markerStyles.studentWrapper,
          isNext && markerStyles.studentWrapperNext,
        ]}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <View style={[markerStyles.studentCore, { backgroundColor: bgColor }]}>
            {isPicked ? (
              <MaterialIcons name="check" size={14} color={COLORS.white} />
            ) : isSkipped ? (
              <MaterialIcons name="close" size={14} color={COLORS.white} />
            ) : (
              <Text style={markerStyles.studentInitials}>{initials}</Text>
            )}
          </View>
        </Animated.View>
        {isNext && (
          <View style={markerStyles.nextPip}>
            <View style={markerStyles.nextPipDot} />
          </View>
        )}
      </View>
    );
  },
  (prev, next) =>
    prev.name === next.name &&
    prev.status === next.status &&
    prev.isNext === next.isNext,
);

// ─── Student Row ──────────────────────────────────────────────────────────────

const StudentRow = React.memo(({ student, isNext, onCall, t }) => {
  const status = normalizeStatus(student.status);
  const isPicked = status === STATUS_PICKED;
  const isSkipped = status === STATUS_SKIPPED;
  const isWaiting = status === STATUS_WAITING;

  const statusColor = isPicked
    ? COLORS.success
    : isSkipped
      ? COLORS.danger
      : COLORS.primary;
  const statusBg = isPicked
    ? COLORS.successLight
    : isSkipped
      ? COLORS.dangerLight
      : COLORS.primarySurface;
  const statusLabel = isPicked ? t.picked : isSkipped ? t.skipped : t.waiting;

  return (
    <View
      style={[
        rowStyles.row,
        isNext && rowStyles.rowNext,
        isPicked && rowStyles.rowDone,
      ]}
    >
      {/* Avatar */}
      <View
        style={[
          rowStyles.avatar,
          { backgroundColor: isNext ? COLORS.primary : isPicked ? COLORS.successLight : COLORS.neutral100 },
        ]}
      >
        {isPicked ? (
          <MaterialIcons name="check" size={16} color={COLORS.success} />
        ) : (
          <Text
            style={[
              rowStyles.avatarText,
              { color: isNext ? COLORS.white : COLORS.neutral500 },
            ]}
          >
            {getStudentInitials(student.name)}
          </Text>
        )}
      </View>

      {/* Info */}
      <View style={rowStyles.info}>
        <Text style={[rowStyles.name, isPicked && rowStyles.nameDone]} numberOfLines={1}>
          {student.name}
        </Text>
        <View style={rowStyles.metaRow}>
          <View style={[rowStyles.badge, { backgroundColor: statusBg }]}>
            <View style={[rowStyles.badgeDot, { backgroundColor: statusColor }]} />
            <Text style={[rowStyles.badgeText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
          {isNext && student.etaSeconds != null && (
            <Text style={rowStyles.eta}>
              {formatClockFromNow(student.etaSeconds)}
            </Text>
          )}
        </View>
      </View>

      {/* Call button */}
      {isWaiting && student.phone ? (
        <TouchableOpacity
          style={rowStyles.callBtn}
          onPress={() => onCall(student.phone)}
          activeOpacity={0.75}
        >
          <MaterialIcons name="phone" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const TripLiveViewScreen = ({
  tripData,
  driverId: _driverId,
  language = "en",
  onBack,
  onCompleteTrip,
  isDemo = true,
}) => {
  const t = translations[language] || translations.en;
  const isRTL = language === "ar";

  const seededTrip = useMemo(
    () => buildLiveTripSeed(tripData, isDemo),
    [tripData, isDemo],
  );

  const [trip] = useState(() => seededTrip);
  const [students] = useState(() =>
    (seededTrip?.students || []).map((s) => ({
      ...s,
      status: normalizeStatus(s?.status),
    })),
  );

  const [driverLocation] = useState(
    trip.parkingLocation ||
    trip.students?.[0]?.homeLocation || {
      latitude: 33.575,
      longitude: -7.59,
    },
  );

  const [tripTime, setTripTime] = useState(0);
  const [endingTrip, setEndingTrip] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [panelExpanded, setPanelExpanded] = useState(false);

  const mapRef = useRef(null);
  const tripTimeIntervalRef = useRef(null);
  const livePulse = useRef(new Animated.Value(1)).current;
  const panelAnim = useRef(new Animated.Value(0)).current;
  const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

  // ── Derived data ──
  const routeCoordinates = useMemo(() => {
    const coords = [];
    if (trip.parkingLocation) coords.push(trip.parkingLocation);
    else if (students[0]?.homeLocation) coords.push(students[0].homeLocation);
    students
      .map((s) => s.homeLocation)
      .filter(Boolean)
      .forEach((loc) => coords.push(loc));
    if (trip.destinationLocation) coords.push(trip.destinationLocation);
    return coords;
  }, [trip.parkingLocation, trip.destinationLocation, students]);

  const nextStudentIndex = useMemo(
    () => students.findIndex((s) => normalizeStatus(s.status) === STATUS_WAITING),
    [students],
  );
  const nextStudent = nextStudentIndex >= 0 ? students[nextStudentIndex] : null;

  const pickedCount = useMemo(
    () => students.filter((s) => normalizeStatus(s.status) === STATUS_PICKED).length,
    [students],
  );
  const totalCount = students.length;

  const remainingDistanceKm = useMemo(() => {
    if (!driverLocation) return 0;
    const waiting = students.filter(
      (s) => normalizeStatus(s.status) === STATUS_WAITING && s.homeLocation,
    );
    if (waiting.length === 0) {
      if (!trip.destinationLocation) return 0;
      return calculateDistanceKm(
        driverLocation.latitude,
        driverLocation.longitude,
        trip.destinationLocation.latitude,
        trip.destinationLocation.longitude,
      );
    }
    let total = calculateDistanceKm(
      driverLocation.latitude,
      driverLocation.longitude,
      waiting[0].homeLocation.latitude,
      waiting[0].homeLocation.longitude,
    );
    for (let i = 0; i < waiting.length - 1; i++) {
      const from = waiting[i].homeLocation;
      const to = waiting[i + 1].homeLocation;
      total += calculateDistanceKm(from.latitude, from.longitude, to.latitude, to.longitude);
    }
    const last = waiting[waiting.length - 1].homeLocation;
    if (trip.destinationLocation) {
      total += calculateDistanceKm(
        last.latitude,
        last.longitude,
        trip.destinationLocation.latitude,
        trip.destinationLocation.longitude,
      );
    }
    return total;
  }, [driverLocation, students, trip.destinationLocation]);

  const estimatedRemainingMinutes = useMemo(() => {
    if (routeData?.durationSeconds) return routeData.durationSeconds / 60;
    return (remainingDistanceKm / 28) * 60;
  }, [remainingDistanceKm, routeData?.durationSeconds]);

  const studentMarkerData = useMemo(
    () =>
      students.map((student, index) => {
        const hasLocation = !!student.homeLocation;
        return {
          ...student,
          index,
          isNext: index === nextStudentIndex,
          hasLocation,
        };
      }),
    [students, nextStudentIndex],
  );

  // ── Effects ──
  useEffect(() => {
    tripTimeIntervalRef.current = setInterval(() => setTripTime((p) => p + 1), 1000);
    return () => clearInterval(tripTimeIntervalRef.current);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, { toValue: 0.6, duration: 600, useNativeDriver: true }),
        Animated.timing(livePulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [livePulse]);

  useEffect(() => {
    const build = async () => {
      if (!driverLocation || !trip.destinationLocation) {
        setRouteData(null);
        return;
      }
      const waitingWaypoints = students
        .filter((s) => normalizeStatus(s.status) === STATUS_WAITING && s.homeLocation)
        .map((s) => s.homeLocation);

      const r = await getDirectionsRoute({
        origin: driverLocation,
        waypoints: waitingWaypoints,
        destination: trip.destinationLocation,
      });
      setRouteData(r);
    };
    build();
  }, [driverLocation, students, trip.destinationLocation]);

  useEffect(() => {
    const points = routeData?.coordinates?.length ? routeData.coordinates : routeCoordinates;
    if (mapRef.current && points.length > 0) {
      mapRef.current.fitToCoordinates(points, {
        edgePadding: { top: 180, right: 60, bottom: 360, left: 60 },
        animated: true,
      });
    }
  }, [routeCoordinates, routeData?.coordinates]);

  // Panel expand/collapse animation
  useEffect(() => {
    Animated.spring(panelAnim, {
      toValue: panelExpanded ? 1 : 0,
      friction: 8,
      tension: 60,
      useNativeDriver: false,
    }).start();
  }, [panelExpanded]);

  // ── Handlers ──
  const triggerHaptic = () => Vibration.vibrate(30);

  const handleCall = (phone) => {
    if (!phone) return;
    triggerHaptic();
    Linking.openURL(`tel:${phone}`);
  };

  const handleEndTrip = async () => {
    if (!onCompleteTrip || endingTrip) return;
    triggerHaptic();
    setEndingTrip(true);
    try {
      await onCompleteTrip({ ...trip, students });
    } finally {
      setEndingTrip(false);
    }
  };


  // Panel height interpolation
  const PANEL_COLLAPSED = 220;
  const PANEL_EXPANDED = SCREEN_HEIGHT * 0.55;
  const panelHeight = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [PANEL_COLLAPSED, PANEL_EXPANDED],
  });

  const progressPercent = totalCount > 0 ? (pickedCount / totalCount) * 100 : 0;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar style="dark" />

      {/* ── MAP ─────────────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        mapType={mapboxToken ? "none" : "standard"}
        initialRegion={{
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {mapboxToken ? (
          <UrlTile
            urlTemplate={`https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`}
            maximumZ={20}
            flipY={false}
          />
        ) : null}

        {/* Route line */}
        {routeData?.coordinates?.length ? (
          <Polyline
            coordinates={routeData.coordinates}
            strokeColor={COLORS.primary}
            strokeWidth={4}
          />
        ) : null}

        {/* Student markers with inline Callout */}
        {studentMarkerData.map((student) => {
          if (!student.hasLocation) return null;
          const status = normalizeStatus(student.status);
          const isPicked = status === STATUS_PICKED;
          const isSkipped = status === STATUS_SKIPPED;
          const statusLabel = isPicked ? t.picked : isSkipped ? t.skipped : student.isNext ? `${t.nextStop} →` : t.waiting;
          const statusColor = isPicked ? COLORS.success : isSkipped ? COLORS.danger : COLORS.primary;
          return (
            <Marker
              key={`${student.id || `s-${student.index}`}`}
              coordinate={student.homeLocation}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={5}
            >
              <StudentMarker
                name={student.name}
                status={student.status}
                isNext={student.isNext}
              />
              <Callout tooltip>
                <View style={styles.calloutCard}>
                  <View style={styles.calloutRow}>
                    <View style={styles.calloutAvatar}>
                      <Text style={styles.calloutInitials}>
                        {getStudentInitials(student.name)}
                      </Text>
                    </View>
                    <View style={styles.calloutInfo}>
                      <Text style={styles.calloutName} numberOfLines={1}>
                        {student.name}
                      </Text>
                      <Text style={[styles.calloutStatus, { color: statusColor }]}>
                        {statusLabel}
                      </Text>
                    </View>
                  </View>
                  {student.phone && !isPicked && !isSkipped ? (
                    <TouchableOpacity
                      style={styles.calloutCallBtn}
                      onPress={() => {
                        Linking.openURL(`tel:${student.phone}`);
                        Vibration.vibrate(30);
                      }}
                    >
                      <MaterialIcons name="phone" size={15} color={COLORS.white} />
                      <Text style={styles.calloutCallText}>{t.call}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </Callout>
            </Marker>
          );
        })}

        {/* School marker with Callout */}
        {trip.destinationLocation && (
          <Marker
            coordinate={trip.destinationLocation}
            anchor={{ x: 0.5, y: 1 }}
            zIndex={10}
            title={t.school}
          >
            <SchoolMarker label={trip.destination || t.school} />
            <Callout tooltip>
              <View style={styles.calloutCard}>
                <View style={styles.calloutRow}>
                  <View style={[styles.calloutAvatar, { backgroundColor: COLORS.warningLight }]}>
                    <MaterialIcons name="school" size={18} color={COLORS.warning} />
                  </View>
                  <View style={styles.calloutInfo}>
                    <Text style={styles.calloutName}>{t.school}</Text>
                    <Text style={[styles.calloutStatus, { color: COLORS.neutral500 }]}>
                      {trip.destination || t.school}
                    </Text>
                  </View>
                </View>
              </View>
            </Callout>
          </Marker>
        )}

        {/* Driver / bus marker with Callout */}
        <Marker
          coordinate={driverLocation}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={20}
          title={t.bus}
        >
          <DriverMarker />
          <Callout tooltip>
            <View style={styles.calloutCard}>
              <View style={styles.calloutRow}>
                <View style={[styles.calloutAvatar, { backgroundColor: COLORS.primarySurface }]}>
                  <MaterialIcons name="directions-bus" size={18} color={COLORS.primary} />
                </View>
                <View style={styles.calloutInfo}>
                  <Text style={styles.calloutName}>{t.bus}</Text>
                  <Text style={[styles.calloutStatus, { color: COLORS.neutral500 }]}>
                    {t.live} • {t.enRoute}
                  </Text>
                </View>
              </View>
            </View>
          </Callout>
        </Marker>
      </MapView>

      {/* ── TOP BAR ─────────────────────────────────────────────────── */}
      <View style={[styles.topBar, isRTL && styles.topBarRTL]}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => { triggerHaptic(); onBack?.(); }}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={22}
            color={COLORS.neutral900}
          />
        </TouchableOpacity>

        {/* Live badge */}
        <View style={styles.liveBadge}>
          <Animated.View style={[styles.liveDot, { opacity: livePulse }]} />
          <Text style={styles.liveText}>{t.live}</Text>
          <Text style={styles.liveTime}>{formatElapsed(tripTime)}</Text>
        </View>

        {/* End trip button */}
        <TouchableOpacity
          style={[styles.endBtn, endingTrip && styles.endBtnDisabled]}
          onPress={handleEndTrip}
          disabled={endingTrip}
          activeOpacity={0.85}
        >
          <MaterialIcons name="flag" size={16} color={COLORS.white} />
          <Text style={styles.endBtnText}>{t.endTrip}</Text>
        </TouchableOpacity>
      </View>

      {/* ── MAP LEGEND (top-right) ───────────────────────────────────── */}
      <View style={[styles.legend, isRTL && styles.legendRTL]}>
        <View style={[styles.legendChip, { backgroundColor: COLORS.white }]}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.legendText}>{t.bus}</Text>
        </View>
        <View style={[styles.legendChip, { backgroundColor: COLORS.white }]}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
          <Text style={styles.legendText}>{t.school}</Text>
        </View>
      </View>

      {/* ── BOTTOM PANEL ────────────────────────────────────────────── */}
      <Animated.View style={[styles.panel, { height: panelHeight }]}>
        {/* Handle */}
        <TouchableOpacity
          style={styles.handleArea}
          onPress={() => setPanelExpanded((p) => !p)}
          activeOpacity={1}
        >
          <View style={styles.handle} />
        </TouchableOpacity>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>
              {formatDuration(estimatedRemainingMinutes)}
              <Text style={styles.statUnit}> {t.min}</Text>
            </Text>
            <Text style={styles.statLabel}>{t.etaRemaining}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>
              {formatDistance(
                routeData?.distanceMeters
                  ? routeData.distanceMeters / 1000
                  : remainingDistanceKm,
              )}
              <Text style={styles.statUnit}> {t.km}</Text>
            </Text>
            <Text style={styles.statLabel}>{t.distanceRemaining}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>
              {pickedCount}
              <Text style={styles.statUnit}>/{totalCount}</Text>
            </Text>
            <Text style={styles.statLabel}>{t.students}</Text>
          </View>
        </View>

        {/* ── Progress bar ── */}
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {pickedCount} {t.completed}
          </Text>
        </View>

        {/* ── Next stop card ── */}
        {nextStudent ? (
          <View style={styles.nextCard}>
            <View style={styles.nextCardLeft}>
              <View style={styles.nextTag}>
                <Text style={styles.nextTagText}>{t.nextStop}</Text>
              </View>
              <Text style={styles.nextName} numberOfLines={1}>
                {nextStudent.name}
              </Text>
              <View style={styles.nextMeta}>
                {nextStudent.etaSeconds != null && (
                  <View style={styles.metaChip}>
                    <Ionicons name="time-outline" size={12} color={COLORS.neutral500} />
                    <Text style={styles.metaChipText}>
                      {formatClockFromNow(nextStudent.etaSeconds, language)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            {nextStudent.phone ? (
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => handleCall(nextStudent.phone)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="phone" size={20} color={COLORS.white} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.allDoneCard}>
            <MaterialIcons name="check-circle" size={22} color={COLORS.success} />
            <Text style={styles.allDoneText}>{t.noStopsLeft}</Text>
          </View>
        )}

        {/* ── Student list (expanded) ── */}
        {panelExpanded && (
          <ScrollView
            style={styles.studentList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <Text style={styles.listHeader}>{t.students}</Text>
            {students.map((student, index) => (
              <StudentRow
                key={student.id || `row-${index}`}
                student={student}
                isNext={index === nextStudentIndex}
                onCall={handleCall}
                t={t}
              />
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

// ─── Marker Styles ────────────────────────────────────────────────────────────
const markerStyles = StyleSheet.create({
  driverWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 56,
    height: 56,
  },
  driverPulse: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${COLORS.primary}30`,
  },
  driverCore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  schoolWrapper: {
    alignItems: "center",
  },
  schoolCore: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.warning,
    borderWidth: 2.5,
    borderColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 7,
  },
  schoolTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: COLORS.warning,
    marginTop: -1,
  },
  schoolLabel: {
    marginTop: 4,
    backgroundColor: COLORS.warning,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 120,
  },
  schoolLabelText: {
    color: COLORS.white,
    fontFamily: UbuntuFonts.bold,
    fontSize: 10,
    textAlign: "center",
  },
  studentWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  studentWrapperNext: {
    marginBottom: 2,
  },
  studentCore: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2.5,
    borderColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  studentInitials: {
    color: COLORS.white,
    fontFamily: UbuntuFonts.bold,
    fontSize: 11,
  },
  nextPip: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  nextPipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
});

// ─── Row Styles ───────────────────────────────────────────────────────────────
const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral100,
    gap: 10,
  },
  rowNext: {
    backgroundColor: `${COLORS.primary}08`,
    borderRadius: 12,
    paddingHorizontal: 10,
    marginHorizontal: -6,
    borderBottomWidth: 0,
    marginBottom: 4,
  },
  rowDone: {
    opacity: 0.55,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: UbuntuFonts.bold,
    fontSize: 13,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontFamily: UbuntuFonts.bold,
    fontSize: 14,
    color: COLORS.neutral900,
  },
  nameDone: {
    textDecorationLine: "line-through",
    color: COLORS.neutral500,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontFamily: UbuntuFonts.medium,
    fontSize: 11,
  },
  eta: {
    fontFamily: UbuntuFonts.medium,
    fontSize: 11,
    color: COLORS.neutral500,
  },
  callBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primarySurface,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Screen Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F2FF",
  },
  // Top bar
  topBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 42,
    left: 14,
    right: 14,
    zIndex: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  topBarRTL: {
    flexDirection: "row-reverse",
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: COLORS.neutral900,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  liveText: {
    color: COLORS.white,
    fontFamily: UbuntuFonts.bold,
    fontSize: 12,
    letterSpacing: 1.2,
  },
  liveTime: {
    color: "#CBD5E1",
    fontFamily: UbuntuFonts.medium,
    fontSize: 12,
  },
  endBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  endBtnDisabled: { opacity: 0.6 },
  endBtnText: {
    color: COLORS.white,
    fontFamily: UbuntuFonts.bold,
    fontSize: 13,
  },
  // Legend
  legend: {
    position: "absolute",
    top: Platform.OS === "ios" ? 116 : 102,
    right: 14,
    zIndex: 22,
    gap: 6,
  },
  legendRTL: {
    right: undefined,
    left: 14,
  },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: UbuntuFonts.medium,
    fontSize: 11,
    color: COLORS.neutral700,
  },
  // Callout (inline inside Marker via react-native-maps Callout)
  calloutCard: {
    width: 200,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  },
  calloutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  calloutAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primarySurface,
    alignItems: "center",
    justifyContent: "center",
  },
  calloutInfo: {
    flex: 1,
  },
  calloutInitials: {
    fontFamily: UbuntuFonts.bold,
    fontSize: 13,
    color: COLORS.primary,
  },
  calloutName: {
    fontFamily: UbuntuFonts.bold,
    fontSize: 14,
    color: COLORS.neutral900,
  },
  calloutStatus: {
    fontFamily: UbuntuFonts.medium,
    fontSize: 12,
    marginTop: 2,
  },
  calloutCallBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 8,
  },
  calloutCallText: {
    color: COLORS.white,
    fontFamily: UbuntuFonts.bold,
    fontSize: 13,
  },
  // Bottom panel
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 16,
    paddingHorizontal: 20,
    zIndex: 25,
  },
  handleArea: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.neutral300,
  },
  // Stats
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    marginTop: 4,
    marginBottom: 12,
  },
  statBlock: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontFamily: UbuntuFonts.bold,
    fontSize: 26,
    color: COLORS.neutral900,
  },
  statUnit: {
    fontFamily: UbuntuFonts.regular,
    fontSize: 14,
    color: COLORS.neutral500,
  },
  statLabel: {
    fontFamily: UbuntuFonts.medium,
    fontSize: 11,
    color: COLORS.neutral500,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.neutral100,
  },
  // Progress
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.neutral100,
    overflow: "hidden",
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  progressText: {
    fontFamily: UbuntuFonts.medium,
    fontSize: 11,
    color: COLORS.neutral500,
    minWidth: 60,
    textAlign: "right",
  },
  // Next stop card
  nextCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primarySurface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  nextCardLeft: {
    flex: 1,
    gap: 4,
  },
  nextTag: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 2,
  },
  nextTagText: {
    fontFamily: UbuntuFonts.bold,
    fontSize: 10,
    color: COLORS.white,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  nextName: {
    fontFamily: UbuntuFonts.bold,
    fontSize: 20,
    color: COLORS.neutral900,
  },
  nextMeta: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaChipText: {
    fontFamily: UbuntuFonts.medium,
    fontSize: 12,
    color: COLORS.neutral500,
  },
  callBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  allDoneCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.successLight,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  allDoneText: {
    fontFamily: UbuntuFonts.bold,
    fontSize: 16,
    color: COLORS.success,
  },
  // Student list
  studentList: {
    marginTop: 16,
    flex: 1,
  },
  listHeader: {
    fontFamily: UbuntuFonts.bold,
    fontSize: 13,
    color: COLORS.neutral500,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
});

export default TripLiveViewScreen;
