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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../lib/supabase";
import {
  getValidationError,
  validateEmail,
  validatePhone,
  validateCIN,
  validateFullname,
  validateCoordinates,
} from "../../shared/utils/validation";
import { UbuntuFonts } from "../../shared/utils/fonts";
import SchoolPicker from "../../shared/components/student/SchoolPicker";
import MapLocationPicker from "../../shared/components/common/MapLocationPicker";
import SchoolMapCard from "../../shared/components/common/SchoolMapCard";
import { getSchoolById } from "../../shared/services/schoolService";

const translations = {
  en: {
    step1Title: "Personal Profile",
    step1Subtitle: "Basic details to help us identify you.",
    step2Title: "Home Location",
    step2Subtitle: "Select your city and pin your residence.",
    step3Title: "Your University",
    step3Subtitle: "Select your educational institution in your city.",
    fullname: "Full Name",
    fullnamePlaceholder: "John Doe",
    phone: "Phone Number",
    phonePlaceholder: "0612345678",
    email: "Email Address",
    emailPlaceholder: "john.doe@example.com",
    cin: "CIN",
    cinPlaceholder: "AB123456",
    next: "Continue",
    previous: "Back",
    register: "Complete Registration",
    registering: "Processing...",
    success: "Welcome Aboard!",
    successMessage: "Your student account has been created.",
    ok: "Let's Go",
    of: "of",
    step: "Step",
  },
  ar: {
    step1Title: "الملف الشخصي",
    step1Subtitle: "تفاصيل أساسية لمساعدتنا في التعرف عليك.",
    step2Title: "موقع المنزل",
    step2Subtitle: "اختر مدينتك وحدد موقع سكنك.",
    step3Title: "جامعتك",
    step3Subtitle: "اختر مؤسستك التعليمية في مدينتك.",
    fullname: "الاسم الكامل",
    fullnamePlaceholder: "محمد أحمد",
    phone: "رقم الهاتف",
    phonePlaceholder: "0612345678",
    email: "البريد الإلكتروني",
    emailPlaceholder: "mohammed@example.com",
    cin: "رقم البطاقة الوطنية",
    cinPlaceholder: "AB123456",
    next: "متابعة",
    previous: "رجوع",
    register: "إكمال التسجيل",
    registering: "جاري المعالجة...",
    success: "مرحباً بك!",
    successMessage: "تم إنشاء حساب الطالب الخاص بك.",
    ok: "لنبدأ",
    of: "من",
    step: "خطوة",
  },
};

const CityPicker = ({ value, onSelect, language, error }) => {
  const cities = [
    { id: "casablanca", name: "Casablanca", nameAr: "الدار البيضاء" },
    { id: "rabat", name: "Rabat", nameAr: "الرباط" },
    { id: "marrakech", name: "Marrakech", nameAr: "مراكش" },
    { id: "tangier", name: "Tangier", nameAr: "طنجة" },
    { id: "fes", name: "Fes", nameAr: "فاس" },
    { id: "agadir", name: "Agadir", nameAr: "أكادير" },
    { id: "meknes", name: "Meknes", nameAr: "مكناس" },
    { id: "oujda", name: "Oujda", nameAr: "وجدة" },
    { id: "kenitra", name: "Kenitra", nameAr: "القنيطرة" },
    { id: "tetouan", name: "Tetouan", nameAr: "تطوان" },
  ];

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {language === "ar" ? "المدينة" : "City"}
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
          name="location-city"
          size={20}
          color={error ? "#EF4444" : isExpanded ? "#3185FC" : "#94A3B8"}
          style={styles.inputIcon}
        />
        <Text
          style={[
            styles.input,
            !value && styles.pickerPlaceholder,
            language === "ar" && styles.rtlText,
            { verticalAlign: 'middle', lineHeight: 54 }
          ]}
        >
          {value
            ? cities.find((c) => c.id === value)?.[language === "ar" ? "nameAr" : "name"]
            : language === "ar"
            ? "اختر مدينتك"
            : "Select your city"}
        </Text>
        <MaterialIcons
          name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
          size={24}
          color="#94A3B8"
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.dropdownContainer}>
          {cities.map((city) => (
            <TouchableOpacity
              key={city.id}
              style={[
                styles.cityOption,
                value === city.id && styles.cityOptionSelected,
                language === "ar" && styles.rtlRow,
              ]}
              onPress={() => {
                onSelect(city.id);
                setIsExpanded(false);
              }}
            >
              <Text
                style={[
                  styles.cityOptionText,
                  value === city.id && styles.cityOptionTextSelected,
                  language === "ar" && styles.rtlText,
                ]}
              >
                {language === "ar" ? city.nameAr : city.name}
              </Text>
              {value === city.id && (
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

const InputField = React.memo(
  ({
    label,
    placeholder,
    icon,
    keyboardType = "default",
    autoCapitalize = "none",
    value,
    hasError,
    language,
    loading,
    onChangeText,
    onBlur,
    isFocused,
    onFocus,
  }) => {
    return (
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
            editable={!loading}
          />
        </View>
        {hasError && <Text style={styles.errorText}>{hasError}</Text>}
      </View>
    );
  },
);

const StudentRegisterScreen = ({
  language = "en",
  onBack,
  onSuccess,
  onLanguageChange,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    fullname: "",
    phone: "",
    email: "",
    cin: "",
    city: "",
    school: "",
    homeLocation: null,
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [activeField, setActiveField] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [loadingSchool, setLoadingSchool] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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

  const t = translations[language];
  const totalSteps = 3;

  const handleInputChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
    if (field === "school" && value) fetchSchoolDetails(value);
  }, []);

  const fetchSchoolDetails = useCallback(async (schoolId) => {
    setLoadingSchool(true);
    try {
      const result = await getSchoolById(schoolId);
      setSelectedSchool(result.data || null);
    } catch (error) {
      setSelectedSchool(null);
    } finally {
      setLoadingSchool(false);
    }
  }, []);

  const validateField = useCallback(
    (field) => {
      let error = null;
      switch (field) {
        case "fullname":
          if (!formData.fullname.trim())
            error = getValidationError("fullname", "", language);
          else if (!validateFullname(formData.fullname))
            error = getValidationError("fullname", formData.fullname, language);
          break;
        case "phone":
          if (!formData.phone.trim())
            error = getValidationError("phone", "", language);
          else if (!validatePhone(formData.phone))
            error = getValidationError("phone", formData.phone, language);
          break;
        case "email":
          if (!formData.email.trim())
            error = getValidationError("email", "", language);
          else if (!validateEmail(formData.email))
            error = getValidationError("email", formData.email, language);
          break;
        case "cin":
          if (!formData.cin.trim())
            error = getValidationError("cin", "", language);
          else if (!validateCIN(formData.cin.toUpperCase()))
            error = getValidationError("cin", formData.cin, language);
          break;
        case "city":
          if (!formData.city)
            error = language === "ar" ? "يرجى اختيار المدينة" : "Please select a city";
          break;
        case "homeLocation":
          if (!formData.homeLocation)
            error = getValidationError("location", null, language);
          break;
        case "school":
          if (!formData.school)
            error = getValidationError("school", "", language);
          break;
      }
      console.log(`validateField(${field}): error =`, error);
      setErrors((prev) => ({ ...prev, [field]: error }));
      return !error;
    },
    [formData, language],
  );

  const handleNext = () => {
    const fields = {
      1: ["fullname", "phone", "email", "cin"],
      2: ["city", "homeLocation"],
      3: ["school"],
    };
    let isValid = true;
    fields[currentStep].forEach((f) => {
      setTouched((tp) => ({ ...tp, [f]: true }));
      if (!validateField(f)) isValid = false;
    });
    if (isValid && currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const handleRegister = async () => {
    console.log("HandleRegister called, validating all fields...");

    // Validate all fields from previous steps
    const allFields = [
      "fullname",
      "phone",
      "email",
      "cin",
      "cin",
      "city",
      "homeLocation",
      "school",
    ];
    let isValid = true;
    allFields.forEach((f) => {
      setTouched((tp) => ({ ...tp, [f]: true }));
      if (!validateField(f)) {
        isValid = false;
      }
    });

    if (!isValid) {
      console.log("Validation failed, showing errors:", errors);
      Alert.alert(
        language === "ar" ? "خطأ في التحقق" : "Validation Error",
        language === "ar"
          ? "يرجى التحقق من جميع الحقول"
          : "Please check all fields are filled correctly",
      );
      return;
    }

    console.log("Validation passed, creating account...");
    setIsLoading(true);

    try {
      const password =
        formData.cin.toUpperCase().trim() + formData.phone.slice(-4);
      let userId = null;

      // Try to create auth user — no OTP required
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.toLowerCase().trim(),
        password,
        options: {
          data: {
            fullname: formData.fullname.trim(),
            phone: formData.phone.trim(),
            cin: formData.cin.toUpperCase().trim(),
            school_id: formData.school,
            home_location: formData.homeLocation,
          },
        },
      });

      if (authError) {
        // Rate limit — account may already exist from a previous attempt
        if (authError.message?.toLowerCase().includes("rate limit")) {
          if (__DEV__)
            console.warn("signUp rate limit — falling back to signIn");

          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({
              email: formData.email.toLowerCase().trim(),
              password,
            });

          if (signInError || !signInData?.user?.id) {
            Alert.alert(
              language === "ar" ? "حاول لاحقاً" : "Try Again Later",
              language === "ar"
                ? "تعذر إنشاء الحساب بسبب محاولات كثيرة. يرجى الانتظار بضع دقائق وإعادة المحاولة."
                : "Too many attempts. Please wait a few minutes and try again.",
            );
            return;
          }

          userId = signInData.user.id;
          console.log("✅ Signed in via fallback, userId:", userId);
        } else {
          console.error("Auth signup error:", authError);
          Alert.alert(
            language === "ar" ? "خطأ" : "Error",
            authError.message ||
              (language === "ar"
                ? "فشل إنشاء الحساب"
                : "Failed to create account"),
          );
          return;
        }
      }

      if (!userId) {
        userId = authData?.user?.id;
      }

      if (!userId) {
        Alert.alert(
          language === "ar" ? "خطأ" : "Error",
          language === "ar" ? "فشل إنشاء الحساب" : "Failed to create account",
        );
        return;
      }

      console.log("✅ Auth user ready, userId:", userId);

      // 1. Ensure user exists in public.users (fallback for trigger delay/failure)
      const { data: userData, error: userLookupError } = await supabase
        .from("users")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (!userData) {
        console.log("  Inserting into public.users manually...");
        const { error: userInsertError } = await supabase
          .from("users")
          .insert({
            id: userId,
            email: formData.email.toLowerCase().trim(),
            fullname: formData.fullname.trim(),
            role: "student",
          });

        if (userInsertError) {
          console.error("  Manual user insert failed:", userInsertError);
          // Only fail if it's NOT a duplicate key error (which means another process/trigger did it)
          if (!userInsertError.message?.includes("duplicate")) {
            Alert.alert(
              language === "ar" ? "خطأ" : "Error",
              language === "ar" ? "فشل تهيئة الحساب" : "Account initialization failed"
            );
            setIsLoading(false);
            return;
          }
        }
      }

      console.log("✅ User profile synced in public.users");

      // Check if student already exists (from a previous partial registration)
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingStudent) {
        console.log("✅ Student already exists:", existingStudent.id);
        if (onSuccess) {
          onSuccess({
            studentId: existingStudent.id,
            email: formData.email.toLowerCase().trim(),
          });
        }
        return;
      }

      // Insert student profile
      const { data: student, error: dbError } = await supabase
        .from("students")
        .insert({
          user_id: userId,
          fullname: formData.fullname.trim(),
          phone: formData.phone.trim(),
          email: formData.email.toLowerCase().trim(),
          cin: formData.cin.toUpperCase().trim(),
          school_id: formData.school,
          home_location: formData.homeLocation,
          is_verified: true,
        })
        .select("id")
        .single();

      if (dbError) {
        console.error("Failed to insert student profile:", dbError);
        Alert.alert(
          language === "ar" ? "خطأ" : "Error",
          dbError.message ||
            (language === "ar"
              ? "فشل إنشاء الملف الشخصي"
              : "Failed to create profile"),
        );
        return;
      }

      console.log("✅ Student profile created!");
      console.log("  Student ID:", student.id);

      const studentEmail = formData.email.toLowerCase().trim();

      // Persist student identity locally for session restoration on app restart
      await AsyncStorage.setItem("@registered_student_email", studentEmail);
      await AsyncStorage.setItem("@registered_student_id", student.id);

      if (onSuccess) {
        onSuccess({
          studentId: student.id,
          email: studentEmail,
        });
      }
    } catch (error) {
      console.error("Unexpected error during registration:", error);
      Alert.alert(
        language === "ar" ? "خطأ" : "Error",
        language === "ar"
          ? "حدث خطأ غير متوقع"
          : "An unexpected error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const StepCircle = ({ step }) => (
    <View
      style={[
        styles.stepCircle,
        currentStep >= step && styles.stepCircleActive,
      ]}
    >
      {currentStep > step ? (
        <MaterialIcons name="check" size={14} color="#FFFFFF" />
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
                  label={t.fullname}
                  placeholder={t.fullnamePlaceholder}
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
                  label={t.phone}
                  placeholder={t.phonePlaceholder}
                  icon="phone-android"
                  keyboardType="phone-pad"
                  value={formData.phone}
                  onChangeText={(v) => handleInputChange("phone", v)}
                  onFocus={() => setActiveField("phone")}
                  onBlur={() => {
                    setActiveField(null);
                    validateField("phone");
                  }}
                  isFocused={activeField === "phone"}
                  hasError={touched.phone && errors.phone}
                  language={language}
                />
                <InputField
                  label={t.email}
                  placeholder={t.emailPlaceholder}
                  icon="alternate-email"
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
                  label={t.cin}
                  placeholder={t.cinPlaceholder}
                  icon="badge"
                  autoCapitalize="characters"
                  value={formData.cin}
                  onChangeText={(v) => handleInputChange("cin", v)}
                  onFocus={() => setActiveField("cin")}
                  onBlur={() => {
                    setActiveField(null);
                    validateField("cin");
                  }}
                  isFocused={activeField === "cin"}
                  hasError={touched.cin && errors.cin}
                  language={language}
                />
              </View>
            )}

            {currentStep === 2 && (
              <View style={styles.formContainer}>
                <CityPicker
                  value={formData.city}
                  onSelect={(v) => {
                    handleInputChange("city", v);
                    setTouched((p) => ({ ...p, city: true }));
                    // Reset school if city changes to avoid mismatched school
                    handleInputChange("school", "");
                    setSelectedSchool(null);
                  }}
                  language={language}
                  error={touched.city && errors.city}
                />
                <MapLocationPicker
                  value={formData.homeLocation}
                  onSelect={(loc) => {
                    handleInputChange("homeLocation", loc);
                    setTouched((p) => ({ ...p, homeLocation: true }));
                  }}
                  language={language}
                  error={touched.homeLocation && errors.homeLocation}
                />
              </View>
            )}

            {currentStep === 3 && (
              <View style={styles.formContainer}>
                <SchoolPicker
                  value={formData.school}
                  city={formData.city} // Pass city for filtering
                  onSelect={(id) => {
                    handleInputChange("school", id);
                    setTouched((p) => ({ ...p, school: true }));
                  }}
                  language={language}
                  error={touched.school && errors.school}
                />
                {selectedSchool && (
                  <SchoolMapCard school={selectedSchool} language={language} />
                )}
                {loadingSchool && (
                  <ActivityIndicator
                    size="small"
                    color="#3185FC"
                    style={{ marginTop: 20 }}
                  />
                )}
              </View>
            )}
          </Animated.View>
        </ScrollView>

        <View style={styles.footerNav}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.prevButton}
              onPress={() => setCurrentStep((prev) => prev - 1)}
            >
              <MaterialIcons name="arrow-back" size={20} color="#64748B" />
              <Text style={styles.prevButtonText}>{t.previous}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextButton, currentStep === 1 && { flex: 1 }]}
            onPress={currentStep === totalSteps ? handleRegister : handleNext}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {currentStep === totalSteps ? t.register : t.next}
                </Text>
                {currentStep < totalSteps && (
                  <MaterialIcons
                    name="arrow-forward"
                    size={20}
                    color="#FFFFFF"
                  />
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
  container: { flex: 1, backgroundColor: "#FFFFFF" },
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
  stepCircleTextActive: { color: "#FFFFFF" },
  stepLine: { width: 40, height: 2, backgroundColor: "#F1F5F9", mx: 8 },
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
  inputWrapperFocused: { borderColor: "#3185FC", backgroundColor: "#FFFFFF" },
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
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: UbuntuFonts.bold,
  },
  pickerPlaceholder: { color: "#94A3B8" },
  dropdownContainer: {
    backgroundColor: "#FFFFFF",
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#EBF2FF",
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cityOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cityOptionSelected: { backgroundColor: "#F0F7FF" },
  cityOptionText: {
    fontSize: 15,
    color: "#475569",
    fontFamily: UbuntuFonts.medium,
  },
  cityOptionTextSelected: { color: "#3185FC", fontFamily: UbuntuFonts.bold },
  rtlRow: { flexDirection: "row-reverse" },
  rtlText: { textAlign: "right" },
});

export default StudentRegisterScreen;
