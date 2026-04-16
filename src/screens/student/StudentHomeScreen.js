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
  AppState,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import DateTimePicker from "@react-native-community/datetimepicker";

import MapboxRoutePreview from "../../shared/components/common/MapboxRoutePreview";
import { UbuntuFonts } from "../../shared/utils/fonts";
import { getDirectionsRoute } from "../../shared/services/mapboxService";
import { getSchoolById } from "../../shared/services/schoolService";
import { getStudentById } from "../../shared/services/studentService";
import {
  cancelStudentPendingTrip,
  getStudentCurrentTrip,
  requestStudentTripDetailsState,
} from "../../shared/services/groupingService";
import { runGroupingForDate } from "../../shared/services/groupingAlgorithm";
import { getAssignedTripForStudent } from "../../shared/services/tripService";
import { supabase } from "../../lib/supabase";

const PRIMARY_BLUE = "#3185FC";
const NEUTRAL_900 = "#1A1A1A";
const NEUTRAL_500 = "#64748B";
const BACKGROUND_LIGHT = "#F8FAFF";

const translations = {
  en: {
    startTime: "Start Time",
    arrivalTime: "Arrival Time",
    go: "GO",
    selectTime: "Select time",
    gpsDenied: "Location permission denied, using home location",
    preparingTrip: "Preparing Trip...",
    loadingTrip: "Checking Trip...",
    pendingTrip: "Pending Trip",
    cancelTrip: "Cancel",
    error: "Error",
    distanceTooFar: "Outside grouping range. Showing route anyway.",
    groupingProcessing: "Processing your request...",
    defaultStudentName: "Student",
    defaultSchoolName: "School",
    notifications: "Notifications",
    noNotifications: "No new notifications",
    pendingTripNotice: "Your trip request is pending",
    routeLoadingNotice: "Updating route information",
    locationHintTitle: "Location update",
    groupingHintTitle: "Trip update",
  },
  ar: {
    startTime: "وقت البدء",
    arrivalTime: "وقت الوصول",
    go: "انطلق",
    selectTime: "اختر الوقت",
    gpsDenied: "تم رفض إذن الموقع، تم استخدام موقع المنزل",
    preparingTrip: "جاري التجهيز...",
    loadingTrip: "جاري التحقق...",
    pendingTrip: "رحلة قيد الانتظار",
    cancelTrip: "إلغاء",
    error: "خطأ",
    distanceTooFar: "المسافة بعيدة جداً، جاري عرض المسار.",
    groupingProcessing: "جاري المعالجة...",
    defaultStudentName: "الطالب",
    defaultSchoolName: "المدرسة",
    notifications: "الإشعارات",
    noNotifications: "لا توجد إشعارات جديدة",
    pendingTripNotice: "طلب الرحلة قيد الانتظار",
    routeLoadingNotice: "جاري تحديث معلومات المسار",
    locationHintTitle: "تحديث الموقع",
    groupingHintTitle: "تحديث الرحلة",
  },
};

const formatTime = (dateValue) => {
  if (!dateValue) return "";
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
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

const buildDateFromSelection = (timeValue, selectedDate) => {
  const source = timeValue instanceof Date ? timeValue : new Date(timeValue);
  return new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
    source.getHours(),
    source.getMinutes(),
    0,
    0,
  );
};

const StudentHomeScreen = ({
  studentId,
  language = "en",
  onNavigateToTripDetails,
  onNavigateToProfile,
  isDemo = false,
  onFocus,
}) => {
  const { height: screenHeight } = useWindowDimensions();
  const t = translations[language] || translations.en;
  const isRTL = language === "ar";

  // States
  const [studentData, setStudentData] = useState(null);
  const [studentLocation, setStudentLocation] = useState(null);
  const [schoolLocation, setSchoolLocation] = useState(null);
  const [schoolName, setSchoolName] = useState("");

  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isRouteLoading, setIsRouteLoading] = useState(true);

  const [tripDate, setTripDate] = useState(null);
  const [arrivalTime, setArrivalTime] = useState(null);
  const [returnTime, setReturnTime] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showArrivalPicker, setShowArrivalPicker] = useState(false);
  const [showReturnPicker, setShowReturnPicker] = useState(false);

  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [isBooking, setIsBooking] = useState(false);
  const [refreshBooking, setRefreshBooking] = useState(0);
  const [pendingTripData, setPendingTripData] = useState(null);
  const [isCheckingTrip, setIsCheckingTrip] = useState(false);
  const [locationHint, setLocationHint] = useState("");
  const [groupingHint, setGroupingHint] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTripId, setActiveTripId] = useState(null); // Trip starting notification track
  const [lastStatuses, setLastStatuses] = useState({}); // Tracking statuses to detect transitions

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Initialization & Data Loading
  const loadData = useCallback(async () => {
    if (!studentId) return;
    try {
      const { data } = await getStudentById(studentId);
      if (data) {
        setStudentData(data);
        if (data.home_location) setStudentLocation(data.home_location);
        if (data.schools) {
          setSchoolName(data.schools.name);
          setSchoolLocation({
            latitude: data.schools.latitude,
            longitude: data.schools.longitude,
          });
        }
      }
    } catch (e) {
      console.error("[StudentHome] Failed to load student data:", e);
    }
  }, [studentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Location Resolution
  useEffect(() => {
    const resolveLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationHint(t.gpsDenied);
          return;
        }
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setStudentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      } catch (e) {
        // error handled
      }
    };
    resolveLocation();
  }, [t.gpsDenied]);

  // Route Loading
  useEffect(() => {
    const loadRoute = async () => {
      if (!studentLocation || !schoolLocation) return;
      setIsRouteLoading(true);
      try {
        const route = await getDirectionsRoute({
          origin: studentLocation,
          destination: schoolLocation,
        });
        setRouteCoordinates(
          route?.coordinates || [studentLocation, schoolLocation],
        );
        setDistanceMeters(route?.distanceMeters || 0);
        setDurationSeconds(route?.durationSeconds || 0);
      } catch (e) {
        setRouteCoordinates([studentLocation, schoolLocation]);
      } finally {
        setIsRouteLoading(false);
      }
    };
    loadRoute();
  }, [studentLocation, schoolLocation]);

  // Trip Status Check
  useEffect(() => {
    const checkTrip = async () => {
      if (!studentId) return;
      setIsCheckingTrip(true);
      try {
        const result = await getStudentCurrentTrip(studentId);
        if (result?.data?.trip) {
          setPendingTripData(result.data);
        }
      } finally {
        setIsCheckingTrip(false);
      }
    };
    checkTrip();
  }, [studentId]);

  // Check existing bookings for today and tomorrow
  useEffect(() => {
    const checkUpcomingBookings = async () => {
      if (!studentId) return;
      try {
        const today = new Date().toISOString().split("T")[0];
        const tomorrow = new Date(Date.now() + 86400000)
          .toISOString()
          .split("T")[0];

        console.log("Checking upcoming bookings for student:", studentId);
        console.log("  Date range:", today, "to", tomorrow);

        const { data, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("student_id", studentId)
          .in("status", ["PENDING", "CONFIRMED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"])
          .gte("trip_date", today)
          .order("trip_date", { ascending: true })
          .order("start_time", { ascending: true });

        if (error) {
          console.error("Supabase booking query error:", error);
          setUpcomingBookings([]);
          return;
        }

        if (data && data.length > 0) {
          console.log(`✅ Found ${data.length} upcoming booking(s):`);

          // Enhanced status check: prioritize status from the "trips" table as requested
          const bookingsWithTripStatus = await Promise.all(data.map(async (booking) => {
            // Find all trips for this student on the specific booking date
            const { data: tripsData } = await supabase
              .from("trips")
              .select("status, id, student_ids, school_arrival, start_time, driver_id")
              .eq("trip_date", booking.trip_date);

            const studentTrips = (tripsData || []).filter(t => 
              Array.isArray(t.student_ids) && t.student_ids.includes(studentId)
            );

            // Match the booking to the correct trip by comparing school arrival times
            const bookingArrival = new Date(booking.start_time);
            const tripData = studentTrips.find(t => {
              const tripArrival = new Date(t.school_arrival || t.start_time);
              // Match if trip arrival is within 1.5 hours of requested booking arrival
              return Math.abs(tripArrival - bookingArrival) < 5400000;
            }) || (studentTrips.length === 1 ? studentTrips[0] : null);

            if (tripData) {
              const newStatus = tripData.status === 'SCHEDULED' ? 'ASSIGNED' : tripData.status;

              // Detect status switch to IN_PROGRESS for notification
              const oldStatus = lastStatuses[booking.id];
              if (oldStatus && oldStatus !== "IN_PROGRESS" && newStatus === "IN_PROGRESS") {
                 Alert.alert(
                   language === "ar" ? "بدأت الرحلة!" : "Trip Started!",
                   language === "ar" 
                     ? "سائقك بدأ الرحلة الآن. يمكنك تتبعه مباشرة."
                     : "Your driver has started the trip. You can track it live now!"
                 );
              }

              return {
                ...booking,
                // Map SCHEDULED (trip table) to ASSIGNED (UI display name)
                status: newStatus,
                trip_id: tripData.id,
                driver_id: tripData.driver_id
              };
            }
            return booking;
          }));

          // Update statuses map for next iteration
          const newStatuses = {};
          bookingsWithTripStatus.forEach(t => { newStatuses[t.id] = t.status; });
          setLastStatuses(newStatuses);

          setUpcomingBookings(bookingsWithTripStatus);
        } else {
          console.log("No upcoming bookings found");
          setUpcomingBookings([]);
        }
      } catch (e) {
        console.error("Error checking bookings:", e.message);
        setUpcomingBookings([]);
      }
    };
    checkUpcomingBookings();
  }, [studentId, refreshBooking]);

  // Refresh booking when app comes back to foreground (e.g., returning from trip details)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        console.log("App came to foreground — refreshing booking status");
        setRefreshBooking((prev) => prev + 1);
      }
    });
    return () => subscription.remove();
  }, []);

  // Realtime subscription for trip updates
  useEffect(() => {
    if (!studentId) return;

    const channel = supabase
      .channel("student-home-trips")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trips",
        },
        (payload) => {
          console.log("[StudentHome] Realtime trip update:", payload.new?.status);
          setRefreshBooking((prev) => prev + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId]);

  // Notify parent when this screen is focused
  useEffect(() => {
    if (onFocus) {
      onFocus(() => {
        console.log("[StudentHome] Refreshing data on focus...");
        setRefreshBooking((prev) => prev + 1);
        loadData();
      });
    }
  }, [onFocus, loadData]);

  const handleGo = async () => {
    // Validation
    if (!tripDate || !arrivalTime || !returnTime) {
      console.log("Booking validation failed: missing date/time selection");
      Alert.alert(
        language === "ar" ? "معلومات ناقصة" : "Missing info",
        language === "ar"
          ? "يرجى اختيار التاريخ ووقت الوصول ووقت العودة."
          : "Please select date, arrival and return time.",
      );
      return;
    }

    const buildDateTime = (base, time) =>
      new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate(),
        time.getHours(),
        time.getMinutes(),
        0,
        0,
      );

    const startDateTime = buildDateTime(tripDate, arrivalTime);
    const endDateTime = buildDateTime(tripDate, returnTime);

    if (endDateTime <= startDateTime) {
      console.log("Booking validation failed: return time before arrival time");
      Alert.alert(
        language === "ar" ? "أوقات غير صالحة" : "Invalid times",
        language === "ar"
          ? "وقت العودة يجب أن يكون بعد وقت الوصول."
          : "Return time must be after arrival time.",
      );
      return;
    }

    console.log("Booking details:");
    console.log("  Student ID:", studentData?.id);
    console.log("  School ID:", studentData?.school_id);
    console.log("  Date:", tripDate.toISOString());
    console.log("  Arrival:", startDateTime.toISOString());
    console.log("  Return:", endDateTime.toISOString());
    console.log("  Pickup:", JSON.stringify(studentLocation));
    console.log("  Destination:", JSON.stringify(schoolLocation));

    if (isDemo) {
      console.log("Demo mode — skipping Supabase booking");
      onNavigateToTripDetails({
        homeLocation: studentLocation,
        destinationLocation: schoolLocation,
        routeCoordinates: routeCoordinates,
        leaveHomeTime: startDateTime,
        arriveDestinationTime: endDateTime,
        studentId,
        language,
      });
      return;
    }

    console.log("Creating booking in Supabase...");
    setIsBooking(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          student_id: studentId,
          school_id: studentData?.school_id,
          trip_date: tripDate.toISOString().split("T")[0],
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          pickup_location: studentLocation,
          status: "PENDING",
        })
        .select()
        .single();

      if (error) {
        console.error("Booking creation failed:", error);
        Alert.alert(language === "ar" ? "خطأ" : "Error", error.message);
        return;
      }

      console.log("✅ Booking created successfully!");
      console.log("  Booking ID:", data.id);
      console.log("  Status:", data.status);
      // Refresh the bookings list
      setRefreshBooking((prev) => prev + 1);

      // Run grouping in background — do not await, do not block UI
      runGroupingForDate(tripDate.toISOString().split("T")[0])
        .then((result) => {
          if (__DEV__) {
            console.log("[Auto-grouping] Result:", result);
          }
        })
        .catch((err) => {
          if (__DEV__) {
            console.warn("[Auto-grouping] Error:", err.message);
          }
          // Never show grouping errors to the student — silent fail
        });
    } catch (e) {
      console.error("Unexpected error creating booking:", e);
      Alert.alert(language === "ar" ? "خطأ" : "Error", e.message);
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancel = async (bookingId) => {
    Alert.alert(
      language === "ar" ? "إلغاء الرحلة" : "Cancel Trip",
      language === "ar"
        ? "هل أنت متأكد أنك تريد إلغاء هذه الرحلة؟"
        : "Are you sure you want to cancel this trip?",
      [
        {
          text: language === "ar" ? "لا" : "No",
          style: "cancel",
        },
        {
          text: language === "ar" ? "نعم، إلغاء" : "Yes, cancel",
          style: "destructive",
          onPress: async () => {
            console.log("Cancelling booking:", bookingId);
            const { error } = await supabase
              .from("bookings")
              .update({ status: "CANCELLED" })
              .eq("id", bookingId);

            if (error) {
              console.error("Booking cancellation failed:", error);
              return;
            }

            console.log("✅ Booking cancelled successfully!");
            console.log("  Booking ID:", bookingId);
            // Refresh the list
            setRefreshBooking((prev) => prev + 1);
          },
        },
      ],
    );
  };

  const getInitials = (name) => {
    if (!name) return "S";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const mapReady = studentLocation && schoolLocation;
  const notifications = useMemo(() => {
    const items = [];
    if (pendingTripData?.trip) {
      items.push({ id: "pending-trip", title: t.pendingTripNotice });
    }
    if (isCheckingTrip || isRouteLoading) {
      items.push({ id: "route-loading", title: t.routeLoadingNotice });
    }
    if (locationHint) {
      items.push({
        id: "location-hint",
        title: t.locationHintTitle,
        detail: locationHint,
      });
    }
    if (groupingHint) {
      items.push({
        id: "grouping-hint",
        title: t.groupingHintTitle,
        detail: groupingHint,
      });
    }

    return items;
  }, [
    pendingTripData,
    isCheckingTrip,
    isRouteLoading,
    locationHint,
    groupingHint,
    t.pendingTripNotice,
    t.routeLoadingNotice,
    t.locationHintTitle,
    t.groupingHintTitle,
  ]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* 70% Map Section */}
      <View style={styles.mapArea}>
        {mapReady ? (
          <MapboxRoutePreview
            style={styles.map}
            homeLocation={studentLocation}
            destinationLocation={schoolLocation}
            routeCoordinates={routeCoordinates}
            interactive
            showRoute
            zoom={13}
            studentLabel={studentData?.fullname || t.defaultStudentName}
            schoolLabel={schoolName || t.defaultSchoolName}
            fitPadding={{ top: 90, right: 44, bottom: 200, left: 44 }}
          />
        ) : (
          <View style={styles.loaderContainer}>
            <ActivityIndicator color={PRIMARY_BLUE} size="large" />
          </View>
        )}

        {/* Floating Header */}
        <SafeAreaView style={styles.floatingHeader} edges={["top"]}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={onNavigateToProfile}
            activeOpacity={0.8}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(studentData?.fullname || "S")}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => setShowNotifications((prev) => !prev)}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="notifications-none"
              size={24}
              color={NEUTRAL_900}
            />
            {notifications.length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {Math.min(notifications.length, 9)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </SafeAreaView>

        {showNotifications && (
          <View style={styles.notificationDropdown}>
            <Text
              style={[
                styles.notificationDropdownTitle,
                isRTL && styles.rtlText,
              ]}
            >
              {t.notifications}
            </Text>
            {notifications.length === 0 ? (
              <Text
                style={[styles.notificationEmptyText, isRTL && styles.rtlText]}
              >
                {t.noNotifications}
              </Text>
            ) : (
              notifications.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.notificationItem}
                  onPress={() => {
                    if (item.action) {
                      item.action();
                      setShowNotifications(false);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.notificationDot} />
                  <View style={styles.notificationContent}>
                    <Text
                      style={[
                        styles.notificationItemTitle,
                        isRTL && styles.rtlText,
                      ]}
                    >
                      {item.title}
                    </Text>
                    {!!item.detail && (
                      <Text
                        style={[
                          styles.notificationItemDetail,
                          isRTL && styles.rtlText,
                        ]}
                      >
                        {item.detail}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {isRouteLoading && (
          <View style={styles.statusIndicator}>
            <ActivityIndicator size="small" color={PRIMARY_BLUE} />
          </View>
        )}

        {/* Live Trip Status Bar (Visible when a trip is in progress) */}
        {upcomingBookings.some(b => b.status === "IN_PROGRESS") && (
          <TouchableOpacity 
            style={styles.liveTripBanner}
            onPress={() => {
              const booking = upcomingBookings.find(b => b.status === "IN_PROGRESS");
              if (booking) {
                const tripPayload = {
                  id: booking.id,
                  tripId: booking.trip_id || booking.id, // Using trip_id from earlier mapping
                  studentId,
                  homeLocation: studentLocation || booking.pickup_location,
                  destinationLocation: schoolLocation,
                  routeCoordinates,
                  start_time: booking.start_time,
                    trip_date: booking.trip_date,
                  leaveHomeTime: booking.start_time,
                  arriveDestinationTime: booking.end_time,
                  status: "IN_PROGRESS",
                  schoolName,
                    driver_id: booking.driver_id
                };
                onNavigateToTripDetails(tripPayload);
              }
            }}
          >
            <View style={styles.liveTripIndicator} />
            <View style={styles.liveTripContent}>
              <Text style={styles.liveTripTitle}>
                {language === "ar" ? "رحلة جارية الآن" : "Trip is Live Now"}
              </Text>
              <Text style={styles.liveTripSubtitle}>
                {language === "ar" ? "انقر للمتابعة على الخريطة" : "Tap to track on map"}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Booking Info Overlay on Map */}
        {upcomingBookings.length > 0 && (
          <View style={styles.bookingOverlay}>
            <View style={styles.bookingOverlayCard}>
              <View style={styles.bookingOverlayHeader}>
                <MaterialIcons
                  name="event-available"
                  size={18}
                  color="#3185FC"
                />
                <Text style={styles.bookingOverlayTitle}>
                  {language === "ar"
                    ? `${upcomingBookings.length} رحلة قادمة`
                    : `${upcomingBookings.length} Upcoming Trip${upcomingBookings.length > 1 ? "s" : ""}`}
                </Text>
              </View>
              {upcomingBookings.slice(0, 2).map((booking) => (
                <View key={booking.id} style={styles.bookingOverlayRow}>
                  <MaterialCommunityIcons
                    name="calendar"
                    size={14}
                    color="#64748B"
                  />
                  <Text style={styles.bookingOverlayText}>
                    {new Date(
                      booking.trip_date + "T00:00:00",
                    ).toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                    })}{" "}
                    •{" "}
                    {new Date(booking.start_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              ))}
              {upcomingBookings.length > 2 && (
                <Text style={styles.bookingOverlayHint}>
                  +{upcomingBookings.length - 2}{" "}
                  {language === "ar" ? "أخرى" : "more"}
                </Text>
              )}
              <Text style={styles.bookingOverlayHint}>
                {language === "ar"
                  ? "انقر على البطاقة أدناه للتفاصيل"
                  : "Tap card below for details"}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* 30% Action Section */}
      <Animated.View
        style={[
          styles.actionArea,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.actionPanel}>
          {upcomingBookings.length > 0 ? (
            /* ── UPCOMING TRIPS LIST ── */
            <ScrollView
              style={styles.bookingsScrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.bookingsScrollContent}
            >
              <Text style={styles.bookingsSectionTitle}>
                {language === "ar" ? "الرحلات القادمة" : "Upcoming Trips"}
              </Text>
              {upcomingBookings.map((booking) => (
                <TouchableOpacity
                  key={booking.id}
                  style={styles.tripCardContainer}
                  onPress={async () => {
                    if (!onNavigateToTripDetails) return;

                    // For ASSIGNED bookings, fetch enriched trip data
                    if (booking.status === "ASSIGNED") {
                      const tripDate = booking.trip_date;
                      const { data: enrichedTrip, error } =
                        await getAssignedTripForStudent(studentId, tripDate);

                      if (enrichedTrip) {
                        onNavigateToTripDetails({
                          ...enrichedTrip,
                          homeLocation: studentLocation || booking.pickup_location,
                          destinationLocation: schoolLocation,
                          routeCoordinates,
                          schoolName,
                          start_time: booking.start_time,
                          trip_date: booking.trip_date,
                          leaveHomeTime: booking.start_time,
                          arriveDestinationTime: booking.end_time,
                        });
                        return;
                      }

                      if (error) {
                        console.warn(
                          "[TripDetails] Failed to fetch enriched trip:",
                          error,
                        );
                      }
                    }

                    // Fallback: basic booking data
                    const tripPayload = {
                      id: booking.id,
                      tripId: booking.id,
                      studentId,
                      homeLocation: studentLocation || booking.pickup_location,
                      destinationLocation: schoolLocation,
                      routeCoordinates,
                      start_time: booking.start_time,
                      trip_date: booking.trip_date,
                      leaveHomeTime: booking.start_time,
                      arriveDestinationTime: booking.end_time,
                      status: booking.status,
                      schoolName,
                    };
                    onNavigateToTripDetails(tripPayload);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.tripCardHeader}>
                    <View style={[
                      styles.tripStatusBadge,
                      (booking.status === "ASSIGNED" || booking.status === "SCHEDULED") && { backgroundColor: "#ECFDF5" },
                      booking.status === "IN_PROGRESS" && { backgroundColor: "#FDF2F2" },
                      booking.status === "COMPLETED" && { backgroundColor: "#F3F4F6" },
                    ]}>
                      <Text style={[
                        styles.tripStatusText,
                        (booking.status === "ASSIGNED" || booking.status === "SCHEDULED") && { color: "#059669" },
                        booking.status === "IN_PROGRESS" && { color: "#DC2626" },
                        booking.status === "COMPLETED" && { color: "#4B5563" },
                      ]}>
                        {booking.status === "CONFIRMED"
                          ? "✓ Confirmed"
                          : (booking.status === "ASSIGNED" || booking.status === "SCHEDULED")
                            ? "🚐 Assigned"
                            : booking.status === "IN_PROGRESS"
                              ? "🚩 In Progress"
                              : booking.status === "COMPLETED"
                                ? "🏁 Completed"
                                : "⏳ Pending"}
                      </Text>
                    </View>
                    <Text style={styles.tripCardDate}>
                      {new Date(
                        booking.trip_date + "T00:00:00",
                      ).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })}
                    </Text>
                  </View>

                  <View style={styles.tripCardRow}>
                    <View style={styles.directionDotBlue} />
                    <Text style={styles.tripCardRowText}>
                      {language === "ar" ? "المنزل ← المدرسة" : "Home → School"}{" "}
                      <Text style={styles.tripCardTimeHighlight}>
                        {new Date(booking.start_time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </Text>
                  </View>

                  <View style={styles.tripCardRow}>
                    <View style={styles.directionDotGreen} />
                    <Text style={styles.tripCardRowText}>
                      {language === "ar" ? "المدرسة ← المنزل" : "School → Home"}{" "}
                      <Text style={styles.tripCardTimeHighlight}>
                        {new Date(booking.end_time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </Text>
                  </View>

                  <Text style={styles.tripCardTapHint}>
                    {language === "ar"
                      ? "انقر لعرض التفاصيل"
                      : "Tap to view details →"}
                  </Text>

                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleCancel(booking.id);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelBtnText}>Cancel Trip</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            /* ── BOOKING FORM (no booking yet) ── */
            <View style={styles.inputRow}>
              {/* Date */}
              <TouchableOpacity
                style={styles.timeInput}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="calendar-today"
                  size={20}
                  color={PRIMARY_BLUE}
                />
                <View style={styles.inputLabels}>
                  <Text style={styles.inputLabel}>DATE</Text>
                  <Text style={styles.inputValue}>
                    {tripDate
                      ? tripDate.toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })
                      : "Select date"}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Arrival time */}
              <TouchableOpacity
                style={styles.timeInput}
                onPress={() => setShowArrivalPicker(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="clock-start"
                  size={20}
                  color={PRIMARY_BLUE}
                />
                <View style={styles.inputLabels}>
                  <Text style={styles.inputLabel}>ARRIVAL AT SCHOOL</Text>
                  <Text style={styles.inputValue}>
                    {arrivalTime ? formatTime(arrivalTime) : "08:00"}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Return time */}
              <TouchableOpacity
                style={styles.timeInput}
                onPress={() => setShowReturnPicker(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="clock-check-outline"
                  size={20}
                  color="#10B981"
                />
                <View style={styles.inputLabels}>
                  <Text style={styles.inputLabel}>RETURN FROM SCHOOL</Text>
                  <Text style={styles.inputValue}>
                    {returnTime ? formatTime(returnTime) : "16:00"}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* GO button */}
              <TouchableOpacity
                style={[
                  styles.goButton,
                  (!tripDate || !arrivalTime || !returnTime) &&
                  styles.goButtonDisabled,
                ]}
                onPress={handleGo}
                disabled={isBooking || !tripDate || !arrivalTime || !returnTime}
                activeOpacity={0.8}
              >
                {isBooking ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.goButtonText}>{t.go}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Date/Time Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={tripDate || new Date()}
          mode="date"
          minimumDate={new Date()}
          onChange={(e, date) => {
            setShowDatePicker(false);
            if (date) setTripDate(date);
          }}
        />
      )}
      {showArrivalPicker && (
        <DateTimePicker
          value={arrivalTime || new Date()}
          mode="time"
          is24Hour
          onChange={(e, time) => {
            setShowArrivalPicker(false);
            if (time) setArrivalTime(time);
          }}
        />
      )}
      {showReturnPicker && (
        <DateTimePicker
          value={returnTime || new Date()}
          mode="time"
          is24Hour
          onChange={(e, time) => {
            setShowReturnPicker(false);
            if (time) setReturnTime(time);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  mapArea: {
    flex: 0.65,
    backgroundColor: "#EBF2FF",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  floatingHeader: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: NEUTRAL_900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(49, 133, 252, 0.1)",
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: NEUTRAL_900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(49, 133, 252, 0.1)",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: UbuntuFonts.bold,
  },
  notificationDropdown: {
    position: "absolute",
    top: Platform.OS === "ios" ? 96 : 88,
    right: 20,
    width: 280,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    zIndex: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: NEUTRAL_900,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  notificationDropdownTitle: {
    fontSize: 14,
    fontFamily: UbuntuFonts.bold,
    color: NEUTRAL_900,
    marginBottom: 10,
  },
  notificationEmptyText: {
    fontSize: 13,
    color: NEUTRAL_500,
    fontFamily: UbuntuFonts.medium,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 6,
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: PRIMARY_BLUE,
  },
  notificationContent: {
    flex: 1,
  },
  notificationItemTitle: {
    fontSize: 13,
    color: NEUTRAL_900,
    fontFamily: UbuntuFonts.bold,
  },
  notificationItemDetail: {
    marginTop: 2,
    fontSize: 12,
    color: NEUTRAL_500,
    fontFamily: UbuntuFonts.medium,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EDF5FF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: PRIMARY_BLUE,
    fontFamily: UbuntuFonts.bold,
    fontSize: 16,
  },
  statusIndicator: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  bookingOverlay: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 8,
  },
  bookingOverlayCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#1A1A1A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(49, 133, 252, 0.15)",
  },
  bookingOverlayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  bookingOverlayTitle: {
    fontSize: 13,
    fontFamily: UbuntuFonts.bold,
    color: "#3185FC",
  },
  bookingOverlayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  bookingOverlayText: {
    fontSize: 13,
    fontFamily: UbuntuFonts.medium,
    color: "#1A1A1A",
  },
  bookingOverlayHint: {
    fontSize: 11,
    fontFamily: UbuntuFonts.medium,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  actionArea: {
    flex: 0.35,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32, // Overlay on map
    shadowColor: NEUTRAL_900,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 20,
  },
  actionPanel: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  bookingsScrollView: {
    flex: 1,
  },
  bookingsScrollContent: {
    paddingBottom: 8,
  },
  bookingsSectionTitle: {
    fontSize: 16,
    fontFamily: UbuntuFonts.bold,
    color: NEUTRAL_900,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "column",
    gap: 0,
    marginBottom: 16,
  },
  tripCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#1A1A1A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tripCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  tripCardIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tripCardText: {
    flex: 1,
  },
  tripCardTitle: {
    fontSize: 14,
    fontFamily: UbuntuFonts.bold,
    color: NEUTRAL_900,
  },
  tripCardSubtitle: {
    fontSize: 12,
    fontFamily: UbuntuFonts.medium,
    color: NEUTRAL_500,
    marginTop: 2,
  },
  tripCardTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  tripCardTimeText: {
    fontSize: 13,
    fontFamily: UbuntuFonts.bold,
    color: NEUTRAL_900,
  },
  tripDateValue: {
    fontSize: 13,
    fontFamily: UbuntuFonts.bold,
    color: "#7C3AED",
  },
  // New booking form styles
  timeInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
    gap: 14,
  },
  inputLabels: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: UbuntuFonts.bold,
    color: NEUTRAL_500,
    letterSpacing: 0.5,
  },
  inputValue: {
    fontSize: 16,
    fontFamily: UbuntuFonts.bold,
    color: NEUTRAL_900,
    marginTop: 2,
  },
  tripCardContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  tripCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tripStatusBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
  },
  tripStatusText: {
    fontSize: 12,
    fontFamily: UbuntuFonts.bold,
    color: PRIMARY_BLUE,
  },
  tripCardDate: {
    fontSize: 13,
    fontFamily: UbuntuFonts.bold,
    color: "#64748B",
  },
  tripCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tripCardRowText: {
    fontSize: 14,
    fontFamily: UbuntuFonts.medium,
    color: "#0F172A",
  },
  tripCardTimeHighlight: {
    fontFamily: UbuntuFonts.bold,
    color: PRIMARY_BLUE,
  },
  directionDotBlue: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY_BLUE,
    marginRight: 8,
  },
  directionDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
    marginRight: 8,
  },
  tripCardTapHint: {
    fontSize: 12,
    fontFamily: UbuntuFonts.medium,
    color: "#3185FC",
    textAlign: "center",
    marginTop: 4,
    opacity: 0.7,
  },
  cancelBtn: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: "#EF4444",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: UbuntuFonts.bold,
    color: "#EF4444",
  },
  goButton: {
    backgroundColor: PRIMARY_BLUE,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: PRIMARY_BLUE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  goButtonDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
    elevation: 0,
  },
  goButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: UbuntuFonts.bold,
    letterSpacing: 1,
  },
  rtlText: {
    textAlign: "right",
  },
  liveTripBanner: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: "#DC2626", // Red for live
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
  },
  liveTripIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
    marginRight: 12,
  },
  liveTripContent: {
    flex: 1,
  },
  liveTripTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  liveTripSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
  },
});

export default StudentHomeScreen;
