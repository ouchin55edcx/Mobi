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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { UbuntuFonts } from "../../shared/utils/fonts";
import { supabase } from "../../lib/supabase";
import MapLocationPicker from "../../shared/components/common/MapLocationPicker";

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

const VehicleTypePicker = ({ value, onSelect, language, error }) => {
  const types = [
    { id: "sedan", name: "Sedan", nameAr: "سيدان" },
    { id: "suv", name: "SUV", nameAr: "سيارة رياضية" },
    { id: "hatchback", name: "Hatchback", nameAr: "هاتشباك" },
    { id: "van", name: "Van", nameAr: "فان" },
    { id: "minivan", name: "Minivan", nameAr: "ميني فان" },
    { id: "other", name: "Other", nameAr: "أخرى" },
  ];
  const [isExpanded, setIsExpanded] = useState(false);
  const t = translations[language] || translations.en;

  return (
    <View style={styles.inputGroup}>
      <Text
        style={[
          styles.label,
          isExpanded && styles.labelFocused,
          error && styles.labelError,
          language === "ar" && styles.rtlText,
        ]}
      >
        {t.carType}
      </Text>
      <TouchableOpacity
        style={[
          styles.inputWrapper,
          isExpanded && styles.inputWrapperFocused,
          error && styles.inputWrapperError,
          language === "ar" && styles.rtlRow,
        ]}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="directions-car"
          size={20}
          color={error ? "#EF4444" : isExpanded ? "#3185FC" : "#94A3B8"}
          style={styles.inputIcon}
        />
        <Text
          style={[
            styles.input,
            !value && { color: "#94A3B8" },
            language === "ar" && styles.rtlText,
            { textAlignVertical: "center", lineHeight: 54 },
          ]}
        >
          {value
            ? types.find((t) => t.id === value || t.name === value)?.[
                language === "ar" ? "nameAr" : "name"
              ] || value
            : t.carTypePlaceholder}
        </Text>
        <MaterialIcons
          name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
          size={24}
          color="#94A3B8"
        />
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.dropdownContainer}>
          {types.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[styles.optionItem, language === "ar" && styles.rtlRow]}
              onPress={() => {
                onSelect(type.name);
                setIsExpanded(false);
              }}
            >
              <Text
                style={[
                  styles.optionText,
                  language === "ar" && styles.rtlText,
                  value === type.name && styles.optionTextActive,
                ]}
              >
                {language === "ar" ? type.nameAr : type.name}
              </Text>
              {value === type.name && (
                <MaterialIcons name="check" size={18} color="#3185FC" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const DriverVehicleScreen = ({
  language = "en",
  onBack,
  onLanguageChange,
  params = {},
  onSuccess,
}) => {
  const t = translations[language] || translations.en;
  // params are now received directly as a prop
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
            city: firstGeo?.city || prev.city || "",
            location_coords: {
              latitude: coords.coords.latitude,
              longitude: coords.coords.longitude,
            }
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
      case "location_coords":
        return value
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
    console.log("[DriverRegister] Starting registration process...");
    console.log("[DriverRegister] Step 1 Data:", params);
    console.log("[DriverRegister] Step 2 Data:", formData);

    const nextErrors = {};

    Object.keys(formData).forEach((field) => {
      const error = validateField(field, formData);
      if (error) nextErrors[field] = error;
    });

    setErrors(nextErrors);
    setBannerError("");

    if (Object.keys(nextErrors).length > 0) {
      console.log("[DriverRegister] Validation failed:", nextErrors);
      return;
    }

    setLoading(true);

    try {
      // Auto-generate password: plate number + last 4 digits of phone
      const generatedPassword = (formData.car_plate_number || "").toUpperCase().trim() + (params.phone_number || "").slice(-4);
      console.log("[DriverRegister] Generated Password for Auth:", generatedPassword);

      console.log("[DriverRegister] Attempting Supabase Auth SignUp for:", params.email);
      const { data, error } = await supabase.auth.signUp({
        email: params.email,
        password: generatedPassword,
      });

      if (error) {
        // Rate limit — account may already exist from a previous attempt
        if (error.message?.toLowerCase().includes("rate limit")) {
          console.warn("[DriverRegister] SignUp rate limit — falling back to signIn");

          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({
              email: params.email.toLowerCase().trim(),
              password: generatedPassword,
            });

          if (signInError || !signInData?.user?.id) {
            console.error("[DriverRegister] Fallback SignIn failed:", signInError);
            setBannerError(
              language === "ar"
                ? "تعذر إنشاء الحساب بسبب محاولات كثيرة. يرجى الانتظار بضع دقائق وإعادة المحاولة."
                : "Too many attempts. Please wait a few minutes and try again."
            );
            return;
          }

          data.user = signInData.user;
          data.session = signInData.session;
          console.log("[DriverRegister] Signed in via fallback.");
        } else {
          console.error("[DriverRegister] Auth SignUp Error:", error);
          setBannerError(error.message);
          return;
        }
      }

      const userId = data?.user?.id;
      console.log("[DriverRegister] Auth Success! User ID:", userId);

      if (!userId) {
        setBannerError(
          language === "ar"
            ? "تعذر إنشاء حساب المستخدم"
            : "Unable to create auth user",
        );
        return;
      }

      // 1. Ensure user exists in public.users (fallback for trigger delay/failure)
      console.log("[DriverRegister] Checking public.users for sync...");
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (!userData) {
        console.log("[DriverRegister] User not found in public.users, inserting manually...");
        const { error: userInsertError } = await supabase
          .from("users")
          .insert({
            id: userId,
            email: params.email.toLowerCase().trim(),
            fullname: params.full_name.trim(),
            role: "driver",
          });

        if (userInsertError && !userInsertError.message?.includes("duplicate")) {
          console.error("[DriverRegister] public.users insert error:", userInsertError);
          setBannerError(userInsertError.message);
          return;
        }
        console.log("[DriverRegister] public.users sync complete.");
      }

      console.log("[DriverRegister] Inserting into public.drivers table...");

      const { data: driverRecord, error: dbError } = await supabase
        .from("drivers")
        .insert({
          user_id: userId,
          fullname: params.full_name,
          email: params.email,
          city: formData.city || null,
          location: {
            address: formData.location_address,
            latitude: locationLat,
            longitude: locationLng,
            phone_number: params.phone_number,
            car_type: formData.car_type.trim(),
            car_plate_number: formData.car_plate_number.trim().toUpperCase(),
            seat_capacity: parseInt(formData.seat_capacity, 10),
          },
          status: 'PENDING'
        })
        .select()
        .single();

      if (dbError) {
        console.error("[DriverRegister] Drivers table entry error:", dbError);
        setBannerError(dbError.message);
        return;
      }

      console.log("[DriverRegister] Driver registration successful! Record ID:", driverRecord.id);

      // Persist driver identity locally for session restoration on app restart
      await AsyncStorage.setItem("@registered_driver_email", params.email);
      await AsyncStorage.setItem("@registered_driver_id", driverRecord.id);

      if (onSuccess) {
        onSuccess({ driverId: driverRecord?.id, email: params.email });
      }
    } catch (error) {
      console.error("[DriverRegister] Unexpected crash during registration:", error);
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
      !formData.location_coords,
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
              <VehicleTypePicker
                value={formData.car_type}
                onSelect={(value) => handleChange("car_type", value)}
                language={language}
                error={errors.car_type}
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

              <MapLocationPicker
                value={formData.location_coords}
                onSelect={(loc) => {
                  setFormData((prev) => ({
                    ...prev,
                    location_coords: loc,
                    location_address: loc.address || prev.location_address,
                  }));
                  setLocationLat(loc.latitude);
                  setLocationLng(loc.longitude);
                  setErrors((prev) => ({ ...prev, location_coords: null }));
                }}
                language={language}
                error={errors.location_coords}
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
  dropdownContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#EBF2FF",
    marginTop: 8,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 15,
    color: "#64748B",
    fontFamily: UbuntuFonts.medium,
  },
  optionTextActive: {
    color: "#1A1A1A",
  },
});

export default DriverVehicleScreen;
