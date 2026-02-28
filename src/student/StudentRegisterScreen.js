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
import { useStudent } from '../shared/hooks/useStudent';
import { getValidationError, validateEmail, validatePhone, validateCIN, validateFullname, validateCoordinates } from '../shared/utils/validation';
import StepIndicator from '../shared/components/common/StepIndicator';
import SchoolPicker from '../shared/components/student/SchoolPicker';
import MapLocationPicker from '../shared/components/common/MapLocationPicker';
import SchoolMapCard from '../shared/components/common/SchoolMapCard';
import { getSchoolById } from '../shared/services/schoolService';

const translations = {
  en: {
    step1Title: 'Personal Information',
    step1Subtitle: 'Tell us about yourself',
    step2Title: 'Select Your School',
    step2Subtitle: 'Choose your university',
    step3Title: 'Set Your Location',
    step3Subtitle: 'Select your home location on the map',
    fullname: 'Full Name',
    fullnamePlaceholder: 'John Doe',
    phone: 'Phone Number',
    phonePlaceholder: '0612345678',
    email: 'Email Address',
    emailPlaceholder: 'john.doe@example.com',
    cin: 'CIN',
    cinPlaceholder: 'AB123456',
    next: 'Next',
    previous: 'Previous',
    register: 'Register',
    registering: 'Registering...',
    success: 'Registration Successful',
    successMessage: 'Your account has been created successfully!',
    ok: 'OK',
  },
  ar: {
    step1Title: 'المعلومات الشخصية',
    step1Subtitle: 'أخبرنا عن نفسك',
    step2Title: 'اختر مدرستك',
    step2Subtitle: 'اختر جامعتك',
    step3Title: 'حدد موقعك',
    step3Subtitle: 'اختر موقع منزلك على الخريطة',
    fullname: 'الاسم الكامل',
    fullnamePlaceholder: 'محمد أحمد',
    phone: 'رقم الهاتف',
    phonePlaceholder: '0612345678',
    email: 'عنوان البريد الإلكتروني',
    emailPlaceholder: 'mohammed@example.com',
    cin: 'رقم بطاقة التعريف الوطنية',
    cinPlaceholder: 'AB123456',
    next: 'التالي',
    previous: 'السابق',
    register: 'تسجيل',
    registering: 'جاري التسجيل...',
    success: 'تم التسجيل بنجاح',
    successMessage: 'تم إنشاء حسابك بنجاح!',
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

const StudentRegisterScreen = ({ language = 'en', onBack, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    fullname: '',
    phone: '',
    email: '',
    cin: '',
    school: '',
    homeLocation: null,
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [loadingSchool, setLoadingSchool] = useState(false);
  const { registerStudent, loading } = useStudent();

  const t = translations[language];
  const totalSteps = 3;

  const handleInputChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (prev[field]) {
        return { ...prev, [field]: null };
      }
      return prev;
    });

    // Fetch school details when school is selected
    if (field === 'school' && value) {
      fetchSchoolDetails(value);
    } else if (field === 'school' && !value) {
      setSelectedSchool(null);
    }
  }, []);

  const fetchSchoolDetails = useCallback(async (schoolId) => {
    setLoadingSchool(true);
    try {
      const result = await getSchoolById(schoolId);
      if (result.data) {
        setSelectedSchool(result.data);
      } else {
        setSelectedSchool(null);
      }
    } catch (error) {
      console.error('Error fetching school details:', error);
      setSelectedSchool(null);
    } finally {
      setLoadingSchool(false);
    }
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
      case 'school':
        if (!formData.school) {
          error = getValidationError('school', '', language);
        }
        break;
      case 'homeLocation':
        if (!formData.homeLocation) {
          error = getValidationError('location', null, language);
        } else if (!validateCoordinates(formData.homeLocation.latitude, formData.homeLocation.longitude)) {
          error = getValidationError('location', null, language);
        }
        break;
    }

    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
      return false;
    }

    return true;
  }, [formData, language]);

  const validateStep = (step) => {
    let isValid = true;
    const fields = {
      1: ['fullname', 'phone', 'email', 'cin'],
      2: ['school'],
      3: ['homeLocation'],
    };

    fields[step].forEach((field) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      if (!validateField(field)) {
        isValid = false;
      }
    });

    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRegister = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    const studentData = {
      fullname: formData.fullname.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim().toLowerCase(),
      cin: formData.cin.trim().toUpperCase(),
      school: formData.school,
      homeLocation: formData.homeLocation,
    };

    const result = await registerStudent(studentData);

    if (result.success) {
      Alert.alert(
        t.success,
        t.successMessage,
        [
          {
            text: t.ok,
            onPress: () => {
              if (onSuccess) {
                onSuccess(result.data);
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        language === 'ar' ? 'خطأ' : 'Error',
        result.error?.message || (language === 'ar' ? 'فشل التسجيل' : 'Registration failed'),
        [{ text: language === 'ar' ? 'حسناً' : 'OK' }]
      );
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Text style={[styles.stepTitle, language === 'ar' && styles.rtl]}>
                {t.step1Title}
              </Text>
              <Text style={[styles.stepSubtitle, language === 'ar' && styles.rtl]}>
                {t.step1Subtitle}
              </Text>
            </View>

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
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Text style={[styles.stepTitle, language === 'ar' && styles.rtl]}>
                {t.step2Title}
              </Text>
              <Text style={[styles.stepSubtitle, language === 'ar' && styles.rtl]}>
                {t.step2Subtitle}
              </Text>
            </View>

            <View style={styles.formContainer}>
              <SchoolPicker
                value={formData.school}
                onSelect={(schoolId) => {
                  handleInputChange('school', schoolId);
                  setTouched((prev) => ({ ...prev, school: true }));
                }}
                language={language}
                error={touched.school && errors.school ? errors.school : null}
                disabled={loading}
              />

              {/* Display school map card after selection */}
              {selectedSchool && (
                <SchoolMapCard
                  school={selectedSchool}
                  language={language}
                />
              )}

              {loadingSchool && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#3185FC" />
                  <Text style={styles.loadingText}>
                    {language === 'ar' ? 'جاري تحميل موقع المدرسة...' : 'Loading school location...'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <Text style={[styles.stepTitle, language === 'ar' && styles.rtl]}>
                {t.step3Title}
              </Text>
              <Text style={[styles.stepSubtitle, language === 'ar' && styles.rtl]}>
                {t.step3Subtitle}
              </Text>
            </View>

            <View style={styles.formContainer}>
              <MapLocationPicker
                value={formData.homeLocation}
                onSelect={(location) => {
                  handleInputChange('homeLocation', location);
                  setTouched((prev) => ({ ...prev, homeLocation: true }));
                }}
                language={language}
                error={touched.homeLocation && errors.homeLocation ? errors.homeLocation : null}
                disabled={loading}
              />
            </View>
          </View>
        );

      default:
        return null;
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

        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} totalSteps={totalSteps} language={language} />

        {/* Step Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {renderStepContent()}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.previousButton}
              onPress={handlePrevious}
              disabled={loading}
              activeOpacity={0.8}
            >
              <MaterialIcons name="arrow-back" size={20} color="#3185FC" />
              <Text style={styles.previousButtonText}>{t.previous}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.nextButton,
              loading && styles.nextButtonDisabled,
              currentStep > 1 && styles.nextButtonWithMargin,
            ]}
            onPress={currentStep === totalSteps ? handleRegister : handleNext}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
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
                    style={styles.nextButtonIcon}
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    marginBottom: 32,
    marginTop: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3185FC',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
  },
  rtl: {
    textAlign: 'right',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  previousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3185FC',
    gap: 8,
  },
  previousButtonText: {
    color: '#3185FC',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
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
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonWithMargin: {
    marginLeft: 12,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  nextButtonIcon: {
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
  },
});

export default StudentRegisterScreen;
