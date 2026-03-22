import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { UbuntuFonts } from "../../shared/utils/fonts";
import { supabase } from "../../lib/supabase";

const translations = {
  en: {
    title: "Vehicle Information",
    subtitle: "Tell us about your vehicle",
    carType: "Car Type",
    carTypePlaceholder: "Sedan",
    plateNumber: "Plate Number",
    plateNumberPlaceholder: "ABC-123",
    seatCapacity: "Seat Capacity",
    seatCapacityPlaceholder: "4",
    locationAddress: "Driver Location",
    locationAddressPlaceholder: "Enter your current location",
    register: "Register",
    loadingLocation: "Fetching current location...",
  },
  ar: {
    title: "معلومات المركبة",
    subtitle: "أخبرنا عن مركبتك",
    carType: "نوع السيارة",
    carTypePlaceholder: "سيدان",
    plateNumber: "رقم اللوحة",
    plateNumberPlaceholder: "ABC-123",
    seatCapacity: "عدد المقاعد",
    seatCapacityPlaceholder: "4",
    locationAddress: "موقع السائق",
    locationAddressPlaceholder: "أدخل موقعك الحالي",
    register: "تسجيل",
    loadingLocation: "جاري تحديد موقعك...",
  },
};

const InputField = ({
  label,
  placeholder,
  icon,
  value,
  onChangeText,
  onFocus,
  onBlur,
  isFocused,
  hasError,
  language,
  keyboardType = "default",
  autoCapitalize = "none",
}) => (
  <View style={styles.inputGroup}>
    <Text
      style={[
        styles.label,
        isFocused && styles.labelFocused,
        hasError && styles.labelError,
        language === "ar" && styles.rtlText,
      ]}
    >
      {label}
    </Text>
    <View
      style={[
        styles.inputWrapper,
        isFocused && styles.inputWrapperFocused,
        hasError && styles.inputWrapperError,
        language === "ar" && styles.rtlRow,
      ]}
    >
      <MaterialIcons
        name={icon}
        size={20}
        color={hasError ? "#EF4444" : isFocused ? "#3185FC" : "#94A3B8"}
        style={styles.inputIcon}
      />
      <TextInput
        style={[styles.input, language === "ar" && styles.rtlText]}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
    {hasError ? <Text style={styles.errorText}>{hasError}</Text> : null}
  </View>
);

const DriverVehicleScreen = ({
  language = "en",
  onBack,
  onLanguageChange,
  route,
  onSuccess,
}) => {
  const t = translations[language] || translations.en;
  const params = route?.params || {};
  const [activeField, setActiveField] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [bannerError, setBannerError] = useState("");
  const [locationLat, setLocationLat] = useState(null);
  const [locationLng, setLocationLng] = useState(null);
  const [formData, setFormData] = useState({
    car_type: "",
    car_plate_number: "",
    seat_capacity: "",
    location_address: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let mounted = true;

    const loadLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const coords = await Location.getCurrentPositionAsync({});
          const geo = await Location.reverseGeocodeAsync(coords.coords);
          if (!mounted) return;

          const firstGeo = geo?.[0];
          const address = [firstGeo?.street, firstGeo?.city]
            .filter(Boolean)
            .join(", ");

          setFormData((prev) => ({
            ...prev,
            location_address: address || prev.location_address,
          }));
          setLocationLat(coords.coords.latitude);
          setLocationLng(coords.coords.longitude);
        }
      } catch (error) {
        if (mounted) {
          setLocationLat(null);
          setLocationLng(null);
        }
      } finally {
        if (mounted) {
          setLoadingLocation(false);
        }
      }
    };

    loadLocation();

    return () => {
      mounted = false;
    };
  }, []);

  const validateField = (field, source = formData) => {
    const value = source[field] || "";

    switch (field) {
      case "car_type":
        return value.trim()
          ? null
          : language === "ar"
            ? "نوع السيارة مطلوب"
            : "Car type is required";
      case "car_plate_number":
        return value.trim()
          ? null
          : language === "ar"
            ? "رقم اللوحة مطلوب"
            : "Plate number is required";
      case "seat_capacity": {
        if (!value.trim()) {
          return language === "ar"
            ? "عدد المقاعد مطلوب"
            : "Seat capacity is required";
        }
        const parsed = parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          return language === "ar"
            ? "عدد المقاعد يجب أن يكون رقماً صحيحاً أكبر من 0"
            : "Seat capacity must be an integer greater than 0";
        }
        return null;
      }
      case "location_address":
        return value.trim()
          ? null
          : language === "ar"
            ? "الموقع مطلوب"
            : "Location is required";
      default:
        return null;
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setBannerError("");
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleRegister = async () => {
    const nextErrors = {};

    Object.keys(formData).forEach((field) => {
      const error = validateField(field, formData);
      if (error) nextErrors[field] = error;
    });

    setErrors(nextErrors);
    setBannerError("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: params.password,
      });

      if (error) {
        setBannerError(error.message);
        return;
      }

      const userId = data?.user?.id;

      if (!userId) {
        setBannerError(
          language === "ar"
            ? "تعذر إنشاء حساب المستخدم"
            : "Unable to create auth user",
        );
        return;
      }

      const { data: driverRecord, error: dbError } = await supabase
        .from("drivers")
        .insert({
          user_id: userId,
          full_name: params.full_name,
          email: params.email,
          phone_number: params.phone_number,
          car_type: formData.car_type.trim(),
          car_plate_number: formData.car_plate_number.trim().toUpperCase(),
          seat_capacity: parseInt(formData.seat_capacity, 10),
          location_address: formData.location_address.trim(),
          location_lat: locationLat,
          location_lng: locationLng,
        })
        .select()
        .single();

      if (dbError) {
        setBannerError(dbError.message);
        return;
      }

      if (onSuccess) {
        onSuccess({ driverId: driverRecord?.id, email: params.email });
      }
    } catch (error) {
      setBannerError(
        error?.message ||
          (language === "ar"
            ? "حدث خطأ غير متوقع"
            : "An unexpected error occurred"),
      );
    } finally {
      setLoading(false);
    }
  };

  const isRegisterDisabled = useMemo(
    () =>
      loading ||
      !formData.car_type ||
      !formData.car_plate_number ||
      !formData.seat_capacity ||
      !formData.location_address,
    [formData, loading],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#1A1A1A" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.languagePill}
          onPress={() =>
            onLanguageChange &&
            onLanguageChange(language === "en" ? "ar" : "en")
          }
        >
          <Text style={styles.languagePillText}>
            {language === "en" ? "العربية" : "English"}
          </Text>
          <Text style={styles.languagePillFlag}>
            {language === "en" ? "🇲🇦" : "🇬🇧"}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <Text
                style={[styles.stepInfo, language === "ar" && styles.rtlText]}
              >
                2 / 2
              </Text>
              <Text
                style={[styles.stepTitle, language === "ar" && styles.rtlText]}
              >
                {t.title}
              </Text>
              <Text
                style={[
                  styles.stepSubtitle,
                  language === "ar" && styles.rtlText,
                ]}
              >
                {t.subtitle}
              </Text>
            </View>

            {bannerError ? (
              <View
                style={[
                  styles.inputWrapper,
                  styles.inputWrapperError,
                  {
                    height: "auto",
                    minHeight: 56,
                    marginBottom: 20,
                    alignItems: "flex-start",
                    paddingVertical: 16,
                  },
                ]}
              >
                <Text
                  style={[styles.errorText, { marginTop: 0, marginLeft: 0 }]}
                >
                  {bannerError}
                </Text>
              </View>
            ) : null}

            <View style={styles.formCard}>
              <InputField
                label={t.carType}
                placeholder={t.carTypePlaceholder}
                icon="directions-car"
                value={formData.car_type}
                onChangeText={(value) => handleChange("car_type", value)}
                onFocus={() => setActiveField("car_type")}
                onBlur={() => {
                  setActiveField(null);
                  setErrors((prev) => ({
                    ...prev,
                    car_type: validateField("car_type"),
                  }));
                }}
                isFocused={activeField === "car_type"}
                hasError={errors.car_type}
                language={language}
              />

              <InputField
                label={t.plateNumber}
                placeholder={t.plateNumberPlaceholder}
                icon="pin"
                value={formData.car_plate_number}
                onChangeText={(value) =>
                  handleChange("car_plate_number", value)
                }
                onFocus={() => setActiveField("car_plate_number")}
                onBlur={() => {
                  setActiveField(null);
                  setErrors((prev) => ({
                    ...prev,
                    car_plate_number: validateField("car_plate_number"),
                  }));
                }}
                isFocused={activeField === "car_plate_number"}
                hasError={errors.car_plate_number}
                language={language}
                autoCapitalize="characters"
              />

              <InputField
                label={t.seatCapacity}
                placeholder={t.seatCapacityPlaceholder}
                icon="event-seat"
                value={formData.seat_capacity}
                onChangeText={(value) => handleChange("seat_capacity", value)}
                onFocus={() => setActiveField("seat_capacity")}
                onBlur={() => {
                  setActiveField(null);
                  setErrors((prev) => ({
                    ...prev,
                    seat_capacity: validateField("seat_capacity"),
                  }));
                }}
                isFocused={activeField === "seat_capacity"}
                hasError={errors.seat_capacity}
                language={language}
                keyboardType="numeric"
              />

              <InputField
                label={t.locationAddress}
                placeholder={t.locationAddressPlaceholder}
                icon="location-on"
                value={formData.location_address}
                onChangeText={(value) =>
                  handleChange("location_address", value)
                }
                onFocus={() => setActiveField("location_address")}
                onBlur={() => {
                  setActiveField(null);
                  setErrors((prev) => ({
                    ...prev,
                    location_address: validateField("location_address"),
                  }));
                }}
                isFocused={activeField === "location_address"}
                hasError={errors.location_address}
                language={language}
              />

              {loadingLocation ? (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <ActivityIndicator size="small" color="#3185FC" />
                  <Text style={styles.label}>{t.loadingLocation}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>

        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              isRegisterDisabled && styles.nextButtonDisabled,
            ]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>{t.register}</Text>
                <MaterialIcons name="check" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardView: {
    flex: 1,
  },
  navHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  languagePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  languagePillText: {
    fontSize: 13,
    color: "#475569",
    fontFamily: UbuntuFonts.medium,
  },
  languagePillFlag: {
    fontSize: 16,
  },
  stepContainer: {
    flex: 1,
  },
  stepHeader: {
    paddingHorizontal: 28,
    marginBottom: 32,
    marginTop: 10,
  },
  stepInfo: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: UbuntuFonts.medium,
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 28,
    color: "#1A1A1A",
    fontFamily: UbuntuFonts.bold,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: "#64748B",
    fontFamily: UbuntuFonts.regular,
    lineHeight: 22,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  formCard: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: UbuntuFonts.medium,
    marginBottom: 8,
    marginLeft: 4,
  },
  labelFocused: {
    color: "#3185FC",
  },
  labelError: {
    color: "#EF4444",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFF",
    borderWidth: 1.5,
    borderColor: "#EBF2FF",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputWrapperFocused: {
    borderColor: "#3185FC",
    backgroundColor: "#FFFFFF",
    shadowColor: "#3185FC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputWrapperError: {
    borderColor: "#EF4444",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1A1A1A",
    fontFamily: UbuntuFonts.medium,
    height: "100%",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 6,
    marginLeft: 4,
    fontFamily: UbuntuFonts.regular,
  },
  navigationContainer: {
    flexDirection: "row",
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  nextButton: {
    flex: 1,
    backgroundColor: "#3185FC",
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#3185FC",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  nextButtonDisabled: {
    backgroundColor: "#E2E8F0",
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: UbuntuFonts.bold,
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
  rtlText: {
    textAlign: "right",
  },
});

export default DriverVehicleScreen;
