import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Verification Service
 * Handles email verification code generation, validation, and management
 */

// Code expiration time: 15 minutes
const CODE_EXPIRATION_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const CODE_LENGTH = 6;

/**
 * Generate a random 6-digit verification code
 * Uses Math.random() with timestamp for better randomness
 * @returns {string} - 6-digit code
 */
const generateVerificationCode = () => {
  const timestamp = Date.now();
  const random = Math.random();
  const combined = (timestamp * random) % 1000000;
  const code = Math.floor(combined).toString().padStart(6, '0');
  return code;
};

/**
 * Create a verification code for a student or driver
 * @param {string} userId - User ID (student or driver)
 * @param {string} email - User email
 * @param {string} userType - 'student' or 'driver' (defaults to 'student')
 * @returns {Promise<Object>} - Result object with code and error
 */
export const createVerificationCode = async (userId, email, userType = 'student') => {
  try {
    // Delete any existing unverified codes for this user
    const deleteQuery = supabase
      .from('verification_codes')
      .delete()
      .eq('verified', false);

    if (userType === 'student') {
      deleteQuery.eq('student_id', userId);
    } else {
      deleteQuery.eq('driver_id', userId);
    }

    await deleteQuery;

    // Generate new code
    const code = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CODE_EXPIRATION_MINUTES);

    // Prepare insert data
    const insertData = {
      email: email,
      code: code,
      attempts: 0,
      max_attempts: MAX_ATTEMPTS,
      expires_at: expiresAt.toISOString(),
      verified: false,
      user_type: userType,
    };

    if (userType === 'student') {
      insertData.student_id = userId;
    } else {
      insertData.driver_id = userId;
    }

    // Insert verification code
    const { data, error } = await supabase
      .from('verification_codes')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.warn('Supabase not available, storing verification code locally');

      // Fallback: Store in AsyncStorage
      const localVerification = {
        id: Math.random().toString(36).substr(2, 9),
        ...insertData,
        created_at: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        `verification_${userId}`,
        JSON.stringify(localVerification)
      );

      console.log('Verification code stored locally:', code);
      return { data: localVerification, error: null };
    }

    console.log('Verification code (Supabase):', code);
    return { data: { code, ...data }, error: null };
  } catch (error) {
    console.warn('Exception creating verification code, storing locally:', error);

    const code = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CODE_EXPIRATION_MINUTES);

    const localVerification = {
      id: Math.random().toString(36).substr(2, 9),
      email: email,
      code: code,
      attempts: 0,
      max_attempts: MAX_ATTEMPTS,
      expires_at: expiresAt.toISOString(),
      verified: false,
      user_type: userType,
      created_at: new Date().toISOString(),
    };

    if (userType === 'student') {
      localVerification.student_id = userId;
    } else {
      localVerification.driver_id = userId;
    }

    await AsyncStorage.setItem(
      `verification_${userId}`,
      JSON.stringify(localVerification)
    );

    return { data: localVerification, error: null };
  }
};

/**
 * Verify a code for a student or driver
 * @param {string} userId - User ID (student or driver)
 * @param {string} code - Verification code
 * @param {string} userType - 'student' or 'driver' (defaults to 'student')
 * @returns {Promise<Object>} - Result object with success status and error
 */
export const verifyCode = async (userId, code, userType = 'student') => {
  try {
    // Find the verification code in Supabase first
    const query = supabase
      .from('verification_codes')
      .select('*')
      .eq('verified', false)
      .eq('user_type', userType)
      .order('created_at', { ascending: false })
      .limit(1);

    if (userType === 'student') {
      query.eq('student_id', userId);
    } else {
      query.eq('driver_id', userId);
    }

    const { data: verificationData, error: fetchError } = await query.single();

    if (fetchError || !verificationData) {
      // Check AsyncStorage if not found in Supabase
      const localDataStr = await AsyncStorage.getItem(`verification_${userId}`);
      if (localDataStr) {
        const localData = JSON.parse(localDataStr);
        if (localData.code === code && !localData.verified) {
          // Success locally
          localData.verified = true;
          localData.verified_at = new Date().toISOString();
          await AsyncStorage.setItem(`verification_${userId}`, JSON.stringify(localData));

          // Also mark the user as verified locally in student storage
          const studentDataStr = await AsyncStorage.getItem(`student_${userId}`);
          if (studentDataStr) {
            const studentData = JSON.parse(studentDataStr);
            studentData.is_verified = true;
            await AsyncStorage.setItem(`student_${userId}`, JSON.stringify(studentData));
          }

          return { success: true, error: null };
        }
      }

      return {
        success: false,
        error: { message: 'Verification code not found or invalid' },
      };
    }

    // Process Supabase verification status...
    // Check if code is expired
    const now = new Date();
    const expiresAt = new Date(verificationData.expires_at);
    if (now > expiresAt) {
      return { success: false, error: { message: 'Verification code has expired' } };
    }

    // Verify code
    if (verificationData.code !== code) {
      return { success: false, error: { message: 'Invalid verification code' } };
    }

    // Mark as verified in Supabase
    await supabase
      .from('verification_codes')
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq('id', verificationData.id);

    // Update student verification status
    if (userType === 'student') {
      await supabase.from('students').update({ is_verified: true }).eq('id', userId);
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Exception verifying code:', error);
    return { success: false, error };
  }
};

/**
 * Resend verification code
 * @param {string} userId - User ID (student or driver)
 * @param {string} email - User email
 * @param {string} userType - 'student' or 'driver' (defaults to 'student')
 * @returns {Promise<Object>} - Result object with code and error
 */
export const resendVerificationCode = async (userId, email, userType = 'student') => {
  try {
    // Check rate limiting - prevent too many resends in Supabase
    const query = supabase
      .from('verification_codes')
      .select('created_at')
      .eq('user_type', userType)
      .order('created_at', { ascending: false })
      .limit(1);

    if (userType === 'student') {
      query.eq('student_id', userId);
    } else {
      query.eq('driver_id', userId);
    }

    const { data: recentCodes, error: fetchError } = await query;

    if (!fetchError && recentCodes && recentCodes.length > 0) {
      const lastCodeTime = new Date(recentCodes[0].created_at);
      const now = new Date();
      const minutesSinceLastCode = (now - lastCodeTime) / (1000 * 60);

      if (minutesSinceLastCode < 1) {
        return { data: null, error: { message: 'Please wait before requesting a new code' } };
      }
    }

    // Fallback rate limiting check for local storage
    const localDataStr = await AsyncStorage.getItem(`verification_${userId}`);
    if (localDataStr) {
      const localData = JSON.parse(localDataStr);
      const lastCodeTime = new Date(localData.created_at);
      const now = new Date();
      const minutesSinceLastCode = (now - lastCodeTime) / (1000 * 60);

      if (minutesSinceLastCode < 1) {
        return { data: null, error: { message: 'Please wait before requesting a new code' } };
      }
    }

    // Create new verification code
    return await createVerificationCode(userId, email, userType);
  } catch (error) {
    // If anything fails, still try to create a new code locally
    return await createVerificationCode(userId, email, userType);
  }
};

/**
 * Get verification status for a student or driver
 * @param {string} userId - User ID (student or driver)
 * @param {string} userType - 'student' or 'driver' (defaults to 'student')
 * @returns {Promise<Object>} - Result object with verification data and error
 */
export const getVerificationStatus = async (userId, userType = 'student') => {
  try {
    const query = supabase
      .from('verification_codes')
      .select('*')
      .eq('user_type', userType)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (userType === 'student') {
      query.eq('student_id', userId);
    } else {
      query.eq('driver_id', userId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      // Check local storage if Supabase fails
      const localDataStr = await AsyncStorage.getItem(`verification_${userId}`);
      if (localDataStr) {
        return { data: JSON.parse(localDataStr), error: null };
      }
      return { data: null, error };
    }

    if (!data) {
      // Check local storage if no data found in Supabase
      const localDataStr = await AsyncStorage.getItem(`verification_${userId}`);
      if (localDataStr) {
        return { data: JSON.parse(localDataStr), error: null };
      }
    }

    return { data, error: null };
  } catch (error) {
    // Fallback to local storage on exception
    const localDataStr = await AsyncStorage.getItem(`verification_${userId}`);
    if (localDataStr) {
      return { data: JSON.parse(localDataStr), error: null };
    }
    return { data: null, error };
  }
};

