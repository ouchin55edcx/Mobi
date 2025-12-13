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
import { createBus } from '../../src/services/busService';
import { getValidationError, validateYear, validateCapacity, validateCoordinates } from '../../src/utils/validation';
import MapLocationPicker from '../../components/MapLocationPicker';

const translations = {
  en: {
    title: 'Bus Information',
    subtitle: 'Tell us about your vehicle',
    type: 'Bus Type',
    typePlaceholder: 'e.g., Bus, Minibus, Van',
    brand: 'Brand',
    brandPlaceholder: 'e.g., Mercedes, Toyota',
    year: 'Year',
    yearPlaceholder: 'e.g., 2020',
    plateNumber: 'Plate Number',
    plateNumberPlaceholder: 'e.g., ABC-1234',
    parkingLocation: 'Parking Location',
    parkingLocationSubtitle: 'Select your parking location on the map',
    capacity: 'Capacity',
    capacityPlaceholder: 'Minimum 7',
    save: 'Save',
    saving: 'Saving...',
    success: 'Bus Information Saved',
    successMessage: 'Your bus information has been saved successfully!',
    ok: 'OK',
  },
  ar: {
    title: 'معلومات الحافلة',
    subtitle: 'أخبرنا عن مركبتك',
    type: 'نوع الحافلة',
    typePlaceholder: 'مثل: حافلة، ميني باص، فان',
    brand: 'العلامة التجارية',
    brandPlaceholder: 'مثل: مرسيدس، تويوتا',
    year: 'السنة',
    yearPlaceholder: 'مثل: 2020',
    plateNumber: 'رقم اللوحة',
    plateNumberPlaceholder: 'مثل: ABC-1234',
    parkingLocation: 'موقع الوقوف',
    parkingLocationSubtitle: 'اختر موقع الوقوف على الخريطة',
    capacity: 'السعة',
    capacityPlaceholder: 'الحد الأدنى 7',
    save: 'حفظ',
    saving: 'جاري الحفظ...',
    success: 'تم حفظ معلومات الحافلة',
    successMessage: 'تم حفظ معلومات الحافلة بنجاح!',
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

const BusInformationScreen = ({ driverId, language = 'en', onBack, onSuccess }) => {
  const [formData, setFormData] = useState({
    type: '',
    brand: '',
    year: '',
    plateNumber: '',
    parkingLocation: null,
    capacity: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);

  const t = translations[language];
  const currentYear = new Date().getFullYear();

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
  }, [formData, language, currentYear]);

  const validateField = useCallback((field) => {
    let error = null;

    switch (field) {
      case 'type':
        if (!formData.type.trim()) {
          error = getValidationError('type', '', language);
        }
        break;
      case 'brand':
        if (!formData.brand.trim()) {
          error = getValidationError('brand', '', language);
        }
        break;
      case 'year':
        if (!formData.year.trim()) {
          error = getValidationError('year', '', language);
        } else if (!validateYear(formData.year)) {
          error = getValidationError('year', formData.year, language);
        }
        break;
      case 'plateNumber':
        if (!formData.plateNumber.trim()) {
          error = getValidationError('plateNumber', '', language);
        }
        break;
      case 'parkingLocation':
        if (!formData.parkingLocation) {
          error = getValidationError('location', null, language);
        } else if (!validateCoordinates(formData.parkingLocation.latitude, formData.parkingLocation.longitude)) {
          error = getValidationError('location', null, language);
        }
        break;
      case 'capacity':
        if (!formData.capacity.trim()) {
          error = getValidationError('capacity', '', language);
        } else if (!validateCapacity(formData.capacity)) {
          error = getValidationError('capacity', formData.capacity, language);
        }
        break;
    }

    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
      return false;
    }

    return true;
  }, [formData, language, currentYear]);

  const validateForm = () => {
    let isValid = true;
    const fields = ['type', 'brand', 'year', 'plateNumber', 'parkingLocation', 'capacity'];

    fields.forEach((field) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      if (!validateField(field)) {
        isValid = false;
      }
    });

    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) {
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

    setLoading(true);

    const busData = {
      driver_id: driverId,
      type: formData.type.trim(),
      brand: formData.brand.trim(),
      year: parseInt(formData.year.trim(), 10),
      plate_number: formData.plateNumber.trim(),
      parking_location: {
        lat: formData.parkingLocation.latitude,
        lng: formData.parkingLocation.longitude,
      },
      capacity: parseInt(formData.capacity.trim(), 10),
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
      console.error('Exception during save:', err);
      Alert.alert(
        language === 'ar' ? 'خطأ' : 'Error',
        language === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'An error occurred during save',
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
              field="type"
              label={t.type}
              placeholder={t.typePlaceholder}
              autoCapitalize="words"
              value={formData.type}
              hasError={touched.type && errors.type ? errors.type : null}
              language={language}
              loading={loading}
              onChangeText={(text) => handleInputChange('type', text)}
              onBlur={() => handleBlur('type')}
            />

            <InputField
              field="brand"
              label={t.brand}
              placeholder={t.brandPlaceholder}
              autoCapitalize="words"
              value={formData.brand}
              hasError={touched.brand && errors.brand ? errors.brand : null}
              language={language}
              loading={loading}
              onChangeText={(text) => handleInputChange('brand', text)}
              onBlur={() => handleBlur('brand')}
            />

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <InputField
                  field="year"
                  label={t.year}
                  placeholder={t.yearPlaceholder}
                  keyboardType="numeric"
                  value={formData.year}
                  hasError={touched.year && errors.year ? errors.year : null}
                  language={language}
                  loading={loading}
                  onChangeText={(text) => handleInputChange('year', text)}
                  onBlur={() => handleBlur('year')}
                />
              </View>

              <View style={styles.halfWidth}>
                <InputField
                  field="capacity"
                  label={t.capacity}
                  placeholder={t.capacityPlaceholder}
                  keyboardType="numeric"
                  value={formData.capacity}
                  hasError={touched.capacity && errors.capacity ? errors.capacity : null}
                  language={language}
                  loading={loading}
                  onChangeText={(text) => handleInputChange('capacity', text)}
                  onBlur={() => handleBlur('capacity')}
                />
              </View>
            </View>

            <InputField
              field="plateNumber"
              label={t.plateNumber}
              placeholder={t.plateNumberPlaceholder}
              autoCapitalize="characters"
              value={formData.plateNumber}
              hasError={touched.plateNumber && errors.plateNumber ? errors.plateNumber : null}
              language={language}
              loading={loading}
              onChangeText={(text) => handleInputChange('plateNumber', text)}
              onBlur={() => handleBlur('plateNumber')}
            />

            <View style={styles.locationContainer}>
              <Text style={[styles.label, language === 'ar' && styles.rtl]}>
                {t.parkingLocation}
              </Text>
              <Text style={[styles.locationSubtitle, language === 'ar' && styles.rtl]}>
                {t.parkingLocationSubtitle}
              </Text>
              <MapLocationPicker
                value={formData.parkingLocation}
                onSelect={(location) => {
                  handleInputChange('parkingLocation', location);
                  setTouched((prev) => ({ ...prev, parkingLocation: true }));
                }}
                language={language}
                error={touched.parkingLocation && errors.parkingLocation ? errors.parkingLocation : null}
                disabled={loading}
              />
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>{t.save}</Text>
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
  locationSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  navigationContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  saveButton: {
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default BusInformationScreen;

