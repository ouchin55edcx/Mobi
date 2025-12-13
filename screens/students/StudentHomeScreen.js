import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../../components/Header';
import TripCard from '../../components/TripCard';
import BookingModal from '../../components/BookingModal';
import { getActiveBooking } from '../../src/services/bookingService';
import { getDemoActiveTrip, DEMO_STUDENT, DEMO_SCHOOL } from '../../src/data/demoData';
import TripDetailsScreen from './TripDetailsScreen';

const translations = {
  en: {
    title: 'Home',
    subtitle: 'Your active trips',
    noActiveTrip: 'No active trips',
    bookAnotherRide: 'Book Another Ride',
    viewDetails: 'View Details',
    loading: 'Loading...',
  },
  ar: {
    title: 'الرئيسية',
    subtitle: 'رحلاتك النشطة',
    noActiveTrip: 'لا توجد رحلات نشطة',
    bookAnotherRide: 'احجز رحلة أخرى',
    viewDetails: 'عرض التفاصيل',
    loading: 'جاري التحميل...',
  },
};

const StudentHomeScreen = ({ studentId, isDemo = false, language = 'en' }) => {
  // Use demo locations or real student data
  const homeLocation = isDemo 
    ? DEMO_STUDENT.home_location 
    : { latitude: 33.5731, longitude: -7.5898 }; // In production, fetch from student profile
  const schoolLocation = isDemo 
    ? DEMO_SCHOOL.location 
    : { latitude: 33.5800, longitude: -7.5920 }; // In production, fetch from school data

  const [activeBooking, setActiveBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showTripDetails, setShowTripDetails] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);

  const t = translations[language];
  const isRTL = language === 'ar';

  // Load active booking
  const loadActiveBooking = useCallback(async () => {
    if (isDemo) {
      // Demo mode: use static demo trip data
      const demoTrip = getDemoActiveTrip();
      setActiveBooking(demoTrip);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const { data, error } = await getActiveBooking(studentId);
      if (error) {
        console.error('Error loading active booking:', error);
        setActiveBooking(null);
      } else {
        setActiveBooking(data);
      }
    } catch (err) {
      console.error('Exception loading active booking:', err);
      setActiveBooking(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId, isDemo]);

  // Load on mount and when booking modal closes
  useEffect(() => {
    loadActiveBooking();
  }, [loadActiveBooking]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadActiveBooking();
  }, [loadActiveBooking]);

  // Handle booking success
  const handleBookingSuccess = useCallback((newBooking) => {
    // In demo mode, newBooking is passed from modal
    // In real mode, reload from API
    if (isDemo && newBooking) {
      setActiveBooking(newBooking);
    } else {
      loadActiveBooking();
    }
  }, [loadActiveBooking, isDemo]);

  // Convert booking to trip data format
  const convertBookingToTripData = (booking) => {
    if (!booking) return null;

    // Mock locations (in production, fetch from student and school data)
    const pickupLocation = { latitude: 33.5750, longitude: -7.5900 };
    const destinationLocation = { latitude: 33.5800, longitude: -7.5920 };
    const startTime = new Date(booking.start_time);
    
    // Calculate times (mock calculation)
    const leaveHomeTime = new Date(startTime.getTime() - 45 * 60 * 1000);
    const reachPickupTime = new Date(startTime.getTime() - 30 * 60 * 1000);
    const arriveDestinationTime = startTime;
    const routeCoordinates = [homeLocation, pickupLocation, destinationLocation];

    return {
      bookingId: booking.id,
      tripId: booking.id,
      studentId: booking.student_id,
      type: booking.type,
      status: booking.status,
      start_time: booking.start_time,
      end_time: booking.end_time,
      homeLocation,
      pickupLocation,
      destinationLocation,
      routeCoordinates,
      leaveHomeTime,
      reachPickupTime,
      arriveDestinationTime,
      totalDurationMinutes: 45,
      totalDistanceKm: 5.2,
    };
  };

  // Handle trip card press
  const handleTripCardPress = () => {
    if (activeBooking) {
      const tripData = convertBookingToTripData(activeBooking);
      setSelectedTrip(tripData);
      setShowTripDetails(true);
    }
  };

  // Show trip details screen
  if (showTripDetails && selectedTrip) {
    return (
      <TripDetailsScreen
        tripData={selectedTrip}
        language={language}
        onBack={() => {
          setShowTripDetails(false);
          setSelectedTrip(null);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <Header
        title={t.title}
        subtitle={activeBooking ? t.subtitle : t.noActiveTrip}
        language={language}
        studentId={studentId}
        isDemo={isDemo}
        showNotifications={false}
      />

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3185FC" />
          <Text style={[styles.loadingText, isRTL && styles.rtl]}>
            {t.loading}
          </Text>
        </View>
      ) : activeBooking ? (
        // Active Trip State - Show Trip Card
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
          <TripCard
            tripData={activeBooking}
            language={language}
            onPress={handleTripCardPress}
            homeLocation={homeLocation}
            schoolLocation={schoolLocation}
          />

          {/* Book Another Ride Button */}
          <TouchableOpacity
            style={[styles.bookAnotherButton, isRTL && styles.bookAnotherButtonRTL]}
            onPress={() => setShowBookingModal(true)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="add-circle-outline" size={24} color="#3185FC" />
            <Text style={[styles.bookAnotherText, isRTL && styles.rtl]}>
              {t.bookAnotherRide}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        // No Active Trip State - Show Empty State with Book Button
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.emptyContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3185FC"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MaterialIcons name="directions-car" size={64} color="#E5E7EB" />
            </View>
            <Text style={[styles.emptyTitle, isRTL && styles.rtl]}>
              {t.noActiveTrip}
            </Text>
            <Text style={[styles.emptySubtitle, isRTL && styles.rtl]}>
              {language === 'ar'
                ? 'ابدأ بحجز رحلة جديدة'
                : 'Start by booking a new ride'}
            </Text>
            <TouchableOpacity
              style={styles.bookButton}
              onPress={() => setShowBookingModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.bookButtonText}>{t.bookAnotherRide}</Text>
              <MaterialIcons
                name="arrow-forward"
                size={20}
                color="#FFFFFF"
                style={styles.bookButtonIcon}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Booking Modal */}
      <BookingModal
        visible={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        studentId={studentId}
        language={language}
        onBookingSuccess={handleBookingSuccess}
        isDemo={isDemo}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 32,
    textAlign: 'center',
  },
  bookButton: {
    backgroundColor: '#3185FC',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3185FC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  bookButtonIcon: {
    marginLeft: 8,
  },
  bookAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F7FF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 24,
    marginTop: 24,
    gap: 8,
    borderWidth: 2,
    borderColor: '#3185FC',
    borderStyle: 'dashed',
  },
  bookAnotherButtonRTL: {
    flexDirection: 'row-reverse',
  },
  bookAnotherText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3185FC',
  },
  rtl: {
    textAlign: 'right',
  },
});

export default StudentHomeScreen;
