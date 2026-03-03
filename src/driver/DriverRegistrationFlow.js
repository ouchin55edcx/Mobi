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
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { UbuntuFonts } from "../shared/utils/fonts";
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
    isFocused,
    onFocus,
  }) => {
    return (
      <View style={styles.inputGroup}>
        <Text style={[
          styles.label,
          isFocused && styles.labelFocused,
          hasError && styles.labelError,
          language === 'ar' && styles.rtlText
        ]}>
          {label}
        </Text>
        <View style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          hasError && styles.inputWrapperError,
          language === 'ar' && styles.rtlRow
        ]}>
          <MaterialIcons
            name={icon}
            size={20}
            color={hasError ? "#EF4444" : isFocused ? "#3185FC" : "#94A3B8"}
            style={styles.inputIcon}
          />
          <TextInput
            style={[
              styles.input,
              language === 'ar' && styles.rtlText
            ]}
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
  }
);

InputField.displayName = 'InputField';

const DriverRegistrationFlow = ({ language = 'en', onBack, onSuccess, onLanguageChange }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [activeField, setActiveField] = useState(null);

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

    // Reset animations when moving to next step
    return () => {
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
    };
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

  // Step 2: Input Change Handler
  const handleStep2InputChange = (field, value) => {
    setStep2Data((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'brand' ? { model: '' } : {}), // Reset model when brand changes
    }));
    if (step2Errors[field]) {
      setStep2Errors((prev) => ({ ...prev, [field]: null }));
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
          <Text style={[styles.stepTitle, language === 'ar' && styles.rtlText]}>{t.step1Title}</Text>
          <Text style={[styles.stepSubtitle, language === 'ar' && styles.rtlText]}>{t.step1Subtitle}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <InputField
              label={t.fullname} placeholder={t.fullnamePlaceholder} icon="person-outline"
              autoCapitalize="words" value={step1Data.fullname}
              hasError={step1Touched.fullname && step1Errors.fullname}
              language={language} loading={step1Loading}
              onFocus={() => setActiveField('fullname')}
              onBlur={() => { setActiveField(null); setStep1Touched(p => ({ ...p, fullname: true })); validateStep1Field('fullname'); }}
              onChangeText={text => {
                setStep1Data(p => ({ ...p, fullname: text }));
                if (step1Errors.fullname) setStep1Errors(p => ({ ...p, fullname: null }));
              }}
              isFocused={activeField === 'fullname'}
            />

            <InputField
              label={t.email} placeholder={t.emailPlaceholder} icon="alternate-email"
              keyboardType="email-address" value={step1Data.email}
              hasError={step1Touched.email && step1Errors.email}
              language={language} loading={step1Loading}
              onFocus={() => setActiveField('email')}
              onBlur={() => { setActiveField(null); setStep1Touched(p => ({ ...p, email: true })); validateStep1Field('email'); }}
              onChangeText={text => {
                setStep1Data(p => ({ ...p, email: text }));
                if (step1Errors.email) setStep1Errors(p => ({ ...p, email: null }));
              }}
              isFocused={activeField === 'email'}
            />

            <InputField
              label={t.phone} placeholder={t.phonePlaceholder} icon="phone-android"
              keyboardType="phone-pad" value={step1Data.phone}
              hasError={step1Touched.phone && step1Errors.phone}
              language={language} loading={step1Loading}
              onFocus={() => setActiveField('phone')}
              onBlur={() => { setActiveField(null); setStep1Touched(p => ({ ...p, phone: true })); validateStep1Field('phone'); }}
              onChangeText={text => {
                setStep1Data(p => ({ ...p, phone: text }));
                if (step1Errors.phone) setStep1Errors(p => ({ ...p, phone: null }));
              }}
              isFocused={activeField === 'phone'}
            />

            <InputField
              label={t.cin} placeholder={t.cinPlaceholder} icon="badge"
              autoCapitalize="characters" value={step1Data.cin}
              hasError={step1Touched.cin && step1Errors.cin}
              language={language} loading={step1Loading}
              onFocus={() => setActiveField('cin')}
              onBlur={() => { setActiveField(null); setStep1Touched(p => ({ ...p, cin: true })); validateStep1Field('cin'); }}
              onChangeText={text => {
                setStep1Data(p => ({ ...p, cin: text }));
                if (step1Errors.cin) setStep1Errors(p => ({ ...p, cin: null }));
              }}
              isFocused={activeField === 'cin'}
            />
          </View>
        </ScrollView>

        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.nextButton, (step1Loading || !step1Data.fullname || !step1Data.email || !step1Data.phone || !step1Data.cin) && styles.nextButtonDisabled]}
            onPress={handleStep1Next}
            disabled={step1Loading || !step1Data.fullname || !step1Data.email || !step1Data.phone || !step1Data.cin}
            activeOpacity={0.8}
          >
            {step1Loading ? <ActivityIndicator color="#FFFFFF" /> : (
              <>
                <Text style={styles.nextButtonText}>{t.next}</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render Step 2
  const renderStep2 = () => {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, language === 'ar' && styles.rtlText]}>{t.step2Title}</Text>
          <Text style={[styles.stepSubtitle, language === 'ar' && styles.rtlText]}>{t.step2Subtitle}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <Select
              label={t.busType} placeholder={t.busTypePlaceholder} options={BUS_TYPES}
              value={step2Data.type} onSelect={val => handleStep2InputChange('type', val)}
              error={step2Touched.type && step2Errors.type} language={language}
            />
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Select
                  label={t.brand} placeholder={t.brandPlaceholder} options={BRANDS}
                  value={step2Data.brand} onSelect={val => handleStep2InputChange('brand', val)}
                  error={step2Touched.brand && step2Errors.brand} language={language}
                />
              </View>
              <View style={{ width: 16 }} />
              <View style={styles.flex1}>
                <Select
                  label={t.model} placeholder={t.modelPlaceholder} options={getAvailableModels()}
                  value={step2Data.model} onSelect={val => handleStep2InputChange('model', val)}
                  error={step2Touched.model && step2Errors.model} language={language}
                  disabled={!step2Data.brand}
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Select
                  label={t.year} placeholder={t.yearPlaceholder} options={YEARS}
                  value={step2Data.year} onSelect={val => handleStep2InputChange('year', val)}
                  error={step2Touched.year && step2Errors.year} language={language}
                />
              </View>
              <View style={{ width: 16 }} />
              <View style={styles.flex1}>
                <InputField
                  label={t.capacity} placeholder={t.capacityPlaceholder} icon="people-outline"
                  keyboardType="number-pad" value={step2Data.capacity}
                  hasError={step2Touched.capacity && step2Errors.capacity} language={language}
                  onFocus={() => setActiveField('capacity')} onBlur={() => { setActiveField(null); setStep2Touched(p => ({ ...p, capacity: true })); validateStep2Field('capacity'); }}
                  onChangeText={v => handleStep2InputChange('capacity', v)} isFocused={activeField === 'capacity'}
                />
              </View>
            </View>

            <InputField
              label={t.plateNumber} placeholder={t.plateNumberPlaceholder} icon="directions-bus"
              autoCapitalize="characters" value={step2Data.plateNumber}
              hasError={step2Touched.plateNumber && step2Errors.plateNumber} language={language}
              onFocus={() => setActiveField('plateNumber')} onBlur={() => { setActiveField(null); setStep2Touched(p => ({ ...p, plateNumber: true })); validateStep2Field('plateNumber'); }}
              onChangeText={v => handleStep2InputChange('plateNumber', v)} isFocused={activeField === 'plateNumber'}
            />

            <View style={styles.locationContainer}>
              <Text style={[styles.label, language === 'ar' && styles.rtlText]}>{t.parkingLocation}</Text>
              <TouchableOpacity
                style={[styles.locationButton, step2Touched.parkingLocation && step2Errors.parkingLocation && styles.locationButtonError]}
                onPress={() => setShowMapPicker(true)} activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="map-marker-radius-outline" size={22}
                  color={step2Data.parkingLocation ? '#3185FC' : '#94A3B8'}
                />
                <Text style={[styles.locationButtonText, !step2Data.parkingLocation && styles.locationButtonTextPlaceholder, language === 'ar' && styles.rtlText]}>
                  {step2Data.parkingLocation ? `${step2Data.parkingLocation.latitude.toFixed(4)}, ${step2Data.parkingLocation.longitude.toFixed(4)}` : t.parkingLocationHelper}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
              </TouchableOpacity>
              {step2Touched.parkingLocation && step2Errors.parkingLocation && <Text style={styles.errorText}>{step2Errors.parkingLocation}</Text>}
            </View>
          </View>
        </ScrollView>

        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.nextButton, step2Loading && styles.nextButtonDisabled]}
            onPress={handleStep2Save} disabled={step2Loading} activeOpacity={0.8}
          >
            {step2Loading ? <ActivityIndicator color="#FFFFFF" /> : (
              <>
                <Text style={styles.nextButtonText}>{t.save}</Text>
                <MaterialIcons name="check" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <MapLocationPickerModal
          visible={showMapPicker} value={step2Data.parkingLocation}
          onSelect={loc => {
            setStep2Data(p => ({ ...p, parkingLocation: loc }));
            setStep2Touched(p => ({ ...p, parkingLocation: true }));
            if (step2Errors.parkingLocation) setStep2Errors(p => ({ ...p, parkingLocation: null }));
          }}
          onClose={() => setShowMapPicker(false)} language={language}
          error={step2Touched.parkingLocation && step2Errors.parkingLocation ? step2Errors.parkingLocation : null}
        />
      </View>
    );
  };

  // Render Step 3: Verification
  const renderStep3 = () => {
    if (isVerified) {
      return (
        <View style={styles.stepContainer}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.pendingContainer}>
              <View style={styles.pendingIconContainer}>
                <MaterialCommunityIcons name="clock-check-outline" size={70} color="#F59E0B" />
              </View>
              <Text style={[styles.pendingTitle, language === 'ar' && styles.rtlText]}>{t.pendingTitle}</Text>
              <Text style={[styles.pendingSubtitle, language === 'ar' && styles.rtlText]}>{t.pendingSubtitle}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{t.statusPending}</Text>
              </View>
              <Text style={[styles.pendingMessage, language === 'ar' && styles.rtlText]}>{t.pendingMessage}</Text>
            </View>
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, language === 'ar' && styles.rtlText]}>{t.step3Title}</Text>
          <Text style={[styles.stepSubtitle, language === 'ar' && styles.rtlText]}>{t.step3Subtitle}</Text>
          <Text style={styles.emailText}>{step1Data.email}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="always">
          <View style={styles.codeContainer}>
            <Text style={[styles.codeLabel, language === 'ar' && styles.rtlText]}>{t.enterCode}</Text>
            <View style={[styles.codeInputsContainer, language === 'ar' && styles.rtlRow]}>
              {step3Code.map((digit, index) => (
                <TextInput
                  key={index} ref={el => step3InputRefs.current[index] = el}
                  style={[styles.codeInput, digit && styles.codeInputFilled, step3Error && styles.codeInputError]}
                  keyboardType="number-pad" maxLength={1} value={digit}
                  onChangeText={text => handleStep3CodeChange(index, text)}
                  onKeyPress={({ nativeEvent }) => handleStep3KeyPress(index, nativeEvent.key)}
                />
              ))}
            </View>
            {step3Error && <Text style={[styles.errorText, { textAlign: 'center' }]}>{t.invalidCode}</Text>}

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>{language === 'ar' ? 'لم يصلك الرمز؟' : "Didn't receive the code?"}</Text>
              <TouchableOpacity onPress={handleStep3Resend} disabled={step3Resending || step3ResendCooldown > 0}>
                <Text style={[styles.resendLink, (step3Resending || step3ResendCooldown > 0) && styles.resendLinkDisabled]}>
                  {step3Resending ? t.resending : step3ResendCooldown > 0 ? `${t.resend} (${step3ResendCooldown}s)` : t.resend}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.verifyButton, (step3Code.join('').length < 6 || step3Loading) && styles.verifyButtonDisabled]}
          onPress={handleStep3Verify} disabled={step3Code.join('').length < 6 || step3Loading}
        >
          {step3Loading ? <ActivityIndicator color="#FFFFFF" /> : (
            <>
              <Text style={styles.verifyButtonText}>{t.verify}</Text>
              <MaterialIcons name="verified" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.navHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back-ios" size={20} color="#1A1A1A" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.languagePill}
            onPress={() => onLanguageChange && onLanguageChange(language === "en" ? "ar" : "en")}
          >
            <Text style={styles.languagePillText}>{language === "en" ? "العربية" : "English"}</Text>
            <Text style={styles.languagePillFlag}>{language === "en" ? "🇲🇦" : "🇬🇧"}</Text>
          </TouchableOpacity>
        </View>

        <DriverRegistrationProgressBar currentStep={currentStep} totalSteps={3} language={language} />

        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
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
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  languagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  languagePillText: {
    fontSize: 13,
    color: '#475569',
    fontFamily: UbuntuFonts.medium,
  },
  languagePillFlag: {
    fontSize: 16,
  },
  stepWrapper: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  stepHeader: {
    paddingHorizontal: 28,
    marginBottom: 32,
    marginTop: 10,
  },
  stepTitle: {
    fontSize: 28,
    color: '#1A1A1A',
    fontFamily: UbuntuFonts.bold,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: '#64748B',
    fontFamily: UbuntuFonts.regular,
    lineHeight: 22,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  formCard: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: UbuntuFonts.medium,
    marginBottom: 8,
    marginLeft: 4,
  },
  labelFocused: {
    color: '#3185FC',
  },
  labelError: {
    color: '#EF4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
    borderWidth: 1.5,
    borderColor: '#EBF2FF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputWrapperFocused: {
    borderColor: '#3185FC',
    backgroundColor: '#FFFFFF',
    shadowColor: "#3185FC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    fontFamily: UbuntuFonts.medium,
    height: '100%',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 4,
    fontFamily: UbuntuFonts.regular,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  locationContainer: {
    marginBottom: 20,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
    borderWidth: 1.5,
    borderColor: '#EBF2FF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  locationButtonError: {
    borderColor: '#EF4444',
  },
  locationButtonIcon: {
    //
  },
  locationButtonText: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    fontFamily: UbuntuFonts.medium,
  },
  locationButtonTextPlaceholder: {
    color: '#94A3B8',
  },
  navigationContainer: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#3185FC',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: "#3185FC",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  nextButtonDisabled: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: UbuntuFonts.bold,
  },
  // Step 3
  verificationIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    alignSelf: 'center',
  },
  emailText: {
    fontSize: 16,
    color: '#3185FC',
    fontFamily: UbuntuFonts.bold,
    textAlign: 'center',
    marginTop: 8,
  },
  codeContainer: {
    marginBottom: 32,
    paddingHorizontal: 28,
  },
  codeLabel: {
    fontSize: 14,
    fontFamily: UbuntuFonts.medium,
    color: '#64748B',
    marginBottom: 20,
    textAlign: 'center',
  },
  codeInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  codeInput: {
    width: 48,
    height: 60,
    backgroundColor: '#F8FAFF',
    borderWidth: 1.5,
    borderColor: '#EBF2FF',
    borderRadius: 14,
    fontSize: 24,
    fontFamily: UbuntuFonts.bold,
    textAlign: 'center',
    color: '#1A1A1A',
  },
  codeInputFilled: {
    borderColor: '#3185FC',
    backgroundColor: '#FFFFFF',
  },
  codeInputError: {
    borderColor: '#EF4444',
  },
  verifyButton: {
    backgroundColor: '#3185FC',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: "#3185FC",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    marginHorizontal: 28,
    marginBottom: 24,
  },
  verifyButtonDisabled: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: UbuntuFonts.bold,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: UbuntuFonts.regular,
  },
  resendLink: {
    fontSize: 15,
    color: '#3185FC',
    fontFamily: UbuntuFonts.bold,
    marginTop: 8,
  },
  resendLinkDisabled: {
    color: '#94A3B8',
  },
  // Pending Approval Styles
  pendingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  pendingIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  pendingTitle: {
    fontSize: 32,
    fontFamily: UbuntuFonts.bold,
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  pendingSubtitle: {
    fontSize: 16,
    color: '#64748B',
    fontFamily: UbuntuFonts.regular,
    marginBottom: 24,
    textAlign: 'center',
  },
  statusBadge: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginBottom: 24,
  },
  statusBadgeText: {
    fontSize: 13,
    fontFamily: UbuntuFonts.bold,
    color: '#B45309',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pendingMessage: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: UbuntuFonts.regular,
    paddingHorizontal: 40,
  },
  rtlRow: {
    flexDirection: 'row-reverse',
  },
  rtlText: {
    textAlign: 'right',
  },
});

export default DriverRegistrationFlow;
