import React, { useState, useCallback, useRef, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import DriverRegistrationProgressBar from '../shared/components/driver/DriverRegistrationProgressBar';
import Select from '../shared/components/common/Select';
import MapLocationPickerModal from '../shared/components/common/MapLocationPickerModal';
import { createDriver } from '../shared/services/driverService';
import { createBus } from '../shared/services/busService';
import {
  createVerificationCode,
  verifyCode,
  resendVerificationCode,
} from '../shared/services/verificationService';
import {
  getValidationError,
  validateEmail,
  validatePhone,
  validateCIN,
  validateFullname,
  validateYear,
  validateCapacity,
  validateCoordinates,
} from '../shared/utils/validation';

const translations = {
  en: {
    // Step 1
    step1Title: 'Driver Information',
    step1Subtitle: 'Tell us about yourself',
    fullname: 'Full Name',
    fullnamePlaceholder: 'John Doe',
    email: 'Email Address',
    emailPlaceholder: 'john.doe@example.com',
    phone: 'Phone Number',
    phonePlaceholder: '0612345678',
    cin: 'CIN',
    cinPlaceholder: 'AB123456',
    next: 'Next',
    // Step 2
    step2Title: 'Bus Information',
    step2Subtitle: 'Tell us about your vehicle',
    busType: 'Bus Type',
    busTypePlaceholder: 'Select bus type',
    brand: 'Brand',
    brandPlaceholder: 'Select brand',
    model: 'Model',
    modelPlaceholder: 'Select model',
    year: 'Year',
    yearPlaceholder: 'Select year',
    plateNumber: 'Plate Number',
    plateNumberPlaceholder: 'ABC-1234',
    capacity: 'Capacity',
    capacityPlaceholder: 'Minimum 7',
    parkingLocation: 'Bus Parking Location',
    parkingLocationHelper: 'Tap to select location on map',
    save: 'Save & Continue',
    // Step 3
    step3Title: 'Verify Your Email',
    step3Subtitle: 'We sent a 6-digit code to',
    enterCode: 'Enter verification code',
    verify: 'Verify',
    verifying: 'Verifying...',
    resend: 'Resend Code',
    resending: 'Resending...',
    invalidCode: 'Invalid code',
    // Pending
    pendingTitle: 'Pending Approval',
    pendingSubtitle: 'Your account is under review',
    pendingMessage: 'Approval usually takes 24–48 hours',
    statusPending: 'PENDING',
  },
  ar: {
    // Step 1
    step1Title: 'معلومات السائق',
    step1Subtitle: 'أخبرنا عن نفسك',
    fullname: 'الاسم الكامل',
    fullnamePlaceholder: 'محمد أحمد',
    email: 'عنوان البريد الإلكتروني',
    emailPlaceholder: 'mohammed@example.com',
    phone: 'رقم الهاتف',
    phonePlaceholder: '0612345678',
    cin: 'رقم بطاقة التعريف الوطنية',
    cinPlaceholder: 'AB123456',
    next: 'التالي',
    // Step 2
    step2Title: 'معلومات الحافلة',
    step2Subtitle: 'أخبرنا عن مركبتك',
    busType: 'نوع الحافلة',
    busTypePlaceholder: 'اختر نوع الحافلة',
    brand: 'العلامة التجارية',
    brandPlaceholder: 'اختر العلامة التجارية',
    model: 'الموديل',
    modelPlaceholder: 'اختر الموديل',
    year: 'السنة',
    yearPlaceholder: 'اختر السنة',
    plateNumber: 'رقم اللوحة',
    plateNumberPlaceholder: 'ABC-1234',
    capacity: 'السعة',
    capacityPlaceholder: 'الحد الأدنى 7',
    parkingLocation: 'موقع وقوف الحافلة',
    parkingLocationHelper: 'اضغط لاختيار الموقع على الخريطة',
    save: 'حفظ ومتابعة',
    // Step 3
    step3Title: 'تحقق من بريدك الإلكتروني',
    step3Subtitle: 'أرسلنا رمزاً مكوناً من 6 أرقام إلى',
    enterCode: 'أدخل رمز التحقق',
    verify: 'تحقق',
    verifying: 'جاري التحقق...',
    resend: 'إعادة إرسال الرمز',
    resending: 'جاري إعادة الإرسال...',
    invalidCode: 'رمز غير صحيح',
    // Pending
    pendingTitle: 'قيد المراجعة',
    pendingSubtitle: 'حسابك قيد المراجعة',
    pendingMessage: 'عادة ما تستغرق الموافقة 24-48 ساعة',
    statusPending: 'قيد الانتظار',
  },
};

// Bus data options
const BUS_TYPES = [
  { value: 'Mini Bus', label: 'Mini Bus' },
  { value: 'Van', label: 'Van' },
  { value: 'Bus', label: 'Bus' },
];

const BRANDS = [
  { value: 'Toyota', label: 'Toyota' },
  { value: 'Mercedes', label: 'Mercedes' },
  { value: 'Ford', label: 'Ford' },
  { value: 'Hyundai', label: 'Hyundai' },
  { value: 'Other', label: 'Other' },
];

// Generate years from 1990 to current year
const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= 1990; year--) {
    years.push({ value: year.toString(), label: year.toString() });
  }
  return years;
};

const YEARS = generateYears();

// Models based on brand (simplified - in real app, this would be dynamic)
const MODELS = {
  Toyota: [
    { value: 'Hiace', label: 'Hiace' },
    { value: 'Coaster', label: 'Coaster' },
    { value: 'Other', label: 'Other' },
  ],
  Mercedes: [
    { value: 'Sprinter', label: 'Sprinter' },
    { value: 'Vito', label: 'Vito' },
    { value: 'Other', label: 'Other' },
  ],
  Ford: [
    { value: 'Transit', label: 'Transit' },
    { value: 'Tourneo', label: 'Tourneo' },
    { value: 'Other', label: 'Other' },
  ],
  Hyundai: [
    { value: 'H350', label: 'H350' },
    { value: 'Starex', label: 'Starex' },
    { value: 'Other', label: 'Other' },
  ],
  Other: [{ value: 'Other', label: 'Other' }],
};

// Input Field Component with Icon
const InputField = React.memo(
  ({
    field,
    label,
    placeholder,
    icon,
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
        <Text style={[styles.label, language === 'ar' && styles.rtl]}>{label}</Text>
        <View style={styles.inputWrapper}>
          {icon && (
            <MaterialIcons
              name={icon}
              size={20}
              color={value ? '#3185FC' : '#9CA3AF'}
              style={styles.inputIcon}
            />
          )}
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
        {hasError && <Text style={styles.errorText}>{hasError}</Text>}
        <View
          style={[
            styles.underline,
            hasError
              ? styles.underlineError
              : value
              ? styles.underlineActive
              : styles.underlineInactive,
          ]}
        />
      </View>
    );
  }
);

InputField.displayName = 'InputField';

const DriverRegistrationFlow = ({ language = 'en', onBack, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [slideAnim] = useState(new Animated.Value(0));

  // Step 1: Driver Information
  const [step1Data, setStep1Data] = useState({
    fullname: '',
    email: '',
    phone: '',
    cin: '',
  });
  const [step1Errors, setStep1Errors] = useState({});
  const [step1Touched, setStep1Touched] = useState({});
  const [step1Loading, setStep1Loading] = useState(false);

  // Step 2: Bus Information
  const [step2Data, setStep2Data] = useState({
    type: '',
    brand: '',
    model: '',
    year: '',
    plateNumber: '',
    capacity: '7',
    parkingLocation: null,
  });
  const [step2Errors, setStep2Errors] = useState({});
  const [step2Touched, setStep2Touched] = useState({});
  const [step2Loading, setStep2Loading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Step 3: Verification
  const [step3Code, setStep3Code] = useState(['', '', '', '', '', '']);
  const [step3Loading, setStep3Loading] = useState(false);
  const [step3Resending, setStep3Resending] = useState(false);
  const [step3Error, setStep3Error] = useState(null);
  const [step3ResendCooldown, setStep3ResendCooldown] = useState(0);
  const [driverId, setDriverId] = useState(null);
  const [driverEmail, setDriverEmail] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const step3InputRefs = useRef([]);

  const t = translations[language];

  // Animate step transitions
  useEffect(() => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  // Resend cooldown timer
  useEffect(() => {
    if (step3ResendCooldown > 0) {
      const timer = setTimeout(() => {
        setStep3ResendCooldown(step3ResendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [step3ResendCooldown]);

  // Initialize verification code when entering step 3
  useEffect(() => {
    if (currentStep === 3 && driverId && driverEmail && !isVerified) {
      initializeVerification();
    }
  }, [currentStep, driverId, driverEmail]);

  // Step 1: Validation
  const validateStep1Field = useCallback(
    (field) => {
      let error = null;

      switch (field) {
        case 'fullname':
          if (!step1Data.fullname.trim()) {
            error = getValidationError('fullname', '', language);
          } else if (!validateFullname(step1Data.fullname)) {
            error = getValidationError('fullname', step1Data.fullname, language);
          }
          break;
        case 'phone':
          if (!step1Data.phone.trim()) {
            error = getValidationError('phone', '', language);
          } else if (!validatePhone(step1Data.phone)) {
            error = getValidationError('phone', step1Data.phone, language);
          }
          break;
        case 'email':
          if (!step1Data.email.trim()) {
            error = getValidationError('email', '', language);
          } else if (!validateEmail(step1Data.email)) {
            error = getValidationError('email', step1Data.email, language);
          }
          break;
        case 'cin':
          if (!step1Data.cin.trim()) {
            error = getValidationError('cin', '', language);
          } else if (!validateCIN(step1Data.cin.toUpperCase())) {
            error = getValidationError('cin', step1Data.cin, language);
          }
          break;
      }

      if (error) {
        setStep1Errors((prev) => ({ ...prev, [field]: error }));
        return false;
      }

      setStep1Errors((prev) => ({ ...prev, [field]: null }));
      return true;
    },
    [step1Data, language]
  );

  const validateStep1 = () => {
    let isValid = true;
    const fields = ['fullname', 'phone', 'email', 'cin'];

    fields.forEach((field) => {
      setStep1Touched((prev) => ({ ...prev, [field]: true }));
      if (!validateStep1Field(field)) {
        isValid = false;
      }
    });

    return isValid;
  };

  // Step 1: Handle Next
  const handleStep1Next = async () => {
    if (!validateStep1()) {
      return;
    }

    setStep1Loading(true);

    const driverData = {
      fullname: step1Data.fullname.trim(),
      phone: step1Data.phone.trim(),
      email: step1Data.email.trim().toLowerCase(),
      cin: step1Data.cin.trim().toUpperCase(),
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
        setDriverId(data.id);
        setDriverEmail(data.email);
        setCurrentStep(2);
      }
    } catch (err) {
      console.error('Exception during registration:', err);
      Alert.alert(
        language === 'ar' ? 'خطأ' : 'Error',
        language === 'ar' ? 'حدث خطأ أثناء التسجيل' : 'An error occurred during registration',
        [{ text: language === 'ar' ? 'حسناً' : 'OK' }]
      );
    } finally {
      setStep1Loading(false);
    }
  };

  // Step 2: Validation
  const validateStep2Field = useCallback(
    (field) => {
      let error = null;

      switch (field) {
        case 'type':
          if (!step2Data.type.trim()) {
            error = getValidationError('type', '', language);
          }
          break;
        case 'brand':
          if (!step2Data.brand.trim()) {
            error = getValidationError('brand', '', language);
          }
          break;
        case 'model':
          if (!step2Data.model.trim()) {
            error = getValidationError('brand', '', language); // Reuse brand error
          }
          break;
        case 'year':
          if (!step2Data.year.trim()) {
            error = getValidationError('year', '', language);
          } else if (!validateYear(step2Data.year)) {
            error = getValidationError('year', step2Data.year, language);
          }
          break;
        case 'plateNumber':
          if (!step2Data.plateNumber.trim()) {
            error = getValidationError('plateNumber', '', language);
          }
          break;
        case 'capacity':
          if (!step2Data.capacity.trim()) {
            error = getValidationError('capacity', '', language);
          } else if (!validateCapacity(step2Data.capacity)) {
            error = getValidationError('capacity', step2Data.capacity, language);
          }
          break;
        case 'parkingLocation':
          if (!step2Data.parkingLocation) {
            error = getValidationError('location', null, language);
          } else if (
            !validateCoordinates(
              step2Data.parkingLocation.latitude,
              step2Data.parkingLocation.longitude
            )
          ) {
            error = getValidationError('location', null, language);
          }
          break;
      }

      if (error) {
        setStep2Errors((prev) => ({ ...prev, [field]: error }));
        return false;
      }

      setStep2Errors((prev) => ({ ...prev, [field]: null }));
      return true;
    },
    [step2Data, language]
  );

  const validateStep2 = () => {
    let isValid = true;
    const fields = ['type', 'brand', 'model', 'year', 'plateNumber', 'capacity', 'parkingLocation'];

    fields.forEach((field) => {
      setStep2Touched((prev) => ({ ...prev, [field]: true }));
      if (!validateStep2Field(field)) {
        isValid = false;
      }
    });

    return isValid;
  };

  // Step 2: Handle Save
  const handleStep2Save = async () => {
    if (!validateStep2()) {
      return;
    }

    if (!driverId) {
      Alert.alert(
        language === 'ar' ? 'خطأ' : 'Error',
        language === 'ar' ? 'معرف السائق غير موجود' : 'Driver ID is missing',
        [{ text: language === 'ar' ? 'حسناً' : 'OK' }]
      );
      return;
    }

    setStep2Loading(true);

    const busData = {
      driver_id: driverId,
      type: step2Data.type.trim(),
      brand: step2Data.brand.trim(),
      model: step2Data.model.trim(),
      year: parseInt(step2Data.year.trim(), 10),
      plate_number: step2Data.plateNumber.trim(),
      parking_location: {
        lat: step2Data.parkingLocation.latitude,
        lng: step2Data.parkingLocation.longitude,
      },
      capacity: parseInt(step2Data.capacity.trim(), 10),
    };

    try {
      const { data, error } = await createBus(busData);

      if (error) {
        Alert.alert(
          language === 'ar' ? 'خطأ' : 'Error',
          error.message || (language === 'ar' ? 'فشل حفظ المعلومات' : 'Failed to save bus information'),
          [{ text: language === 'ar' ? 'حسناً' : 'OK' }]
        );
      } else {
        setCurrentStep(3);
      }
    } catch (err) {
      console.error('Exception during save:', err);
      Alert.alert(
        language === 'ar' ? 'خطأ' : 'Error',
        language === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'An error occurred during save',
        [{ text: language === 'ar' ? 'حسناً' : 'OK' }]
      );
    } finally {
      setStep2Loading(false);
    }
  };

  // Step 3: Verification
  const initializeVerification = async () => {
    try {
      setStep3Loading(true);
      const result = await createVerificationCode(driverId, driverEmail, 'driver');
      if (result.error) {
        Alert.alert(
          language === 'ar' ? 'خطأ' : 'Error',
          result.error.message ||
            (language === 'ar' ? 'فشل إنشاء رمز التحقق' : 'Failed to create verification code'),
          [{ text: language === 'ar' ? 'حسناً' : 'OK' }]
        );
      }
    } catch (err) {
      console.error('Error initializing verification:', err);
    } finally {
      setStep3Loading(false);
    }
  };

  const handleStep3CodeChange = useCallback(
    (index, value) => {
      if (value && !/^\d$/.test(value)) {
        return;
      }

      const newCode = [...step3Code];
      newCode[index] = value;
      setStep3Code(newCode);
      setStep3Error(null);

      if (value && index < 5) {
        step3InputRefs.current[index + 1]?.focus();
      }

      if (newCode.every((digit) => digit !== '') && newCode.length === 6) {
        handleStep3Verify(newCode.join(''));
      }
    },
    [step3Code]
  );

  const handleStep3KeyPress = useCallback(
    (index, key) => {
      if (key === 'Backspace' && !step3Code[index] && index > 0) {
        step3InputRefs.current[index - 1]?.focus();
      }
    },
    [step3Code]
  );

  const handleStep3Verify = async (verificationCode = null) => {
    const codeToVerify = verificationCode || step3Code.join('');

    if (codeToVerify.length !== 6) {
      setStep3Error(t.invalidCode || 'Invalid code');
      return;
    }

    setStep3Loading(true);
    setStep3Error(null);

    try {
      const result = await verifyCode(driverId, codeToVerify, 'driver');

      if (result.success) {
        setIsVerified(true);
        // Call onSuccess to notify parent component
        if (onSuccess) {
          onSuccess({ driverId, email: driverEmail });
        }
      } else {
        const errorMessage = result.error?.message || (t.invalidCode || 'Invalid code');
        setStep3Error(errorMessage);
        setStep3Code(['', '', '', '', '', '']);
        step3InputRefs.current[0]?.focus();
      }
    } catch (err) {
      console.error('Error verifying code:', err);
      setStep3Error(language === 'ar' ? 'حدث خطأ' : 'An error occurred');
    } finally {
      setStep3Loading(false);
    }
  };

  const handleStep3Resend = async () => {
    if (step3ResendCooldown > 0) {
      return;
    }

    setStep3Resending(true);
    setStep3Error(null);
    setStep3ResendCooldown(60);

    try {
      const result = await resendVerificationCode(driverId, driverEmail, 'driver');

      if (result.error) {
        if (result.error.message?.includes('wait')) {
          setStep3ResendCooldown(60);
          Alert.alert(
            language === 'ar' ? 'انتظر' : 'Please Wait',
            language === 'ar' ? 'يرجى الانتظار قبل طلب رمز جديد' : 'Please wait before requesting a new code',
            [{ text: language === 'ar' ? 'حسناً' : 'OK' }]
          );
        } else {
          Alert.alert(
            language === 'ar' ? 'خطأ' : 'Error',
            result.error.message || (language === 'ar' ? 'فشل إعادة الإرسال' : 'Failed to resend code'),
            [{ text: language === 'ar' ? 'حسناً' : 'OK' }]
          );
        }
      } else {
        setStep3Code(['', '', '', '', '', '']);
        step3InputRefs.current[0]?.focus();
        Alert.alert(
          language === 'ar' ? 'تم الإرسال' : 'Code Sent',
          language === 'ar'
            ? 'تم إرسال رمز التحقق الجديد إلى بريدك الإلكتروني'
            : 'A new verification code has been sent to your email',
          [{ text: language === 'ar' ? 'حسناً' : 'OK' }]
        );
      }
    } catch (err) {
      console.error('Error resending code:', err);
      Alert.alert(
        language === 'ar' ? 'خطأ' : 'Error',
        language === 'ar' ? 'حدث خطأ أثناء إعادة الإرسال' : 'An error occurred while resending',
        [{ text: language === 'ar' ? 'حسناً' : 'OK' }]
      );
    } finally {
      setStep3Resending(false);
    }
  };

  // Get available models based on selected brand
  const getAvailableModels = () => {
    if (!step2Data.brand) {
      return [];
    }
    return MODELS[step2Data.brand] || MODELS.Other;
  };

  // Render Step 1
  const renderStep1 = () => {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, language === 'ar' && styles.rtl]}>
            {t.step1Title}
          </Text>
          <Text style={[styles.stepSubtitle, language === 'ar' && styles.rtl]}>
            {t.step1Subtitle}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <InputField
              field="fullname"
              label={t.fullname}
              placeholder={t.fullnamePlaceholder}
              icon="person"
              autoCapitalize="words"
              value={step1Data.fullname}
              hasError={step1Touched.fullname && step1Errors.fullname ? step1Errors.fullname : null}
              language={language}
              loading={step1Loading}
              onChangeText={(text) => {
                setStep1Data((prev) => ({ ...prev, fullname: text }));
                if (step1Errors.fullname) {
                  setStep1Errors((prev) => ({ ...prev, fullname: null }));
                }
              }}
              onBlur={() => {
                setStep1Touched((prev) => ({ ...prev, fullname: true }));
                validateStep1Field('fullname');
              }}
            />

            <InputField
              field="email"
              label={t.email}
              placeholder={t.emailPlaceholder}
              icon="email"
              keyboardType="email-address"
              value={step1Data.email}
              hasError={step1Touched.email && step1Errors.email ? step1Errors.email : null}
              language={language}
              loading={step1Loading}
              onChangeText={(text) => {
                setStep1Data((prev) => ({ ...prev, email: text }));
                if (step1Errors.email) {
                  setStep1Errors((prev) => ({ ...prev, email: null }));
                }
              }}
              onBlur={() => {
                setStep1Touched((prev) => ({ ...prev, email: true }));
                validateStep1Field('email');
              }}
            />

            <InputField
              field="phone"
              label={t.phone}
              placeholder={t.phonePlaceholder}
              icon="phone"
              keyboardType="phone-pad"
              value={step1Data.phone}
              hasError={step1Touched.phone && step1Errors.phone ? step1Errors.phone : null}
              language={language}
              loading={step1Loading}
              onChangeText={(text) => {
                setStep1Data((prev) => ({ ...prev, phone: text }));
                if (step1Errors.phone) {
                  setStep1Errors((prev) => ({ ...prev, phone: null }));
                }
              }}
              onBlur={() => {
                setStep1Touched((prev) => ({ ...prev, phone: true }));
                validateStep1Field('phone');
              }}
            />

            <InputField
              field="cin"
              label={t.cin}
              placeholder={t.cinPlaceholder}
              icon="badge"
              autoCapitalize="characters"
              value={step1Data.cin}
              hasError={step1Touched.cin && step1Errors.cin ? step1Errors.cin : null}
              language={language}
              loading={step1Loading}
              onChangeText={(text) => {
                setStep1Data((prev) => ({ ...prev, cin: text }));
                if (step1Errors.cin) {
                  setStep1Errors((prev) => ({ ...prev, cin: null }));
                }
              }}
              onBlur={() => {
                setStep1Touched((prev) => ({ ...prev, cin: true }));
                validateStep1Field('cin');
              }}
            />
          </View>
        </ScrollView>

        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              step1Loading && styles.nextButtonDisabled,
              (!step1Data.fullname ||
                !step1Data.email ||
                !step1Data.phone ||
                !step1Data.cin ||
                step1Loading) &&
                styles.nextButtonDisabled,
            ]}
            onPress={handleStep1Next}
            disabled={
              step1Loading ||
              !step1Data.fullname ||
              !step1Data.email ||
              !step1Data.phone ||
              !step1Data.cin
            }
            activeOpacity={0.8}
          >
            {step1Loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.nextButtonText}>{t.next}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render Step 2
  const renderStep2 = () => {
    const availableModels = getAvailableModels();

    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, language === 'ar' && styles.rtl]}>
            {t.step2Title}
          </Text>
          <Text style={[styles.stepSubtitle, language === 'ar' && styles.rtl]}>
            {t.step2Subtitle}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <Select
              label={t.busType}
              placeholder={t.busTypePlaceholder}
              value={step2Data.type}
              options={BUS_TYPES}
              onSelect={(value) => {
                setStep2Data((prev) => ({ ...prev, type: value }));
                if (step2Errors.type) {
                  setStep2Errors((prev) => ({ ...prev, type: null }));
                }
              }}
              icon="directions-bus"
              hasError={step2Touched.type && step2Errors.type ? step2Errors.type : null}
              language={language}
              disabled={step2Loading}
            />

            <Select
              label={t.brand}
              placeholder={t.brandPlaceholder}
              value={step2Data.brand}
              options={BRANDS}
              onSelect={(value) => {
                setStep2Data((prev) => ({ ...prev, brand: value, model: '' })); // Reset model when brand changes
                if (step2Errors.brand) {
                  setStep2Errors((prev) => ({ ...prev, brand: null }));
                }
              }}
              icon="local-offer"
              hasError={step2Touched.brand && step2Errors.brand ? step2Errors.brand : null}
              language={language}
              disabled={step2Loading}
            />

            <Select
              label={t.model}
              placeholder={t.modelPlaceholder}
              value={step2Data.model}
              options={availableModels}
              onSelect={(value) => {
                setStep2Data((prev) => ({ ...prev, model: value }));
                if (step2Errors.model) {
                  setStep2Errors((prev) => ({ ...prev, model: null }));
                }
              }}
              icon="build"
              hasError={step2Touched.model && step2Errors.model ? step2Errors.model : null}
              language={language}
              disabled={step2Loading || !step2Data.brand}
            />

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Select
                  label={t.year}
                  placeholder={t.yearPlaceholder}
                  value={step2Data.year}
                  options={YEARS}
                  onSelect={(value) => {
                    setStep2Data((prev) => ({ ...prev, year: value }));
                    if (step2Errors.year) {
                      setStep2Errors((prev) => ({ ...prev, year: null }));
                    }
                  }}
                  icon="calendar-today"
                  hasError={step2Touched.year && step2Errors.year ? step2Errors.year : null}
                  language={language}
                  disabled={step2Loading}
                />
              </View>

              <View style={styles.halfWidth}>
                <InputField
                  field="capacity"
                  label={t.capacity}
                  placeholder={t.capacityPlaceholder}
                  icon="people"
                  keyboardType="numeric"
                  value={step2Data.capacity}
                  hasError={
                    step2Touched.capacity && step2Errors.capacity ? step2Errors.capacity : null
                  }
                  language={language}
                  loading={step2Loading}
                  onChangeText={(text) => {
                    setStep2Data((prev) => ({ ...prev, capacity: text }));
                    if (step2Errors.capacity) {
                      setStep2Errors((prev) => ({ ...prev, capacity: null }));
                    }
                  }}
                  onBlur={() => {
                    setStep2Touched((prev) => ({ ...prev, capacity: true }));
                    validateStep2Field('capacity');
                  }}
                />
              </View>
            </View>

            <InputField
              field="plateNumber"
              label={t.plateNumber}
              placeholder={t.plateNumberPlaceholder}
              icon="confirmation-number"
              autoCapitalize="characters"
              value={step2Data.plateNumber}
              hasError={
                step2Touched.plateNumber && step2Errors.plateNumber
                  ? step2Errors.plateNumber
                  : null
              }
              language={language}
              loading={step2Loading}
              onChangeText={(text) => {
                setStep2Data((prev) => ({ ...prev, plateNumber: text }));
                if (step2Errors.plateNumber) {
                  setStep2Errors((prev) => ({ ...prev, plateNumber: null }));
                }
              }}
              onBlur={() => {
                setStep2Touched((prev) => ({ ...prev, plateNumber: true }));
                validateStep2Field('plateNumber');
              }}
            />

            <View style={styles.locationContainer}>
              <Text style={[styles.label, language === 'ar' && styles.rtl]}>
                {t.parkingLocation}
              </Text>
              <TouchableOpacity
                style={[
                  styles.locationButton,
                  step2Touched.parkingLocation &&
                    step2Errors.parkingLocation &&
                    styles.locationButtonError,
                ]}
                onPress={() => setShowMapPicker(true)}
                disabled={step2Loading}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="location-on"
                  size={20}
                  color={step2Data.parkingLocation ? '#3185FC' : '#9CA3AF'}
                  style={styles.locationButtonIcon}
                />
                <Text
                  style={[
                    styles.locationButtonText,
                    !step2Data.parkingLocation && styles.locationButtonTextPlaceholder,
                    language === 'ar' && styles.rtl,
                  ]}
                >
                  {step2Data.parkingLocation
                    ? `${step2Data.parkingLocation.latitude.toFixed(4)}, ${step2Data.parkingLocation.longitude.toFixed(4)}`
                    : t.parkingLocationHelper}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              {step2Touched.parkingLocation && step2Errors.parkingLocation && (
                <Text style={styles.errorText}>{step2Errors.parkingLocation}</Text>
              )}
              <View
                style={[
                  styles.underline,
                  step2Touched.parkingLocation && step2Errors.parkingLocation
                    ? styles.underlineError
                    : step2Data.parkingLocation
                    ? styles.underlineActive
                    : styles.underlineInactive,
                ]}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.nextButton, step2Loading && styles.nextButtonDisabled]}
            onPress={handleStep2Save}
            disabled={step2Loading}
            activeOpacity={0.8}
          >
            {step2Loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.nextButtonText}>{t.save}</Text>
            )}
          </TouchableOpacity>
        </View>

        <MapLocationPickerModal
          visible={showMapPicker}
          value={step2Data.parkingLocation}
          onSelect={(location) => {
            setStep2Data((prev) => ({ ...prev, parkingLocation: location }));
            setStep2Touched((prev) => ({ ...prev, parkingLocation: true }));
            if (step2Errors.parkingLocation) {
              setStep2Errors((prev) => ({ ...prev, parkingLocation: null }));
            }
          }}
          onClose={() => setShowMapPicker(false)}
          language={language}
          error={step2Touched.parkingLocation && step2Errors.parkingLocation ? step2Errors.parkingLocation : null}
        />
      </View>
    );
  };

  // Render Step 3: Verification
  const renderStep3 = () => {
    if (isVerified) {
      // Pending Approval Screen
      return (
        <View style={styles.stepContainer}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, styles.pendingContainer]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.pendingIconContainer}>
              <MaterialIcons name="pending" size={80} color="#F59E0B" />
            </View>
            <Text style={[styles.pendingTitle, language === 'ar' && styles.rtl]}>
              {t.pendingTitle}
            </Text>
            <Text style={[styles.pendingSubtitle, language === 'ar' && styles.rtl]}>
              {t.pendingSubtitle}
            </Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{t.statusPending}</Text>
            </View>
            <Text style={[styles.pendingMessage, language === 'ar' && styles.rtl]}>
              {t.pendingMessage}
            </Text>
          </ScrollView>
        </View>
      );
    }

    // OTP Verification Screen
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <View style={styles.verificationIconContainer}>
            <MaterialIcons name="email" size={64} color="#3185FC" />
          </View>
          <Text style={[styles.stepTitle, language === 'ar' && styles.rtl]}>
            {t.step3Title}
          </Text>
          <Text style={[styles.stepSubtitle, language === 'ar' && styles.rtl]}>
            {t.step3Subtitle}
          </Text>
          {driverEmail && (
            <Text style={[styles.emailText, language === 'ar' && styles.rtl]}>
              {driverEmail}
            </Text>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.codeContainer}>
            <Text style={[styles.codeLabel, language === 'ar' && styles.rtl]}>
              {t.enterCode}
            </Text>
            <View style={styles.codeInputsContainer}>
              {step3Code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (step3InputRefs.current[index] = ref)}
                  style={[
                    styles.codeInput,
                    step3Error && styles.codeInputError,
                    digit && !step3Error && styles.codeInputFilled,
                  ]}
                  value={digit}
                  onChangeText={(value) => handleStep3CodeChange(index, value)}
                  onKeyPress={({ nativeEvent }) =>
                    handleStep3KeyPress(index, nativeEvent.key)
                  }
                  keyboardType="number-pad"
                  maxLength={1}
                  editable={!step3Loading}
                  selectTextOnFocus
                  autoFocus={index === 0}
                />
              ))}
            </View>
            {step3Error && <Text style={styles.errorText}>{step3Error}</Text>}
          </View>

          <TouchableOpacity
            style={[
              styles.verifyButton,
              step3Loading && styles.verifyButtonDisabled,
            ]}
            onPress={() => handleStep3Verify()}
            disabled={step3Loading || step3Code.some((digit) => !digit)}
            activeOpacity={0.8}
          >
            {step3Loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.verifyButtonText}>{t.verify}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>
              {language === 'ar' ? 'لم تستلم الرمز؟' : "Didn't receive the code?"}
            </Text>
            <TouchableOpacity
              onPress={handleStep3Resend}
              disabled={step3Resending || step3ResendCooldown > 0}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.resendLink,
                  (step3Resending || step3ResendCooldown > 0) && styles.resendLinkDisabled,
                ]}
              >
                {step3Resending
                  ? t.resending
                  : step3ResendCooldown > 0
                  ? `${language === 'ar' ? 'إعادة الإرسال' : 'Resend'} (${step3ResendCooldown}s)`
                  : t.resend}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
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
            disabled={step1Loading || step2Loading || step3Loading}
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

        {/* Progress Bar */}
        <DriverRegistrationProgressBar currentStep={currentStep} totalSteps={3} language={language} />

        {/* Step Content */}
        <Animated.View
          style={[
            styles.stepWrapper,
            {
              opacity: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1],
              }),
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </Animated.View>
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
  stepWrapper: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  stepHeader: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  stepTitle: {
    fontSize: 32,
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
  inputIcon: {
    marginRight: 12,
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
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  locationContainer: {
    marginBottom: 24,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  locationButtonIcon: {
    marginRight: 12,
  },
  locationButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  locationButtonTextPlaceholder: {
    color: '#999999',
  },
  locationButtonError: {
    // Error styling handled by underline
  },
  navigationContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  nextButton: {
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
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  // Step 3 Styles
  verificationIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    alignSelf: 'center',
  },
  emailText: {
    fontSize: 16,
    color: '#3185FC',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
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
  // Pending Approval Styles
  pendingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  pendingIconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  pendingTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3185FC',
    marginBottom: 12,
    textAlign: 'center',
  },
  pendingSubtitle: {
    fontSize: 18,
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pendingMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 40,
  },
});

export default DriverRegistrationFlow;

