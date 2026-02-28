import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../shared/components/common/Header';
import BarChart from '../shared/components/common/BarChart';

const translations = {
  en: {
    title: 'History & Statistics',
    subtitle: 'Your trip history and performance',
    tripHistory: 'Trip History',
    statistics: 'Statistics',
    noTrips: 'No trips yet',
    noTripsDesc: 'Your completed trips will appear here',
    loading: 'Loading...',
    error: 'Error',
    errorMessage: 'Failed to load history',
    ok: 'OK',
    date: 'Date',
    students: 'Students',
    school: 'School',
    duration: 'Duration',
    distance: 'Distance',
    status: 'Status',
    totalTrips: 'Total Trips',
    totalDistance: 'Total Distance',
    totalTime: 'Total Time',
    totalStudents: 'Total Students',
    averageRating: 'Average Rating',
    km: 'km',
    min: 'min',
    hours: 'hours',
    completed: 'Completed',
    cancelled: 'Cancelled',
    scheduled: 'Scheduled',
    pullToRefresh: 'Pull to refresh',
    tripsPerMonth: 'Trips per Month',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    trips: 'trips',
    studentsCount: 'students',
  },
  ar: {
    title: 'السجل والإحصائيات',
    subtitle: 'سجل رحلاتك وأدائك',
    tripHistory: 'سجل الرحلات',
    statistics: 'الإحصائيات',
    noTrips: 'لا توجد رحلات بعد',
    noTripsDesc: 'ستظهر رحلاتك المكتملة هنا',
    loading: 'جاري التحميل...',
    error: 'خطأ',
    errorMessage: 'فشل تحميل السجل',
    ok: 'حسناً',
    date: 'التاريخ',
    students: 'الطلاب',
    school: 'المدرسة',
    duration: 'المدة',
    distance: 'المسافة',
    status: 'الحالة',
    totalTrips: 'إجمالي الرحلات',
    totalDistance: 'إجمالي المسافة',
    totalTime: 'إجمالي الوقت',
    totalStudents: 'إجمالي الطلاب',
    averageRating: 'التقييم المتوسط',
    km: 'كم',
    min: 'دقيقة',
    hours: 'ساعة',
    completed: 'مكتمل',
    cancelled: 'ملغي',
    scheduled: 'مجدول',
    pullToRefresh: 'اسحب للتحديث',
    tripsPerMonth: 'الرحلات شهرياً',
    thisMonth: 'هذا الشهر',
    lastMonth: 'الشهر الماضي',
    trips: 'رحلة',
    studentsCount: 'طالب',
  },
};

// Demo data generator
const generateDemoTrips = () => {
  const trips = [];
  const now = new Date();
  
  for (let i = 0; i < 10; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * 2);
    date.setHours(7 + (i % 3), 30, 0, 0);
    
    trips.push({
      id: `trip-${i + 1}`,
      date: date.toISOString(),
      students: 5 + Math.floor(Math.random() * 5),
      school: 'Casablanca International School',
      duration: 30 + Math.floor(Math.random() * 30),
      distance: 5 + Math.random() * 5,
      status: i < 7 ? 'completed' : 'cancelled',
    });
  }
  
  return trips;
};

const generateDemoStatistics = () => {
  return {
    totalTrips: 45,
    totalDistance: 225.5,
    totalTime: 1800, // minutes
    totalStudents: 360,
    averageRating: 4.8,
    monthlyData: [
      { month: 'Jan', trips: 8, distance: 40 },
      { month: 'Feb', trips: 10, distance: 50 },
      { month: 'Mar', trips: 12, distance: 60 },
      { month: 'Apr', trips: 15, distance: 75 },
    ],
  };
};

const DriverHistoryScreen = ({ driverId, isDemo = false, language = 'en' }) => {
  const [trips, setTrips] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const t = translations[language];
  const isRTL = language === 'ar';

  useEffect(() => {
    loadData();
  }, [driverId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (isDemo) {
        // Use demo data
        await new Promise(resolve => setTimeout(resolve, 500));
        setTrips(generateDemoTrips());
        setStatistics(generateDemoStatistics());
      } else {
        // TODO: Load from API
        // const tripsData = await getDriverTrips(driverId);
        // const statsData = await getDriverStatistics(driverId);
        // setTrips(tripsData);
        // setStatistics(statsData);
        setTrips(generateDemoTrips());
        setStatistics(generateDemoStatistics());
      }
    } catch (err) {
      console.error('Error loading history:', err);
      setError(err.message || t.errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [driverId, isDemo]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(
      language === 'ar' ? 'ar-SA' : 'en-US',
      { day: 'numeric', month: 'short', year: 'numeric' }
    );
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(
      language === 'ar' ? 'ar-SA' : 'en-US',
      { hour: '2-digit', minute: '2-digit' }
    );
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes} ${t.min}`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}${t.hours} ${mins > 0 ? `${mins}${t.min}` : ''}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'cancelled':
        return '#EF4444';
      case 'scheduled':
        return '#F59E0B';
      default:
        return '#666666';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return t.completed;
      case 'cancelled':
        return t.cancelled;
      case 'scheduled':
        return t.scheduled;
      default:
        return status;
    }
  };

  const renderTripItem = ({ item }) => (
    <View style={[styles.tripCard, isRTL && styles.tripCardRTL]}>
      <View style={styles.tripHeader}>
        <View style={styles.tripDateContainer}>
          <MaterialIcons name="calendar-today" size={20} color="#3185FC" />
          <View style={styles.tripDateText}>
            <Text style={[styles.tripDate, isRTL && styles.rtl]}>
              {formatDate(item.date)}
            </Text>
            <Text style={[styles.tripTime, isRTL && styles.rtl]}>
              {formatTime(item.date)}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }, isRTL && styles.rtl]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.tripDetails}>
        <View style={styles.tripDetailRow}>
          <MaterialIcons name="school" size={18} color="#666666" />
          <Text style={[styles.tripDetailText, isRTL && styles.rtl]}>
            {item.school}
          </Text>
        </View>
        <View style={styles.tripDetailRow}>
          <MaterialIcons name="people" size={18} color="#666666" />
          <Text style={[styles.tripDetailText, isRTL && styles.rtl]}>
            {item.students} {t.students}
          </Text>
        </View>
        <View style={styles.tripDetailRow}>
          <MaterialIcons name="schedule" size={18} color="#666666" />
          <Text style={[styles.tripDetailText, isRTL && styles.rtl]}>
            {formatDuration(item.duration)}
          </Text>
        </View>
        <View style={styles.tripDetailRow}>
          <MaterialIcons name="directions-car" size={18} color="#666666" />
          <Text style={[styles.tripDetailText, isRTL && styles.rtl]}>
            {item.distance.toFixed(1)} {t.km}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <Header title={t.title} subtitle={t.subtitle} language={language} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3185FC" />
          <Text style={[styles.loadingText, isRTL && styles.rtl]}>
            {t.loading}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Header title={t.title} subtitle={t.subtitle} language={language} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3185FC"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Statistics Section */}
        {statistics && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>
              {t.statistics}
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <MaterialIcons name="directions-car" size={32} color="#3185FC" />
                <Text style={[styles.statValue, isRTL && styles.rtl]}>
                  {statistics.totalTrips}
                </Text>
                <Text style={[styles.statLabel, isRTL && styles.rtl]}>
                  {t.totalTrips}
                </Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="straighten" size={32} color="#10B981" />
                <Text style={[styles.statValue, isRTL && styles.rtl]}>
                  {statistics.totalDistance.toFixed(1)}
                </Text>
                <Text style={[styles.statLabel, isRTL && styles.rtl]}>
                  {t.totalDistance} ({t.km})
                </Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="schedule" size={32} color="#F59E0B" />
                <Text style={[styles.statValue, isRTL && styles.rtl]}>
                  {formatDuration(statistics.totalTime)}
                </Text>
                <Text style={[styles.statLabel, isRTL && styles.rtl]}>
                  {t.totalTime}
                </Text>
              </View>
              <View style={styles.statCard}>
                <MaterialIcons name="people" size={32} color="#8B5CF6" />
                <Text style={[styles.statValue, isRTL && styles.rtl]}>
                  {statistics.totalStudents}
                </Text>
                <Text style={[styles.statLabel, isRTL && styles.rtl]}>
                  {t.totalStudents}
                </Text>
              </View>
            </View>

            {/* Monthly Chart */}
            {statistics.monthlyData && statistics.monthlyData.length > 0 && (
              <View style={styles.chartContainer}>
                <Text style={[styles.chartTitle, isRTL && styles.rtl]}>
                  {t.tripsPerMonth}
                </Text>
                <BarChart
                  data={statistics.monthlyData.map(item => ({
                    label: item.month,
                    value: item.trips,
                  }))}
                  color="#3185FC"
                />
              </View>
            )}
          </View>
        )}

        {/* Trip History Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>
            {t.tripHistory}
          </Text>
          {trips.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="history" size={64} color="#D1D5DB" />
              <Text style={[styles.emptyTitle, isRTL && styles.rtl]}>
                {t.noTrips}
              </Text>
              <Text style={[styles.emptyDesc, isRTL && styles.rtl]}>
                {t.noTripsDesc}
              </Text>
            </View>
          ) : (
            <FlatList
              data={trips}
              renderItem={renderTripItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginTop: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tripCardRTL: {
    // RTL support
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  tripDateText: {
    flex: 1,
  },
  tripDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  tripTime: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tripDetails: {
    gap: 8,
  },
  tripDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripDetailText: {
    fontSize: 14,
    color: '#666666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  rtl: {
    textAlign: 'right',
  },
});

export default DriverHistoryScreen;

