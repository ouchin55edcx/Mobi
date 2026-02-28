import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import {
  createVerificationCode,
  verifyCode,
  resendVerificationCode,
} from '../shared/services/verificationService';

const translations = {
  en: {
    title: 'Verify Your Email',
    subtitle: 'We sent a 6-digit code to',
    enterCode: 'Enter verification code',
    codePlaceholder: '000000',
    verify: 'Verify',
    verifying: 'Verifying...',
    resend: 'Resend Code',
    resending: 'Resending...',
    success: 'Email Verified',
    successMessage: 'Your email has been verified successfully!',
    invalidCode: 'Invalid code',
    expiredCode: 'Code expired',
    maxAttempts: 'Maximum attempts reached',
    resendWait: 'Please wait before requesting a new code',
    ok: 'OK',
  },
  ar: {
    title: 'تحقق من بريدك الإلكتروني',
    subtitle: 'أرسلنا رمزاً مكوناً من 6 أرقام إلى',
    enterCode: 'أدخل رمز التحقق',
    codePlaceholder: '000000',
    verify: 'تحقق',
    verifying: 'جاري التحقق...',
    resend: 'إعادة إرسال الرمز',
    resending: 'جاري إعادة الإرسال...',
    success: 'تم التحقق من البريد الإلكتروني',
    successMessage: 'تم التحقق من بريدك الإلكتروني بنجاح!',
    invalidCode: 'رمز غير صحيح',
    expiredCode: 'انتهت صلاحية الرمز',
    maxAttempts: 'تم الوصول إلى الحد الأقصى للمحاولات',
    resendWait: 'يرجى الانتظار قبل طلب رمز جديد',
    ok: 'حسناً',
  },
};

const EmailVerificationScreen = ({
  userId,
  email,
  userType = 'student',
  language = 'en',
  onBack,
  onSuccess,
}) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);

  const t = translations[language];

  // Initialize verification code on mount
  useEffect(() => {
    initializeVerification();
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const initializeVerification = async () => {
    try {
      setLoading(true);
      const result = await createVerificationCode(userId, email, userType);
      if (result.error) {
        Alert.alert(
          language === 'ar' ? 'خطأ' : 'Error',
          result.error.message || (language === 'ar' ? 'فشل إنشاء رمز التحقق' : 'Failed to create verification code'),
          [{ text: language === 'ar' ? 'حسناً' : 'OK' }]
        );
      }
    } catch (err) {
      console.error('Error initializing verification:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = useCallback((index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits are entered
    if (newCode.every((digit) => digit !== '') && newCode.length === 6) {
      handleVerify(newCode.join(''));
    }
  }, [code]);

  const handleKeyPress = useCallback((index, key) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [code]);

  const handleVerify = async (verificationCode = null) => {
    const codeToVerify = verificationCode || code.join('');

    if (codeToVerify.length !== 6) {
      setError(t.invalidCode);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await verifyCode(userId, codeToVerify, userType);

      if (result.success) {
        Alert.alert(
          t.success,
          t.successMessage,
          [
            {
              text: t.ok,
              onPress: () => {
                if (onSuccess) {
                  onSuccess();
                }
              },
            },
          ]
        );
      } else {
        const errorMessage = result.error?.message || t.invalidCode;
        setError(errorMessage);

        if (result.error?.remainingAttempts !== undefined) {
          setRemainingAttempts(result.error.remainingAttempts);
        }

        // Clear code on error
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();

        // Show specific error messages
        if (errorMessage.includes('expired')) {
          Alert.alert(
            language === 'ar' ? 'انتهت الصلاحية' : 'Code Expired',
            language === 'ar'
              ? 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.'
              : 'The verification code has expired. Please request a new code.',
            [{ text: t.ok }]
          );
        } else if (errorMessage.includes('Maximum')) {
          Alert.alert(
            language === 'ar' ? 'الحد الأقصى' : 'Max Attempts',
            language === 'ar'
              ? 'تم الوصول إلى الحد الأقصى للمحاولات. يرجى طلب رمز جديد.'
              : 'Maximum verification attempts reached. Please request a new code.',
            [{ text: t.ok }]
          );
        }
      }
    } catch (err) {
      console.error('Error verifying code:', err);
      setError(language === 'ar' ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) {
      return;
    }

    setResending(true);
    setError(null);
    setResendCooldown(60); // 60 second cooldown

    try {
      const result = await resendVerificationCode(userId, email, userType);

      if (result.error) {
        if (result.error.message?.includes('wait')) {
          setResendCooldown(60);
          Alert.alert(
            language === 'ar' ? 'انتظر' : 'Please Wait',
            t.resendWait,
            [{ text: t.ok }]
          );
        } else {
          Alert.alert(
            language === 'ar' ? 'خطأ' : 'Error',
            result.error.message || (language === 'ar' ? 'فشل إعادة الإرسال' : 'Failed to resend code'),
            [{ text: t.ok }]
          );
        }
      } else {
        // Clear current code
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setRemainingAttempts(5);

        Alert.alert(
          language === 'ar' ? 'تم الإرسال' : 'Code Sent',
          language === 'ar'
            ? 'تم إرسال رمز التحقق الجديد إلى بريدك الإلكتروني'
            : 'A new verification code has been sent to your email',
          [{ text: t.ok }]
        );
      }
    } catch (err) {
      console.error('Error resending code:', err);
      Alert.alert(
        language === 'ar' ? 'خطأ' : 'Error',
        language === 'ar' ? 'حدث خطأ أثناء إعادة الإرسال' : 'An error occurred while resending',
        [{ text: t.ok }]
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
        enabled={Platform.OS === 'ios'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
            disabled={loading}
          >
            <MaterialIcons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>

          {/* Language Switcher */}
          <View style={styles.languageContainer}>
            <TouchableOpacity style={styles.languageButton} activeOpacity={0.7}>
              <Text style={styles.languageIcon}>
                {language === 'en' ? '🇬🇧' : '🇲🇦'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="email" size={64} color="#3185FC" />
            </View>
            <Text style={[styles.title, language === 'ar' && styles.rtl]}>
              {t.title}
            </Text>
            <Text style={[styles.subtitle, language === 'ar' && styles.rtl]}>
              {t.subtitle}
            </Text>
            <Text style={[styles.emailText, language === 'ar' && styles.rtl]}>
              {email}
            </Text>
          </View>

          {/* Code Input */}
          <View style={styles.codeContainer}>
            <Text style={[styles.codeLabel, language === 'ar' && styles.rtl]}>
              {t.enterCode}
            </Text>
            <View style={styles.codeInputsContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[
                    styles.codeInput,
                    error && styles.codeInputError,
                    digit && !error && styles.codeInputFilled,
                  ]}
                  value={digit}
                  onChangeText={(value) => handleCodeChange(index, value)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(index, nativeEvent.key)
                  }
                  keyboardType="number-pad"
                  maxLength={1}
                  editable={!loading}
                  selectTextOnFocus
                  autoFocus={index === 0}
                />
              ))}
            </View>
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
            {remainingAttempts < 5 && remainingAttempts > 0 && (
              <Text style={styles.attemptsText}>
                {language === 'ar'
                  ? `محاولات متبقية: ${remainingAttempts}`
                  : `Remaining attempts: ${remainingAttempts}`}
              </Text>
            )}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              loading && styles.verifyButtonDisabled,
            ]}
            onPress={() => handleVerify()}
            disabled={loading || code.some((digit) => !digit)}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.verifyButtonText}>{t.verify}</Text>
            )}
          </TouchableOpacity>

          {/* Resend Code */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>
              {language === 'ar'
                ? 'لم تستلم الرمز؟'
                : "Didn't receive the code?"}
            </Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={resending || resendCooldown > 0}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.resendLink,
                  (resending || resendCooldown > 0) && styles.resendLinkDisabled,
                ]}
              >
                {resending
                  ? t.resending
                  : resendCooldown > 0
                    ? `${language === 'ar' ? 'إعادة الإرسال' : 'Resend'} (${resendCooldown}s)`
                    : t.resend}
              </Text>
            </TouchableOpacity>
          </View>
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
  backButton: {
    marginTop: Platform.OS === 'ios' ? 10 : 20,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  languageButton: {
    padding: 8,
  },
  languageIcon: {
    fontSize: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 48,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3185FC',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
  },
  emailText: {
    fontSize: 16,
    color: '#3185FC',
    fontWeight: '600',
    textAlign: 'center',
  },
  rtl: {
    textAlign: 'right',
  },
  codeContainer: {
    marginBottom: 32,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 16,
    textAlign: 'center',
  },
  codeInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  codeInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1A1A1A',
    backgroundColor: '#FFFFFF',
  },
  codeInputFilled: {
    borderColor: '#3185FC',
    backgroundColor: '#F0F7FF',
  },
  codeInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 8,
  },
  attemptsText: {
    fontSize: 12,
    color: '#F59E0B',
    textAlign: 'center',
    marginTop: 8,
  },
  verifyButton: {
    backgroundColor: '#3185FC',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#3185FC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  resendContainer: {
    alignItems: 'center',
    gap: 8,
  },
  resendText: {
    fontSize: 14,
    color: '#666666',
  },
  resendLink: {
    fontSize: 16,
    color: '#3185FC',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  resendLinkDisabled: {
    color: '#9CA3AF',
    textDecorationLine: 'none',
  },
});

export default EmailVerificationScreen;

