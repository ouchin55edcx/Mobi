import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabase";
import { UbuntuFonts } from "../../shared/utils/fonts";

const translations = {
  en: {
    step1Title: "Personal Info",
    step1Subtitle: "Basic details to identify you as a driver.",
    step2Title: "Vehicle Details",
    step2Subtitle: "Tell us about your bus.",
    step3Title: "Verify Email",
    step3Subtitle: "Enter the 8-digit code sent to your email.",
    fullName: "Full Name",
    fullNamePlaceholder: "John Doe",
    email: "Email Address",
    emailPlaceholder: "john.doe@example.com",
    city: "City",
    cityPlaceholder: "Casablanca",
    permis: "Driving License",
    permisHint: "Upload photo of your permis de conduire",
    busType: "Bus Type",
    busTypePlaceholder: "e.g. Minibus, Coach",
    capacity: "Capacity",
    capacityPlaceholder: "20",
    plateNumber: "Plate Number",
    plateNumberPlaceholder: "12345-A-5",
    carteGrise: "Carte Grise",
    carteGriseHint: "Upload vehicle registration document",
    next: "Continue",
    previous: "Back",
    registering: "Creating account...",
    verifying: "Verifying...",
    verify: "Verify Code",
    resend: "Resend Code",
    resendCooldown: "Resend in",
    of: "of",
    step: "Step",
  },
  ar: {
    step1Title: "المعلومات الشخصية",
    step1Subtitle: "تفاصيل أساسية للتعرف عليك كسائق.",
    step2Title: "تفاصيل المركبة",
    step2Subtitle: "أخبرنا عن حافلتك.",
    step3Title: "تحقق من البريد",
    step3Subtitle: "أدخل الرمز المكون من 8 أرقام المرسل إلى بريدك.",
    fullName: "الاسم الكامل",
    fullNamePlaceholder: "محمد أحمد",
    email: "البريد الإلكتروني",
    emailPlaceholder: "mohammed@example.com",
    city: "المدينة",
    cityPlaceholder: "الدار البيضاء",
    permis: "رخصة القيادة",
    permisHint: "قم بتحميل صورة من رخصة القيادة",
    busType: "نوع الحافلة",
    busTypePlaceholder: "مثال: حافلة صغيرة",
    capacity: "السعة",
    capacityPlaceholder: "20",
    plateNumber: "رقم اللوحة",
    plateNumberPlaceholder: "12345-A-5",
    carteGrise: "بطاقة الرمادية",
    carteGriseHint: "قم بتحميل وثيقة تسجيل المركبة",
    next: "متابعة",
    previous: "رجوع",
    registering: "جاري إنشاء الحساب...",
    verifying: "جاري التحقق...",
    verify: "تحقق من الرمز",
    resend: "إعادة إرسال",
    resendCooldown: "إعادة الإرسال في",
    of: "من",
    step: "خطوة",
  },
};

const InputField = ({
  label,
  placeholder,
  icon,
  keyboardType = "default",
  autoCapitalize = "none",
  value,
  hasError,
  language,
  onChangeText,
  isFocused,
  onFocus,
  onBlur,
}) => (
  <View style={styles.inputGroup}>
    <Text
      style={[
        styles.label,
        isFocused && styles.labelFocused,
        hasError && styles.labelError,
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
    {hasError && <Text style={styles.errorText}>{hasError}</Text>}
  </View>
);

const DocumentPicker = ({ label, hint, icon, fileName, onPick, hasError }) => (
  <View style={styles.inputGroup}>
    <Text style={[styles.label, hasError && styles.labelError]}>{label}</Text>
    <TouchableOpacity
      style={[styles.docPicker, hasError && styles.inputWrapperError]}
      onPress={onPick}
      activeOpacity={0.7}
    >
      <MaterialIcons
        name={icon}
        size={24}
        color={fileName ? "#3185FC" : "#94A3B8"}
      />
      <Text
        style={[styles.docPickerText, fileName && styles.docPickerTextFilled]}
      >
        {fileName || hint}
      </Text>
      {fileName && (
        <MaterialIcons name="check-circle" size={20} color="#10B981" />
      )}
    </TouchableOpacity>
  </View>
);

const DriverRegisterScreen = ({
  language = "en",
  onBack,
  onSuccess,
  onLanguageChange,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    city: "",
    location: null,
    permisFileName: null,
    busType: "",
    capacity: "",
    plateNumber: "",
    carteGriseFileName: null,
  });
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [activeField, setActiveField] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeInputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const restorePending = async () => {
      try {
        const stored = await AsyncStorage.getItem(
          "@pending_driver_registration",
        );
        if (stored) {
          const data = JSON.parse(stored);
          if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
            console.log("Restoring pending driver registration:", data.email);
            setFormData({
              fullname: data.fullname || "",
              email: data.email || "",
              city: data.city || "",
              location: data.location || null,
              permisFileName: data.permisFileName || null,
              busType: data.busType || "",
              capacity: data.capacity || "",
              plateNumber: data.plateNumber || "",
              carteGriseFileName: data.carteGriseFileName || null,
            });
            setCurrentStep(3);
          } else {
            await AsyncStorage.removeItem("@pending_driver_registration");
          }
        }
      } catch (e) {
        console.error("Restore error:", e);
      }
    };
    restorePending();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  const t = translations[language];
  const totalSteps = 3;

  const handleInputChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  }, []);

  const validateField = useCallback(
    (field) => {
      let error = null;
      if (field === "fullname" && !formData.fullname.trim())
        error = language === "ar" ? "الاسم مطلوب" : "Full name is required";
      else if (
        field === "fullname" &&
        formData.fullname.trim().split(/\s+/).length < 2
      )
        error = language === "ar" ? "أدخل الاسم الكامل" : "Enter full name";
      else if (field === "email" && !formData.email.trim())
        error = language === "ar" ? "البريد مطلوب" : "Email is required";
      else if (
        field === "email" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
      )
        error = language === "ar" ? "بريد غير صحيح" : "Invalid email";
      else if (field === "city" && !formData.city.trim())
        error = language === "ar" ? "المدينة مطلوبة" : "City is required";
      else if (field === "busType" && !formData.busType.trim())
        error =
          language === "ar" ? "نوع الحافلة مطلوب" : "Bus type is required";
      else if (field === "capacity" && !formData.capacity)
        error = language === "ar" ? "السعة مطلوبة" : "Capacity is required";
      else if (field === "capacity" && parseInt(formData.capacity) < 7)
        error = language === "ar" ? "الحد الأدنى 7 مقاعد" : "Minimum 7 seats";
      else if (field === "plateNumber" && !formData.plateNumber.trim())
        error =
          language === "ar" ? "رقم اللوحة مطلوب" : "Plate number is required";
      setErrors((prev) => ({ ...prev, [field]: error }));
      return !error;
    },
    [formData, language],
  );

  const handleNext = () => {
    const fields = {
      1: ["fullname", "email", "city"],
      2: ["busType", "capacity", "plateNumber"],
    };
    let isValid = true;
    fields[currentStep]?.forEach((f) => {
      setTouched((p) => ({ ...p, [f]: true }));
      if (!validateField(f)) isValid = false;
    });
    if (isValid && currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const handleGetLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Error", "Location permission denied");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setFormData((prev) => ({
        ...prev,
        location: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        },
      }));
      Alert.alert(
        "Success",
        language === "ar" ? "تم تحديد موقعك" : "Location captured",
      );
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const handlePickDocument = (field) =>
    setFormData((prev) => ({ ...prev, [field]: `document_${Date.now()}.pdf` }));

  const handleRegister = async () => {
    console.log("Driver registration — creating account...");
    setIsLoading(true);
    try {
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.toLowerCase().trim(),
        password: formData.plateNumber.trim(),
        options: {
          data: {
            fullname: formData.fullname.trim(),
            city: formData.city.trim(),
            location: formData.location,
            permis_file: formData.permisFileName,
            bus_type: formData.busType.trim(),
            capacity: parseInt(formData.capacity),
            plate_number: formData.plateNumber.trim(),
            carte_grise_file: formData.carteGriseFileName,
          },
        },
      });

      if (authError) {
        if (authError.message?.toLowerCase().includes("rate limit")) {
          if (__DEV__) console.warn("Rate limit hit");
          setCurrentStep(3);
          return;
        }
        Alert.alert(language === "ar" ? "خطأ" : "Error", authError.message);
        return;
      }

      const userId = authData?.user?.id;
      if (!userId) {
        Alert.alert("Error", "Failed to create account. Please try again.");
        return;
      }
      console.log("Auth user created:", userId);

      // Step 2: Wait for auth commit, then insert driver
      await new Promise((r) => setTimeout(r, 500));

      const { data: driver, error: driverError } = await supabase
        .from("drivers")
        .insert({
          user_id: userId,
          fullname: formData.fullname.trim(),
          email: formData.email.toLowerCase().trim(),
          city: formData.city.trim(),
          location: formData.location,
          permis_url: formData.permisFileName,
          status: "PENDING",
        })
        .select("id")
        .single();

      if (driverError) {
        console.error("Driver insert error:", driverError);
        Alert.alert(language === "ar" ? "خطأ" : "Error", driverError.message);
        return;
      }
      console.log("Driver record created:", driver.id);

      // Step 3: Insert bus
      const { error: busError } = await supabase.from("buses").insert({
        driver_id: driver.id,
        bus_type: formData.busType.trim(),
        capacity: parseInt(formData.capacity),
        plate_number: formData.plateNumber.trim(),
        carte_grise_url: formData.carteGriseFileName,
      });

      if (busError) {
        console.error("Bus insert error:", busError);
        Alert.alert(language === "ar" ? "خطأ" : "Error", busError.message);
        return;
      }
      console.log("Bus record created");

      // Step 4: Send OTP
      await supabase.auth.signInWithOtp({
        email: formData.email.toLowerCase().trim(),
        options: { shouldCreateUser: false },
      });
      console.log("✅ Account created! OTP email sent.");

      await AsyncStorage.setItem(
        "@pending_driver_registration",
        JSON.stringify({
          ...formData,
          email: formData.email.toLowerCase().trim(),
          driverId: driver.id,
          timestamp: Date.now(),
        }),
      );
      setCurrentStep(3);
    } catch (e) {
      console.error("Registration error:", e);
      Alert.alert(language === "ar" ? "خطأ" : "Error", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.length < 8) {
      Alert.alert(
        language === "ar" ? "رمز ناقص" : "Incomplete code",
        language === "ar" ? "أدخل 8 أرقام" : "Please enter all 8 digits.",
      );
      return;
    }
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: formData.email.toLowerCase().trim(),
        token: code,
        type: "email",
      });
      if (error) {
        Alert.alert(
          language === "ar" ? "رمز خاطئ" : "Invalid code",
          "The code is incorrect or expired.",
        );
        setCode("");
        codeInputRef.current?.focus();
        return;
      }
      console.log("✅ Email verified!");
      await AsyncStorage.removeItem("@pending_driver_registration");
      if (onSuccess)
        onSuccess({
          driverId: data.user.id,
          email: data.user.email,
          isDriver: true,
        });
    } catch (e) {
      console.error("Verification error:", e);
      Alert.alert("Error", e.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    await supabase.auth.signInWithOtp({
      email: formData.email,
      options: { shouldCreateUser: false },
    });
    setIsResending(false);
    setCooldown(60);
    setCode("");
    codeInputRef.current?.focus();
  };

  const StepCircle = ({ step }) => (
    <View
      style={[
        styles.stepCircle,
        currentStep >= step && styles.stepCircleActive,
      ]}
    >
      {currentStep > step ? (
        <MaterialIcons name="check" size={14} color="#FFF" />
      ) : (
        <Text
          style={[
            styles.stepCircleText,
            currentStep >= step && styles.stepCircleTextActive,
          ]}
        >
          {step}
        </Text>
      )}
    </View>
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
          onPress={() => onLanguageChange?.(language === "en" ? "ar" : "en")}
        >
          <Text style={styles.languagePillText}>
            {language === "en" ? "العربية" : "English"}
          </Text>
          <Text style={styles.languagePillFlag}>
            {language === "en" ? "🇲🇦" : "🇬"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.stepIndicator}>
          <StepCircle step={1} />
          <View
            style={[styles.stepLine, currentStep > 1 && styles.stepLineActive]}
          />
          <StepCircle step={2} />
          <View
            style={[styles.stepLine, currentStep > 2 && styles.stepLineActive]}
          />
          <StepCircle step={3} />
        </View>
        <Text style={styles.stepInfo}>
          {t.step} {currentStep} {t.of} {totalSteps}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex1}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <View style={styles.titleSection}>
              <Text style={[styles.title, language === "ar" && styles.rtlText]}>
                {t[`step${currentStep}Title`]}
              </Text>
              <Text
                style={[styles.subtitle, language === "ar" && styles.rtlText]}
              >
                {t[`step${currentStep}Subtitle`]}
              </Text>
            </View>

            {currentStep === 1 && (
              <View style={styles.formContainer}>
                <InputField
                  label={t.fullName}
                  placeholder={t.fullNamePlaceholder}
                  icon="person-outline"
                  value={formData.fullname}
                  onChangeText={(v) => handleInputChange("fullname", v)}
                  onFocus={() => setActiveField("fullname")}
                  onBlur={() => {
                    setActiveField(null);
                    validateField("fullname");
                  }}
                  isFocused={activeField === "fullname"}
                  hasError={touched.fullname && errors.fullname}
                  language={language}
                />
                <InputField
                  label={t.email}
                  placeholder={t.emailPlaceholder}
                  icon="email"
                  keyboardType="email-address"
                  value={formData.email}
                  onChangeText={(v) => handleInputChange("email", v)}
                  onFocus={() => setActiveField("email")}
                  onBlur={() => {
                    setActiveField(null);
                    validateField("email");
                  }}
                  isFocused={activeField === "email"}
                  hasError={touched.email && errors.email}
                  language={language}
                />
                <InputField
                  label={t.city}
                  placeholder={t.cityPlaceholder}
                  icon="location-city"
                  value={formData.city}
                  onChangeText={(v) => handleInputChange("city", v)}
                  onFocus={() => setActiveField("city")}
                  onBlur={() => {
                    setActiveField(null);
                    validateField("city");
                  }}
                  isFocused={activeField === "city"}
                  hasError={touched.city && errors.city}
                  language={language}
                />
                <Text style={[styles.label, { marginTop: 8 }]}>
                  {language === "ar" ? "الموقع" : "Location"}
                </Text>
                <TouchableOpacity
                  style={styles.locationBtn}
                  onPress={handleGetLocation}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="my-location" size={20} color="#3185FC" />
                  <Text style={styles.locationBtnText}>
                    {formData.location
                      ? `${formData.location.latitude.toFixed(4)}, ${formData.location.longitude.toFixed(4)}`
                      : language === "ar"
                        ? "تحديد موقعي"
                        : "Get My Location"}
                  </Text>
                </TouchableOpacity>
                <DocumentPicker
                  label={t.permis}
                  hint={t.permisHint}
                  icon="badge"
                  fileName={formData.permisFileName}
                  onPick={() => handlePickDocument("permisFileName")}
                  hasError={false}
                />
              </View>
            )}

            {currentStep === 2 && (
              <View style={styles.formContainer}>
                <InputField
                  label={t.busType}
                  placeholder={t.busTypePlaceholder}
                  icon="directions-bus"
                  value={formData.busType}
                  onChangeText={(v) => handleInputChange("busType", v)}
                  onFocus={() => setActiveField("busType")}
                  onBlur={() => {
                    setActiveField(null);
                    validateField("busType");
                  }}
                  isFocused={activeField === "busType"}
                  hasError={touched.busType && errors.busType}
                  language={language}
                />
                <InputField
                  label={t.capacity}
                  placeholder={t.capacityPlaceholder}
                  icon="event-seat"
                  keyboardType="number-pad"
                  value={formData.capacity}
                  onChangeText={(v) => handleInputChange("capacity", v)}
                  onFocus={() => setActiveField("capacity")}
                  onBlur={() => {
                    setActiveField(null);
                    validateField("capacity");
                  }}
                  isFocused={activeField === "capacity"}
                  hasError={touched.capacity && errors.capacity}
                  language={language}
                />
                <InputField
                  label={t.plateNumber}
                  placeholder={t.plateNumberPlaceholder}
                  icon="confirmation-number"
                  value={formData.plateNumber}
                  onChangeText={(v) => handleInputChange("plateNumber", v)}
                  autoCapitalize="characters"
                  onFocus={() => setActiveField("plateNumber")}
                  onBlur={() => {
                    setActiveField(null);
                    validateField("plateNumber");
                  }}
                  isFocused={activeField === "plateNumber"}
                  hasError={touched.plateNumber && errors.plateNumber}
                  language={language}
                />
                <DocumentPicker
                  label={t.carteGrise}
                  hint={t.carteGriseHint}
                  icon="description"
                  fileName={formData.carteGriseFileName}
                  onPick={() => handlePickDocument("carteGriseFileName")}
                  hasError={false}
                />
              </View>
            )}

            {currentStep === 3 && (
              <View style={styles.formContainer}>
                <Text
                  style={[
                    styles.subtitle,
                    { textAlign: "center", marginBottom: 32 },
                  ]}
                >
                  {language === "ar" ? "أدخل الرمز المرسل إلى" : "Code sent to"}
                </Text>
                <Text
                  style={[
                    styles.emailText,
                    { textAlign: "center", marginBottom: 40 },
                  ]}
                >
                  {formData.email}
                </Text>
                <View style={styles.codeContainer}>
                  <View style={styles.codeDisplay}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.codeBox,
                          code[i] && styles.codeBoxFilled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.codeBoxText,
                            code[i] && styles.codeBoxTextFilled,
                          ]}
                        >
                          {code[i] || "·"}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <TextInput
                    ref={codeInputRef}
                    style={styles.codeHiddenInput}
                    value={code}
                    onChangeText={(text) =>
                      setCode(text.replace(/[^0-9]/g, "").slice(0, 8))
                    }
                    keyboardType="number-pad"
                    maxLength={8}
                    autoFocus
                    editable={!isVerifying}
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.verifyBtn,
                    code.length < 8 && styles.verifyBtnDisabled,
                  ]}
                  onPress={verifyCode}
                  disabled={isVerifying || code.length < 8}
                  activeOpacity={0.8}
                >
                  {isVerifying ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.verifyBtnText}>{t.verify}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={isResending || cooldown > 0}
                  style={styles.resendBtn}
                >
                  {isResending ? (
                    <ActivityIndicator color="#3185FC" size="small" />
                  ) : (
                    <Text
                      style={[
                        styles.resendText,
                        cooldown > 0 && styles.resendTextMuted,
                      ]}
                    >
                      {cooldown > 0
                        ? `${t.resendCooldown} ${cooldown}s`
                        : t.resend}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        <View style={styles.footerNav}>
          {currentStep > 1 && currentStep < 3 && (
            <TouchableOpacity
              style={styles.prevButton}
              onPress={() => setCurrentStep((p) => p - 1)}
            >
              <MaterialIcons name="arrow-back" size={20} color="#64748B" />
              <Text style={styles.prevButtonText}>{t.previous}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextButton, currentStep === 1 && { flex: 1 }]}
            onPress={currentStep === 2 ? handleRegister : handleNext}
            disabled={isLoading || isVerifying}
          >
            {isLoading || isVerifying ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>{t.next}</Text>
                {currentStep < totalSteps && (
                  <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  flex1: { flex: 1 },
  navHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  backButton: { padding: 8, marginLeft: -8 },
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
  languagePillFlag: { fontSize: 16 },
  progressContainer: {
    paddingHorizontal: 28,
    marginBottom: 20,
    alignItems: "center",
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: { backgroundColor: "#3185FC" },
  stepCircleText: {
    fontSize: 13,
    color: "#94A3B8",
    fontFamily: UbuntuFonts.bold,
  },
  stepCircleTextActive: { color: "#FFF" },
  stepLine: { width: 40, height: 2, backgroundColor: "#F1F5F9" },
  stepLineActive: { backgroundColor: "#3185FC" },
  stepInfo: {
    fontSize: 12,
    color: "#94A3B8",
    fontFamily: UbuntuFonts.medium,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  scrollContent: { paddingHorizontal: 28, paddingBottom: 40 },
  titleSection: { marginBottom: 32, marginTop: 10 },
  title: {
    fontSize: 28,
    color: "#1A1A1A",
    fontFamily: UbuntuFonts.bold,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    fontFamily: UbuntuFonts.regular,
    lineHeight: 22,
  },
  emailText: { fontSize: 15, fontWeight: "700", color: "#3185FC" },
  formContainer: { width: "100%" },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: UbuntuFonts.medium,
    marginBottom: 8,
    marginLeft: 4,
  },
  labelFocused: { color: "#3185FC" },
  labelError: { color: "#EF4444" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFF",
    borderWidth: 1.5,
    borderColor: "#EBF2FF",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
  },
  inputWrapperFocused: { borderColor: "#3185FC", backgroundColor: "#FFF" },
  inputWrapperError: { borderColor: "#EF4444" },
  inputIcon: { marginRight: 12 },
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
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF4FF",
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  locationBtnText: {
    fontSize: 14,
    color: "#3185FC",
    fontFamily: UbuntuFonts.medium,
    flex: 1,
  },
  docPicker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFF",
    borderWidth: 1.5,
    borderColor: "#EBF2FF",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  docPickerText: {
    fontSize: 13,
    color: "#94A3B8",
    fontFamily: UbuntuFonts.medium,
    flex: 1,
  },
  docPickerTextFilled: { color: "#1A1A1A" },
  codeContainer: { alignItems: "center", marginBottom: 32 },
  codeDisplay: { flexDirection: "row", gap: 8, marginBottom: 0 },
  codeBox: {
    width: 36,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#F8FAFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  codeBoxFilled: { borderColor: "#3185FC", backgroundColor: "#EFF6FF" },
  codeBoxText: { fontSize: 18, fontFamily: UbuntuFonts.bold, color: "#CBD5E1" },
  codeBoxTextFilled: { color: "#1A1A1A" },
  codeHiddenInput: { position: "absolute", width: 1, height: 1, opacity: 0 },
  verifyBtn: {
    backgroundColor: "#3185FC",
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#3185FC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  verifyBtnDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  resendBtn: { paddingVertical: 8, alignItems: "center" },
  resendText: { fontSize: 14, color: "#3185FC", fontWeight: "600" },
  resendTextMuted: { color: "#94A3B8" },
  footerNav: {
    flexDirection: "row",
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  prevButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  prevButtonText: {
    fontSize: 16,
    color: "#64748B",
    fontFamily: UbuntuFonts.bold,
  },
  nextButton: {
    flex: 2,
    backgroundColor: "#3185FC",
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  nextButtonText: { color: "#FFF", fontSize: 16, fontFamily: UbuntuFonts.bold },
  rtlRow: { flexDirection: "row-reverse" },
  rtlText: { textAlign: "right" },
});

export default DriverRegisterScreen;
