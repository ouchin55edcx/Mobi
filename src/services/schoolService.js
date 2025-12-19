import { supabase } from '../lib/supabase';

/**
 * School Service
 * Handles all Supabase operations for schools
 */

/**
 * Get all schools
 * @param {boolean} activeOnly - If true, only return active schools (default: true)
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getAllSchools = async (activeOnly = true) => {
  try {
    let query = supabase
      .from('schools')
      .select('*');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      console.error('Error fetching schools:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching schools:', error);
    return { data: null, error };
  }
};

/**
 * Get school by ID
 * @param {string} schoolId - School ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getSchoolById = async (schoolId) => {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .single();

    if (error) {
      console.error('Error fetching school:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching school:', error);
    return { data: null, error };
  }
};

/**
 * Get school by ID with all students (One-to-Many relationship)
 * @param {string} schoolId - School ID
 * @returns {Promise<Object>} - Result object with data (including students) and error
 */
export const getSchoolWithStudents = async (schoolId) => {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select(`
        *,
        students:school_id (
          id,
          fullname,
          email,
          phone,
          cin,
          home_location,
          created_at
        )
      `)
      .eq('id', schoolId)
      .single();

    if (error) {
      console.error('Error fetching school with students:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching school with students:', error);
    return { data: null, error };
  }
};

