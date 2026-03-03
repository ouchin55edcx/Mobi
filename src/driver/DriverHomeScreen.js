import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Linking,
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
import { getDirectionsRoute } from "../shared/services/mapboxService";
import {
  getDriverAssignedTrips,
  buildAndPersistTripRoute,
} from "../shared/services/groupingService";
import { mockTrip } from "../shared/mock/mockDriverData";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_COLLAPSED_RATIO = 0.4;
const SHEET_EXPANDED_RATIO = 0.78;
const SHEET_EXPANDED_HEIGHT = SCREEN_HEIGHT * SHEET_EXPANDED_RATIO;
const SHEET_COLLAPSED_HEIGHT = SCREEN_HEIGHT * SHEET_COLLAPSED_RATIO;
const SHEET_COLLAPSED_Y = SHEET_EXPANDED_HEIGHT - SHEET_COLLAPSED_HEIGHT;
const FIT_EDGE_PADDING_BOTTOM = Math.round(SHEET_COLLAPSED_HEIGHT * 0.72);

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

const normalizeStudents = (trip) => {
  if (!Array.isArray(trip?.students)) return [];

  return [...trip.students]
    .map((student, index) => ({
      id: student.id || `student-${index + 1}`,
      name: student.name || `Student ${index + 1}`,
      pickupOrder: Number(student.pickupOrder ?? index + 1),
      pickupLabel:
        student.pickupLabel ||
        student.pickupPoint ||
        student.pickupLocationName ||
        `Stop ${index + 1}`,
      phone:
        student.phone ||
        student.phoneNumber ||
        student.parentPhone ||
        student.guardianPhone ||
        null,
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
  if (status === STATUS_SKIPPED) return "Absent";
  return "";
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

  const sheetExpandedOffset = 0;
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
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [currentStudentId, setCurrentStudentId] = useState(null);
  const [mapRegionDelta, setMapRegionDelta] = useState(0.02);

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

  const pendingCount = useMemo(
    () => students.filter((s) => s.status === STATUS_PENDING).length,
    [students],
  );
  const markerGroups = useMemo(
    () => clusterStudentMarkers(validStudents, mapRegionDelta),
    [validStudents, mapRegionDelta],
  );

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
        edgePadding: {
          top: 70,
          right: 44,
          bottom: FIT_EDGE_PADDING_BOTTOM,
          left: 44,
        },
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
            sheetExpandedOffset,
            Math.min(sheetCollapsedOffset, base + gesture.dy),
          );
          sheetDrag.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const threshold = (sheetExpandedOffset + sheetCollapsedOffset) / 2;
          const current = sheetOffsetRef.current + gesture.dy;
          const shouldExpand = gesture.dy < -22 || current < threshold;
          const toValue = shouldExpand
            ? sheetExpandedOffset
            : sheetCollapsedOffset;

          sheetOffsetRef.current = toValue;
          setIsSheetExpanded(shouldExpand);
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

    if (typeof onTripPress === "function" && trip) {
      onTripPress({
        ...trip,
        students,
        destinationLocation: isValidCoordinate(schoolLocation)
          ? toCoordinate(schoolLocation)
          : schoolLocation,
        parkingLocation: isValidCoordinate(driverLocation)
          ? toCoordinate(driverLocation)
          : trip?.parkingLocation || trip?.pickupLocation || null,
      });
    }
  }, [
    buildRoute,
    driverLocation,
    locationPermission,
    onTripPress,
    schoolLocation,
    startLiveTracking,
    students,
    trip,
  ]);

  const handleRecalculate = useCallback(() => {
    buildRoute({ source: "manual" });
  }, [buildRoute]);

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

  const handleCallStudent = useCallback(async (phone) => {
    if (!phone) {
      Alert.alert("No phone number", "No contact number for this student.");
      return;
    }

    const tel = `tel:${String(phone).trim()}`;
    const supported = await Linking.canOpenURL(tel);
    if (!supported) {
      Alert.alert("Call unavailable", "Your device cannot place calls.");
      return;
    }
    Linking.openURL(tel);
  }, []);

  const handleToggleSheet = useCallback(() => {
    const nextExpanded = !isSheetExpanded;
    const toValue = nextExpanded ? sheetExpandedOffset : sheetCollapsedOffset;
    sheetOffsetRef.current = toValue;
    setIsSheetExpanded(nextExpanded);
    Animated.spring(sheetDrag, {
      toValue,
      useNativeDriver: true,
      bounciness: 6,
    }).start();
  }, [isSheetExpanded, sheetCollapsedOffset, sheetDrag, sheetExpandedOffset]);

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
      <StatusBar style="dark" />
      <View style={styles.screen}>
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
                  <MaterialIcons name="school" size={16} color={COLORS.white} />
                </View>
              </Marker>

              {markerGroups.map((group, index) => {
                if (group.type === "cluster") {
                  return (
                    <Marker key={`cluster-${index}`} coordinate={group.center}>
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

          <View style={styles.topOverlay}>
            <View style={styles.liveBadge}>
              <Animated.View
                style={[
                  styles.liveDot,
                  isTripLive && {
                    opacity: livePulse,
                    transform: [{ scale: livePulse }],
                  },
                ]}
              />
              <Text style={styles.liveBadgeText}>
                {isTripLive ? "Online" : "Offline"}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onSkipToProfile}
              style={styles.settingsBtn}
            >
              <MaterialIcons
                name="account-circle"
                size={22}
                color={COLORS.gray900}
              />
            </TouchableOpacity>
          </View>

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
            <TouchableOpacity
              style={styles.sheetToggleBtn}
              onPress={handleToggleSheet}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={
                  isSheetExpanded ? "keyboard-arrow-down" : "keyboard-arrow-up"
                }
                size={20}
                color={COLORS.blue}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.listSectionHeader}>
            <View style={styles.listHeaderTextWrap}>
              <Text style={styles.pickupTitle}>Assigned Students</Text>
              <Text style={styles.schoolName} numberOfLines={1}>
                {schoolName}
              </Text>
            </View>
            <Text style={styles.pickupSubtitle}>{pendingCount} waiting</Text>
          </View>

          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {students.map((student) => {
              const isCurrent = student.id === currentStudentId;
              const statusLabel = getStudentStatusLabel(student.status);

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
                    <Text style={styles.studentPickupLabel} numberOfLines={1}>
                      {student.pickupLabel}
                    </Text>
                  </View>
                  <View style={styles.studentMeta}>
                    {statusLabel ? (
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: `${getStudentStatusColor(student.status)}22`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStudentStatusColor(student.status) },
                          ]}
                        >
                          {statusLabel}
                        </Text>
                      </View>
                    ) : null}
                    <TouchableOpacity
                      style={[
                        styles.callBtn,
                        !student.phone && styles.callBtnDisabled,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => handleCallStudent(student.phone)}
                    >
                      <MaterialIcons
                        name="call"
                        size={14}
                        color={student.phone ? COLORS.blue : COLORS.gray500}
                      />
                      <Text
                        style={[
                          styles.callBtnText,
                          !student.phone && styles.callBtnTextDisabled,
                        ]}
                      >
                        Call
                      </Text>
                    </TouchableOpacity>
                    {isTripLive && student.status === STATUS_PENDING ? (
                      <TouchableOpacity
                        onPress={() => markSkipped(student.id)}
                        style={styles.absentBtn}
                      >
                        <Text style={styles.absentBtnText}>Absent</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.actionWrap}>
            <TouchableOpacity
              style={[
                styles.primaryCta,
                isTripLive && styles.primaryCtaLive,
                isTripLive && styles.primaryCtaDisabled,
              ]}
              onPress={handleStartTrip}
              activeOpacity={0.9}
              disabled={isTripLive}
            >
              <Text style={styles.primaryCtaText}>
                {isTripLive ? "LIVE TRIP" : "GO"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: "#EAF2FF",
    position: "relative",
  },
  map: {
    flex: 1,
  },
  topOverlay: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  liveBadge: {
    backgroundColor: "rgba(16,33,58,0.82)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#35D07F",
  },
  liveBadgeText: {
    color: COLORS.white,
    fontFamily: UbuntuFonts.medium,
    fontSize: 12,
  },
  settingsBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    shadowColor: "#0A2540",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 3,
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
    top: 54,
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
    top: 54,
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
    height: SHEET_EXPANDED_HEIGHT,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 14,
    shadowColor: "#0A2540",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 10,
  },
  dragHandleWrap: {
    alignItems: "center",
    paddingVertical: 8,
    position: "relative",
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 3,
    backgroundColor: "#D2DCEB",
  },
  sheetToggleBtn: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  listSectionHeader: {
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listHeaderTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  pickupTitle: {
    color: COLORS.gray900,
    fontSize: 17,
    fontFamily: UbuntuFonts.bold,
  },
  schoolName: {
    marginTop: 2,
    color: COLORS.gray700,
    fontFamily: UbuntuFonts.medium,
    fontSize: 12,
  },
  pickupSubtitle: {
    color: COLORS.blue,
    fontFamily: UbuntuFonts.bold,
    fontSize: 12,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 10,
    rowGap: 12,
  },
  studentRow: {
    borderWidth: 1,
    borderColor: "#E4ECF8",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    shadowColor: "#0A2540",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  studentRowCurrent: {
    borderColor: "#B8D7FB",
    backgroundColor: "#F6FAFF",
  },
  orderBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.blue,
    marginRight: 10,
  },
  orderBadgeText: {
    color: COLORS.white,
    fontFamily: UbuntuFonts.bold,
    fontSize: 13,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    color: COLORS.gray900,
    fontFamily: UbuntuFonts.medium,
    fontSize: 15,
  },
  studentPickupLabel: {
    marginTop: 2,
    color: COLORS.gray700,
    fontFamily: UbuntuFonts.regular,
    fontSize: 12,
  },
  studentMeta: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: {
    fontFamily: UbuntuFonts.medium,
    fontSize: 11,
  },
  absentBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F8CACA",
    backgroundColor: "#FFF4F4",
  },
  absentBtnText: {
    color: COLORS.red,
    fontSize: 10,
    fontFamily: UbuntuFonts.medium,
  },
  callBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CDE3FA",
    backgroundColor: "#F5FAFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  callBtnDisabled: {
    backgroundColor: "#F4F6FA",
    borderColor: "#E1E7F0",
  },
  callBtnText: {
    color: COLORS.blue,
    fontSize: 10,
    fontFamily: UbuntuFonts.medium,
  },
  callBtnTextDisabled: {
    color: COLORS.gray500,
  },
  actionWrap: {
    paddingTop: 12,
  },
  primaryCta: {
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.blue,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 9,
    elevation: 7,
  },
  primaryCtaLive: {
    backgroundColor: COLORS.blue,
    shadowColor: COLORS.blue,
  },
  primaryCtaDisabled: {
    opacity: 0.72,
  },
  primaryCtaText: {
    color: COLORS.white,
    fontFamily: UbuntuFonts.bold,
    fontSize: 18,
    letterSpacing: 1.4,
  },
  skeletonWrap: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  skeletonHero: {
    height: 56,
    backgroundColor: "#DDE9FB",
  },
  skeletonMap: {
    height: SCREEN_HEIGHT * 0.56,
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
