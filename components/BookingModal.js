import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import BookingTypePicker from "./BookingTypePicker";
import DateTimePicker from "./DateTimePicker";
import { createBooking } from "../src/services/bookingService";
import { createDemoTripFromBooking } from "../src/data/demoData";

const translations = {
  en: {
    title: "Book a Ride",
    startTime: "Start Time",
    endTime: "End Time",
    book: "Book Ride",
    booking: "Booking...",
    cancel: "Cancel",
    success: "Booking Created",
    successMessage: "Your ride has been booked successfully!",
  },
  ar: {
    title: "احجز رحلة",
    startTime: "وقت البداية",
    endTime: "وقت النهاية",
    book: "احجز الرحلة",
    booking: "جاري الحجز...",
    cancel: "إلغاء",
    success: "تم إنشاء الحجز",
    successMessage: "تم حجز رحلتك بنجاح!",
  },
};

const BookingModal = ({
  visible,
  onClose,
  studentId,
  language = "en",
  onBookingSuccess,
  isDemo = false,
  schoolEntryTime = null,
  schoolExitTime = null,
}) => {
  const [formData, setFormData] = useState({
    type: "PICKUP",
    startTime: null,
    endTime: null,
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);

  const t = translations[language];
  const isRTL = language === "ar";

  useEffect(() => {
    if (visible) {
      setFormData((prev) => ({
        ...prev,
        type: prev.type || "PICKUP",
        startTime: prev.startTime || schoolEntryTime || null,
        endTime: prev.endTime || schoolExitTime || null,
      }));
    }
  }, [visible, schoolEntryTime, schoolExitTime]);

  const handleTypeSelect = useCallback((type) => {
    setFormData((prev) => ({ ...prev, type }));
    setErrors((prev) => ({ ...prev, type: null }));
  }, []);

  const handleStartTimeSelect = useCallback(
    (time) => {
      setFormData((prev) => ({ ...prev, startTime: time }));
      setErrors((prev) => ({ ...prev, startTime: null }));

      if (formData.endTime && time >= formData.endTime) {
        const newEndTime = new Date(time);
        newEndTime.setHours(newEndTime.getHours() + 1);
        setFormData((prev) => ({ ...prev, endTime: newEndTime }));
      }
    },
    [formData.endTime],
  );

  const handleEndTimeSelect = useCallback((time) => {
    setFormData((prev) => ({ ...prev, endTime: time }));
    setErrors((prev) => ({ ...prev, endTime: null }));
  }, []);

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!formData.startTime) {
      newErrors.startTime =
        language === "ar"
          ? "يرجى اختيار وقت البداية"
          : "Please select start time";
      isValid = false;
    } else {
      const now = new Date();
      if (formData.startTime < now) {
        newErrors.startTime =
          language === "ar"
            ? "وقت البداية يجب أن يكون في المستقبل"
            : "Start time must be in the future";
        isValid = false;
      }
    }

    if (!formData.endTime) {
      newErrors.endTime =
        language === "ar"
          ? "يرجى اختيار وقت النهاية"
          : "Please select end time";
      isValid = false;
    } else if (formData.startTime && formData.endTime <= formData.startTime) {
      newErrors.endTime =
        language === "ar"
          ? "وقت النهاية يجب أن يكون بعد وقت البداية"
          : "End time must be after start time";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const getMinEndTime = () => {
    if (!formData.startTime) return new Date();
    const minTime = new Date(formData.startTime);
    minTime.setMinutes(minTime.getMinutes() + 1);
    return minTime;
  };

  const handleBook = async () => {
    setTouched({
      type: true,
      startTime: true,
      endTime: true,
    });

    if (!validateForm()) {
      return;
    }

    if (isDemo) {
      // Demo mode: create demo trip from form data
      const demoBooking = {
        type: formData.type,
        startTime: formData.startTime,
        endTime: formData.endTime,
      };
      const demoTrip = createDemoTripFromBooking(demoBooking, studentId);

      resetForm();
      onClose();

      // Notify parent with demo trip data
      if (onBookingSuccess) {
        onBookingSuccess(demoTrip);
      }
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
          language === "ar" ? "خطأ" : "Error",
          result.error.message ||
            (language === "ar"
              ? "فشل إنشاء الحجز"
              : "Failed to create booking"),
          [{ text: language === "ar" ? "حسناً" : "OK" }],
        );
      } else {
        Alert.alert(t.success, t.successMessage, [
          {
            text: language === "ar" ? "حسناً" : "OK",
            onPress: () => {
              resetForm();
              onClose();
              if (onBookingSuccess) {
                onBookingSuccess(result.data);
              }
            },
          },
        ]);
      }
    } catch (err) {
      console.error("Error creating booking:", err);
      Alert.alert(
        language === "ar" ? "خطأ" : "Error",
        language === "ar"
          ? "حدث خطأ أثناء إنشاء الحجز"
          : "An error occurred while creating booking",
        [{ text: language === "ar" ? "حسناً" : "OK" }],
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: "PICKUP",
      startTime: schoolEntryTime || null,
      endTime: schoolExitTime || null,
    });
    setErrors({});
    setTouched({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.modalContainer} edges={["bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={[styles.header, isRTL && styles.headerRTL]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={isRTL ? "arrow-forward" : "arrow-back"}
                size={24}
                color="#1A1A1A"
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, isRTL && styles.rtl]}>
              {t.title}
            </Text>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={24} color="#666666" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            {/* Booking Type Selection */}
            <View style={styles.bookingTypeSection}>
              <BookingTypePicker
                value={formData.type}
                onSelect={handleTypeSelect}
                language={language}
                error={touched.type && errors.type ? errors.type : null}
                disabled={loading}
              />
            </View>

            {/* Time Selection Section */}
            <View style={styles.timeSection}>
              <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>
                {language === "ar" ? "اختر الوقت" : "Select Time"}
              </Text>

              <DateTimePicker
                value={formData.startTime}
                onSelect={handleStartTimeSelect}
                label={t.startTime}
                language={language}
                error={
                  touched.startTime && errors.startTime
                    ? errors.startTime
                    : null
                }
                disabled={loading}
                minimumDate={new Date()}
              />

              <DateTimePicker
                value={formData.endTime}
                onSelect={handleEndTimeSelect}
                label={t.endTime}
                language={language}
                error={
                  touched.endTime && errors.endTime ? errors.endTime : null
                }
                disabled={loading}
                minimumDate={getMinEndTime()}
              />
            </View>
          </ScrollView>

          {/* Book Button */}
          <View style={styles.buttonContainer}>
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
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 8 : 12,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerRTL: {
    flexDirection: "row-reverse",
  },
  closeButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    flex: 1,
    textAlign: "center",
  },
  cancelButton: {
    padding: 8,
    marginRight: -8,
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 100,
  },
  bookingTypeSection: {
    marginBottom: 24,
  },
  timeSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  bookButton: {
    backgroundColor: "#3185FC",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3185FC",
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
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  bookButtonIcon: {
    marginLeft: 8,
  },
  rtl: {
    textAlign: "right",
  },
});

export default BookingModal;
