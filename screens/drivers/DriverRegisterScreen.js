import React, { useState, useCallback } from 'react';
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
import { createDriver } from '../../src/services/driverService';
import { getValidationError, validateEmail, validatePhone, validateCIN, validateFullname } from '../../src/utils/validation';

const translations = {
  en: {
    title: 'Driver Registration',
    subtitle: 'Create your driver account',
    fullname: 'Full Name',
    fullnamePlaceholder: 'John Doe',
    phone: 'Phone Number',
    phonePlaceholder: '0612345678',
    email: 'Email Address',
    emailPlaceholder: 'john.doe@example.com',
    cin: 'CIN',
    cinPlaceholder: 'AB123456',
    register: 'Register',
    registering: 'Registering...',
    success: 'Registration Successful',
    successMessage: 'Your driver account has been created successfully!',
    ok: 'OK',
  },
  ar: {
    title: 'تسجيل السائق',
    subtitle: 'أنشئ حساب السائق الخاص بك',
    fullname: 'الاسم الكامل',
    fullnamePlaceholder: 'محمد أحمد',
    phone: 'رقم الهاتف',
    phonePlaceholder: '0612345678',
    email: 'عنوان البريد الإلكتروني',
    emailPlaceholder: 'mohammed@example.com',
    cin: 'رقم بطاقة التعريف الوطنية',
    cinPlaceholder: 'AB123456',
    register: 'تسجيل',
    registering: 'جاري التسجيل...',
    success: 'تم التسجيل بنجاح',
    successMessage: 'تم إنشاء حساب السائق بنجاح!',
    ok: 'حسناً',
  },
};

// Memoized InputField component
const InputField = React.memo(({ 
  field, 
  label, 
  placeholder, 
  keyboardType = 'default', 
  autoCapitalize = 'none',
  value,
  hasError,
  language,
  loading,
  onChangeText,
  onBlur,
}) => {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            hasError && styles.inputError,
            language === 'ar' && styles.rtl,
          ]}
          placeholder={placeholder}
          placeholderTextColor="#999999"
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={!loading}
          blurOnSubmit={false}
          returnKeyType="next"
        />
      </View>
      {hasError && (
        <Text style={styles.errorText}>{hasError}</Text>
      )}
      <View
        style={[
          styles.underline,
          hasError ? styles.underlineError : value ? styles.underlineActive : styles.underlineInactive,
        ]}
      />
    </View>
  );
});

InputField.displayName = 'InputField';

const DriverRegisterScreen = ({ language = 'en', onBack, onSuccess }) => {
  const [formData, setFormData] = useState({
    fullname: '',
    phone: '',
    email: '',
    cin: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);

  const t = translations[language];

  const handleInputChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (prev[field]) {
        return { ...prev, [field]: null };
      }
      return prev;
    });
  }, []);

  const handleBlur = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setTimeout(() => {
      validateField(field);
    }, 0);
  }, [formData, language]);

  const validateField = useCallback((field) => {
    let error = null;

    switch (field) {
      case 'fullname':
        if (!formData.fullname.trim()) {
          error = getValidationError('fullname', '', language);
        } else if (!validateFullname(formData.fullname)) {
          error = getValidationError('fullname', formData.fullname, language);
        }
        break;
      case 'phone':
        if (!formData.phone.trim()) {
          error = getValidationError('phone', '', language);
        } else if (!validatePhone(formData.phone)) {
          error = getValidationError('phone', formData.phone, language);
        }
        break;
      case 'email':
        if (!formData.email.trim()) {
          error = getValidationError('email', '', language);
        } else if (!validateEmail(formData.email)) {
          error = getValidationError('email', formData.email, language);
        }
        break;
      case 'cin':
        if (!formData.cin.trim()) {
          error = getValidationError('cin', '', language);
        } else if (!validateCIN(formData.cin.toUpperCase())) {
          error = getValidationError('cin', formData.cin, language);
        }
        break;
    }

    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
      return false;
    }

    return true;
  }, [formData, language]);

  const validateForm = () => {
    let isValid = true;
    const fields = ['fullname', 'phone', 'email', 'cin'];

    fields.forEach((field) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      if (!validateField(field)) {
        isValid = false;
      }
    });

    return isValid;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const driverData = {
      fullname: formData.fullname.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim().toLowerCase(),
      cin: formData.cin.trim().toUpperCase(),
    };

    try {
      const { data, error } = await createDriver(driverData);

      if (error) {
        Alert.alert(
          language === 'ar' ? 'خطأ' : 'Error',
          error.message || (language === 'ar' ? 'فشل التسجيل' : 'Registration failed'),
          [{ text: language === 'ar' ? 'حسناً' : 'OK' }]
        );
      } else {
        Alert.alert(
          t.success,
          t.successMessage,
          [
            {
              text: t.ok,
              onPress: () => {
                if (onSuccess) {
                  onSuccess(data);
                }
              },
            },
          ]
        );
      }
    } catch (err) {
      console.error('Exception during registration:', err);
      Alert.alert(
        language === 'ar' ? 'خطأ' : 'Error',
        language === 'ar' ? 'حدث خطأ أثناء التسجيل' : 'An error occurred during registration',
        [{ text: language === 'ar' ? 'حسناً' : 'OK' }]
      );
    } finally {
      setLoading(false);
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
            disabled={loading}
          >
            <MaterialIcons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>

          <View style={styles.languageContainer}>
            <TouchableOpacity style={styles.languageButton} activeOpacity={0.7}>
              <Text style={styles.languageIcon}>
                {language === 'en' ? '🇬🇧' : '🇲🇦'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, language === 'ar' && styles.rtl]}>
            {t.title}
          </Text>
          <Text style={[styles.subtitle, language === 'ar' && styles.rtl]}>
            {t.subtitle}
          </Text>
        </View>

        {/* Form Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formContainer}>
            <InputField
              field="fullname"
              label={t.fullname}
              placeholder={t.fullnamePlaceholder}
              autoCapitalize="words"
              value={formData.fullname}
              hasError={touched.fullname && errors.fullname ? errors.fullname : null}
              language={language}
              loading={loading}
              onChangeText={(text) => handleInputChange('fullname', text)}
              onBlur={() => handleBlur('fullname')}
            />

            <InputField
              field="phone"
              label={t.phone}
              placeholder={t.phonePlaceholder}
              keyboardType="phone-pad"
              value={formData.phone}
              hasError={touched.phone && errors.phone ? errors.phone : null}
              language={language}
              loading={loading}
              onChangeText={(text) => handleInputChange('phone', text)}
              onBlur={() => handleBlur('phone')}
            />

            <InputField
              field="email"
              label={t.email}
              placeholder={t.emailPlaceholder}
              keyboardType="email-address"
              value={formData.email}
              hasError={touched.email && errors.email ? errors.email : null}
              language={language}
              loading={loading}
              onChangeText={(text) => handleInputChange('email', text)}
              onBlur={() => handleBlur('email')}
            />

            <InputField
              field="cin"
              label={t.cin}
              placeholder={t.cinPlaceholder}
              autoCapitalize="characters"
              value={formData.cin}
              hasError={touched.cin && errors.cin ? errors.cin : null}
              language={language}
              loading={loading}
              onChangeText={(text) => handleInputChange('cin', text)}
              onBlur={() => handleBlur('cin')}
            />
          </View>
        </ScrollView>

        {/* Register Button */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.registerButtonText}>{t.register}</Text>
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
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 4,
  },
  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  languageButton: {
    padding: 8,
  },
  languageIcon: {
    fontSize: 24,
  },
  titleContainer: {
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3185FC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
  },
  rtl: {
    textAlign: 'right',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  formContainer: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    paddingVertical: 12,
    paddingRight: 0,
  },
  inputError: {
    color: '#EF4444',
  },
  underline: {
    height: 2,
    marginTop: 4,
  },
  underlineActive: {
    backgroundColor: '#3185FC',
  },
  underlineInactive: {
    backgroundColor: '#E0E0E0',
  },
  underlineError: {
    backgroundColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  navigationContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3185FC',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#3185FC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default DriverRegisterScreen;

