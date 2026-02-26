import React, { useState, useEffect, useRef, useCallback } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { UbuntuFonts } from "../../src/utils/fonts";
import * as Location from "expo-location";
import { updateDriverLiveLocation } from "../../src/services/groupingService";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const translations = {
  en: {
    live: "LIVE",
    nextStudent: "Next Student",
    distance: "Distance",
    atPickupPoint: "At Pickup Point",
    notAtPickupPoint: "Not At Pickup Point",
    call: "Call",
    sos: "SOS",
    endTrip: "End Trip",
    back: "Back",
    km: "km",
    minutes: "min",
    seconds: "sec",
  },
  ar: {
    live: "مباشر",
    nextStudent: "الطالب التالي",
    distance: "المسافة",
    atPickupPoint: "في نقطة الاستلام",
    notAtPickupPoint: "غير موجود في نقطة الاستلام",
    call: "اتصال",
    sos: "طوارئ",
    endTrip: "إنهاء الرحلة",
    back: "رجوع",
    km: "كم",
    minutes: "دقيقة",
    seconds: "ثانية",
  },
};

// Calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
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

const TripLiveViewScreen = ({
  tripData,
  driverId,
  language = "en",
  onBack,
  onCompleteTrip,
  isDemo = true,
}) => {
  const t = translations[language];
  const isRTL = language === "ar";

  // Initialize trip data
  const [trip, setTrip] = useState(() => {
    if (tripData) {
      const students = tripData.students || [];
      const destinationLocation = tripData.destinationLocation || {
        latitude: 33.58,
        longitude: -7.592,
      };
      return {
        ...tripData,
        students,
        destinationLocation,
        startTime: new Date(),
      };
    }
    return {
      students: [],
      destinationLocation: { latitude: 33.58, longitude: -7.592 },
      startTime: new Date(),
    };
  });

  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [tripTime, setTripTime] = useState(0); // in seconds (elapsed)
  const [remainingSeconds, setRemainingSeconds] = useState(20 * 60); // simple countdown for demo
  const [driverLocation, setDriverLocation] = useState(
    trip.parkingLocation ||
    trip.students?.[0]?.homeLocation || {
      latitude: 33.575,
      longitude: -7.59,
    },
  );
  const [routeIndex, setRouteIndex] = useState(0);
  const [studentAtPickup, setStudentAtPickup] = useState(false);
  const [endingTrip, setEndingTrip] = useState(false);

  const mapRef = useRef(null);
  const tripTimeIntervalRef = useRef(null);
  const driverMoveIntervalRef = useRef(null);
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const sosPulseAnimation = useRef(new Animated.Value(1)).current;
  const sosRotateAnimation = useRef(new Animated.Value(0)).current;

  // Get next student
  const nextStudent = trip.students?.[currentStudentIndex] || null;

  // Calculate distance to next student
  const distanceToNextStudent = nextStudent?.homeLocation
    ? calculateDistance(
      driverLocation.latitude,
      driverLocation.longitude,
      nextStudent.homeLocation.latitude,
      nextStudent.homeLocation.longitude,
    )
    : 0;

  // Check if student is at pickup point (within 50 meters)
  useEffect(() => {
    if (nextStudent?.homeLocation) {
      const distance = distanceToNextStudent * 1000; // Convert to meters
      setStudentAtPickup(distance < 0.05); // 50 meters threshold
    }
  }, [distanceToNextStudent, nextStudent]);

  // Build ordered route: parking -> students -> school
  const routeCoordinates = React.useMemo(() => {
    const coords = [];
    if (trip.parkingLocation) {
      coords.push(trip.parkingLocation);
    } else if (trip.students?.[0]?.homeLocation) {
      coords.push(trip.students[0].homeLocation);
    }
    (trip.students || [])
      .map((s) => s.homeLocation)
      .filter(Boolean)
      .forEach((loc) => coords.push(loc));
    if (trip.destinationLocation) {
      coords.push(trip.destinationLocation);
    }
    return coords;
  }, [trip]);

  // Start trip timer and countdown
  useEffect(() => {
    tripTimeIntervalRef.current = setInterval(() => {
      setTripTime((prev) => prev + 1);
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      if (tripTimeIntervalRef.current) {
        clearInterval(tripTimeIntervalRef.current);
      }
    };
  }, []);

  // Simulate driver moving along the route and progressing through pickups
  useEffect(() => {
    if (!isDemo) return undefined;
    if (!routeCoordinates.length) return;

    // Clear any existing interval
    if (driverMoveIntervalRef.current) {
      clearInterval(driverMoveIntervalRef.current);
    }

    let index = 0;
    setRouteIndex(0);
    setDriverLocation(routeCoordinates[0]);

    driverMoveIntervalRef.current = setInterval(() => {
      index = Math.min(index + 1, routeCoordinates.length - 1);
      const nextPoint = routeCoordinates[index];
      setRouteIndex(index);
      setDriverLocation(nextPoint);

      // Advance to next student when passing its coordinate
      const nextStudent = trip.students?.[currentStudentIndex];
      if (nextStudent?.homeLocation) {
        const d = calculateDistance(
          nextPoint.latitude,
          nextPoint.longitude,
          nextStudent.homeLocation.latitude,
          nextStudent.homeLocation.longitude,
        );
        if (
          d < 0.05 &&
          currentStudentIndex < (trip.students?.length || 0) - 1
        ) {
          setCurrentStudentIndex((prev) => prev + 1);
        }
      }

      // Follow bus on map
      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: nextPoint.latitude,
            longitude: nextPoint.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          800,
        );
      }

      // Stop at end of route
      if (
        index === routeCoordinates.length - 1 &&
        driverMoveIntervalRef.current
      ) {
        clearInterval(driverMoveIntervalRef.current);
      }
    }, 5000); // move every 5 seconds

    return () => {
      if (driverMoveIntervalRef.current) {
        clearInterval(driverMoveIntervalRef.current);
      }
    };
  }, [routeCoordinates, trip.students, currentStudentIndex, isDemo]);

  // Live GPS updates to Supabase for non-demo mode
  useEffect(() => {
    if (isDemo || !trip?.id || !driverId) {
      return undefined;
    }

    let subscription = null;
    let mounted = true;

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || !mounted) {
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        async (position) => {
          const { latitude, longitude, speed, heading } = position.coords;
          setDriverLocation({ latitude, longitude });
          await updateDriverLiveLocation({
            tripId: trip.id,
            driverId,
            latitude,
            longitude,
            speedMps: typeof speed === "number" ? speed : null,
            heading: typeof heading === "number" ? heading : null,
          });
        },
      );
    };

    startTracking();

    return () => {
      mounted = false;
      if (subscription?.remove) {
        subscription.remove();
      }
    };
  }, [isDemo, trip?.id, driverId]);

  // Enhanced pulse animation for LIVE indicator with expanding circles
  const pulseAnimation2 = useRef(new Animated.Value(0)).current;
  const pulseAnimation3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createPulseSequence = (animation, delay = 0) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(animation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      );
    };

    const pulse1 = createPulseSequence(pulseAnimation);
    const pulse2 = createPulseSequence(pulseAnimation2, 667);
    const pulse3 = createPulseSequence(pulseAnimation3, 1333);

    pulse1.start();
    pulse2.start();
    pulse3.start();

    return () => {
      pulse1.stop();
      pulse2.stop();
      pulse3.stop();
    };
  }, []);

  // Warning icon animation for status badge
  const warningShakeAnimation = useRef(new Animated.Value(0)).current;

  // SOS Button animations
  useEffect(() => {
    const sosPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(sosPulseAnimation, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(sosPulseAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );

    const sosRotate = Animated.loop(
      Animated.timing(sosRotateAnimation, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }),
    );

    sosPulse.start();
    sosRotate.start();

    return () => {
      sosPulse.stop();
      sosRotate.stop();
    };
  }, []);

  // Warning icon shake animation
  useEffect(() => {
    if (!studentAtPickup) {
      const shake = Animated.loop(
        Animated.sequence([
          Animated.timing(warningShakeAnimation, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(warningShakeAnimation, {
            toValue: -1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(warningShakeAnimation, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(warningShakeAnimation, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      );
      shake.start();

      return () => shake.stop();
    }
  }, [studentAtPickup]);

  const sosRotateInterpolate = sosRotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Format trip time
  const formatTripTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  };

  const triggerHapticFeedback = () => {
    if (Platform.OS === "ios") {
      Vibration.vibrate(50);
    } else {
      Vibration.vibrate(50);
    }
  };

  const handleCall = (phone) => {
    triggerHapticFeedback();
    Linking.openURL(`tel:${phone}`);
  };

  const handleEndTrip = async () => {
    if (!onCompleteTrip || endingTrip) return;
    setEndingTrip(true);
    try {
      await onCompleteTrip(trip);
    } finally {
      setEndingTrip(false);
    }
  };

  const handleSOS = () => {
    triggerHapticFeedback();
    // Handle SOS emergency
    Linking.openURL("tel:190"); // Emergency number
  };

  // Fit map to show all locations
  useEffect(() => {
    if (mapRef.current && routeCoordinates.length > 0) {
      mapRef.current.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 150, right: 50, bottom: 250, left: 50 },
        animated: true,
      });
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar style="light" />

      {/* Full Screen Map */}
      <MapView
        ref={mapRef}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={{
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {/* Student pickup points */}
        {trip.students?.map((student, index) => {
          if (!student.homeLocation) return null;
          const isNext = index === currentStudentIndex;
          return (
            <Marker
              key={student.id || index}
              coordinate={student.homeLocation}
              title={student.name}
            >
              <View
                style={[styles.pickupMarker, isNext && styles.nextPickupMarker]}
              >
                <Text
                  style={[
                    styles.markerNumber,
                    isNext && styles.nextMarkerNumber,
                  ]}
                >
                  {index + 1}
                </Text>
              </View>
            </Marker>
          );
        })}

        {/* Destination marker */}
        <Marker coordinate={trip.destinationLocation} pinColor="#10B981" />

        {/* Driver location */}
        <Marker coordinate={driverLocation} title="Driver">
          <View style={styles.driverMarker}>
            <MaterialIcons name="directions-bus" size={32} color="#FFFFFF" />
          </View>
        </Marker>

        {/* Multi-segment route polyline with gradient colors */}
        {routeCoordinates.length > 1 && (
          <>
            {/* Completed segment (green) */}
            {routeIndex > 0 && (
              <Polyline
                coordinates={routeCoordinates.slice(0, routeIndex + 1)}
                strokeColor="#10B981"
                strokeWidth={6}
                lineDashPattern={[0]}
                zIndex={1}
              />
            )}

            {/* Current segment (blue) */}
            {routeIndex < routeCoordinates.length - 1 && (
              <Polyline
                coordinates={routeCoordinates.slice(routeIndex, routeIndex + 2)}
                strokeColor="#3B82F6"
                strokeWidth={8}
                lineDashPattern={[0]}
                zIndex={2}
              />
            )}

            {/* Remaining segment (gray) */}
            {routeIndex < routeCoordinates.length - 2 && (
              <Polyline
                coordinates={routeCoordinates.slice(routeIndex + 1)}
                strokeColor="#9CA3AF"
                strokeWidth={4}
                lineDashPattern={[5, 5]}
                zIndex={0}
              />
            )}
          </>
        )}
      </MapView>

      {/* Back Button - Enhanced */}
      <TouchableOpacity
        style={[styles.backButton, isRTL && styles.backButtonRTL]}
        onPress={() => {
          triggerHapticFeedback();
          onBack();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.backButtonContainer}>
          <MaterialIcons
            name={isRTL ? "arrow-forward" : "arrow-back"}
            size={24}
            color="#1A1A1A"
          />
        </View>
      </TouchableOpacity>

      {/* End Trip Button */}
      <TouchableOpacity
        style={[
          styles.endTripButton,
          endingTrip && styles.endTripButtonDisabled,
        ]}
        onPress={handleEndTrip}
        disabled={endingTrip}
        activeOpacity={0.8}
      >
        <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
        <Text style={styles.endTripButtonText}>{t.endTrip}</Text>
      </TouchableOpacity>

      {/* LIVE Indicator with Trip Time - Enhanced */}
      <View style={styles.liveContainer}>
        <View style={styles.liveBadgeContainer}>
          {/* Expanding pulse circles */}
          <Animated.View
            style={[
              styles.livePulseCircle,
              styles.livePulseCircle1,
              {
                opacity: pulseAnimation.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.6, 0],
                }),
                transform: [
                  {
                    scale: pulseAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 2.5],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.livePulseCircle,
              styles.livePulseCircle2,
              {
                opacity: pulseAnimation2.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.4, 0],
                }),
                transform: [
                  {
                    scale: pulseAnimation2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 2.5],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.livePulseCircle,
              styles.livePulseCircle3,
              {
                opacity: pulseAnimation3.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.2, 0],
                }),
                transform: [
                  {
                    scale: pulseAnimation3.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 2.5],
                    }),
                  },
                ],
              },
            ]}
          />

          {/* Main badge with subtle pulse */}
          <Animated.View
            style={[
              styles.liveBadge,
              {
                transform: [
                  {
                    scale: pulseAnimation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [1, 1.05, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{t.live}</Text>
          </Animated.View>
        </View>
        <View style={styles.tripTimeContainer}>
          <Text style={styles.tripTimeText}>{formatTripTime(tripTime)}</Text>
        </View>
      </View>

      {/* Distance Card - Minimal */}
      {nextStudent && (
        <View style={[styles.distanceCard, isRTL && styles.distanceCardRTL]}>
          <Text style={styles.distanceValue}>
            {distanceToNextStudent.toFixed(1)}
          </Text>
          <Text style={styles.distanceUnit}>{t.km}</Text>
          <Text style={styles.distanceLabel}>
            TO STUDENT {currentStudentIndex + 1} •{" "}
            {Math.max(1, Math.round((distanceToNextStudent / 30) * 60))} MIN
          </Text>
        </View>
      )}

      {/* Next Student Card - Compact with Blur/Glassmorphism */}
      {nextStudent && (
        <View
          style={[
            styles.studentCardWrapper,
            isRTL && styles.studentCardWrapperRTL,
          ]}
        >
          <View style={styles.studentBlurCard}>
            <View style={styles.studentCardHeader}>
              <View style={styles.studentInfoContainer}>
                <Text style={[styles.studentNameLabel, isRTL && styles.rtl]}>
                  NEXT STUDENT
                </Text>
                <Text
                  style={[styles.studentName, isRTL && styles.rtl]}
                  numberOfLines={1}
                >
                  {nextStudent.name || `Student ${currentStudentIndex + 1}`}
                </Text>
              </View>
            </View>

            {nextStudent.phone && (
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => handleCall(nextStudent.phone)}
                activeOpacity={0.8}
              >
                <View style={styles.callIconContainer}>
                  <MaterialIcons name="phone" size={22} color="#FFFFFF" />
                </View>
                <Text style={[styles.callButtonText, isRTL && styles.rtl]}>
                  {t.call} {nextStudent.phone}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 50,
    left: 20,
    zIndex: 20,
  },
  backButtonRTL: {
    left: undefined,
    right: 20,
  },
  backButtonContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  endTripButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 62 : 52,
    right: 20,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#10B981",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  endTripButtonDisabled: {
    opacity: 0.6,
  },
  endTripButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  liveContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 50,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
    gap: 12,
  },
  liveBadgeContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  livePulseCircle: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EF4444",
  },
  livePulseCircle1: {
    backgroundColor: "rgba(239, 68, 68, 0.8)",
  },
  livePulseCircle2: {
    backgroundColor: "rgba(239, 68, 68, 0.6)",
  },
  livePulseCircle3: {
    backgroundColor: "rgba(239, 68, 68, 0.4)",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    zIndex: 10,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  liveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
    fontFamily: UbuntuFonts.bold,
    letterSpacing: 1.5,
  },
  tripTimeContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 25,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "rgba(0, 0, 0, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    backdropFilter: "blur(10px)",
  },
  tripTimeText: {
    color: "#111827",
    fontSize: 36,
    fontWeight: "bold",
    fontFamily: UbuntuFonts.bold,
    textShadowColor: "rgba(255, 255, 255, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 1,
  },
  distanceCard: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.4,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 10,
  },
  distanceCardRTL: {
    right: undefined,
    left: 20,
  },
  distanceValue: {
    fontSize: 48,
    fontWeight: "700",
    color: "#1F2937",
    fontFamily: UbuntuFonts.bold,
    lineHeight: 52,
  },
  distanceUnit: {
    fontSize: 18,
    color: "#6B7280",
    fontFamily: UbuntuFonts.semiBold,
    marginTop: 2,
    fontWeight: "600",
  },
  distanceLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    fontFamily: UbuntuFonts.medium,
    marginTop: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  studentCardWrapper: {
    position: "absolute",
    bottom: 32,
    left: 24,
    right: 24,
    zIndex: 10,
  },
  studentBlurCard: {
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: "#0EA5E9",
    overflow: "hidden",
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    backdropFilter: "blur(20px)",
  },
  studentCardWrapperRTL: {
    // RTL handled by text alignment
  },
  studentCardHeader: {
    marginBottom: 18,
  },
  studentInfoContainer: {
    flex: 1,
  },
  studentNameLabel: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.8)",
    fontFamily: UbuntuFonts.medium,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "600",
  },
  studentName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: UbuntuFonts.bold,
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    height: 60,
    paddingHorizontal: 24,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  callIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  callButtonText: {
    color: "#10B981",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: UbuntuFonts.bold,
  },
  pickupMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3185FC",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  nextPickupMarker: {
    backgroundColor: "#10B981",
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 4,
    shadowColor: "#10B981",
    shadowOpacity: 0.5,
  },
  markerNumber: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
    fontFamily: UbuntuFonts.bold,
  },
  nextMarkerNumber: {
    fontSize: 18,
  },
  driverMarker: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#3185FC",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3185FC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  rtl: {
    textAlign: "right",
  },
});

export default TripLiveViewScreen;
