import { supabase } from '../lib/supabase';

/**
 * School Service
 * Handles all Supabase operations for schools
 */

/**
 * Static fallback schools data (used when Supabase is not available)
 */
const STATIC_SCHOOLS = [
  {
    id: '1',
    name: 'University of Casablanca',
    name_ar: 'جامعة الدار البيضاء',
    latitude: 33.5731,
    longitude: -7.5898,
    address: 'Boulevard Mohamed V',
    city: 'Casablanca',
    is_active: true,
  },
  {
    id: '2',
    name: 'Mohammed V University',
    name_ar: 'جامعة محمد الخامس',
    latitude: 33.9716,
    longitude: -6.8498,
    address: 'Avenue des Nations Unies',
    city: 'Rabat',
    is_active: true,
  },
  {
    id: '3',
    name: 'Ibn Tofail University',
    name_ar: 'جامعة ابن طفيل',
    latitude: 34.0209,
    longitude: -6.8416,
    address: 'Route de Kenitra',
    city: 'Kenitra',
    is_active: true,
  },
  {
    id: '4',
    name: 'Cadi Ayyad University',
    name_ar: 'جامعة القاضي عياض',
    latitude: 31.6295,
    longitude: -7.9811,
    address: 'Boulevard Abdelkrim Khattabi',
    city: 'Marrakech',
    is_active: true,
  },
  {
    id: '5',
    name: 'Hassan II University',
    name_ar: 'جامعة الحسن الثاني',
    latitude: 33.5731,
    longitude: -7.5898,
    address: "Route d'El Jadida",
    city: 'Casablanca',
    is_active: true,
  },
];

/**
 * Get all schools
 * @param {boolean} activeOnly - If true, only return active schools (default: true)
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getAllSchools = async (activeOnly = true) => {
  try {
    // Try Supabase first
    let query = supabase
      .from('schools')
      .select('*');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      console.warn('Supabase not available, using static schools data');
      // Fallback to static data
      const filteredData = activeOnly
        ? STATIC_SCHOOLS.filter(school => school.is_active)
        : STATIC_SCHOOLS;
      return { data: filteredData, error: null };
    }

    return { data, error: null };
  } catch (error) {
    console.warn('Exception fetching schools, using static data:', error);
    // Fallback to static data
    const filteredData = activeOnly
      ? STATIC_SCHOOLS.filter(school => school.is_active)
      : STATIC_SCHOOLS;
    return { data: filteredData, error: null };
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
      console.warn('Supabase not available, using static schools data');
      // Fallback to static data
      const school = STATIC_SCHOOLS.find(s => s.id === schoolId);
      return school
        ? { data: school, error: null }
        : { data: null, error: { message: 'School not found' } };
    }

    return { data, error: null };
  } catch (error) {
    console.warn('Exception fetching school, using static data:', error);
    // Fallback to static data
    const school = STATIC_SCHOOLS.find(s => s.id === schoolId);
    return school
      ? { data: school, error: null }
      : { data: null, error: { message: 'School not found' } };
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
      console.warn('Supabase not available, using static school data for details');
      const school = STATIC_SCHOOLS.find(s => s.id === schoolId);
      if (school) {
        return { data: { ...school, students: [] }, error: null };
      }
      return { data: null, error: null };
    }

    return { data, error: null };
  } catch (error) {
    const school = STATIC_SCHOOLS.find(s => s.id === schoolId);
    if (school) {
      return { data: { ...school, students: [] }, error: null };
    }
    return { data: null, error: null };
  }
};


