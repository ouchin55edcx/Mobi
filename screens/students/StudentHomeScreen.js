import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import DateTimePicker from "@react-native-community/datetimepicker";

import MapboxRoutePreview from "../../components/MapboxRoutePreview";
import { DEMO_SCHOOL, DEMO_STUDENT } from "../../src/data/demoData";
import { UbuntuFonts } from "../../src/utils/fonts";
import { getDirectionsRoute } from "../../src/services/mapboxService";
import { getSchoolById } from "../../src/services/schoolService";
import { getStudentById } from "../../src/services/studentService";
import {
  cancelStudentPendingTrip,
  getStudentCurrentTrip,
  requestStudentTripDetailsState,
} from "../../src/services/groupingService";

const BLUE = "#2563EB";
const LIGHT_BLUE = "#EFF6FF";
const SHEET_COLLAPSED_HEIGHT = 120;

const translations = {
  en: {
    appName: "Mobi",
    studentRoute: "Your School Route",
    studentLabel: "Student",
    schoolLabel: "School",
    defaultStudentName: "Student",
    defaultSchoolName: "School",
    gpsDenied: "Location permission denied, using your home location",
    eta: "ETA",
    distance: "Distance",
    startTime: "Start Time",
    endTime: "End Time",
    selectTime: "Select time",
    viewDetails: "View Details",
    routeLoading: "Building route...",
    preparingTrip: "Preparing your trip details...",
    groupingProcessing:
      "Grouping is still processing. Please try again in a moment.",
    distanceTooFar:
      "You're outside the automatic grouping range. Showing route details anyway.",
    pendingTrip: "Pending Trip",
    viewPendingTrip: "View Pending Trip",
    cancelTrip: "Cancel Trip",
    no: "No",
    error: "Error",
    cancelTripConfirmTitle: "Cancel trip",
    cancelTripConfirmMessage:
      "Are you sure you want to cancel this pending trip?",
    cancellingTrip: "Cancelling trip...",
    cancelTripFailed: "Unable to cancel this trip now. Please try again.",
    tripCancelled: "Trip cancelled successfully.",
    loadingTrip: "Checking your trip...",
  },
  ar: {
    appName: "موبي",
    studentRoute: "مسارك إلى المدرسة",
    studentLabel: "الطالب",
    schoolLabel: "المدرسة",
    defaultStudentName: "الطالب",
    defaultSchoolName: "المدرسة",
    gpsDenied: "تم رفض إذن الموقع، تم استخدام موقع المنزل",
    eta: "الوقت",
    distance: "المسافة",
    startTime: "وقت البداية",
    endTime: "وقت النهاية",
    selectTime: "اختر الوقت",
    viewDetails: "عرض التفاصيل",
    routeLoading: "جاري إنشاء المسار...",
    preparingTrip: "جاري تجهيز تفاصيل الرحلة...",
    groupingProcessing: "ما زال التجميع قيد المعالجة. يرجى المحاولة بعد قليل.",
    distanceTooFar:
      "أنت خارج نطاق التجميع التلقائي. سنعرض تفاصيل المسار على أي حال.",
    pendingTrip: "رحلة قيد الانتظار",
    viewPendingTrip: "عرض الرحلة الحالية",
    cancelTrip: "إلغاء الرحلة",
    no: "لا",
    error: "خطأ",
    cancelTripConfirmTitle: "إلغاء الرحلة",
    cancelTripConfirmMessage: "هل أنت متأكد أنك تريد إلغاء هذه الرحلة؟",
    cancellingTrip: "جاري إلغاء الرحلة...",
    cancelTripFailed: "تعذر إلغاء الرحلة الآن. يرجى المحاولة مرة أخرى.",
    tripCancelled: "تم إلغاء الرحلة بنجاح.",
    loadingTrip: "جاري التحقق من الرحلة...",
  },
};

const getInitials = (fullName) => {
  if (!fullName) return "S";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const formatTime = (dateValue) => {
  if (!dateValue) return "--:--";
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "--:--";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const buildDateOnTomorrowFromTime = (timeValue) => {
  const source = timeValue instanceof Date ? timeValue : new Date(timeValue);
  const now = new Date();
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    source.getHours(),
    source.getMinutes(),
    0,
    0,
  );
  return tomorrow;
};

const StudentHomeScreen = ({
  studentId,
  isDemo = false,
  language = "en",
  onNavigateToTripDetails,
}) => {
  const { height: screenHeight } = useWindowDimensions();
  const t = translations[language] || translations.en;

  const [studentName, setStudentName] = useState(
    isDemo ? DEMO_STUDENT.fullname : t.defaultStudentName,
  );
  const [schoolName, setSchoolName] = useState(
    isDemo ? DEMO_SCHOOL.name : t.defaultSchoolName,
  );
  const [homeFallback, setHomeFallback] = useState(
    isDemo ? DEMO_STUDENT.home_location : null,
  );
  const [schoolLocation, setSchoolLocation] = useState(
    isDemo ? DEMO_SCHOOL.location : null,
  );
  const [studentLocation, setStudentLocation] = useState(
    isDemo ? DEMO_STUDENT.home_location : null,
  );

  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isRouteLoading, setIsRouteLoading] = useState(true);
  const [locationHint, setLocationHint] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isPreparingTrip, setIsPreparingTrip] = useState(false);
  const [groupingHint, setGroupingHint] = useState("");
  const [pendingTripData, setPendingTripData] = useState(null);
  const [isCheckingTrip, setIsCheckingTrip] = useState(false);
  const [isCancellingTrip, setIsCancellingTrip] = useState(false);

  const contentFade = useRef(new Animated.Value(0)).current;
  const sheetTranslate = useRef(new Animated.Value(0)).current;
  const sheetCurrentValue = useRef(0);

  const sheetExpandedHeight = Math.max(290, Math.round(screenHeight * 0.35));
  const maxSheetTranslate = Math.max(
    0,
    sheetExpandedHeight - SHEET_COLLAPSED_HEIGHT,
  );

  useEffect(() => {
    const id = sheetTranslate.addListener(({ value }) => {
      sheetCurrentValue.current = value;
    });
    return () => {
      sheetTranslate.removeListener(id);
    };
  }, [sheetTranslate]);

  useEffect(() => {
    Animated.timing(contentFade, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [contentFade]);

  useEffect(() => {
    if (sheetCurrentValue.current > maxSheetTranslate) {
      sheetTranslate.setValue(maxSheetTranslate);
    }
  }, [maxSheetTranslate, sheetTranslate]);

  const snapSheet = useCallback(
    (toValue) => {
      Animated.spring(sheetTranslate, {
        toValue,
        friction: 9,
        tension: 80,
        useNativeDriver: true,
      }).start();
    },
    [sheetTranslate],
  );

  const panResponder = useMemo(() => {
    let startValue = 0;

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gestureState) => {
        return Math.abs(gestureState.dy) > 8;
      },
      onPanResponderGrant: () => {
        startValue = sheetCurrentValue.current;
      },
      onPanResponderMove: (_event, gestureState) => {
        const nextValue = Math.max(
          0,
          Math.min(maxSheetTranslate, startValue + gestureState.dy),
        );
        sheetTranslate.setValue(nextValue);
      },
      onPanResponderRelease: (_event, gestureState) => {
        const shouldCollapse =
          gestureState.vy > 0.75 ||
          sheetCurrentValue.current > maxSheetTranslate / 2;
        snapSheet(shouldCollapse ? maxSheetTranslate : 0);
      },
      onPanResponderTerminate: () => {
        const shouldCollapse =
          sheetCurrentValue.current > maxSheetTranslate / 2;
        snapSheet(shouldCollapse ? maxSheetTranslate : 0);
      },
    });
  }, [maxSheetTranslate, sheetTranslate, snapSheet]);

  useEffect(() => {
    let cancelled = false;

    const loadStudentData = async () => {
      if (isDemo) {
        setLocationHint("");
        return;
      }

      try {
        const { data } = await getStudentById(studentId);
        if (cancelled) return;

        const studentHome = data?.home_location || null;
        const schoolFromStudent = data?.schools || null;

        setStudentName(data?.fullname || t.defaultStudentName);

        if (studentHome) {
          setHomeFallback(studentHome);
        }

        if (schoolFromStudent?.name) {
          setSchoolName(schoolFromStudent.name);
        }

        if (
          Number.isFinite(schoolFromStudent?.latitude) &&
          Number.isFinite(schoolFromStudent?.longitude)
        ) {
          setSchoolLocation({
            latitude: schoolFromStudent.latitude,
            longitude: schoolFromStudent.longitude,
          });
        } else if (data?.school_id) {
          const schoolResult = await getSchoolById(data.school_id);
          if (cancelled) return;

          if (schoolResult?.data?.name) {
            setSchoolName(schoolResult.data.name);
          }

          if (
            Number.isFinite(schoolResult?.data?.latitude) &&
            Number.isFinite(schoolResult?.data?.longitude)
          ) {
            setSchoolLocation({
              latitude: schoolResult.data.latitude,
              longitude: schoolResult.data.longitude,
            });
          }
        }
      } catch (_error) {
        // Keep defaults on any upstream issue.
      }
    };

    loadStudentData();

    return () => {
      cancelled = true;
    };
  }, [isDemo, studentId, t.defaultStudentName]);

  useEffect(() => {
    let cancelled = false;

    const resolveStudentLocation = async () => {
      if (isDemo) {
        setLocationHint("");
        return;
      }

      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;

        if (permission.status !== "granted") {
          if (homeFallback) {
            setStudentLocation(homeFallback);
          }
          setLocationHint(t.gpsDenied);
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (cancelled) return;

        if (
          Number.isFinite(position?.coords?.latitude) &&
          Number.isFinite(position?.coords?.longitude)
        ) {
          setStudentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationHint("");
        } else if (homeFallback) {
          setStudentLocation(homeFallback);
        }
      } catch (_error) {
        if (homeFallback) {
          setStudentLocation(homeFallback);
        }
      }
    };

    resolveStudentLocation();

    return () => {
      cancelled = true;
    };
  }, [homeFallback, isDemo, t.gpsDenied]);

  useEffect(() => {
    let cancelled = false;

    const loadRoute = async () => {
      if (!studentLocation || !schoolLocation) return;

      setIsRouteLoading(true);

      try {
        const route = await getDirectionsRoute({
          origin: studentLocation,
          destination: schoolLocation,
        });

        if (cancelled) return;

        const coordinates =
          Array.isArray(route?.coordinates) && route.coordinates.length > 1
            ? route.coordinates
            : [studentLocation, schoolLocation];

        setRouteCoordinates(coordinates);
        setDistanceMeters(route?.distanceMeters || 0);
        setDurationSeconds(route?.durationSeconds || 0);
      } catch (_error) {
        if (cancelled) return;
        setRouteCoordinates([studentLocation, schoolLocation]);
        setDistanceMeters(0);
        setDurationSeconds(0);
      } finally {
        if (!cancelled) {
          setIsRouteLoading(false);
        }
      }
    };

    loadRoute();

    return () => {
      cancelled = true;
    };
  }, [studentLocation, schoolLocation]);

  useEffect(() => {
    let cancelled = false;

    const loadCurrentTrip = async () => {
      if (isDemo || !studentId) return;
      setIsCheckingTrip(true);

      try {
        const result = await getStudentCurrentTrip(studentId);
        if (cancelled) return;
        if (result?.error) return;

        const trip = result?.data?.trip || null;
        if (
          trip &&
          (trip.status === "trip_pending" || trip.status === "trip_started")
        ) {
          setPendingTripData({
            trip,
            booking: result?.data?.booking || null,
          });
        } else {
          setPendingTripData(null);
        }
      } finally {
        if (!cancelled) setIsCheckingTrip(false);
      }
    };

    loadCurrentTrip();

    return () => {
      cancelled = true;
    };
  }, [isDemo, studentId]);

  const handleViewDetails = async () => {
    if (
      !onNavigateToTripDetails ||
      !studentLocation ||
      !schoolLocation ||
      !startTime ||
      !endTime
    ) {
      return;
    }

    const plannedStart = buildDateOnTomorrowFromTime(startTime);
    let plannedEnd = buildDateOnTomorrowFromTime(endTime);
    if (plannedEnd <= plannedStart) {
      plannedEnd = new Date(plannedStart.getTime() + 45 * 60 * 1000);
    }

    const etaMs =
      Math.max(5, Math.round((durationSeconds || 600) / 60)) * 60 * 1000;

    const localTripPayload = {
      homeLocation: studentLocation,
      pickupLocation: studentLocation,
      destinationLocation: schoolLocation,
      routeCoordinates:
        routeCoordinates.length > 1
          ? routeCoordinates
          : [studentLocation, schoolLocation],
      userPathCoordinates:
        routeCoordinates.length > 1
          ? routeCoordinates
          : [studentLocation, schoolLocation],
      leaveHomeTime: plannedStart,
      reachPickupTime: new Date(plannedStart.getTime() + etaMs * 0.4),
      arriveDestinationTime: plannedEnd,
      estimatedArrivalMinutes: Math.max(
        1,
        Math.round((durationSeconds || 600) / 60),
      ),
      distanceToStation: Math.max(0.2, distanceMeters / 1000),
      driverName: language === "ar" ? "سائق موبي" : "Mobi Driver",
      driverPhone: null,
      isDriverOnline: true,
      stations: [],
      driver: {
        name: language === "ar" ? "سائق موبي" : "Mobi Driver",
        phone: null,
      },
    };

    console.log("[StudentHome] ViewDetails pressed", {
      studentId,
      hasStartTime: !!startTime,
      hasEndTime: !!endTime,
      routePoints: routeCoordinates?.length || 0,
      studentLocation,
      schoolLocation,
    });

    if (isDemo || !studentId) {
      onNavigateToTripDetails(localTripPayload);
      return;
    }

    setIsPreparingTrip(true);
    setGroupingHint("");

    try {
      const tripState = await requestStudentTripDetailsState({
        studentId,
        startTime: plannedStart,
        endTime: plannedEnd,
        type: "PICKUP",
      });

      console.log(
        "[StudentHome] requestStudentTripDetailsState result",
        tripState,
      );

      if (tripState.state === "error") {
        setGroupingHint(tripState.error?.message || t.groupingProcessing);
        return;
      }

      if (tripState.state === "processing") {
        if (tripState?.reason === "distance_exceeds_15km") {
          setGroupingHint(t.distanceTooFar);
          onNavigateToTripDetails({
            ...localTripPayload,
            processingState: "distance_exceeds_15km",
          });
          return;
        }

        setGroupingHint(t.groupingProcessing);
        onNavigateToTripDetails({
          ...localTripPayload,
          processingState: "grouping_in_progress",
        });
        return;
      }

      const backendTrip = tripState?.data?.trip || {};
      const backendBooking = tripState?.data?.booking || null;

      onNavigateToTripDetails({
        ...localTripPayload,
        id: backendTrip.id || backendBooking?.id || null,
        tripId: backendTrip.tripId || backendTrip.id || null,
        bookingId: backendBooking?.id || null,
        routeCoordinates:
          Array.isArray(backendTrip.routeCoordinates) &&
          backendTrip.routeCoordinates.length > 1
            ? backendTrip.routeCoordinates
            : localTripPayload.routeCoordinates,
        destinationLocation:
          backendTrip.destinationLocation ||
          localTripPayload.destinationLocation,
        pickupLocation:
          backendTrip.pickupLocation || localTripPayload.pickupLocation,
      });
    } finally {
      setIsPreparingTrip(false);
    }
  };

  const avatarText = getInitials(studentName);
  const mapReady = studentLocation && schoolLocation;
  const canViewDetails =
    mapReady &&
    !!onNavigateToTripDetails &&
    !!startTime &&
    !!endTime &&
    !isPreparingTrip;
  const hasPendingTrip =
    !!pendingTripData?.trip &&
    (pendingTripData.trip.status === "trip_pending" ||
      pendingTripData.trip.status === "trip_started");

  const handleOpenPendingTrip = () => {
    if (!hasPendingTrip || !onNavigateToTripDetails || isCancellingTrip) return;
    const trip = pendingTripData.trip;
    const booking = pendingTripData.booking;

    const destinationLocation = trip.destinationLocation || schoolLocation;
    const pickupLocation =
      trip.pickupLocation || homeFallback || studentLocation;
    const route =
      Array.isArray(trip.routeCoordinates) && trip.routeCoordinates.length > 1
        ? trip.routeCoordinates
        : [pickupLocation, destinationLocation].filter(Boolean);

    onNavigateToTripDetails({
      id: trip.id || null,
      tripId: trip.tripId || trip.id || null,
      bookingId: booking?.id || null,
      studentId,
      homeLocation: pickupLocation,
      pickupLocation,
      destinationLocation,
      routeCoordinates: route,
      userPathCoordinates: route,
      leaveHomeTime: booking?.start_time || trip.startTime || null,
      reachPickupTime: booking?.start_time || trip.startTime || null,
      arriveDestinationTime: booking?.end_time || trip.endTime || null,
      estimatedArrivalMinutes:
        trip.totalDurationMinutes ||
        Math.max(1, Math.round((durationSeconds || 600) / 60)),
      distanceToStation:
        trip.totalDistanceKm || Math.max(0.2, distanceMeters / 1000),
      driverName:
        trip.driver?.name || (language === "ar" ? "سائق موبي" : "Mobi Driver"),
      driverPhone: trip.driver?.phone || null,
      capacity: trip.capacity || null,
      membersCount: trip.membersCount || null,
      schoolName,
      processingState:
        trip.status === "trip_pending" ? "grouping_in_progress" : null,
    });
  };

  const performCancelPendingTrip = async () => {
    if (!hasPendingTrip || isCancellingTrip) return;

    const pendingTrip = pendingTripData?.trip || null;
    const pendingBooking = pendingTripData?.booking || null;

    setIsCancellingTrip(true);
    try {
      const result = await cancelStudentPendingTrip({
        studentId,
        tripId: pendingTrip?.id || null,
        bookingId: pendingBooking?.id || null,
      });

      if (result?.error) {
        Alert.alert(t.error, result.error.message || t.cancelTripFailed);
        return;
      }

      setPendingTripData(null);
      setGroupingHint("");
      Alert.alert(t.cancelTrip, t.tripCancelled);
    } finally {
      setIsCancellingTrip(false);
    }
  };

  const handleCancelPendingTrip = () => {
    if (!hasPendingTrip || isCancellingTrip) return;
    Alert.alert(
      t.cancelTripConfirmTitle,
      t.cancelTripConfirmMessage,
      [
        { text: t.no, style: "cancel" },
        {
          text: t.cancelTrip,
          style: "destructive",
          onPress: performCancelPendingTrip,
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StatusBar style="dark" />

      {isCheckingTrip && (
        <View style={styles.pendingLoaderWrap}>
          <ActivityIndicator size="small" color={BLUE} />
          <Text style={styles.pendingLoaderText}>{t.loadingTrip}</Text>
        </View>
      )}

      {hasPendingTrip ? (
        <View style={styles.pendingOnlyContainer}>
          <View style={styles.pendingCard}>
            <View style={styles.pendingHeaderRow}>
              <View style={styles.pendingBadge}>
                <View style={styles.pendingDot} />
                <Text style={styles.pendingBadgeText}>{t.pendingTrip}</Text>
              </View>
              <MaterialIcons name="schedule" size={18} color={BLUE} />
            </View>

            <Text style={styles.pendingSchoolName} numberOfLines={1}>
              {schoolName || t.defaultSchoolName}
            </Text>

            <View style={styles.pendingInfoRow}>
              <Text style={styles.pendingInfoLabel}>{t.startTime}</Text>
              <Text style={styles.pendingInfoValue}>
                {formatTime(
                  pendingTripData?.booking?.start_time ||
                    pendingTripData?.trip?.startTime,
                )}
              </Text>
            </View>

            <View style={styles.pendingInfoRow}>
              <Text style={styles.pendingInfoLabel}>{t.endTime}</Text>
              <Text style={styles.pendingInfoValue}>
                {formatTime(
                  pendingTripData?.booking?.end_time ||
                    pendingTripData?.trip?.endTime,
                )}
              </Text>
            </View>

            <View style={styles.pendingActionsRow}>
              <TouchableOpacity
                style={[styles.pendingActionBtn, styles.pendingViewActionBtn]}
                activeOpacity={0.85}
                onPress={handleOpenPendingTrip}
                disabled={isCancellingTrip}
              >
                <Text style={styles.pendingActionText}>
                  {t.viewPendingTrip}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.pendingActionBtn,
                  styles.pendingCancelActionBtn,
                  isCancellingTrip && styles.pendingCancelActionBtnDisabled,
                ]}
                activeOpacity={0.85}
                onPress={handleCancelPendingTrip}
                disabled={isCancellingTrip}
              >
                {isCancellingTrip ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.pendingActionText}>
                      {t.cancellingTrip}
                    </Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons name="close" size={18} color="#FFFFFF" />
                    <Text style={styles.pendingActionText}>{t.cancelTrip}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <Animated.View style={[styles.mapStage, { opacity: contentFade }]}>
          <View style={styles.mapContainer}>
            {mapReady ? (
              <MapboxRoutePreview
                style={styles.map}
                homeLocation={studentLocation}
                destinationLocation={schoolLocation}
                routeCoordinates={routeCoordinates}
                interactive
                showRoute
                zoom={13}
                studentLabel={t.studentLabel}
                schoolLabel={t.schoolLabel}
              />
            ) : (
              <View style={styles.mapLoadingFallback}>
                <ActivityIndicator color={BLUE} />
              </View>
            )}

            {isRouteLoading && (
              <View style={styles.routeLoadingChip}>
                <ActivityIndicator size="small" color={BLUE} />
                <Text style={styles.routeLoadingText}>{t.routeLoading}</Text>
              </View>
            )}
          </View>

          <Animated.View
            style={[
              styles.bottomSheet,
              {
                height: sheetExpandedHeight,
                transform: [{ translateY: sheetTranslate }],
              },
            ]}
          >
            <View style={styles.sheetHandleArea} {...panResponder.panHandlers}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{t.studentRoute}</Text>
            </View>

            <View style={styles.sheetContent}>
              <View style={styles.studentRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{avatarText}</Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName} numberOfLines={1}>
                    {studentName || t.defaultStudentName}
                  </Text>
                  <Text style={styles.schoolName} numberOfLines={1}>
                    {schoolName || t.defaultSchoolName}
                  </Text>
                </View>
              </View>

              <View style={styles.timeRow}>
                <TouchableOpacity
                  style={styles.timeCard}
                  activeOpacity={0.75}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <View style={styles.timeCardHeader}>
                    <MaterialIcons
                      name="play-circle-outline"
                      size={16}
                      color={BLUE}
                    />
                    <Text style={styles.timeCardLabel}>{t.startTime}</Text>
                  </View>
                  <Text style={styles.timeCardValue}>
                    {startTime ? formatTime(startTime) : t.selectTime}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.timeCard}
                  activeOpacity={0.75}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <View style={styles.timeCardHeader}>
                    <MaterialIcons name="stop-circle" size={16} color={BLUE} />
                    <Text style={styles.timeCardLabel}>{t.endTime}</Text>
                  </View>
                  <Text style={styles.timeCardValue}>
                    {endTime ? formatTime(endTime) : t.selectTime}
                  </Text>
                </TouchableOpacity>
              </View>

              {showStartTimePicker && (
                <DateTimePicker
                  value={startTime || new Date()}
                  mode="time"
                  is24Hour
                  display="default"
                  onChange={(event, selectedTime) => {
                    setShowStartTimePicker(false);
                    if (
                      selectedTime &&
                      (event?.type === "set" || event?.type === undefined)
                    ) {
                      setStartTime(selectedTime);
                    }
                  }}
                />
              )}

              {showEndTimePicker && (
                <DateTimePicker
                  value={
                    endTime || (startTime ? new Date(startTime) : new Date())
                  }
                  mode="time"
                  is24Hour
                  display="default"
                  onChange={(event, selectedTime) => {
                    setShowEndTimePicker(false);
                    if (
                      selectedTime &&
                      (event?.type === "set" || event?.type === undefined)
                    ) {
                      setEndTime(selectedTime);
                    }
                  }}
                />
              )}

              {!!locationHint && (
                <Text style={styles.locationHint} numberOfLines={2}>
                  {locationHint}
                </Text>
              )}

              {!!groupingHint && (
                <Text style={styles.locationHint} numberOfLines={2}>
                  {groupingHint}
                </Text>
              )}

              <TouchableOpacity
                style={styles.ctaButton}
                onPress={handleViewDetails}
                activeOpacity={0.85}
                disabled={!canViewDetails}
              >
                {isPreparingTrip ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.ctaButtonText}>{t.preparingTrip}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.ctaButtonText}>{t.viewDetails}</Text>
                    <MaterialIcons
                      name="chevron-right"
                      size={20}
                      color="#FFFFFF"
                    />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {isPreparingTrip && !hasPendingTrip && (
        <View style={styles.fullscreenLoader}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={styles.fullscreenLoaderText}>{t.preparingTrip}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  pendingLoaderWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
  },
  pendingLoaderText: {
    color: "#475569",
    fontFamily: UbuntuFonts.medium,
    fontSize: 12,
  },
  pendingOnlyContainer: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  pendingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.OS === "ios" ? 0.08 : 0,
    shadowRadius: 10,
    elevation: 5,
  },
  pendingHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pendingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  pendingBadgeText: {
    color: "#1E3A8A",
    fontFamily: UbuntuFonts.semiBold,
    fontSize: 12,
  },
  pendingSchoolName: {
    color: "#0F172A",
    fontFamily: UbuntuFonts.bold,
    fontSize: 18,
    marginBottom: 12,
  },
  pendingInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2FF",
  },
  pendingInfoLabel: {
    color: "#64748B",
    fontFamily: UbuntuFonts.medium,
    fontSize: 13,
  },
  pendingInfoValue: {
    color: "#0F172A",
    fontFamily: UbuntuFonts.semiBold,
    fontSize: 13,
  },
  pendingActionBtn: {
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  pendingActionText: {
    color: "#FFFFFF",
    fontFamily: UbuntuFonts.semiBold,
    fontSize: 14,
  },
  pendingActionsRow: {
    marginTop: 16,
    gap: 10,
  },
  pendingViewActionBtn: {
    backgroundColor: BLUE,
  },
  pendingCancelActionBtn: {
    backgroundColor: "#DC2626",
  },
  pendingCancelActionBtnDisabled: {
    opacity: 0.7,
  },
  mapStage: {
    flex: 1,
    position: "relative",
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#DCEAFE",
  },
  map: {
    flex: 1,
  },
  mapLoadingFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  routeLoadingChip: {
    position: "absolute",
    top: 14,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  routeLoadingText: {
    fontSize: 12,
    color: "#1E3A8A",
    fontFamily: UbuntuFonts.medium,
  },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: "#DBEAFE",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: Platform.OS === "ios" ? 0.14 : 0,
    shadowRadius: 12,
    elevation: 12,
  },
  sheetHandleArea: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 10,
  },
  sheetHandle: {
    width: 46,
    height: 5,
    borderRadius: 4,
    backgroundColor: "#BFDBFE",
    marginBottom: 8,
  },
  sheetTitle: {
    color: "#1E40AF",
    fontFamily: UbuntuFonts.semiBold,
    fontSize: 14,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: LIGHT_BLUE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  avatarText: {
    color: BLUE,
    fontFamily: UbuntuFonts.bold,
    fontSize: 16,
  },
  studentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  studentName: {
    color: "#0F172A",
    fontFamily: UbuntuFonts.semiBold,
    fontSize: 15,
    marginBottom: 2,
  },
  schoolName: {
    color: "#475569",
    fontFamily: UbuntuFonts.medium,
    fontSize: 13,
  },
  timeRow: {
    flexDirection: "column",
    gap: 8,
    marginBottom: 12,
  },
  timeCard: {
    backgroundColor: "#F8FBFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  timeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  timeCardLabel: {
    color: "#64748B",
    fontFamily: UbuntuFonts.medium,
    fontSize: 12,
  },
  timeCardValue: {
    color: "#1E3A8A",
    fontFamily: UbuntuFonts.semiBold,
    fontSize: 14,
  },
  locationHint: {
    color: "#475569",
    fontFamily: UbuntuFonts.regular,
    fontSize: 12,
    marginBottom: 10,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: BLUE,
    borderRadius: 14,
    paddingVertical: 12,
    opacity: 1,
  },
  ctaButtonText: {
    color: "#FFFFFF",
    fontFamily: UbuntuFonts.semiBold,
    fontSize: 15,
  },
  fullscreenLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.82)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    gap: 10,
  },
  fullscreenLoaderText: {
    color: "#1E3A8A",
    fontFamily: UbuntuFonts.semiBold,
    fontSize: 14,
  },
});

export default StudentHomeScreen;
