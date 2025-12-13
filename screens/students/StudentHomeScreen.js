import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../../components/Header';
import BookingTypePicker from '../../components/BookingTypePicker';
import TimePicker from '../../components/TimePicker';
import { createBooking } from '../../src/services/bookingService';
import TripDetailsScreen from './TripDetailsScreen';

const translations = {
  en: {
    title: 'Book a Ride',
    subtitle: 'Schedule your pickup or dropoff',
    bookingType: 'Booking Type',
    startTime: 'Start Time',
    endTime: 'End Time',
    book: 'Book Ride',
    booking: 'Booking...',
    success: 'Booking Created',
    successMessage: 'Your ride has been booked successfully!',
    ok: 'OK',
    logout: 'Logout',
  },
  ar: {
    title: 'احجز رحلة',
    subtitle: 'حدد موعد استلامك أو توصيلك',
    bookingType: 'نوع الحجز',
    startTime: 'وقت البداية',
    endTime: 'وقت النهاية',
    book: 'احجز الرحلة',
    booking: 'جاري الحجز...',
    success: 'تم إنشاء الحجز',
    successMessage: 'تم حجز رحلتك بنجاح!',
    ok: 'حسناً',
    logout: 'تسجيل الخروج',
  },
};

const StudentHomeScreen = ({ studentId, isDemo = false, language = 'en' }) => {
  const [formData, setFormData] = useState({
    type: null,
    startTime: null,
    endTime: null,
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [showTripDetails, setShowTripDetails] = useState(false);
  const [generatedTrip, setGeneratedTrip] = useState(null);

  const t = translations[language];

  const handleTypeSelect = useCallback((type) => {
    setFormData((prev) => ({ ...prev, type }));
    setErrors((prev) => ({ ...prev, type: null }));
  }, []);

  const handleStartTimeSelect = useCallback((time) => {
    setFormData((prev) => ({ ...prev, startTime: time }));
    setErrors((prev) => ({ ...prev, startTime: null }));

    // Auto-adjust end time if it's before or equal to start time
    if (formData.endTime && time >= formData.endTime) {
      const newEndTime = new Date(time);
      newEndTime.setHours(newEndTime.getHours() + 1); // Add 1 hour default
      setFormData((prev) => ({ ...prev, endTime: newEndTime }));
    }
  }, [formData.endTime]);

  const handleEndTimeSelect = useCallback((time) => {
    setFormData((prev) => ({ ...prev, endTime: time }));
    setErrors((prev) => ({ ...prev, endTime: null }));
  }, []);

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    // Validate type
    if (!formData.type) {
      newErrors.type = language === 'ar' ? 'يرجى اختيار نوع الحجز' : 'Please select booking type';
      isValid = false;
    }

    // Validate start time
    if (!formData.startTime) {
      newErrors.startTime = language === 'ar' ? 'يرجى اختيار وقت البداية' : 'Please select start time';
      isValid = false;
    } else {
      const now = new Date();
      if (formData.startTime < now) {
        newErrors.startTime = language === 'ar' ? 'وقت البداية يجب أن يكون في المستقبل' : 'Start time must be in the future';
        isValid = false;
      }
    }

    // Validate end time
    if (!formData.endTime) {
      newErrors.endTime = language === 'ar' ? 'يرجى اختيار وقت النهاية' : 'Please select end time';
      isValid = false;
    } else if (formData.startTime && formData.endTime <= formData.startTime) {
      newErrors.endTime = language === 'ar' ? 'وقت النهاية يجب أن يكون بعد وقت البداية' : 'End time must be after start time';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleBook = async () => {
    // Mark all fields as touched
    Object.keys(formData).forEach((field) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
    });

    if (!validateForm()) {
      return;
    }

    // Demo mode: Show trip details with mock data
    if (isDemo) {
      const mockTripData = generateMockTripData(formData, studentId);
      setGeneratedTrip(mockTripData);
      setShowTripDetails(true);
      return;
    }

    setLoading(true);

    try {
      const result = await createBooking({
        studentId,
        type: formData.type,
        startTime: formData.startTime,
        endTime: formData.endTime,
      });

      if (result.error) {
        Alert.alert(
          language === 'ar' ? 'خطأ' : 'Error',
          result.error.message || (language === 'ar' ? 'فشل إنشاء الحجز' : 'Failed to create booking'),
          [{ text: language === 'ar' ? 'حسناً' : 'OK' }]
        );
      } else {
        // Generate trip data (mock for now - in production, this would come from trip generation service)
        const mockTripData = generateMockTripData(formData, studentId);
        setGeneratedTrip(mockTripData);
        setShowTripDetails(true);
        
        // Also call callback if provided
        if (onTripGenerated) {
          onTripGenerated(mockTripData);
        }
      }
    } catch (err) {
      console.error('Error creating booking:', err);
      Alert.alert(
        language === 'ar' ? 'خطأ' : 'Error',
        language === 'ar' ? 'حدث خطأ أثناء إنشاء الحجز' : 'An error occurred while creating booking',
        [{ text: language === 'ar' ? 'حسناً' : 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Get minimum date for end time (start time + 1 minute)
  const getMinEndTime = () => {
    if (!formData.startTime) return new Date();
    const minTime = new Date(formData.startTime);
    minTime.setMinutes(minTime.getMinutes() + 1);
    return minTime;
  };

  // Generate mock trip data (replace with actual trip generation service)
  const generateMockTripData = (bookingData, studentId) => {
    const now = new Date();
    const startTime = bookingData.startTime || new Date(now.getTime() + 30 * 60 * 1000);
    
    // Mock locations (in production, fetch from student and school data)
    const homeLocation = { latitude: 33.5731, longitude: -7.5898 }; // Casablanca
    const pickupLocation = { latitude: 33.5750, longitude: -7.5900 };
    const destinationLocation = { latitude: 33.5800, longitude: -7.5920 };

    // Calculate times (mock calculation)
    const leaveHomeTime = new Date(startTime.getTime() - 45 * 60 * 1000); // 45 min before
    const reachPickupTime = new Date(startTime.getTime() - 30 * 60 * 1000); // 30 min before
    const arriveDestinationTime = startTime;

    // Mock route coordinates
    const routeCoordinates = [homeLocation, pickupLocation, destinationLocation];

    return {
      bookingId: 'mock-booking-id',
      studentId,
      type: bookingData.type,
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

  // Show trip details screen
  if (showTripDetails && generatedTrip) {
    return (
      <TripDetailsScreen
        tripData={generatedTrip}
        language={language}
        onBack={() => {
          setShowTripDetails(false);
          // Reset form after viewing trip
          setFormData({ type: null, startTime: null, endTime: null });
          setErrors({});
          setTouched({});
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
        enabled={Platform.OS === 'ios'}
      >
          {/* Header */}
          <Header
            title={t.title}
            subtitle={t.subtitle}
            language={language}
            studentId={studentId}
            isDemo={isDemo}
          />

        {/* Booking Form */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formContainer}>
            {/* Booking Type */}
            <BookingTypePicker
              value={formData.type}
              onSelect={handleTypeSelect}
              language={language}
              error={touched.type && errors.type ? errors.type : null}
              disabled={loading}
            />

            {/* Start Time */}
            <TimePicker
              value={formData.startTime}
              onSelect={handleStartTimeSelect}
              label={t.startTime}
              language={language}
              error={touched.startTime && errors.startTime ? errors.startTime : null}
              disabled={loading}
              minimumDate={new Date()}
            />

            {/* End Time */}
            <TimePicker
              value={formData.endTime}
              onSelect={handleEndTimeSelect}
              label={t.endTime}
              language={language}
              error={touched.endTime && errors.endTime ? errors.endTime : null}
              disabled={loading}
              minimumDate={getMinEndTime()}
            />
          </View>

          {/* Book Button */}
          <TouchableOpacity
            style={[styles.bookButton, loading && styles.bookButtonDisabled]}
            onPress={handleBook}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.bookButtonText}>{t.book}</Text>
                <MaterialIcons
                  name="arrow-forward"
                  size={20}
                  color="#FFFFFF"
                  style={styles.bookButtonIcon}
                />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  formContainer: {
    marginTop: 32,
    marginBottom: 32,
  },
  bookButton: {
    backgroundColor: '#3185FC',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
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
  bookButtonDisabled: {
    opacity: 0.6,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  bookButtonIcon: {
    marginLeft: 8,
  },
});

export default StudentHomeScreen;

