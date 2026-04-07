import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

const CODE_LENGTH = 8;

const translations = {
  en: {
    title: "Enter verification code",
    subtitle: "We sent an 8-digit code to",
    enterCode: "Enter all 8 digits",
    verify: "Verify",
    verifying: "Verifying...",
    resend: "Resend code",
    resendCooldown: "Resend code in",
    resending: "Resending...",
    back: "← Back to register",
    error: "Error",
    ok: "OK",
    invalidCode: "The code is incorrect or has expired. Try again.",
    enterAllDigits: "Please enter all 8 digits.",
  },
  ar: {
    title: "أدخل رمز التحقق",
    subtitle: "أرسلنا رمزاً مكوناً من 8 أرقام إلى",
    enterCode: "أدخل جميع الأرقام الثمانية",
    verify: "تحقق",
    verifying: "جاري التحقق...",
    resend: "إعادة إرسال الرمز",
    resendCooldown: "إعادة الإرسال في",
    resending: "جاري إعادة الإرسال...",
    back: "← العودة للتسجيل",
    error: "خطأ",
    ok: "حسناً",
    invalidCode: "الرمز غير صحيح أو انتهت صلاحيته. حاول مرة أخرى.",
    enterAllDigits: "يرجى إدخال جميع الأرقام الثمانية.",
  },
};

const EmailVerificationScreen = ({
  email,
  language = "en",
  onBack,
  onSuccess,
}) => {
  const [code, setCode] = useState(["", "", "", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef([]);

  const t = translations[language];

  // Handle digit input
  const handleChange = (text, index) => {
    const digit = text.replace(/[^0-9]/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-focus next input
    if (digit && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (digit && index === CODE_LENGTH - 1) {
      const fullCode = [...newCode].join("");
      if (fullCode.length === CODE_LENGTH) {
        verifyCode(fullCode);
      }
    }
  };

  // Handle backspace
  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const verifyCode = async (otp) => {
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (error) {
        console.error("OTP verification error:", error);
        Alert.alert(
          language === "ar" ? "رمز غير صحيح" : "Invalid code",
          t.invalidCode,
          [{ text: t.ok }],
        );
        setCode(["", "", "", "", "", "", "", ""]);
        inputs.current[0]?.focus();
        return;
      }

      console.log("OTP verified successfully! Inserting student profile...");
      console.log("Auth user ID:", user.id);
      console.log("User metadata:", JSON.stringify(meta, null, 2));

      // Validate required fields
      if (!meta.fullname || !meta.cin) {
        console.error("Missing required metadata: fullname or cin not found");
        Alert.alert(
          language === "ar" ? "خطأ" : "Error",
          language === "ar"
            ? "بيانات التسجيل ناقصة. يرجى إعادة التسجيل."
            : "Registration data is missing. Please register again.",
          [{ text: t.ok }],
        );
        return;
      }

      // Parse home_location from JSON string if it exists
      let homeLocation = null;
      if (meta.home_location) {
        try {
          homeLocation = JSON.parse(meta.home_location);
        } catch (e) {
          console.error("Failed to parse home_location:", e);
        }
      }

      console.log("Inserting student with data:", {
        user_id: user.id,
        fullname: meta.fullname,
        phone: meta.phone,
        email: user.email,
        cin: meta.cin,
        school_id: meta.school_id,
        home_location: homeLocation,
      });

      const { data: insertedStudent, error: dbError } = await supabase
        .from("students")
        .insert({
          user_id: user.id,
          fullname: meta.fullname,
          phone: meta.phone,
          email: user.email,
          cin: meta.cin,
          school_id: meta.school_id,
          home_location: homeLocation,
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
          [{ text: t.ok }],
        );
        return;
      }

      console.log("✅ Student profile created successfully!");
      console.log("  Student ID (students table):", insertedStudent.id);
      console.log("  Auth User ID:", user.id);

      // Navigate to student home with the CORRECT student ID
      if (onSuccess) {
        onSuccess({
          studentId: insertedStudent.id,
          email: user.email,
        });
      }
    } catch (error) {
      console.error("Unexpected error during verification:", error);
      Alert.alert(
        language === "ar" ? "خطأ" : "Error",
        language === "ar"
          ? "حدث خطأ غير متوقع"
          : "An unexpected error occurred",
        [{ text: t.ok }],
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyPress = () => {
    const fullCode = code.join("");
    if (fullCode.length < CODE_LENGTH) {
      Alert.alert(
        language === "ar" ? "أدخل الرمز" : "Enter code",
        t.enterAllDigits,
        [{ text: t.ok }],
      );
      return;
    }
    verifyCode(fullCode);
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) {
      return;
    }

    setIsResending(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setIsResending(false);

    if (error) {
      console.error("Resend error:", error);

      // Check for rate limit error
      if (error.message?.includes("rate limit")) {
        Alert.alert(
          language === "ar" ? "محاولات كثيرة" : "Too Many Attempts",
          language === "ar"
            ? "تم إرسال العديد من رموز التحقق. يرجى الانتظار بضع دقائق قبل المحاولة مرة أخرى."
            : "Too many verification codes sent. Please wait a few minutes before trying again.",
          [{ text: t.ok }],
        );
      } else {
        Alert.alert(
          language === "ar" ? "خطأ" : "Error",
          error.message ||
            (language === "ar"
              ? "فشل إعادة إرسال الرمز"
              : "Failed to resend code"),
          [{ text: t.ok }],
        );
      }
      return;
    }

    setCode(["", "", "", "", "", ""]);
    inputs.current[0]?.focus();

    // 60s cooldown
    setCooldown(60);
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    Alert.alert(
      language === "ar" ? "تم الإرسال" : "Code Sent",
      language === "ar"
        ? "تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني"
        : "A new verification code has been sent to your email",
      [{ text: t.ok }],
    );
  };

  const filledCount = code.filter((d) => d !== "").length;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        activeOpacity={0.7}
        disabled={isVerifying}
      >
        <MaterialIcons name="arrow-back" size={24} color="#1A1A1A" />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconWrapper}>
          <MaterialIcons name="mark-email-read" size={48} color="#3185FC" />
        </View>

        {/* Title */}
        <Text style={[styles.title, language === "ar" && styles.rtl]}>
          {t.title}
        </Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, language === "ar" && styles.rtl]}>
          {t.subtitle}
        </Text>

        {/* Email */}
        <Text style={[styles.email, language === "ar" && styles.rtl]}>
          {email}
        </Text>

        {/* Code Label */}
        <Text style={[styles.codeLabel, language === "ar" && styles.rtl]}>
          {t.enterCode}
        </Text>

        {/* Code inputs */}
        <View style={styles.codeRow}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputs.current[index] = ref)}
              style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              autoFocus={index === 0}
              editable={!isVerifying}
            />
          ))}
        </View>

        {/* Verify button */}
        <TouchableOpacity
          style={[
            styles.verifyBtn,
            filledCount < CODE_LENGTH && styles.verifyBtnDisabled,
          ]}
          onPress={handleVerifyPress}
          disabled={isVerifying || filledCount < CODE_LENGTH}
          activeOpacity={0.85}
        >
          {isVerifying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.verifyBtnText}>{t.verify}</Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <TouchableOpacity
          onPress={handleResend}
          disabled={isResending || cooldown > 0}
          style={styles.resendBtn}
          activeOpacity={0.7}
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
              {cooldown > 0 ? `${t.resendCooldown} ${cooldown}s` : t.resend}
            </Text>
          )}
        </TouchableOpacity>

        {/* Back */}
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.backText}>{t.back}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    marginTop: Platform.OS === "ios" ? 10 : 20,
    marginBottom: 10,
    marginLeft: 20,
    alignSelf: "flex-start",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F0F7FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  email: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3185FC",
    marginTop: 4,
    marginBottom: 24,
    textAlign: "center",
  },
  codeLabel: {
    fontSize: 13,
    color: "#94A3B8",
    marginBottom: 16,
    textAlign: "center",
  },
  codeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 32,
  },
  codeInput: {
    width: 46,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFF",
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  codeInputFilled: {
    borderColor: "#3185FC",
    backgroundColor: "#EFF6FF",
  },
  verifyBtn: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    backgroundColor: "#3185FC",
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
  verifyBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  resendBtn: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 14,
    color: "#3185FC",
    fontWeight: "600",
  },
  resendTextMuted: {
    color: "#94A3B8",
  },
  backBtn: {
    paddingVertical: 8,
  },
  backText: {
    fontSize: 13,
    color: "#94A3B8",
  },
  rtl: {
    textAlign: "right",
  },
});

export default EmailVerificationScreen;
