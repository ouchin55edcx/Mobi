/**
 * Validation utilities for Mobi app
 */

/**
 * Validates if a string is a valid UUID v4
 * @param {string} id - String to validate
 * @returns {boolean} - True if valid UUID, false otherwise
 */
export const isValidUUID = (id) => {
  if (!id || typeof id !== 'string') return false;
  
  // UUID v4 regex pattern
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

/**
 * Checks if the app is running in Expo Go
 * @returns {boolean} - True if running in Expo Go
 */
export const isExpoGo = () => {
  try {
    const Constants = require('expo-constants').default;
    return Constants.executionEnvironment === 'storeClient';
  } catch (error) {
    // If expo-constants is not available, assume we're not in Expo Go
    return false;
  }
};

/**
 * Safely validates trip/booking IDs and returns null if invalid
 * @param {string} id - ID to validate
 * @returns {string|null} - Valid UUID or null
 */
export const validateAndReturnUUID = (id) => {
  if (!id) return null;
  return isValidUUID(id) ? id : null;
};

/**
 * Validates full name - minimum 2 words, 2 characters each
 * @param {string} fullname - Full name to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateFullname = (fullname) => {
  if (!fullname || typeof fullname !== 'string') return false;
  
  const trimmed = fullname.trim();
  const words = trimmed.split(/\s+/).filter(word => word.length > 0);
  
  // Must have at least 2 words
  if (words.length < 2) return false;
  
  // Each word must have at least 2 characters
  return words.every(word => word.length >= 2);
};

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email, false otherwise
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  
  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validates Moroccan phone number format
 * Supports: 0XXXXXXXXX or +212XXXXXXXXX
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  
  const trimmed = phone.trim().replace(/\s/g, '');
  
  // Moroccan phone format: 0XXXXXXXXX (10 digits starting with 0)
  // or +212XXXXXXXXX (13 characters starting with +212)
  const moroccanPhoneRegex = /^(0|\+212)[1-9]\d{8}$/;
  return moroccanPhoneRegex.test(trimmed);
};

/**
 * Validates CIN (National ID) format - AB123456 (2 letters + 6 digits)
 * @param {string} cin - CIN to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateCIN = (cin) => {
  if (!cin || typeof cin !== 'string') return false;
  
  const trimmed = cin.trim().toUpperCase();
  
  // CIN format: 2 letters followed by 6 digits
  const cinRegex = /^[A-Z]{2}\d{6}$/;
  return cinRegex.test(trimmed);
};

/**
 * Validates coordinates (latitude and longitude)
 * @param {number} latitude - Latitude value
 * @param {number} longitude - Longitude value
 * @returns {boolean} - True if valid coordinates, false otherwise
 */
export const validateCoordinates = (latitude, longitude) => {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false;
  }
  
  // Valid latitude range: -90 to 90
  // Valid longitude range: -180 to 180
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  );
};

/**
 * Validates year - must be between 1900 and current year
 * @param {number|string} year - Year to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateYear = (year) => {
  if (!year) return false;
  
  const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;
  const currentYear = new Date().getFullYear();
  
  return !isNaN(yearNum) && yearNum >= 1900 && yearNum <= currentYear;
};

/**
 * Validates capacity - must be integer >= 7
 * @param {number|string} capacity - Capacity to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateCapacity = (capacity) => {
  if (!capacity) return false;
  
  const capacityNum = typeof capacity === 'string' ? parseInt(capacity, 10) : capacity;
  
  return !isNaN(capacityNum) && Number.isInteger(capacityNum) && capacityNum >= 7;
};

/**
 * Gets validation error message for a field
 * @param {string} field - Field name
 * @param {string|number|null} value - Field value
 * @param {string} language - Language ('en' or 'ar')
 * @returns {string} - Error message
 */
export const getValidationError = (field, value, language = 'en') => {
  const translations = {
    en: {
      fullname: {
        required: 'Full name is required',
        invalid: 'Full name must contain at least 2 words with 2 characters each',
      },
      phone: {
        required: 'Phone number is required',
        invalid: 'Phone number must be in Moroccan format (0XXXXXXXXX or +212XXXXXXXXX)',
      },
      email: {
        required: 'Email is required',
        invalid: 'Please enter a valid email address',
      },
      cin: {
        required: 'CIN is required',
        invalid: 'CIN must be in format AB123456 (2 letters + 6 digits)',
      },
      school: {
        required: 'Please select your school',
      },
      location: {
        required: 'Please select your home location',
        invalid: 'Invalid location coordinates',
      },
      year: {
        required: 'Year is required',
        invalid: `Year must be between 1900 and ${new Date().getFullYear()}`,
      },
      capacity: {
        required: 'Capacity is required',
        invalid: 'Capacity must be at least 7',
      },
      plateNumber: {
        required: 'Plate number is required',
        invalid: 'Please enter a valid plate number',
      },
      type: {
        required: 'Bus type is required',
        invalid: 'Please enter a valid bus type',
      },
      brand: {
        required: 'Brand is required',
        invalid: 'Please enter a valid brand',
      },
    },
    ar: {
      fullname: {
        required: 'الاسم الكامل مطلوب',
        invalid: 'يجب أن يحتوي الاسم الكامل على كلمتين على الأقل، كل واحدة تحتوي على حرفين على الأقل',
      },
      phone: {
        required: 'رقم الهاتف مطلوب',
        invalid: 'يجب أن يكون رقم الهاتف بالتنسيق المغربي (0XXXXXXXXX أو +212XXXXXXXXX)',
      },
      email: {
        required: 'البريد الإلكتروني مطلوب',
        invalid: 'يرجى إدخال عنوان بريد إلكتروني صحيح',
      },
      cin: {
        required: 'رقم الهوية الوطنية مطلوب',
        invalid: 'يجب أن يكون رقم الهوية الوطنية بالتنسيق AB123456 (حرفان + 6 أرقام)',
      },
      school: {
        required: 'يرجى اختيار مدرستك',
      },
      location: {
        required: 'يرجى اختيار موقع منزلك',
        invalid: 'إحداثيات الموقع غير صحيحة',
      },
      year: {
        required: 'السنة مطلوبة',
        invalid: `يجب أن تكون السنة بين 1900 و ${new Date().getFullYear()}`,
      },
      capacity: {
        required: 'السعة مطلوبة',
        invalid: 'يجب أن تكون السعة 7 على الأقل',
      },
      plateNumber: {
        required: 'رقم اللوحة مطلوب',
        invalid: 'يرجى إدخال رقم لوحة صحيح',
      },
      type: {
        required: 'نوع الحافلة مطلوب',
        invalid: 'يرجى إدخال نوع حافلة صحيح',
      },
      brand: {
        required: 'العلامة التجارية مطلوبة',
        invalid: 'يرجى إدخال علامة تجارية صحيحة',
      },
    },
  };

  const t = translations[language] || translations.en;
  const fieldTranslations = t[field];

  if (!fieldTranslations) {
    return language === 'ar' ? 'قيمة غير صحيحة' : 'Invalid value';
  }

  // If value is empty/null/undefined, return required error
  if (!value || (typeof value === 'string' && !value.trim())) {
    return fieldTranslations.required || fieldTranslations.invalid;
  }

  // Return invalid error for non-empty but invalid values
  return fieldTranslations.invalid || fieldTranslations.required;
};
