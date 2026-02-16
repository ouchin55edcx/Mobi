import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import BarChart from "../../components/BarChart";
import {
  getTripHistory,
  getMonthlyStatistics,
  getMonthlyStatisticsChart,
} from "../../src/services/tripHistoryService";

const translations = {
  en: {
    title: "History",
    subtitle: "Your trip history and statistics",
    tripHistory: "Trip History",
    monthlyStats: "Monthly Statistics",
    noTrips: "No trips yet",
    noTripsDesc: "Your completed trips will appear here",
    loading: "Loading...",
    error: "Error",
    errorMessage: "Failed to load history",
    ok: "OK",
    date: "Date",
    type: "Type",
    school: "School",
    duration: "Duration",
    distance: "Distance",
    status: "Status",
    pickup: "Pickup",
    dropoff: "Dropoff",
    totalTrips: "Total Trips",
    totalDistance: "Total Distance",
    totalTime: "Total Time",
    km: "km",
    min: "min",
    hours: "hours",
    completed: "Completed",
    cancelled: "Cancelled",
    pending: "Pending",
    inProgress: "In Progress",
    pullToRefresh: "Pull to refresh",
    tripsPerMonth: "Trips per Month",
    distancePerMonth: "Distance per Month",
    timePerMonth: "Time per Month",
    trips: "trips",
  },
  ar: {
    title: "السجل",
    subtitle: "سجل رحلاتك وإحصائياتك",
    tripHistory: "سجل الرحلات",
    monthlyStats: "الإحصائيات الشهرية",
    noTrips: "لا توجد رحلات بعد",
    noTripsDesc: "ستظهر رحلاتك المكتملة هنا",
    loading: "جاري التحميل...",
    error: "خطأ",
    errorMessage: "فشل تحميل السجل",
    ok: "حسناً",
    date: "التاريخ",
    type: "النوع",
    school: "المدرسة",
    duration: "المدة",
    distance: "المسافة",
    status: "الحالة",
    pickup: "استلام",
    dropoff: "توصيل",
    totalTrips: "إجمالي الرحلات",
    totalDistance: "إجمالي المسافة",
    totalTime: "إجمالي الوقت",
    km: "كم",
    min: "دقيقة",
    hours: "ساعة",
    completed: "مكتمل",
    cancelled: "ملغي",
    pending: "قيد الانتظار",
    inProgress: "قيد التنفيذ",
    pullToRefresh: "اسحب للتحديث",
    tripsPerMonth: "الرحلات شهرياً",
    distancePerMonth: "المسافة شهرياً",
    timePerMonth: "الوقت شهرياً",
    trips: "رحلة",
  },
};

const HistoryScreen = ({ studentId, isDemo = false, language = "en" }) => {
  const [activeTab, setActiveTab] = useState("history");
  const [trips, setTrips] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [monthlyChartData, setMonthlyChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const t = translations[language];

  useEffect(() => {
    if (studentId && !isDemo) {
      if (activeTab === "history") {
        loadTripHistory();
      } else {
        loadStatistics();
        loadMonthlyChartData();
      }
    } else if (isDemo) {
      // Demo mode: show mock data
      setTrips(generateMockTrips());
      setStatistics(generateMockStatistics());
      loadMonthlyChartData(); // Load chart data for demo
      setLoading(false);
    }
  }, [studentId, isDemo, activeTab]);

  const loadTripHistory = async () => {
    if (!studentId) return;

    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await getTripHistory(studentId, {
        limit: 50,
      });

      if (fetchError) {
        console.error("Error loading trip history:", fetchError);
        setError(fetchError.message);
        setTrips([]);
      } else {
        setTrips(data || []);
      }
    } catch (err) {
      console.error("Exception loading trip history:", err);
      setError(err.message);
      setTrips([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStatistics = async () => {
    if (!studentId) return;

    try {
      setLoading(true);
      setError(null);
      const { statistics: stats, error: fetchError } =
        await getMonthlyStatistics(studentId);

      if (fetchError) {
        console.error("Error loading statistics:", fetchError);
        setError(fetchError.message);
        setStatistics(null);
      } else {
        setStatistics(stats);
      }
    } catch (err) {
      console.error("Exception loading statistics:", err);
      setError(err.message);
      setStatistics(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMonthlyChartData = async () => {
    try {
      const { data, error: fetchError } = await getMonthlyStatisticsChart(
        studentId,
        6,
      );

      if (fetchError) {
        console.error("Error loading monthly chart data:", fetchError);
        setMonthlyChartData([]);
      } else {
        setMonthlyChartData(data || []);
      }
    } catch (err) {
      console.error("Exception loading monthly chart data:", err);
      setMonthlyChartData([]);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    if (activeTab === "history") {
      loadTripHistory();
    } else {
      loadStatistics();
      loadMonthlyChartData();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "--";
    const date = new Date(dateString);
    return date.toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "--:--";
    const date = new Date(dateString);
    return date.toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "--";
    if (minutes < 60) {
      return `${Math.round(minutes)} ${t.min}`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}${t.hours} ${mins > 0 ? `${mins}${t.min}` : ""}`;
  };

  const formatDistance = (km) => {
    if (!km) return "--";
    return `${km.toFixed(1)} ${t.km}`;
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "COMPLETED":
        return t.completed;
      case "CANCELLED":
        return t.cancelled;
      case "PENDING":
      case "GENERATED":
      case "CONFIRMED":
        return t.pending;
      case "IN_PROGRESS":
      case "ACTIVE":
        return t.inProgress;
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "COMPLETED":
        return "#10B981";
      case "CANCELLED":
        return "#EF4444";
      case "IN_PROGRESS":
      case "ACTIVE":
        return "#2563EB";
      default:
        return "#F59E0B";
    }
  };

  const generateMockTrips = () => {
    return [
      {
        id: "1",
        type: "PICKUP",
        status: "COMPLETED",
        created_at: new Date(
          Date.now() - 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        total_route: { total_distance: 5200, total_duration: 2700 },
      },
      {
        id: "2",
        type: "DROPOFF",
        status: "COMPLETED",
        created_at: new Date(
          Date.now() - 5 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        total_route: { total_distance: 4800, total_duration: 2400 },
      },
    ];
  };

  const generateMockStatistics = () => {
    return {
      totalTrips: 12,
      totalDistance: 58.4,
      totalTimeMinutes: 540,
      totalTimeHours: 9.0,
    };
  };

  const renderTripItem = ({ item }) => {
    const distance = item.total_route?.total_distance
      ? item.total_route.total_distance / 1000
      : null;
    const duration = item.total_route?.total_duration
      ? item.total_route.total_duration / 60
      : null;

    return (
      <View style={styles.tripItem}>
        <View style={styles.tripHeader}>
          <View style={styles.tripTypeContainer}>
            <MaterialIcons
              name={item.type === "PICKUP" ? "arrow-upward" : "arrow-downward"}
              size={20}
              color="#3185FC"
            />
            <Text style={styles.tripType}>
              {item.type === "PICKUP" ? t.pickup : t.dropoff}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + "20" },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        <View style={styles.tripDetails}>
          <View style={styles.tripDetailRow}>
            <MaterialIcons name="calendar-today" size={16} color="#9CA3AF" />
            <Text style={styles.tripDetailText}>
              {formatDate(item.created_at)}
            </Text>
          </View>
          {duration && (
            <View style={styles.tripDetailRow}>
              <MaterialIcons name="access-time" size={16} color="#9CA3AF" />
              <Text style={styles.tripDetailText}>
                {formatDuration(duration)}
              </Text>
            </View>
          )}
          {distance && (
            <View style={styles.tripDetailRow}>
              <MaterialIcons name="straighten" size={16} color="#9CA3AF" />
              <Text style={styles.tripDetailText}>
                {formatDistance(distance)}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderStatistics = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3185FC" />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{t.errorMessage}</Text>
        </View>
      );
    }

    if (!statistics) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="bar-chart" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>{t.noTrips}</Text>
          <Text style={styles.emptyDesc}>{t.noTripsDesc}</Text>
        </View>
      );
    }

    // Prepare chart data
    const tripsChartData = monthlyChartData.map((item) => ({
      month: item.month,
      value: item.trips,
    }));

    const distanceChartData = monthlyChartData.map((item) => ({
      month: item.month,
      value: item.distance,
    }));

    const timeChartData = monthlyChartData.map((item) => ({
      month: item.month,
      value: item.timeMinutes,
    }));

    const maxTrips = Math.max(...tripsChartData.map((d) => d.value), 1);
    const maxDistance = Math.max(...distanceChartData.map((d) => d.value), 1);
    const maxTime = Math.max(...timeChartData.map((d) => d.value), 1);

    return (
      <ScrollView
        contentContainerStyle={styles.statisticsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <MaterialIcons name="directions-bus" size={32} color="#3185FC" />
            </View>
            <Text style={styles.statValue}>{statistics.totalTrips}</Text>
            <Text style={styles.statLabel}>{t.totalTrips}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <MaterialIcons name="straighten" size={32} color="#3185FC" />
            </View>
            <Text style={styles.statValue}>
              {formatDistance(statistics.totalDistance)}
            </Text>
            <Text style={styles.statLabel}>{t.totalDistance}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <MaterialIcons name="access-time" size={32} color="#3185FC" />
            </View>
            <Text style={styles.statValue}>
              {formatDuration(statistics.totalTimeMinutes)}
            </Text>
            <Text style={styles.statLabel}>{t.totalTime}</Text>
          </View>
        </View>

        {/* Charts */}
        {monthlyChartData.length > 0 && (
          <>
            <View style={styles.chartCard}>
              <BarChart
                data={tripsChartData}
                label={t.tripsPerMonth}
                unit={t.trips}
                color="#3185FC"
                maxValue={maxTrips}
                language={language}
              />
            </View>

            <View style={styles.chartCard}>
              <BarChart
                data={distanceChartData}
                label={t.distancePerMonth}
                unit={t.km}
                color="#10B981"
                maxValue={maxDistance}
                language={language}
              />
            </View>

            <View style={styles.chartCard}>
              <BarChart
                data={timeChartData}
                label={t.timePerMonth}
                unit={t.min}
                color="#F59E0B"
                maxValue={maxTime}
                language={language}
              />
            </View>
          </>
        )}
      </ScrollView>
    );
  };

  const renderTripHistory = () => {
    if (loading && trips.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3185FC" />
        </View>
      );
    }

    if (error && trips.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{t.errorMessage}</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={trips}
        renderItem={renderTripItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          trips.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="history" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>{t.noTrips}</Text>
            <Text style={styles.emptyDesc}>{t.noTripsDesc}</Text>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StatusBar style="dark" />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "history" && styles.activeTab]}
          onPress={() => setActiveTab("history")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "history" && styles.activeTabText,
            ]}
          >
            {t.tripHistory}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "stats" && styles.activeTab]}
          onPress={() => setActiveTab("stats")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "stats" && styles.activeTabText,
            ]}
          >
            {t.monthlyStats}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === "history" ? renderTripHistory() : renderStatistics()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 4,
    backgroundColor: "#F8FAFC",
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#3B82F6",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#94A3B8",
  },
  activeTabText: {
    color: "#0F172A",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    marginTop: 16,
    textAlign: "center",
  },
  list: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#64748B",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  tripItem: {
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  tripTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tripType: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  tripDetails: {
    gap: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  tripDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tripDetailText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  statisticsContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCards: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F0F7FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#3B82F6",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
    textTransform: "uppercase",
    textAlign: "center",
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
});

export default HistoryScreen;
