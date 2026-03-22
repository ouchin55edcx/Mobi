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

import MapboxRoutePreview from "../shared/components/common/MapboxRoutePreview";
import { DEMO_SCHOOL, DEMO_STUDENT } from "../shared/data/demoData";
import { UbuntuFonts } from "../shared/utils/fonts";
import { getDirectionsRoute } from "../shared/services/mapboxService";
import { getSchoolById } from "../shared/services/schoolService";
import { getStudentById } from "../shared/services/studentService";
import {
  cancelStudentPendingTrip,
  getStudentCurrentTrip,
  requestStudentTripDetailsState,
} from "../shared/services/groupingService";

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

const StudentHomeScreen = ({
  studentId,
  isDemo = false,
  language = "en",
  onNavigateToTripDetails,
  onNavigateToProfile,
}) => {
  const { height: screenHeight } = useWindowDimensions();
  const t = translations[language] || translations.en;

  // States
  const [studentData, setStudentData] = useState(isDemo ? DEMO_STUDENT : null);
  const [studentLocation, setStudentLocation] = useState(
    isDemo ? DEMO_STUDENT.home_location : null,
  );
  const [schoolLocation, setSchoolLocation] = useState(
    isDemo ? DEMO_SCHOOL.location : null,
  );
  const [schoolName, setSchoolName] = useState(isDemo ? DEMO_SCHOOL.name : "");

  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isRouteLoading, setIsRouteLoading] = useState(true);

  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [isPreparingTrip, setIsPreparingTrip] = useState(false);
  const [pendingTripData, setPendingTripData] = useState(null);
  const [isCheckingTrip, setIsCheckingTrip] = useState(false);
  const [locationHint, setLocationHint] = useState("");
  const [groupingHint, setGroupingHint] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

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
  useEffect(() => {
    const loadData = async () => {
      if (isDemo) return;
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
        console.error(e);
      }
    };
    loadData();
  }, [studentId, isDemo]);

  // Location Resolution
  useEffect(() => {
    const resolveLocation = async () => {
      if (isDemo) return;
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
        console.error(e);
      }
    };
    resolveLocation();
  }, [isDemo, t.gpsDenied]);

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
      if (isDemo || !studentId) return;
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
  }, [studentId, isDemo]);

  const handleGo = async () => {
    if (!studentLocation || !schoolLocation || !startTime || !endTime) {
      Alert.alert(
        t.error,
        language === "ar"
          ? "يرجى اختيار الأوقات أولاً"
          : "Please select times first",
      );
      return;
    }

    setIsPreparingTrip(true);
    const plannedStart = buildDateOnTomorrowFromTime(startTime);
    const plannedEnd = buildDateOnTomorrowFromTime(endTime);

    try {
      if (isDemo) {
        onNavigateToTripDetails({
          homeLocation: studentLocation,
          pickupLocation: studentLocation,
          destinationLocation: schoolLocation,
          routeCoordinates:
            routeCoordinates?.length > 1
              ? routeCoordinates
              : [studentLocation, schoolLocation],
          leaveHomeTime: plannedStart,
          arriveDestinationTime: plannedEnd,
          studentId,
          language,
        });
        return;
      }

      const tripState = await requestStudentTripDetailsState({
        studentId,
        startTime: plannedStart,
        endTime: plannedEnd,
        type: "PICKUP",
      });

      if (tripState.state === "error") {
        setGroupingHint(tripState.error?.message || t.groupingProcessing);
      } else {
        onNavigateToTripDetails({
          homeLocation: studentLocation,
          pickupLocation: studentLocation,
          destinationLocation: schoolLocation,
          routeCoordinates,
          leaveHomeTime: plannedStart,
          arriveDestinationTime: plannedEnd,
          studentId,
          language,
        });
      }
    } catch (e) {
      Alert.alert(t.error, e.message);
    } finally {
      setIsPreparingTrip(false);
    }
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

    // Demo Notification: Trip Started
    items.push({
      id: "trip-started-demo",
      title: language === "ar" ? "بدأت الرحلة" : "Trip Started",
      detail:
        language === "ar"
          ? "سائقك في الطريق إليك"
          : "Your driver is on the way",
    });

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
            <Text style={styles.notificationDropdownTitle}>
              {t.notifications}
            </Text>
            {notifications.length === 0 ? (
              <Text style={styles.notificationEmptyText}>
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
                    <Text style={styles.notificationItemTitle}>
                      {item.title}
                    </Text>
                    {!!item.detail && (
                      <Text style={styles.notificationItemDetail}>
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
      </View>

      {/* 30% Action Section */}
      <Animated.View
        style={[
          styles.actionArea,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.actionPanel}>
          <View style={styles.inputRow}>
            {/* Departure Card */}
            <TouchableOpacity
              style={styles.tripCard}
              onPress={() => setShowStartTimePicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.tripCardLeft}>
                <View
                  style={[styles.tripCardIcon, { backgroundColor: "#EEF4FF" }]}
                >
                  <MaterialIcons
                    name="arrow-forward"
                    size={18}
                    color={PRIMARY_BLUE}
                  />
                </View>
                <View style={styles.tripCardText}>
                  <Text style={styles.tripCardTitle}>
                    {language === "ar" ? "الذهاب" : "Departure"}
                  </Text>
                  <Text style={styles.tripCardSubtitle}>
                    {language === "ar" ? "متى تغادر؟" : "When do you leave?"}
                  </Text>
                </View>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={NEUTRAL_500}
              />
            </TouchableOpacity>

            <View style={styles.tripCardTimeRow}>
              <MaterialIcons name="access-time" size={16} color={NEUTRAL_500} />
              <Text style={styles.tripCardTimeText}>
                {startTime ? formatTime(startTime) : "08:00"}
              </Text>
            </View>

            {/* Return Card */}
            <TouchableOpacity
              style={[styles.tripCard, { marginTop: 12 }]}
              onPress={() => setShowEndTimePicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.tripCardLeft}>
                <View
                  style={[styles.tripCardIcon, { backgroundColor: "#F0FDF4" }]}
                >
                  <MaterialIcons name="arrow-back" size={18} color="#10B981" />
                </View>
                <View style={styles.tripCardText}>
                  <Text style={styles.tripCardTitle}>
                    {language === "ar" ? "الإياب" : "Return"}
                  </Text>
                  <Text style={styles.tripCardSubtitle}>
                    {language === "ar" ? "متى تعود؟" : "When do you return?"}
                  </Text>
                </View>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={NEUTRAL_500}
              />
            </TouchableOpacity>

            <View style={styles.tripCardTimeRow}>
              <MaterialIcons name="access-time" size={16} color={NEUTRAL_500} />
              <Text style={styles.tripCardTimeText}>
                {endTime ? formatTime(endTime) : "16:00"}
              </Text>
            </View>
          </View>

          {/* GO Button */}
          <TouchableOpacity
            style={[
              styles.goButton,
              (!startTime || !endTime) && styles.goButtonDisabled,
            ]}
            onPress={handleGo}
            disabled={isPreparingTrip || !startTime || !endTime}
            activeOpacity={0.8}
          >
            {isPreparingTrip ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.goButtonText}>{t.go}</Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Time Pickers */}
      {showStartTimePicker && (
        <DateTimePicker
          value={startTime || new Date()}
          mode="time"
          is24Hour
          onChange={(e, time) => {
            setShowStartTimePicker(false);
            if (time) setStartTime(time);
          }}
        />
      )}
      {showEndTimePicker && (
        <DateTimePicker
          value={endTime || new Date()}
          mode="time"
          is24Hour
          onChange={(e, time) => {
            setShowEndTimePicker(false);
            if (time) setEndTime(time);
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
});

export default StudentHomeScreen;
