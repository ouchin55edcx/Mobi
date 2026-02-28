import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  Alert,
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";
import * as Location from "expo-location";
import { UbuntuFonts } from "../shared/utils/fonts";
import {
  getDirectionsRoute,
  formatDistanceKm,
  formatDurationMinutes,
} from "../shared/services/mapboxService";
import {
  getDriverAssignedTrips,
  buildAndPersistTripRoute,
} from "../shared/services/groupingService";
import { mockTrip } from "../shared/mock/mockDriverData";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.48;
const SHEET_COLLAPSED_Y = SCREEN_HEIGHT * 0.2;
const SHEET_EXPANDED_Y = SCREEN_HEIGHT * 0.04;

const COLORS = {
  blue: "#1E88E5",
  blueDark: "#166EBB",
  bg: "#F4F8FF",
  white: "#FFFFFF",
  gray900: "#10213A",
  gray700: "#53657D",
  gray500: "#8A9AAF",
  orange: "#F59E0B",
  green: "#16A34A",
  red: "#DC2626",
  route: "#1E88E5",
};

const BUS_CAPACITY_TOTAL = 24;
const STATUS_PENDING = "pending";
const STATUS_PICKED = "picked";
const STATUS_SKIPPED = "skipped";

const isValidCoordinate = (point) => {
  const lat = Number(point?.latitude);
  const lng = Number(point?.longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
};

const toCoordinate = (point) => ({
  latitude: Number(point.latitude),
  longitude: Number(point.longitude),
});

const haversineMeters = (a, b) => {
  if (!isValidCoordinate(a) || !isValidCoordinate(b)) return 0;
  const toRadians = (v) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const formatEta = (seconds) => {
  const mins = Math.max(1, Math.round((seconds || 0) / 60));
  return `${mins} min`;
};

const formatMeters = (meters) => {
  if (!Number.isFinite(meters)) return "-";
  if (meters < 1000) return `${Math.max(1, Math.round(meters))} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

const normalizeStudents = (trip) => {
  if (!Array.isArray(trip?.students)) return [];

  return [...trip.students]
    .map((student, index) => ({
      id: student.id || `student-${index + 1}`,
      name: student.name || `Student ${index + 1}`,
      pickupOrder: Number(student.pickupOrder ?? index + 1),
      homeLocation: student.homeLocation,
      status: STATUS_PENDING,
      etaSeconds: null,
    }))
    .sort((a, b) => a.pickupOrder - b.pickupOrder);
};

const getStudentStatusColor = (status) => {
  if (status === STATUS_PICKED) return COLORS.green;
  if (status === STATUS_SKIPPED) return COLORS.red;
  return COLORS.orange;
};

const getStudentStatusLabel = (status) => {
  if (status === STATUS_PICKED) return "Picked";
  if (status === STATUS_SKIPPED) return "Skipped";
  return "Pending";
};

const clusterStudentMarkers = (students, latitudeDelta) => {
  if (!Array.isArray(students) || students.length <= 6) {
    return students.map((student) => ({ type: "single", students: [student] }));
  }

  const cellSize = Math.max((latitudeDelta || 0.02) / 8, 0.0025);
  const map = new Map();

  students.forEach((student) => {
    if (!isValidCoordinate(student.homeLocation)) return;
    const key = `${Math.floor(student.homeLocation.latitude / cellSize)}_${Math.floor(student.homeLocation.longitude / cellSize)}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(student);
  });

  const groups = [];
  map.forEach((groupStudents) => {
    if (groupStudents.length === 1) {
      groups.push({ type: "single", students: groupStudents });
      return;
    }

    const center = groupStudents.reduce(
      (acc, s) => ({
        latitude: acc.latitude + s.homeLocation.latitude,
        longitude: acc.longitude + s.homeLocation.longitude,
      }),
      { latitude: 0, longitude: 0 },
    );

    groups.push({
      type: "cluster",
      students: groupStudents,
      center: {
        latitude: center.latitude / groupStudents.length,
        longitude: center.longitude / groupStudents.length,
      },
    });
  });

  return groups;
};

const LoadingSkeleton = () => {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.skeletonWrap}>
      <Animated.View style={[styles.skeletonHero, { opacity: pulse }]} />
      <Animated.View style={[styles.skeletonMap, { opacity: pulse }]} />
      <Animated.View style={[styles.skeletonSheet, { opacity: pulse }]} />
    </View>
  );
};

const DriverHomeScreen = ({
  driverId,
  isDemo = false,
  onSkipToProfile,
  onTripPress,
}) => {
  const mapRef = useRef(null);
  const liveLocationSubscription = useRef(null);
  const lastRouteRebuildAt = useRef(0);
  const sheetOffsetRef = useRef(SHEET_COLLAPSED_Y);

  const sheetExpandedOffset = SHEET_EXPANDED_Y;
  const sheetCollapsedOffset = SHEET_COLLAPSED_Y;
  const sheetDrag = useRef(new Animated.Value(sheetCollapsedOffset)).current;

  const [loadingTrip, setLoadingTrip] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [trip, setTrip] = useState(null);
  const [students, setStudents] = useState([]);
  const [driverLocation, setDriverLocation] = useState(null);
  const livePulse = useRef(new Animated.Value(0.6)).current;
  const [locationPermission, setLocationPermission] = useState("unknown");
  const [route, setRoute] = useState(null);
  const [routeFailed, setRouteFailed] = useState(false);
  const [routeFailureMessage, setRouteFailureMessage] = useState("");
  const [isTripLive, setIsTripLive] = useState(false);
  const [currentStudentId, setCurrentStudentId] = useState(null);
  const [mapRegionDelta, setMapRegionDelta] = useState(0.02);
  const [showDetails, setShowDetails] = useState(false);

  const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const schoolLocation = trip?.destinationLocation;
  const schoolName = trip?.destination || "School";

  const hasStudentsArray = Array.isArray(trip?.students);
  const validStudents = useMemo(
    () => students.filter((student) => isValidCoordinate(student.homeLocation)),
    [students],
  );

  const missingCoordinates = useMemo(() => {
    if (!isValidCoordinate(driverLocation)) return true;
    if (!isValidCoordinate(schoolLocation)) return true;
    if (!hasStudentsArray || validStudents.length === 0) return true;
    if (validStudents.length !== students.length) return true;
    return false;
  }, [
    driverLocation,
    schoolLocation,
    hasStudentsArray,
    validStudents,
    students,
  ]);

  const pickupCompletedCount = useMemo(
    () => students.filter((s) => s.status === STATUS_PICKED).length,
    [students],
  );
  const skippedCount = useMemo(
    () => students.filter((s) => s.status === STATUS_SKIPPED).length,
    [students],
  );
  const pendingCount = useMemo(
    () => students.filter((s) => s.status === STATUS_PENDING).length,
    [students],
  );
  const totalStudents = students.length;
  const capacityTotal = Number(trip?.capacity) || BUS_CAPACITY_TOTAL;
  const capacityUsed = Math.min(totalStudents, capacityTotal);
  const totalDistanceMeters =
    route?.distanceMeters ||
    (Number.isFinite(Number(trip?.totalDistanceKm))
      ? Number(trip.totalDistanceKm) * 1000
      : 0);
  const totalDurationSeconds =
    route?.durationSeconds ||
    (Number.isFinite(Number(trip?.totalDurationMinutes))
      ? Number(trip.totalDurationMinutes) * 60
      : Number.isFinite(Number(trip?.estimatedDurationMin))
        ? Number(trip.estimatedDurationMin) * 60
        : 0);
  const tripCompletionPercent = totalStudents
    ? Math.round(((pickupCompletedCount + skippedCount) / totalStudents) * 100)
    : 0;

  const markerGroups = useMemo(
    () => clusterStudentMarkers(validStudents, mapRegionDelta),
    [validStudents, mapRegionDelta],
  );

  const perStudentDistance = useMemo(() => {
    const map = new Map();
    students.forEach((student) => {
      map.set(
        student.id,
        haversineMeters(driverLocation, student.homeLocation),
      );
    });
    return map;
  }, [students, driverLocation]);

  const fitToAllPoints = useCallback(
    (routePoints = null) => {
      const points = [
        driverLocation,
        ...validStudents.map((s) => s.homeLocation),
        schoolLocation,
      ]
        .filter(isValidCoordinate)
        .map(toCoordinate);

      if (Array.isArray(routePoints) && routePoints.length > 1) {
        routePoints.forEach((p) => {
          if (isValidCoordinate(p)) points.push(toCoordinate(p));
        });
      }

      if (!mapRef.current || points.length < 2) return;
      mapRef.current.fitToCoordinates(points, {
        edgePadding: { top: 120, right: 50, bottom: 330, left: 50 },
        animated: true,
      });
    },
    [driverLocation, validStudents, schoolLocation],
  );

  const updateStudentEtas = useCallback((routeData, inScopeStudents) => {
    if (!routeData || !Array.isArray(routeData.legs)) {
      return inScopeStudents;
    }

    let elapsed = 0;
    return inScopeStudents.map((student, index) => {
      const leg = routeData.legs[index];
      elapsed += leg?.durationSeconds || 0;
      return {
        ...student,
        etaSeconds: elapsed || student.etaSeconds,
      };
    });
  }, []);

  const buildRoute = useCallback(
    async ({ source = "manual" } = {}) => {
      if (missingCoordinates) {
        setRouteFailed(true);
        setRouteFailureMessage(
          "Map coordinates are missing. Check trip/student locations.",
        );
        return;
      }

      setLoadingRoute(true);
      setRouteFailed(false);
      setRouteFailureMessage("");

      const remainingStudents = isTripLive
        ? students.filter((s) => s.status === STATUS_PENDING)
        : students;

      try {
        const routeData = await getDirectionsRoute({
          origin: driverLocation,
          waypoints: remainingStudents.map((s) => s.homeLocation),
          destination: schoolLocation,
        });

        if (!routeData?.coordinates?.length) {
          throw new Error("Directions returned no geometry");
        }

        setRoute(routeData);
        setStudents((prev) => {
          const pendingFromPrev = prev.filter(
            (s) => s.status === STATUS_PENDING,
          );
          const updatedPending = updateStudentEtas(routeData, pendingFromPrev);
          const etaMap = new Map(
            updatedPending.map((s) => [s.id, s.etaSeconds]),
          );
          return prev.map((s) => ({
            ...s,
            etaSeconds: etaMap.get(s.id) ?? s.etaSeconds,
          }));
        });
        fitToAllPoints(routeData.coordinates);

        if (source === "manual" && trip?.id && !isDemo) {
          await buildAndPersistTripRoute({
            tripId: trip.id,
            driverStartLocation: driverLocation,
          });
        }
      } catch (error) {
        setRouteFailed(true);
        setRouteFailureMessage(
          "Route unavailable right now. Tap Recalculate Route to retry.",
        );
      } finally {
        setLoadingRoute(false);
      }
    },
    [
      driverLocation,
      fitToAllPoints,
      isDemo,
      isTripLive,
      missingCoordinates,
      schoolLocation,
      students,
      trip?.id,
      updateStudentEtas,
    ],
  );

  const pickCurrentStudent = useCallback((items) => {
    const current = items.find((s) => s.status === STATUS_PENDING) || null;
    setCurrentStudentId(current?.id || null);
  }, []);

  const requestDriverLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationPermission("denied");
        return false;
      }

      setLocationPermission("granted");
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (isValidCoordinate(pos?.coords)) {
        setDriverLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        return true;
      }
      return false;
    } catch (_error) {
      setLocationPermission("denied");
      return false;
    }
  }, []);

  const stopLiveTracking = useCallback(() => {
    if (liveLocationSubscription.current?.remove) {
      liveLocationSubscription.current.remove();
    }
    liveLocationSubscription.current = null;
  }, []);

  const startLiveTracking = useCallback(async () => {
    const granted = await requestDriverLocation();
    if (!granted && !isValidCoordinate(driverLocation)) {
      Alert.alert(
        "Location required",
        "Enable GPS to start live trip tracking.",
      );
      return false;
    }

    stopLiveTracking();

    try {
      liveLocationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 8,
        },
        (position) => {
          const next = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setDriverLocation(next);

          if (mapRef.current) {
            mapRef.current.animateCamera(
              {
                center: next,
                zoom: 14.5,
              },
              { duration: 900 },
            );
          }
        },
      );
      return true;
    } catch (_error) {
      return false;
    }
  }, [driverLocation, requestDriverLocation, stopLiveTracking]);

  const loadTrip = useCallback(async () => {
    setLoadingTrip(true);

    try {
      let selectedTrip = null;

      if (isDemo) {
        selectedTrip = mockTrip;
      } else {
        const { data } = await getDriverAssignedTrips(driverId);
        selectedTrip = data?.[0] || null;
      }

      if (!selectedTrip) {
        setTrip(null);
        setStudents([]);
        setRoute(null);
        setRouteFailed(false);
        setRouteFailureMessage("");
        setLoadingTrip(false);
        return;
      }

      const normalized = normalizeStudents(selectedTrip);
      pickCurrentStudent(normalized);
      setTrip(selectedTrip);
      setStudents(normalized);
      setRoute(null);
      setRouteFailed(false);
      setRouteFailureMessage("");

      const hasLocation = await requestDriverLocation();
      if (!hasLocation) {
        const fallbackDriver =
          selectedTrip?.liveLocation ||
          selectedTrip?.pickupLocation ||
          normalized?.[0]?.homeLocation ||
          selectedTrip?.destinationLocation ||
          null;
        if (isValidCoordinate(fallbackDriver)) {
          setDriverLocation(toCoordinate(fallbackDriver));
        }
      }
    } catch (_error) {
      setTrip(null);
      setStudents([]);
    } finally {
      setLoadingTrip(false);
    }
  }, [driverId, isDemo, pickCurrentStudent, requestDriverLocation]);

  useEffect(() => {
    loadTrip();
    return () => stopLiveTracking();
  }, [loadTrip, stopLiveTracking]);

  useEffect(() => {
    if (!trip || missingCoordinates || route) return;
    buildRoute({ source: "initial" });
  }, [trip, missingCoordinates, route, buildRoute]);

  useEffect(() => {
    if (!isTripLive || !driverLocation) return;

    const nextPending = students.find((s) => s.status === STATUS_PENDING);
    if (!nextPending || !isValidCoordinate(nextPending.homeLocation)) {
      setCurrentStudentId(null);
      return;
    }

    setCurrentStudentId(nextPending.id);
    const distance = haversineMeters(driverLocation, nextPending.homeLocation);

    if (distance <= 65) {
      setStudents((prev) => {
        const updated = prev.map((student) =>
          student.id === nextPending.id
            ? { ...student, status: STATUS_PICKED, etaSeconds: 0 }
            : student,
        );
        pickCurrentStudent(updated);
        return updated;
      });
    }
  }, [driverLocation, isTripLive, students, pickCurrentStudent]);

  useEffect(() => {
    if (isTripLive) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(livePulse, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(livePulse, {
            toValue: 0.6,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isTripLive, livePulse]);

  useEffect(() => {
    if (!isTripLive || !driverLocation || missingCoordinates) return;

    const now = Date.now();
    if (now - lastRouteRebuildAt.current < 18000) return;
    lastRouteRebuildAt.current = now;
    buildRoute({ source: "live" });
  }, [driverLocation, isTripLive, missingCoordinates, buildRoute]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
        onPanResponderMove: (_, gesture) => {
          const base = sheetOffsetRef.current;
          const next = Math.max(
            sheetCollapsedOffset,
            Math.min(sheetExpandedOffset, base + gesture.dy),
          );
          sheetDrag.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const threshold = (sheetExpandedOffset + sheetCollapsedOffset) / 2;
          const current = sheetOffsetRef.current + gesture.dy;
          const shouldExpand = gesture.dy < -25 || current < threshold;
          const toValue = shouldExpand
            ? sheetCollapsedOffset
            : sheetExpandedOffset;
          sheetOffsetRef.current = toValue;
          Animated.spring(sheetDrag, {
            toValue,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        },
      }),
    [sheetCollapsedOffset, sheetDrag, sheetExpandedOffset],
  );

  const handleStartTrip = useCallback(async () => {
    const ok = await startLiveTracking();
    if (!ok && locationPermission !== "granted") {
      Alert.alert(
        "Live mode limited",
        "Trip started without live GPS updates.",
      );
    }
    setIsTripLive(true);
    buildRoute({ source: "manual" });
  }, [buildRoute, locationPermission, startLiveTracking]);

  const handleRecalculate = useCallback(() => {
    buildRoute({ source: "manual" });
  }, [buildRoute]);

  const handleReportIssue = useCallback(() => {
    Alert.alert(
      "Report Issue",
      "Dispatch has been notified. Keep students safe and wait for instructions.",
    );
  }, []);

  const markSkipped = useCallback(
    (studentId) => {
      setStudents((prev) => {
        const updated = prev.map((student) =>
          student.id === studentId
            ? { ...student, status: STATUS_SKIPPED }
            : student,
        );
        pickCurrentStudent(updated);
        return updated;
      });
    },
    [pickCurrentStudent],
  );

  const canRenderMap = !loadingTrip && !missingCoordinates;

  if (loadingTrip) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <StatusBar style="light" />
        <LoadingSkeleton />
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />
        <View style={styles.emptyWrap}>
          <MaterialIcons name="event-busy" size={44} color={COLORS.gray500} />
          <Text style={styles.emptyTitle}>No trip assigned yet</Text>
          <Text style={styles.emptyCaption}>
            When dispatch assigns your route, it appears here instantly.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar style="light" />

      <LinearGradient
        colors={[COLORS.blue, COLORS.blueDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroSide}>
          <View style={styles.logoPill}>
            <Text style={styles.logoText}>M</Text>
          </View>
          <View>
            <Text style={styles.heroTitle}>Today's Trip</Text>
            <Text style={styles.heroSubtitle}>Driver overview and route</Text>
          </View>
        </View>
        <View style={styles.heroRight}>
          <View style={styles.liveChip}>
            <Animated.View
              style={[
                styles.liveDot,
                isTripLive && {
                  opacity: livePulse,
                  transform: [{ scale: livePulse }],
                },
              ]}
            />
            <Text style={styles.liveChipText}>
              {isTripLive ? "Live" : "Ready"}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onSkipToProfile}
            style={styles.settingsBtn}
          >
            <MaterialIcons name="settings" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {!showDetails ? (
        <ScrollView
          style={styles.cardHome}
          contentContainerStyle={styles.cardHomeContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.tripCard}
            onPress={() => onTripPress && onTripPress(trip)}
            activeOpacity={0.95}
          >
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Trip Summary</Text>
              <MaterialIcons name="chevron-right" size={20} color={COLORS.gray500} />
            </View>
            <Text style={styles.summarySchoolCard}>{schoolName}</Text>

            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Students</Text>
                <Text style={styles.metricValue}>{totalStudents}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Pending</Text>
                <Text style={styles.metricValue}>{pendingCount}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Distance</Text>
                <Text style={styles.metricValue}>
                  {formatDistanceKm(totalDistanceMeters)}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>ETA</Text>
                <Text style={styles.metricValue}>
                  {formatDurationMinutes(totalDurationSeconds)}
                </Text>
              </View>
            </View>

            <View style={styles.progressSection}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressLabel}>Trip Progress</Text>
                <Text style={styles.progressPercent}>{tripCompletionPercent}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <LinearGradient
                  colors={[COLORS.blue, "#64B5F6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressBarFill, { width: `${tripCompletionPercent}%` }]}
                />
              </View>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Bus Capacity</Text>
              <Text style={styles.summaryValue}>
                {capacityUsed}/{capacityTotal}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.tripCard}>
            <View style={styles.listSectionHeader}>
              <Text style={styles.pickupTitle}>Pickup Order</Text>
              <Text style={styles.pickupSubtitle}>{pendingCount} pending</Text>
            </View>
            {students.slice(0, 4).map((student) => (
              <View key={student.id} style={styles.summaryStudentRow}>
                <Text style={styles.summaryStudentOrder}>
                  {student.pickupOrder}
                </Text>
                <Text style={styles.summaryStudentName} numberOfLines={1}>
                  {student.name}
                </Text>
                <Text style={styles.summaryStudentEta}>
                  {formatEta(student.etaSeconds || 60)}
                </Text>
              </View>
            ))}
            {totalStudents > 4 ? (
              <Text style={styles.moreStudentsText}>
                +{totalStudents - 4} more students in details
              </Text>
            ) : null}
          </View>

          <View style={styles.actionWrap}>
            <TouchableOpacity
              style={[styles.primaryCta, isTripLive && styles.primaryCtaLive]}
              onPress={isTripLive ? () => setShowDetails(true) : handleStartTrip}
              activeOpacity={0.9}
            >
              <MaterialIcons
                name={isTripLive ? "navigation" : "play-circle-outline"}
                size={22}
                color={COLORS.white}
              />
              <Text style={styles.primaryCtaText}>
                {isTripLive ? "Return to Navigation" : "Start Trip Now"}
              </Text>
            </TouchableOpacity>

            <View style={styles.secondaryRow}>
              {!isTripLive && (
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => setShowDetails(true)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="map" size={18} color={COLORS.blue} />
                  <Text style={styles.secondaryBtnText}>Preview Route</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleRecalculate}
                activeOpacity={0.8}
              >
                <MaterialIcons name="refresh" size={18} color={COLORS.blue} />
                <Text style={styles.secondaryBtnText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : (
        <>
          <View style={styles.mapContainer}>
            {!canRenderMap ? (
              <View style={styles.mapFallback}>
                <MaterialIcons
                  name="location-off"
                  size={38}
                  color={COLORS.gray500}
                />
                <Text style={styles.fallbackTitle}>Map unavailable</Text>
                <Text style={styles.fallbackSubtitle}>
                  Driver, school, and all student coordinates are required to
                  render the map.
                </Text>
                <TouchableOpacity style={styles.retryBtn} onPress={loadTrip}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <MapView
                ref={mapRef}
                style={styles.map}
                mapType="standard"
                showsCompass={false}
                toolbarEnabled={false}
                onRegionChangeComplete={(region) =>
                  setMapRegionDelta(region.latitudeDelta)
                }
              >
                {mapboxToken ? (
                  <UrlTile
                    urlTemplate={`https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`}
                    maximumZ={19}
                    flipY={false}
                    zIndex={0}
                  />
                ) : null}

                <Marker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }}>
                  <View style={styles.busMarker}>
                    <MaterialIcons
                      name="directions-bus"
                      size={18}
                      color={COLORS.white}
                    />
                  </View>
                </Marker>

                <Marker coordinate={schoolLocation}>
                  <View style={styles.schoolMarker}>
                    <MaterialIcons
                      name="school"
                      size={16}
                      color={COLORS.white}
                    />
                  </View>
                </Marker>

                {markerGroups.map((group, index) => {
                  if (group.type === "cluster") {
                    return (
                      <Marker
                        key={`cluster-${index}`}
                        coordinate={group.center}
                      >
                        <View style={styles.clusterMarker}>
                          <Text style={styles.clusterText}>
                            {group.students.length}
                          </Text>
                        </View>
                      </Marker>
                    );
                  }

                  const student = group.students[0];
                  const active = student.id === currentStudentId;
                  return (
                    <Marker key={student.id} coordinate={student.homeLocation}>
                      <View
                        style={[
                          styles.studentMarker,
                          active && styles.studentMarkerActive,
                        ]}
                      >
                        <Text style={styles.studentMarkerText}>
                          {student.pickupOrder}
                        </Text>
                      </View>
                    </Marker>
                  );
                })}

                {!!route?.coordinates?.length && (
                  <Polyline
                    coordinates={route.coordinates}
                    strokeColor={COLORS.route}
                    strokeWidth={5}
                    lineCap="round"
                    lineJoin="round"
                  />
                )}
              </MapView>
            )}

            <TouchableOpacity
              style={styles.closeDetailsBtn}
              onPress={() => setShowDetails(false)}
              activeOpacity={0.9}
            >
              <MaterialIcons name="arrow-back" size={18} color={COLORS.white} />
              <Text style={styles.closeDetailsText}>Back to Card</Text>
            </TouchableOpacity>

            {loadingRoute && canRenderMap && (
              <View style={styles.routeLoadingPill}>
                <Text style={styles.routeLoadingText}>Updating route...</Text>
              </View>
            )}

            {routeFailed && (
              <View style={styles.routeErrorCard}>
                <Text style={styles.routeErrorTitle}>Route fetch failed</Text>
                <Text style={styles.routeErrorBody}>{routeFailureMessage}</Text>
                <TouchableOpacity
                  style={styles.routeErrorBtn}
                  onPress={handleRecalculate}
                >
                  <Text style={styles.routeErrorBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Animated.View
            style={[styles.sheet, { transform: [{ translateY: sheetDrag }] }]}
          >
            <View {...panResponder.panHandlers} style={styles.dragHandleWrap}>
              <View style={styles.dragHandle} />
            </View>

            <View style={styles.listSectionHeader}>
              <Text style={styles.pickupTitle}>Student Pickup Order</Text>
              <Text style={styles.pickupSubtitle}>{pendingCount} pending</Text>
            </View>

            <ScrollView
              style={styles.listScroll}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {students.map((student) => {
                const isCurrent = student.id === currentStudentId;
                const distance = perStudentDistance.get(student.id);

                return (
                  <View
                    key={student.id}
                    style={[
                      styles.studentRow,
                      isCurrent && styles.studentRowCurrent,
                    ]}
                  >
                    <View style={styles.orderBadge}>
                      <Text style={styles.orderBadgeText}>
                        {student.pickupOrder}
                      </Text>
                    </View>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName} numberOfLines={1}>
                        {student.name}
                      </Text>
                      <Text style={styles.studentDistance}>
                        {formatMeters(distance)} from bus
                      </Text>
                    </View>
                    <View style={styles.studentMeta}>
                      <Text style={styles.etaInline}>
                        ETA {formatEta(student.etaSeconds || 60)}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: `${getStudentStatusColor(student.status)}20`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStudentStatusColor(student.status) },
                          ]}
                        >
                          {getStudentStatusLabel(student.status)}
                        </Text>
                      </View>
                    </View>
                    {isTripLive && student.status === STATUS_PENDING ? (
                      <TouchableOpacity
                        onPress={() => markSkipped(student.id)}
                        style={styles.skipBtn}
                      >
                        <Text style={styles.skipBtnText}>Skip</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          </Animated.View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  hero: {
    backgroundColor: COLORS.blue,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 4,
  },
  heroSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  logoPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: COLORS.white,
    fontFamily: UbuntuFonts.bold,
    fontSize: 15,
  },
  heroTitle: {
    color: COLORS.white,
    fontFamily: UbuntuFonts.bold,
    fontSize: 18,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: UbuntuFonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  heroRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveChip: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#35D07F",
  },
  liveChipText: {
    color: COLORS.white,
    fontFamily: UbuntuFonts.medium,
    fontSize: 11,
  },
  settingsBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  mapContainer: {
    flex: 1,
    minHeight: SCREEN_HEIGHT * 0.6,
    backgroundColor: "#EAF2FF",
  },
  closeDetailsBtn: {
    position: "absolute",
    top: 14,
    right: 12,
    backgroundColor: "rgba(16,33,58,0.85)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  closeDetailsText: {
    color: COLORS.white,
    fontFamily: UbuntuFonts.medium,
    fontSize: 11,
  },
  map: {
    flex: 1,
  },
  busMarker: {
    backgroundColor: COLORS.blue,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  schoolMarker: {
    backgroundColor: COLORS.green,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  studentMarker: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.blueDark,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  studentMarkerActive: {
    transform: [{ scale: 1.15 }],
    backgroundColor: COLORS.orange,
  },
  studentMarkerText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: UbuntuFonts.bold,
  },
  clusterMarker: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F5EA9",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  clusterText: {
    color: COLORS.white,
    fontFamily: UbuntuFonts.bold,
    fontSize: 13,
  },
  routeLoadingPill: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(16,33,58,0.88)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  routeLoadingText: {
    color: COLORS.white,
    fontFamily: UbuntuFonts.medium,
    fontSize: 12,
  },
  routeErrorCard: {
    position: "absolute",
    top: 12,
    right: 12,
    left: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  routeErrorTitle: {
    color: COLORS.red,
    fontFamily: UbuntuFonts.bold,
    fontSize: 13,
    marginBottom: 3,
  },
  routeErrorBody: {
    color: COLORS.gray700,
    fontFamily: UbuntuFonts.regular,
    fontSize: 12,
  },
  routeErrorBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },
  routeErrorBtnText: {
    color: COLORS.red,
    fontFamily: UbuntuFonts.medium,
    fontSize: 12,
  },
  mapFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  fallbackTitle: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: UbuntuFonts.bold,
    color: COLORS.gray900,
  },
  fallbackSubtitle: {
    marginTop: 6,
    textAlign: "center",
    color: COLORS.gray700,
    fontFamily: UbuntuFonts.regular,
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.blue,
    borderRadius: 10,
  },
  retryBtnText: {
    color: COLORS.white,
    fontFamily: UbuntuFonts.medium,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 8,
  },
  dragHandleWrap: {
    alignItems: "center",
    paddingVertical: 7,
  },
  dragHandle: {
    width: 42,
    height: 4,
    borderRadius: 3,
    backgroundColor: "#D2DCEB",
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryTitle: {
    color: COLORS.gray900,
    fontSize: 16,
    fontFamily: UbuntuFonts.bold,
  },
  summarySchool: {
    maxWidth: "58%",
    color: COLORS.gray700,
    fontSize: 12,
    fontFamily: UbuntuFonts.medium,
    textAlign: "right",
  },
  summarySchoolCard: {
    color: COLORS.gray700,
    fontSize: 13,
    fontFamily: UbuntuFonts.medium,
    marginTop: 2,
    marginBottom: 10,
  },
  metricsGrid: {
    backgroundColor: "#F7FAFF",
    borderWidth: 1,
    borderColor: "#E2ECFA",
    borderRadius: 14,
    padding: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 9,
    gap: 8,
  },
  metricCard: {
    width: "47%",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8F0FC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  metricLabel: {
    color: COLORS.gray700,
    fontFamily: UbuntuFonts.regular,
    fontSize: 11,
  },
  metricValue: {
    marginTop: 2,
    color: COLORS.gray900,
    fontSize: 14,
    fontFamily: UbuntuFonts.bold,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  summaryLabel: {
    color: COLORS.gray700,
    fontFamily: UbuntuFonts.regular,
    fontSize: 12,
  },
  summaryValue: {
    color: COLORS.gray900,
    fontFamily: UbuntuFonts.bold,
    fontSize: 13,
  },
  cardHome: {
    flex: 1,
  },
  cardHomeContent: {
    padding: 12,
    paddingBottom: 22,
    gap: 10,
  },
  tripCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4ECF8",
    padding: 16,
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  progressSection: {
    marginTop: 4,
    marginBottom: 12,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    color: COLORS.gray700,
    fontFamily: UbuntuFonts.medium,
  },
  progressPercent: {
    fontSize: 11,
    color: COLORS.blue,
    fontFamily: UbuntuFonts.bold,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#EEF2F9",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  summaryStudentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  summaryStudentOrder: {
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: "center",
    textAlignVertical: "center",
    color: COLORS.white,
    backgroundColor: COLORS.blue,
    fontFamily: UbuntuFonts.bold,
    fontSize: 11,
    marginRight: 8,
    overflow: "hidden",
    paddingTop: 3,
  },
  summaryStudentName: {
    flex: 1,
    color: COLORS.gray900,
    fontFamily: UbuntuFonts.medium,
    fontSize: 12,
  },
  summaryStudentEta: {
    color: COLORS.blue,
    fontFamily: UbuntuFonts.bold,
    fontSize: 11,
  },
  moreStudentsText: {
    marginTop: 8,
    color: COLORS.gray700,
    fontFamily: UbuntuFonts.regular,
    fontSize: 11,
  },
  listSectionHeader: {
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickupTitle: {
    color: COLORS.gray900,
    fontSize: 14,
    fontFamily: UbuntuFonts.bold,
  },
  pickupSubtitle: {
    color: COLORS.gray700,
    fontFamily: UbuntuFonts.medium,
    fontSize: 12,
  },
  listScroll: {
    maxHeight: SCREEN_HEIGHT * 0.28,
  },
  listContent: {
    paddingBottom: 3,
    rowGap: 7,
  },
  studentRow: {
    borderWidth: 1,
    borderColor: "#E5ECF7",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  studentRowCurrent: {
    borderColor: COLORS.blue,
    backgroundColor: "#F2F8FF",
  },
  orderBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.blue,
    marginRight: 8,
  },
  orderBadgeText: {
    color: COLORS.white,
    fontFamily: UbuntuFonts.bold,
    fontSize: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    color: COLORS.gray900,
    fontFamily: UbuntuFonts.medium,
    fontSize: 12,
  },
  studentDistance: {
    marginTop: 2,
    color: COLORS.gray700,
    fontFamily: UbuntuFonts.regular,
    fontSize: 10,
  },
  studentMeta: {
    alignItems: "flex-end",
    marginRight: 8,
  },
  etaInline: {
    color: COLORS.blue,
    fontFamily: UbuntuFonts.bold,
    fontSize: 10,
    marginBottom: 3,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontFamily: UbuntuFonts.medium,
    fontSize: 9,
  },
  skipBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#F9C97C",
    backgroundColor: "#FFF7E8",
  },
  skipBtnText: {
    color: "#B77200",
    fontSize: 10,
    fontFamily: UbuntuFonts.medium,
  },
  actionWrap: {
    marginTop: 9,
  },
  primaryCta: {
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.blue,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    columnGap: 10,
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryCtaLive: {
    backgroundColor: COLORS.green,
    shadowColor: COLORS.green,
  },
  primaryCtaDisabled: {
    backgroundColor: "#4FA3EE",
  },
  primaryCtaText: {
    color: COLORS.white,
    fontFamily: UbuntuFonts.bold,
    fontSize: 14,
  },
  secondaryRow: {
    marginTop: 8,
    flexDirection: "row",
    columnGap: 8,
  },
  secondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CDE3FA",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    columnGap: 6,
    backgroundColor: "#FFFFFF",
  },
  secondaryBtnText: {
    color: COLORS.blue,
    fontFamily: UbuntuFonts.medium,
    fontSize: 11,
  },
  liveModeText: {
    marginTop: 7,
    color: COLORS.green,
    fontFamily: UbuntuFonts.medium,
    fontSize: 11,
  },
  locationWarning: {
    marginTop: 5,
    color: COLORS.red,
    fontFamily: UbuntuFonts.regular,
    fontSize: 11,
  },
  skeletonWrap: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  skeletonHero: {
    height: 86,
    backgroundColor: "#DDE9FB",
  },
  skeletonMap: {
    height: SCREEN_HEIGHT * 0.62,
    backgroundColor: "#E8F0FC",
  },
  skeletonSheet: {
    flex: 1,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    marginTop: -10,
    backgroundColor: "#FFFFFF",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  emptyTitle: {
    marginTop: 10,
    color: COLORS.gray900,
    fontFamily: UbuntuFonts.bold,
    fontSize: 18,
  },
  emptyCaption: {
    marginTop: 6,
    color: COLORS.gray700,
    textAlign: "center",
    fontFamily: UbuntuFonts.regular,
    fontSize: 13,
  },
});

export default DriverHomeScreen;
