import { supabase } from '../lib/supabase';

/**
 * Student Service
 * Handles all Supabase operations for students
 */

/**
 * Create a new student
 * @param {Object} studentData - Student data object
 * @param {string} studentData.fullname - Full name of the student
 * @param {string} studentData.phone - Phone number
 * @param {string} studentData.email - Email address
 * @param {string} studentData.cin - CIN (National ID)
 * @param {string} studentData.school - School ID
 * @param {Object} studentData.homeLocation - Location object with latitude and longitude
 * @returns {Promise<Object>} - Result object with data and error
 */
export const createStudent = async (studentData) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .insert([
        {
          fullname: studentData.fullname,
          phone: studentData.phone,
          email: studentData.email,
          cin: studentData.cin,
          school: studentData.school,
          home_location: {
            latitude: studentData.homeLocation.latitude,
            longitude: studentData.homeLocation.longitude,
          },
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating student:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception creating student:', error);
    return { data: null, error };
  }
};

/**
 * Get student by ID
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getStudentById = async (studentId) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (error) {
      console.error('Error fetching student:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching student:', error);
    return { data: null, error };
  }
};

/**
 * Get student by email
 * @param {string} email - Student email
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getStudentByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error fetching student by email:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching student by email:', error);
    return { data: null, error };
  }
};

/**
 * Update student
 * @param {string} studentId - Student ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Result object with data and error
 */
export const updateStudent = async (studentId, updates) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', studentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating student:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception updating student:', error);
    return { data: null, error };
  }
};

