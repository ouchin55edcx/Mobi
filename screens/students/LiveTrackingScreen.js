import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Animated,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import {
  subscribeToTripState,
  subscribeToTripLiveLocations,
  unsubscribeChannel,
  calculateLiveEtaForStudentPickup,
} from "../../src/services/groupingService";
// Assuming these imports are necessary for functionality, but they are not part of the UX redesign
// import { supabase } from '../../src/lib/supabase';
// import * as Notifications from 'expo-notifications';
// import { isValidUUID, isExpoGo, validateAndReturnUUID } from '../../src/utils/validation';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// =================================================================
// 1. MODERN COLOR PALETTE & TYPOGRAPHY
// =================================================================
const COLORS = {
  primary: "#007AFF", // Vibrant Blue
  secondary: "#34C759", // Success Green
  warning: "#FF9500", // Warning Orange
  danger: "#FF3B30", // Danger Red
  background: "#F2F2F7", // Light Gray Background
  card: "#FFFFFF", // White Card Background
  textPrimary: "#1C1C1E", // Dark Text
  textSecondary: "#6A6A6A", // Secondary Gray Text
  border: "#E5E5EA", // Light Border
  shadow: "rgba(0, 0, 0, 0.1)",
};

const TYPOGRAPHY = {
  h1: { fontSize: 24, fontWeight: "700", color: COLORS.textPrimary },
  h2: { fontSize: 18, fontWeight: "600", color: COLORS.textPrimary },
  body: { fontSize: 15, fontWeight: "400", color: COLORS.textPrimary },
  caption: { fontSize: 12, fontWeight: "500", color: COLORS.textSecondary },
};

// =================================================================
// 2. TRANSLATIONS (Kept as is for functionality)
// =================================================================
const translations = {
  en: {
    title: "Live Tracking",
    driverArriving: "Driver Arriving",
    driverOnWay: "Driver On The Way",
    driverArrived: "Driver Arrived",
    pickupIn: "Pickup in",
    arrivalIn: "Arrival in",
    minutes: "min",
    seconds: "sec",
    estimatedArrival: "ETA",
    currentLocation: "Current Location",
    driverLocation: "Driver Location",
    tripStatus: "Trip Status",
    active: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
    back: "Back",
    distance: "Distance",
    km: "km",
    timeElapsed: "Time Elapsed",
    speed: "Speed",
    kmh: "km/h",
    callDriver: "Call",
    messageDriver: "Message",
    shareLocation: "Share",
    centerOnMe: "Me",
    centerOnBus: "Bus",
    refresh: "Refresh",
    driverInfo: "Driver",
    vehicle: "Vehicle",
    online: "Online",
    offline: "Offline",
    busRoute: "Bus Route",
    yourRoute: "Walking Route",
    tripProgress: "Progress",
    showDetails: "Details",
    hideDetails: "Hide",
    now: "Now",
    soon: "Soon",
    done: "Done",
    home: "Home",
    pickupStation: "Pickup Station",
    school: "School",
    walkToStation: "Walk to station",
    finalDestination: "Final destination",
  },
  ar: {
    title: "التتبع المباشر",
    driverArriving: "السائق قادم",
    driverOnWay: "السائق في الطريق",
    driverArrived: "وصل السائق",
    pickupIn: "الاستلام خلال",
    arrivalIn: "الوصول خلال",
    minutes: "دقيقة",
    seconds: "ثانية",
    estimatedArrival: "وقت الوصول",
    currentLocation: "الموقع الحالي",
    driverLocation: "موقع السائق",
    tripStatus: "حالة الرحلة",
    active: "نشط",
    completed: "مكتمل",
    cancelled: "ملغي",
    back: "رجوع",
    distance: "المسافة",
    km: "كم",
    timeElapsed: "الوقت المنقضي",
    speed: "السرعة",
    kmh: "كم/س",
    callDriver: "اتصال",
    messageDriver: "رسالة",
    shareLocation: "مشاركة",
    centerOnMe: "موقعي",
    centerOnBus: "الحافلة",
    refresh: "تحديث",
    driverInfo: "السائق",
    vehicle: "المركبة",
    online: "متصل",
    offline: "غير متصل",
    busRoute: "مسار الحافلة",
    yourRoute: "مسار المشي",
    tripProgress: "التقدم",
    showDetails: "التفاصيل",
    hideDetails: "إخفاء",
    now: "الآن",
    soon: "قريباً",
    done: "تم",
    home: "المنزل",
    pickupStation: "محطة الركوب",
    school: "الجامعة",
    walkToStation: "مشي إلى المحطة",
    finalDestination: "الوجهة النهائية",
  },
};

// =================================================================
// 3. HELPER FUNCTIONS (Simplified/Kept as is)
// =================================================================
const formatTime = (date) => {
  if (!date) return "--:--";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const getTimelineStatus = (currentStep, targetStep) => {
  if (currentStep > targetStep) return "done";
  if (currentStep === targetStep) return "now";
  return "soon";
};

// =================================================================
// 4. REDESIGNED COMPONENTS
// =================================================================

// Component for the simplified, modern timeline
const MinimalTimeline = ({ t, currentStep, isRTL }) => {
  const steps = [
    { id: 1, label: t.home, icon: "home", color: COLORS.primary },
    {
      id: 2,
      label: t.pickupStation,
      icon: "location-on",
      color: COLORS.primary,
    },
    { id: 3, label: t.school, icon: "school", color: COLORS.secondary },
  ];

  return (
    <View style={timelineStyles.container}>
      <Text style={[TYPOGRAPHY.h2, isRTL && timelineStyles.rtlText]}>
        {t.tripProgress}
      </Text>
      <View style={timelineStyles.timelineWrapper}>
        {steps.map((step, index) => {
          const status = getTimelineStatus(currentStep, step.id);
          const isActive = status === "now";
          const isDone = status === "done";
          const isLast = index === steps.length - 1;

          let dotColor = COLORS.border;
          let iconColor = COLORS.textSecondary;
          let labelStyle = TYPOGRAPHY.body;

          if (isDone) {
            dotColor = COLORS.secondary;
            iconColor = COLORS.card;
            labelStyle = { ...TYPOGRAPHY.body, color: COLORS.textPrimary };
          } else if (isActive) {
            dotColor = COLORS.primary;
            iconColor = COLORS.card;
            labelStyle = {
              ...TYPOGRAPHY.body,
              fontWeight: "600",
              color: COLORS.primary,
            };
          }

          return (
            <React.Fragment key={step.id}>
              <View style={timelineStyles.item}>
                {/* Left Column: Icon and Connector */}
                <View style={timelineStyles.leftColumn}>
                  <View
                    style={[
                      timelineStyles.iconWrapper,
                      {
                        backgroundColor:
                          isDone || isActive ? step.color : COLORS.background,
                      },
                      isDone && { backgroundColor: COLORS.secondary },
                    ]}
                  >
                    <MaterialIcons
                      name={step.icon}
                      size={20}
                      color={
                        isDone || isActive ? COLORS.card : COLORS.textSecondary
                      }
                    />
                  </View>
                  {!isLast && (
                    <View
                      style={[
                        timelineStyles.connector,
                        {
                          backgroundColor: isDone
                            ? COLORS.secondary
                            : COLORS.border,
                        },
                      ]}
                    />
                  )}
                </View>

                {/* Right Column: Label and Status */}
                <View
                  style={[
                    timelineStyles.rightColumn,
                    isRTL && timelineStyles.rtlRightColumn,
                  ]}
                >
                  <Text style={[labelStyle, isRTL && timelineStyles.rtlText]}>
                    {step.label}
                  </Text>
                  <View
                    style={[
                      timelineStyles.statusBadge,
                      {
                        backgroundColor: isDone
                          ? COLORS.secondary
                          : isActive
                            ? COLORS.primary
                            : COLORS.textSecondary,
                      },
                      { opacity: isDone || isActive ? 1 : 0.5 },
                    ]}
                  >
                    <Text style={timelineStyles.statusText}>
                      {isDone ? t.done : isActive ? t.now : t.soon}
                    </Text>
                  </View>
                </View>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

// Component for Driver/Action Card
const DriverActionCard = ({ t, driverInfo, isRTL }) => {
  const isOnline = driverInfo?.is_online ?? true; // Default to true for demo
  const driverName = driverInfo?.name || "Driver Name";
  const vehicle = driverInfo?.vehicle || "Vehicle Info";

  const ActionButton = ({ icon, label, color, onPress }) => (
    <TouchableOpacity style={driverActionStyles.actionBtn} onPress={onPress}>
      <MaterialIcons name={icon} size={20} color={color} />
      <Text
        style={[
          driverActionStyles.actionText,
          { color },
          isRTL && driverActionStyles.rtlText,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={driverActionStyles.container}>
      <Text style={[TYPOGRAPHY.h2, isRTL && driverActionStyles.rtlText]}>
        {t.driverInfo}
      </Text>

      {/* Driver Info Row */}
      <View
        style={[
          driverActionStyles.driverRow,
          isRTL && driverActionStyles.driverRowRTL,
        ]}
      >
        <View style={driverActionStyles.avatar}>
          <MaterialIcons name="person" size={24} color={COLORS.card} />
        </View>
        <View style={driverActionStyles.info}>
          <View
            style={[
              driverActionStyles.nameRow,
              isRTL && driverActionStyles.nameRowRTL,
            ]}
          >
            <Text
              style={[
                TYPOGRAPHY.h2,
                driverActionStyles.name,
                isRTL && driverActionStyles.rtlText,
              ]}
            >
              {driverName}
            </Text>
            <View
              style={[
                driverActionStyles.onlineBadge,
                {
                  backgroundColor: isOnline
                    ? COLORS.secondary
                    : COLORS.textSecondary,
                },
              ]}
            >
              <Text style={driverActionStyles.onlineText}>
                {isOnline ? t.online : t.offline}
              </Text>
            </View>
          </View>
          <Text
            style={[TYPOGRAPHY.caption, isRTL && driverActionStyles.rtlText]}
          >
            {t.vehicle}: {vehicle}
          </Text>
        </View>
      </View>

      {/* Actions Row */}
      <View
        style={[
          driverActionStyles.actionsRow,
          isRTL && driverActionStyles.actionsRowRTL,
        ]}
      >
        <ActionButton
          icon="call"
          label={t.callDriver}
          color={COLORS.primary}
          onPress={() => Alert.alert("Call Driver")}
        />
        <ActionButton
          icon="message"
          label={t.messageDriver}
          color={COLORS.primary}
          onPress={() => Alert.alert("Message Driver")}
        />
        <ActionButton
          icon="share"
          label={t.shareLocation}
          color={COLORS.primary}
          onPress={() => Alert.alert("Share Location")}
        />
      </View>
    </View>
  );
};

// =================================================================
// 5. MAIN COMPONENT (Refactored)
// =================================================================
const LiveTrackingScreen = ({
  tripId,
  studentId,
  language = "en",
  onBack,
  tripData: providedTripData = null,
}) => {
  // State variables (kept as is for logic)
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [tripStatus, setTripStatus] = useState("ACTIVE"); // ACTIVE, IN_PROGRESS, COMPLETED, CANCELLED
  const [driverLocation, setDriverLocation] = useState({
    latitude: 33.578,
    longitude: -7.5911,
  });
  const [studentLocation, setStudentLocation] = useState({
    latitude: 33.5731,
    longitude: -7.5898,
  });
  const [pickupLocation, setPickupLocation] = useState({
    latitude: 33.575,
    longitude: -7.59,
  });
  const [destinationLocation, setDestinationLocation] = useState({
    latitude: 33.58,
    longitude: -7.592,
  });
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [countdown, setCountdown] = useState({ minutes: 10, seconds: 30 });
  const [arrivalCountdown, setArrivalCountdown] = useState({
    minutes: 25,
    seconds: 0,
  });
  const [estimatedArrival, setEstimatedArrival] = useState(
    new Date(Date.now() + 15 * 60 * 1000),
  );
  const [driverInfo, setDriverInfo] = useState({
    name: "Ahmed Mahmoud",
    vehicle: "Mercedes Sprinter - A12345",
    is_online: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [distanceToPickup, setDistanceToPickup] = useState(2.5);
  const [tripProgress, setTripProgress] = useState(50);
  const [showDetails, setShowDetails] = useState(true);
  const [currentStep, setCurrentStep] = useState(2); // 1: Home, 2: Pickup, 3: School

  const t = translations[language];
  const isRTL = language === "ar";

  // Animated value for the bottom sheet
  const panelHeight = useRef(new Animated.Value(showDetails ? 360 : 0)).current;
  const toggleBtnBottom = useRef(
    new Animated.Value(showDetails ? 370 : 50),
  ).current;

  useEffect(() => {
    Animated.timing(panelHeight, {
      toValue: showDetails ? 360 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();

    Animated.timing(toggleBtnBottom, {
      toValue: showDetails ? 370 : 50,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showDetails]);

  useEffect(() => {
    if (!providedTripData) return;

    if (providedTripData.homeLocation) {
      setStudentLocation(providedTripData.homeLocation);
    }
    if (providedTripData.pickupLocation) {
      setPickupLocation(providedTripData.pickupLocation);
    }
    if (providedTripData.destinationLocation) {
      setDestinationLocation(providedTripData.destinationLocation);
    }
    if (Array.isArray(providedTripData.routeCoordinates)) {
      setRouteCoordinates(providedTripData.routeCoordinates);
    }
    if (providedTripData.driverName) {
      setDriverInfo((prev) => ({ ...prev, name: providedTripData.driverName }));
    }
  }, [providedTripData]);

  useEffect(() => {
    if (!tripId) return undefined;

    const tripChannel = subscribeToTripState(tripId, (nextTrip) => {
      if (nextTrip?.status === "trip_started") {
        setTripStatus("IN_PROGRESS");
      } else if (nextTrip?.status === "trip_completed") {
        setTripStatus("COMPLETED");
      } else {
        setTripStatus("ACTIVE");
      }

      if (
        nextTrip?.live_location?.latitude &&
        nextTrip?.live_location?.longitude
      ) {
        setDriverLocation({
          latitude: nextTrip.live_location.latitude,
          longitude: nextTrip.live_location.longitude,
        });
      }

      if (Array.isArray(nextTrip?.route_polyline)) {
        setRouteCoordinates(nextTrip.route_polyline);
      }
    });

    const locationChannel = subscribeToTripLiveLocations(
      tripId,
      (nextLocation) => {
        if (
          nextLocation?.location?.latitude &&
          nextLocation?.location?.longitude
        ) {
          setDriverLocation({
            latitude: nextLocation.location.latitude,
            longitude: nextLocation.location.longitude,
          });
        }
      },
    );

    const etaInterval = setInterval(async () => {
      if (!studentId) return;
      const eta = await calculateLiveEtaForStudentPickup({ tripId, studentId });
      if (!eta.error && eta.data?.etaMinutes) {
        const minutes = eta.data.etaMinutes;
        setCountdown({ minutes, seconds: 0 });
        setEstimatedArrival(new Date(Date.now() + minutes * 60 * 1000));
      }
    }, 20000);

    return () => {
      clearInterval(etaInterval);
      unsubscribeChannel(tripChannel);
      unsubscribeChannel(locationChannel);
    };
  }, [tripId, studentId]);

  const getStatusDisplay = () => {
    let text = t.driverOnWay;
    let color = COLORS.primary;

    if (tripStatus === "ACTIVE") {
      text = t.driverArriving;
      color = COLORS.warning;
    } else if (tripStatus === "COMPLETED") {
      text = t.completed;
      color = COLORS.secondary;
    } else if (tripStatus === "CANCELLED") {
      text = t.cancelled;
      color = COLORS.danger;
    }

    return { text, color };
  };

  const statusDisplay = getStatusDisplay();

  // Map region calculation (simplified)
  const getInitialRegion = () => {
    if (driverLocation && studentLocation) {
      const allLats = [
        driverLocation.latitude,
        studentLocation.latitude,
        pickupLocation.latitude,
        destinationLocation.latitude,
      ];
      const allLngs = [
        driverLocation.longitude,
        studentLocation.longitude,
        pickupLocation.longitude,
        destinationLocation.longitude,
      ];

      const minLat = Math.min(...allLats);
      const maxLat = Math.max(...allLats);
      const minLng = Math.min(...allLngs);
      const maxLng = Math.max(...allLngs);

      const latitude = (minLat + maxLat) / 2;
      const longitude = (minLng + maxLng) / 2;
      const latitudeDelta = (maxLat - minLat) * 1.5;
      const longitudeDelta = (maxLng - minLng) * 1.5;

      return { latitude, longitude, latitudeDelta, longitudeDelta };
    }
    return {
      latitude: 33.578,
      longitude: -7.5911,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };
  };

  // =================================================================
  // 6. RENDER FUNCTION (Redesigned JSX)
  // =================================================================
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      {/* Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={getInitialRegion()}
        onLayout={() => setMapReady(true)}
      >
        {/* Driver Marker */}
        {driverLocation && (
          <Marker coordinate={driverLocation} title={t.driverLocation}>
            <View style={styles.driverMarker}>
              <MaterialIcons
                name="directions-bus"
                size={24}
                color={COLORS.card}
              />
            </View>
          </Marker>
        )}

        {/* Student Marker */}
        {studentLocation && (
          <Marker coordinate={studentLocation} title={t.currentLocation}>
            <MaterialIcons
              name="person-pin-circle"
              size={30}
              color={COLORS.primary}
            />
          </Marker>
        )}

        {/* Route Polyline (simplified to show only one for clean look) */}
        {routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={COLORS.primary}
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Floating Header: Back Button and Status */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack || (() => Alert.alert("Go Back"))}
        >
          <MaterialIcons
            name={isRTL ? "arrow-forward-ios" : "arrow-back-ios"}
            size={20}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.statusCard}>
          <View
            style={[styles.statusDot, { backgroundColor: statusDisplay.color }]}
          />
          <Text
            style={[
              TYPOGRAPHY.caption,
              { color: statusDisplay.color, fontWeight: "700" },
            ]}
          >
            {statusDisplay.text}
          </Text>
          {estimatedArrival && (
            <>
              <View style={styles.statusDivider} />
              <MaterialIcons
                name="schedule"
                size={14}
                color={COLORS.textSecondary}
              />
              <Text style={[TYPOGRAPHY.caption, { fontWeight: "600" }]}>
                {t.estimatedArrival}: {formatTime(estimatedArrival)}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Floating Map Controls */}
      <View style={[styles.mapControls, isRTL && styles.mapControlsRTL]}>
        <TouchableOpacity
          style={styles.mapControlBtn}
          onPress={() => Alert.alert("Center on Me")}
        >
          <MaterialIcons
            name="my-location"
            size={24}
            color={COLORS.textPrimary}
          />
          <Text style={TYPOGRAPHY.caption}>{t.centerOnMe}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.mapControlBtn}
          onPress={() => Alert.alert("Center on Bus")}
        >
          <MaterialIcons
            name="directions-bus"
            size={24}
            color={COLORS.textPrimary}
          />
          <Text style={TYPOGRAPHY.caption}>{t.centerOnBus}</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Toggle Button */}
      <Animated.View
        style={[styles.toggleBtnContainer, { bottom: toggleBtnBottom }]}
      >
        <TouchableOpacity
          style={[styles.toggleBtn, isRTL && styles.toggleBtnRTL]}
          onPress={() => setShowDetails(!showDetails)}
          activeOpacity={0.9}
        >
          <MaterialIcons
            name={showDetails ? "expand-more" : "expand-less"}
            size={24}
            color={COLORS.textSecondary}
          />
          <Text style={[styles.toggleText, isRTL && styles.rtlText]}>
            {showDetails ? t.hideDetails : t.showDetails}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Info Panel (Bottom Sheet) */}
      <Animated.View style={[styles.panel, { height: panelHeight }]}>
        <View style={styles.panelHandle} />

        <ScrollView
          style={styles.panelScroll}
          contentContainerStyle={styles.panelContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Countdown/ETA Card */}
          <View style={styles.etaCard}>
            <View style={[styles.etaRow, isRTL && styles.etaRowRTL]}>
              <MaterialIcons
                name={tripStatus === "ACTIVE" ? "access-time" : "location-on"}
                size={24}
                color={COLORS.card}
              />
              <Text
                style={[
                  TYPOGRAPHY.h2,
                  styles.etaLabel,
                  isRTL && styles.rtlText,
                ]}
              >
                {tripStatus === "ACTIVE" ? t.pickupIn : t.arrivalIn}
              </Text>
            </View>
            <View style={styles.timerDisplay}>
              <Text style={styles.timeValue}>
                {String(
                  tripStatus === "ACTIVE"
                    ? countdown.minutes
                    : arrivalCountdown.minutes,
                ).padStart(2, "0")}
              </Text>
              <Text style={styles.timeSeparator}>:</Text>
              <Text style={styles.timeValue}>
                {String(
                  tripStatus === "ACTIVE"
                    ? countdown.seconds
                    : arrivalCountdown.seconds,
                ).padStart(2, "0")}
              </Text>
              <Text style={[styles.timeUnit, isRTL && styles.rtlText]}>
                {t.minutes} {t.seconds}
              </Text>
            </View>
          </View>

          {/* 2. Metrics */}
          <View style={[styles.metrics, isRTL && styles.metricsRTL]}>
            <View style={styles.metric}>
              <MaterialIcons
                name="straighten"
                size={20}
                color={COLORS.primary}
              />
              <View style={styles.metricInfo}>
                <Text style={[TYPOGRAPHY.caption, isRTL && styles.rtlText]}>
                  {t.distance}
                </Text>
                <Text
                  style={[
                    TYPOGRAPHY.body,
                    { fontWeight: "600" },
                    isRTL && styles.rtlText,
                  ]}
                >
                  {distanceToPickup.toFixed(1)} {t.km}
                </Text>
              </View>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metric}>
              <MaterialIcons
                name="schedule"
                size={20}
                color={COLORS.secondary}
              />
              <View style={styles.metricInfo}>
                <Text style={[TYPOGRAPHY.caption, isRTL && styles.rtlText]}>
                  {t.estimatedArrival}
                </Text>
                <Text
                  style={[
                    TYPOGRAPHY.body,
                    { fontWeight: "600" },
                    isRTL && styles.rtlText,
                  ]}
                >
                  {estimatedArrival ? formatTime(estimatedArrival) : "--:--"}
                </Text>
              </View>
            </View>
          </View>

          {/* 3. Minimal Timeline */}
          <MinimalTimeline t={t} currentStep={currentStep} isRTL={isRTL} />

          {/* 4. Driver Info and Actions */}
          {driverInfo && (
            <DriverActionCard t={t} driverInfo={driverInfo} isRTL={isRTL} />
          )}
        </ScrollView>
      </Animated.View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading trip data...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

// =================================================================
// 7. STYLES (Redesigned)
// =================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  map: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  rtlText: {
    textAlign: "right",
  },

  // Floating Header (Status Bar)
  header: {
    position: "absolute",
    top: Platform.OS === "ios" ? 10 : 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerRTL: {
    flexDirection: "row-reverse",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  statusCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusDivider: {
    width: 1,
    height: 16,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },

  // Map Controls
  mapControls: {
    position: "absolute",
    top: Platform.OS === "ios" ? 70 : 70,
    right: 16,
    gap: 10,
    zIndex: 10,
  },
  mapControlsRTL: {
    right: "auto",
    left: 16,
  },
  mapControlBtn: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  // Toggle Button
  toggleBtnContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  toggleBtnRTL: {
    flexDirection: "row-reverse",
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  // Panel (Bottom Sheet)
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  panelHandle: {
    width: 40,
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: 2.5,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  panelScroll: {
    flex: 1,
  },
  panelContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },

  // ETA Card (Redesigned Timer)
  etaCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  etaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  etaRowRTL: {
    flexDirection: "row-reverse",
  },
  etaLabel: {
    color: COLORS.card,
    fontWeight: "700",
    fontSize: 16,
  },
  timerDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  timeValue: {
    fontSize: 48,
    fontWeight: "800",
    color: COLORS.card,
    letterSpacing: -1,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  timeSeparator: {
    fontSize: 48,
    fontWeight: "300",
    color: "rgba(255, 255, 255, 0.8)",
    marginHorizontal: 4,
  },
  timeUnit: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    marginLeft: 8,
  },

  // Metrics
  metrics: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    justifyContent: "space-around",
  },
  metricsRTL: {
    flexDirection: "row-reverse",
  },
  metric: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  metricInfo: {
    flex: 1,
  },
  metricDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },

  // Loading/Error Overlays
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  loadingText: {
    marginTop: 10,
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  errorText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.danger,
  },

  // Markers
  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: COLORS.card,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
});

// =================================================================
// 8. TIMELINE STYLES
// =================================================================
const timelineStyles = StyleSheet.create({
  container: {
    padding: 0,
  },
  rtlText: {
    textAlign: "right",
  },
  timelineWrapper: {
    marginTop: 15,
    paddingHorizontal: 10,
  },
  item: {
    flexDirection: "row",
    marginBottom: 20,
  },
  leftColumn: {
    alignItems: "center",
    width: 40,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  connector: {
    width: 2,
    flex: 1,
    marginTop: 5,
    marginBottom: -5,
  },
  rightColumn: {
    flex: 1,
    marginLeft: 15,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 15,
  },
  rtlRightColumn: {
    marginRight: 15,
    marginLeft: 0,
    flexDirection: "row-reverse",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.card,
    textTransform: "uppercase",
  },
});

// =================================================================
// 9. DRIVER ACTION STYLES
// =================================================================
const driverActionStyles = StyleSheet.create({
  container: {
    padding: 0,
  },
  rtlText: {
    textAlign: "right",
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginTop: 15,
    marginBottom: 20,
    padding: 15,
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  driverRowRTL: {
    flexDirection: "row-reverse",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  nameRowRTL: {
    flexDirection: "row-reverse",
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
  },
  onlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  onlineText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.card,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  actionsRowRTL: {
    flexDirection: "row-reverse",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default LiveTrackingScreen;
