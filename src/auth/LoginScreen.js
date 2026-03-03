import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { UbuntuFonts } from "../shared/utils/fonts";

const translations = {
  en: {
    title: "Welcome Back",
    subtitle: "Sign in to continue your journey with Mobi.",
    emailLabel: "Email Address",
    passwordLabel: "Password",
    emailPlaceholder: "email@example.com",
    passwordPlaceholder: "••••••••",
    signUpText: "New to Mobi?",
    signUpLink: "Create an account",
    continueWithGoogle: "Continue with Google",
    forgotPassword: "Forgot password?",
    sendCode: "Send Reset Code",
    resetCodeLabel: "Reset Code",
    newPasswordLabel: "New Password",
    resetPasswordButton: "Verify & Reset",
    loginButton: "Sign In",
    orContinue: "or continue with",
    demoAccessTitle: "Quick demo access",
    demoStudent: "Demo Student Home",
    demoDriver: "Demo Driver Home",
    languageName: "English",
    languageFlag: "🇬🇧",
  },
  ar: {
    title: "مرحباً بعودتك",
    subtitle: "سجل الدخول للمتابعة مع موبي.",
    emailLabel: "البريد الإلكتروني",
    passwordLabel: "كلمة المرور",
    emailPlaceholder: "email@example.com",
    passwordPlaceholder: "••••••••",
    signUpText: "جديد في موبي؟",
    signUpLink: "أنشئ حساباً",
    continueWithGoogle: "المتابعة عبر جوجل",
    forgotPassword: "نسيت كلمة المرور؟",
    sendCode: "إرسال رمز الاستعادة",
    resetCodeLabel: "رمز الاستعادة",
    newPasswordLabel: "كلمة المرور الجديدة",
    resetPasswordButton: "تحقق وأعد التعيين",
    loginButton: "تسجيل الدخول",
    orContinue: "أو المتابعة عبر",
    demoAccessTitle: "وصول تجريبي سريع",
    demoStudent: "الواجهة التجريبية للطالب",
    demoDriver: "الواجهة التجريبية للسائق",
    languageName: "العربية",
    languageFlag: "🇲🇦",
  },
};

const LoginScreen = ({
  language = "en",
  onBack,
  onSignUp,
  onGoogleLogin, // Replaced onFacebookLogin
  onLogin,
  onRequestResetCode,
  onConfirmResetPassword,
  onDemoStudent,
  onDemoDriver,
  onLanguageChange, // New prop to handle language switching
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeField, setActiveField] = useState(null); // 'email' | 'password' | 'resetCode' | 'newPassword'

  const [loading, setLoading] = useState({
    login: false,
    google: false,
    resetCode: false,
    resetConfirm: false,
  });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [forgotPasswordMode]);

  const t = translations[language];

  const handleLogin = async () => {
    if (!onLogin || loading.login) return;
    setLoading((prev) => ({ ...prev, login: true }));
    try {
      await onLogin({
        email: email.trim().toLowerCase(),
        password,
      });
    } finally {
      setLoading((prev) => ({ ...prev, login: false }));
    }
  };

  const handleGoogleLogin = async () => {
    if (!onGoogleLogin || loading.google) return;
    setLoading((prev) => ({ ...prev, google: true }));
    try {
      await onGoogleLogin();
    } finally {
      setLoading((prev) => ({ ...prev, google: false }));
    }
  };

  const handleSendResetCode = async () => {
    if (!onRequestResetCode || loading.resetCode) return;
    setLoading((prev) => ({ ...prev, resetCode: true }));
    try {
      await onRequestResetCode(email.trim().toLowerCase());
    } finally {
      setLoading((prev) => ({ ...prev, resetCode: false }));
    }
  };

  const handleConfirmReset = async () => {
    if (!onConfirmResetPassword || loading.resetConfirm) return;
    setLoading((prev) => ({ ...prev, resetConfirm: true }));
    try {
      await onConfirmResetPassword({
        email: email.trim().toLowerCase(),
        code: resetCode.trim(),
        newPassword,
      });
      setResetCode("");
      setNewPassword("");
      setForgotPasswordMode(false);
    } finally {
      setLoading((prev) => ({ ...prev, resetConfirm: false }));
    }
  };

  const InputField = ({
    label,
    value,
    onChangeText,
    placeholder,
    icon,
    isPassword,
    showPasswordToggle,
    onTogglePassword,
    keyboardType,
    autoCapitalize,
    fieldName,
    maxLength,
  }) => {
    const isFocused = activeField === fieldName;

    return (
      <View style={styles.inputGroup}>
        <Text style={[styles.label, isFocused && styles.labelFocused]}>
          {label}
        </Text>
        <View
          style={[
            styles.inputWrapper,
            isFocused && styles.inputWrapperFocused,
            language === "ar" && styles.rtlContainer,
          ]}
        >
          <MaterialIcons
            name={icon}
            size={20}
            color={isFocused ? "#3185FC" : "#94A3B8"}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, language === "ar" && styles.rtlText]}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setActiveField(fieldName)}
            onBlur={() => setActiveField(null)}
            secureTextEntry={isPassword}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize || "none"}
            autoCorrect={false}
            maxLength={maxLength}
          />
          {showPasswordToggle && (
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={onTogglePassword}
              activeOpacity={0.6}
            >
              <MaterialIcons
                name={isPassword ? "visibility-off" : "visibility"}
                size={20}
                color="#94A3B8"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Navigation */}
          <View style={styles.navHeader}>
            {onBack ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={onBack}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="arrow-back-ios"
                  size={20}
                  color="#1A1A1A"
                />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 40 }} />
            )}

            <TouchableOpacity
              style={styles.languagePill}
              onPress={() =>
                onLanguageChange &&
                onLanguageChange(language === "en" ? "ar" : "en")
              }
              activeOpacity={0.8}
            >
              <Text style={styles.languagePillText}>
                {language === "en" ? "العربية" : "English"}
              </Text>
              <Text style={styles.languagePillFlag}>
                {language === "en" ? "🇲🇦" : "🇬🇧"}
              </Text>
            </TouchableOpacity>
          </View>

          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={[styles.title, language === "ar" && styles.rtlText]}>
                {forgotPasswordMode ? t.forgotPassword : t.title}
              </Text>
              <Text
                style={[styles.subtitle, language === "ar" && styles.rtlText]}
              >
                {forgotPasswordMode
                  ? "Enter your email to receive a reset code."
                  : t.subtitle}
              </Text>
            </View>

            {/* Login Form */}
            {!forgotPasswordMode ? (
              <View style={styles.formContainer}>
                <InputField
                  label={t.emailLabel}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t.emailPlaceholder}
                  icon="alternate-email"
                  fieldName="email"
                  keyboardType="email-address"
                />

                <InputField
                  label={t.passwordLabel}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t.passwordPlaceholder}
                  icon="lock-outline"
                  fieldName="password"
                  isPassword={!showPassword}
                  showPasswordToggle={true}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                />

                <TouchableOpacity
                  onPress={() => setForgotPasswordMode(true)}
                  activeOpacity={0.6}
                  style={styles.forgotPasswordButton}
                >
                  <Text style={styles.forgotPasswordText}>
                    {t.forgotPassword}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    loading.login && styles.buttonDisabled,
                  ]}
                  onPress={handleLogin}
                  activeOpacity={0.9}
                  disabled={loading.login}
                >
                  {loading.login ? (
                    <Animated.View style={styles.loadingContainer}>
                      <MaterialIcons
                        name="hourglass-top"
                        size={20}
                        color="#FFFFFF"
                      />
                    </Animated.View>
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>
                        {t.loginButton}
                      </Text>
                      <MaterialIcons
                        name="arrow-forward"
                        size={20}
                        color="#FFFFFF"
                      />
                    </>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{t.orContinue}</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Google Login */}
                <TouchableOpacity
                  style={[
                    styles.googleButton,
                    loading.google && styles.buttonDisabled,
                  ]}
                  onPress={handleGoogleLogin}
                  activeOpacity={0.8}
                  disabled={loading.google}
                >
                  <MaterialCommunityIcons
                    name="google"
                    size={24}
                    color="#EA4335"
                  />
                  <Text style={styles.googleButtonText}>
                    {t.continueWithGoogle}
                  </Text>
                </TouchableOpacity>

                <View style={styles.demoContainer}>
                  <Text
                    style={[
                      styles.demoTitle,
                      language === "ar" && styles.rtlText,
                    ]}
                  >
                    {t.demoAccessTitle}
                  </Text>
                  <View style={styles.demoActionsRow}>
                    <TouchableOpacity
                      style={styles.demoButton}
                      onPress={onDemoStudent}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.demoButtonText}>{t.demoStudent}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.demoButton}
                      onPress={onDemoDriver}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.demoButtonText}>{t.demoDriver}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              /* Forgot Password Form */
              <View style={styles.formContainer}>
                <InputField
                  label={t.emailLabel}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t.emailPlaceholder}
                  icon="alternate-email"
                  fieldName="email"
                />

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    loading.resetCode && styles.buttonDisabled,
                  ]}
                  onPress={handleSendResetCode}
                  activeOpacity={0.8}
                  disabled={loading.resetCode}
                >
                  <Text style={styles.primaryButtonText}>
                    {loading.resetCode ? "..." : t.sendCode}
                  </Text>
                </TouchableOpacity>

                <View style={styles.spacing32} />

                <InputField
                  label={t.resetCodeLabel}
                  value={resetCode}
                  onChangeText={setResetCode}
                  placeholder="123456"
                  icon="security"
                  fieldName="resetCode"
                  keyboardType="number-pad"
                  maxLength={6}
                />

                <InputField
                  label={t.newPasswordLabel}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t.passwordPlaceholder}
                  icon="vpn-key"
                  fieldName="newPassword"
                  isPassword={!showNewPassword}
                  showPasswordToggle={true}
                  onTogglePassword={() => setShowNewPassword(!showNewPassword)}
                />

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    loading.resetConfirm && styles.buttonDisabled,
                  ]}
                  onPress={handleConfirmReset}
                  activeOpacity={0.8}
                  disabled={loading.resetConfirm}
                >
                  <Text style={styles.primaryButtonText}>
                    {loading.resetConfirm ? "..." : t.resetPasswordButton}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setForgotPasswordMode(false)}
                  style={styles.backToLogin}
                >
                  <Text style={styles.backToLoginText}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Registration Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>{t.signUpText}</Text>
              <TouchableOpacity onPress={onSignUp} activeOpacity={0.7}>
                <Text style={styles.footerLink}> {t.signUpLink}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  navHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    marginBottom: 8,
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
  titleSection: {
    marginBottom: 40,
    marginTop: 10,
  },
  title: {
    fontSize: 34,
    color: "#1A1A1A",
    fontFamily: UbuntuFonts.bold,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    fontFamily: UbuntuFonts.regular,
    lineHeight: 24,
  },
  formContainer: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: UbuntuFonts.medium,
    marginBottom: 8,
    marginLeft: 4,
  },
  labelFocused: {
    color: "#3185FC",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFF",
    borderWidth: 1.5,
    borderColor: "#EBF2FF",
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 58,
    transition: "border-color 0.2s",
  },
  inputWrapperFocused: {
    borderColor: "#3185FC",
    backgroundColor: "#FFFFFF",
    shadowColor: "#3185FC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1A1A1A",
    fontFamily: UbuntuFonts.medium,
    height: "100%",
  },
  eyeIcon: {
    padding: 8,
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginBottom: 32,
    marginTop: -8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#3185FC",
    fontFamily: UbuntuFonts.semiBold,
  },
  primaryButton: {
    backgroundColor: "#3185FC",
    borderRadius: 18,
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#3185FC",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: UbuntuFonts.bold,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    marginHorizontal: 16,
    color: "#94A3B8",
    fontSize: 13,
    fontFamily: UbuntuFonts.medium,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    height: 58,
    gap: 12,
  },
  googleButtonText: {
    fontSize: 16,
    color: "#1A1A1A",
    fontFamily: UbuntuFonts.semiBold,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 15,
    color: "#64748B",
    fontFamily: UbuntuFonts.regular,
  },
  footerLink: {
    fontSize: 15,
    color: "#3185FC",
    fontFamily: UbuntuFonts.bold,
  },
  backToLogin: {
    alignItems: "center",
    marginTop: 24,
  },
  backToLoginText: {
    fontSize: 15,
    color: "#64748B",
    fontFamily: UbuntuFonts.medium,
    textDecorationLine: "underline",
  },
  rtlContainer: {
    flexDirection: "row-reverse",
  },
  rtlText: {
    textAlign: "right",
  },
  spacing32: {
    height: 32,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  demoContainer: {
    marginTop: 20,
    backgroundColor: "#F8FAFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  demoTitle: {
    fontSize: 13,
    color: "#475569",
    fontFamily: UbuntuFonts.medium,
  },
  demoActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  demoButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  demoButtonText: {
    fontSize: 12,
    color: "#1D4ED8",
    fontFamily: UbuntuFonts.semiBold,
    textAlign: "center",
  },
});

export default LoginScreen;
