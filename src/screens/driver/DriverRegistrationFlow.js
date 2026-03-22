import React, { useMemo, useState } from "react";
import {
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
import { UbuntuFonts } from "../../shared/utils/fonts";

const translations = {
  en: {
    title: "Driver Information",
    subtitle: "Tell us about yourself",
    fullName: "Full Name",
    fullNamePlaceholder: "John Doe",
    email: "Email Address",
    emailPlaceholder: "john.doe@example.com",
    password: "Password",
    passwordPlaceholder: "Minimum 8 characters",
    confirmPassword: "Confirm Password",
    confirmPasswordPlaceholder: "Re-enter your password",
    phoneNumber: "Phone Number",
    phoneNumberPlaceholder: "0612345678",
    next: "Next",
  },
  ar: {
    title: "معلومات السائق",
    subtitle: "أخبرنا عن نفسك",
    fullName: "الاسم الكامل",
    fullNamePlaceholder: "محمد أحمد",
    email: "البريد الإلكتروني",
    emailPlaceholder: "mohammed@example.com",
    password: "كلمة المرور",
    passwordPlaceholder: "8 أحرف على الأقل",
    confirmPassword: "تأكيد كلمة المرور",
    confirmPasswordPlaceholder: "أعد إدخال كلمة المرور",
    phoneNumber: "رقم الهاتف",
    phoneNumberPlaceholder: "0612345678",
    next: "التالي",
  },
};

const validateEmail = (value = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

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
  secureTextEntry = false,
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
        secureTextEntry={secureTextEntry}
      />
    </View>
    {hasError ? <Text style={styles.errorText}>{hasError}</Text> : null}
  </View>
);

const DriverRegisterScreen = ({
  language = "en",
  onBack,
  onLanguageChange,
  navigation,
}) => {
  const t = translations[language] || translations.en;
  const [activeField, setActiveField] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    phone_number: "",
  });
  const [errors, setErrors] = useState({});

  const validateField = (field, source = formData) => {
    const value = source[field] || "";

    switch (field) {
      case "full_name":
        if (!value.trim()) return language === "ar" ? "الاسم الكامل مطلوب" : "Full name is required";
        if (value.trim().length < 3) return language === "ar" ? "الاسم الكامل يجب أن يكون 3 أحرف على الأقل" : "Full name must be at least 3 characters";
        return null;
      case "email":
        if (!value.trim()) return language === "ar" ? "البريد الإلكتروني مطلوب" : "Email is required";
        if (!validateEmail(value.trim())) return language === "ar" ? "يرجى إدخال بريد إلكتروني صالح" : "Please enter a valid email";
        return null;
      case "password":
        if (!value) return language === "ar" ? "كلمة المرور مطلوبة" : "Password is required";
        if (value.length < 8) return language === "ar" ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل" : "Password must be at least 8 characters";
        return null;
      case "confirm_password":
        if (!value) return language === "ar" ? "يرجى تأكيد كلمة المرور" : "Please confirm your password";
        if (value !== source.password) return language === "ar" ? "كلمتا المرور غير متطابقتين" : "Passwords do not match";
        return null;
      case "phone_number":
        if (!value.trim()) return language === "ar" ? "رقم الهاتف مطلوب" : "Phone number is required";
        return null;
      default:
        return null;
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleNext = () => {
    const nextErrors = {};

    Object.keys(formData).forEach((field) => {
      const error = validateField(field, formData);
      if (error) nextErrors[field] = error;
    });

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    navigation.navigate("DriverVehicleRegister", {
      full_name: formData.full_name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      phone_number: formData.phone_number.trim(),
    });
  };

  const isNextDisabled = useMemo(
    () =>
      !formData.full_name ||
      !formData.email ||
      !formData.password ||
      !formData.confirm_password ||
      !formData.phone_number,
    [formData],
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
            onLanguageChange && onLanguageChange(language === "en" ? "ar" : "en")
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
              <Text style={[styles.stepInfo, language === "ar" && styles.rtlText]}>
                1 / 2
              </Text>
              <Text style={[styles.stepTitle, language === "ar" && styles.rtlText]}>
                {t.title}
              </Text>
              <Text
                style={[styles.stepSubtitle, language === "ar" && styles.rtlText]}
              >
                {t.subtitle}
              </Text>
            </View>

            <View style={styles.formCard}>
              <InputField
                label={t.fullName}
                placeholder={t.fullNamePlaceholder}
                icon="person-outline"
                value={formData.full_name}
                onChangeText={(value) => handleChange("full_name", value)}
                onFocus={() => setActiveField("full_name")}
                onBlur={() => {
                  setActiveField(null);
                  setErrors((prev) => ({
                    ...prev,
                    full_name: validateField("full_name"),
                  }));
                }}
                isFocused={activeField === "full_name"}
                hasError={errors.full_name}
                language={language}
                autoCapitalize="words"
              />

              <InputField
                label={t.email}
                placeholder={t.emailPlaceholder}
                icon="alternate-email"
                value={formData.email}
                onChangeText={(value) => handleChange("email", value)}
                onFocus={() => setActiveField("email")}
                onBlur={() => {
                  setActiveField(null);
                  setErrors((prev) => ({ ...prev, email: validateField("email") }));
                }}
                isFocused={activeField === "email"}
                hasError={errors.email}
                language={language}
                keyboardType="email-address"
              />

              <InputField
                label={t.password}
                placeholder={t.passwordPlaceholder}
                icon="lock-outline"
                value={formData.password}
                onChangeText={(value) => handleChange("password", value)}
                onFocus={() => setActiveField("password")}
                onBlur={() => {
                  setActiveField(null);
                  setErrors((prev) => ({
                    ...prev,
                    password: validateField("password"),
                    confirm_password: formData.confirm_password
                      ? validateField("confirm_password")
                      : prev.confirm_password,
                  }));
                }}
                isFocused={activeField === "password"}
                hasError={errors.password}
                language={language}
                secureTextEntry
              />

              <InputField
                label={t.confirmPassword}
                placeholder={t.confirmPasswordPlaceholder}
                icon="lock-outline"
                value={formData.confirm_password}
                onChangeText={(value) => handleChange("confirm_password", value)}
                onFocus={() => setActiveField("confirm_password")}
                onBlur={() => {
                  setActiveField(null);
                  setErrors((prev) => ({
                    ...prev,
                    confirm_password: validateField("confirm_password"),
                  }));
                }}
                isFocused={activeField === "confirm_password"}
                hasError={errors.confirm_password}
                language={language}
                secureTextEntry
              />

              <InputField
                label={t.phoneNumber}
                placeholder={t.phoneNumberPlaceholder}
                icon="phone-android"
                value={formData.phone_number}
                onChangeText={(value) => handleChange("phone_number", value)}
                onFocus={() => setActiveField("phone_number")}
                onBlur={() => {
                  setActiveField(null);
                  setErrors((prev) => ({
                    ...prev,
                    phone_number: validateField("phone_number"),
                  }));
                }}
                isFocused={activeField === "phone_number"}
                hasError={errors.phone_number}
                language={language}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              isNextDisabled && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>{t.next}</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
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

export default DriverRegisterScreen;
