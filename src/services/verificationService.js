import { supabase } from '../lib/supabase';

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
 * In production, consider using expo-crypto for cryptographically secure random
 * @returns {string} - 6-digit code
 */
const generateVerificationCode = () => {
  // Generate random number between 100000 and 999999
  // Using timestamp and Math.random for better distribution
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
      console.error('Error creating verification code:', error);
      return { data: null, error };
    }

    // In production, send email here using your email service
    // For now, we'll log it (remove in production!)
    console.log('Verification code:', code); // TODO: Remove in production

    return { data: { code, ...data }, error: null };
  } catch (error) {
    console.error('Exception creating verification code:', error);
    return { data: null, error };
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
    // Find the verification code
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
      return {
        success: false,
        error: { message: 'Verification code not found' },
      };
    }

    // Check if code is expired
    const now = new Date();
    const expiresAt = new Date(verificationData.expires_at);
    if (now > expiresAt) {
      return {
        success: false,
        error: { message: 'Verification code has expired' },
      };
    }

    // Check if max attempts reached
    if (verificationData.attempts >= verificationData.max_attempts) {
      return {
        success: false,
        error: { message: 'Maximum verification attempts reached' },
      };
    }

    // Increment attempts
    const { error: updateError } = await supabase
      .from('verification_codes')
      .update({ attempts: verificationData.attempts + 1 })
      .eq('id', verificationData.id);

    if (updateError) {
      console.error('Error updating attempts:', updateError);
    }

    // Verify code
    if (verificationData.code !== code) {
      const remainingAttempts =
        verificationData.max_attempts - (verificationData.attempts + 1);
      return {
        success: false,
        error: {
          message: 'Invalid verification code',
          remainingAttempts,
        },
      };
    }

    // Code is valid - mark as verified
    const { error: verifyError } = await supabase
      .from('verification_codes')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', verificationData.id);

    if (verifyError) {
      console.error('Error marking code as verified:', verifyError);
      return { success: false, error: verifyError };
    }

    // Update user email_verified status
    if (userType === 'student') {
      const { error: studentUpdateError } = await supabase
        .from('students')
        .update({ email_verified: true })
        .eq('id', userId);

      if (studentUpdateError) {
        console.error('Error updating student verification status:', studentUpdateError);
        return { success: false, error: studentUpdateError };
      }
    } else {
      const { error: driverUpdateError } = await supabase
        .from('drivers')
        .update({ email_verified: true })
        .eq('id', userId);

      if (driverUpdateError) {
        console.error('Error updating driver verification status:', driverUpdateError);
        return { success: false, error: driverUpdateError };
      }
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
    // Check rate limiting - prevent too many resends
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

    const { data: recentCodes } = await query;

    if (recentCodes && recentCodes.length > 0) {
      const lastCodeTime = new Date(recentCodes[0].created_at);
      const now = new Date();
      const minutesSinceLastCode =
        (now - lastCodeTime) / (1000 * 60);

      // Rate limit: 1 code per minute
      if (minutesSinceLastCode < 1) {
        return {
          data: null,
          error: {
            message: 'Please wait before requesting a new code',
          },
        };
      }
    }

    // Create new verification code
    return await createVerificationCode(userId, email, userType);
  } catch (error) {
    console.error('Exception resending verification code:', error);
    return { data: null, error };
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
      // PGRST116 = no rows returned
      console.error('Error fetching verification status:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching verification status:', error);
    return { data: null, error };
  }
};

