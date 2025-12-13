import { supabase } from '../lib/supabase';
import { isValidUUID } from '../utils/validation';

/**
 * Trip History Service
 * Handles fetching past trips and statistics
 */

/**
 * Generate mock trip data for demo mode
 */
const generateMockTrips = () => {
  const now = new Date();
  return [
    {
      id: 'mock-trip-1',
      type: 'PICKUP',
      status: 'COMPLETED',
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      total_route: { total_distance: 5200, total_duration: 2700 },
    },
    {
      id: 'mock-trip-2',
      type: 'DROPOFF',
      status: 'COMPLETED',
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      total_route: { total_distance: 4800, total_duration: 2400 },
    },
    {
      id: 'mock-trip-3',
      type: 'PICKUP',
      status: 'COMPLETED',
      created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      total_route: { total_distance: 5500, total_duration: 3000 },
    },
  ];
};

/**
 * Get trip history for a student
 * @param {string} studentId - Student ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Limit number of results
 * @param {number} options.offset - Offset for pagination
 * @param {string} options.status - Filter by status (optional)
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getTripHistory = async (studentId, options = {}) => {
  try {
    // Check if studentId is a valid UUID, if not return mock data (demo mode)
    if (!studentId || !isValidUUID(studentId)) {
      const mockTrips = generateMockTrips();
      const { status } = options;
      if (status) {
        return { data: mockTrips.filter(trip => trip.status === status), error: null };
      }
      return { data: mockTrips, error: null };
    }

    const { limit = 20, offset = 0, status } = options;
    
    let query = supabase
      .from('trips')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching trip history:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Exception fetching trip history:', error);
    return { data: null, error };
  }
};

/**
 * Get completed trips for a student
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getCompletedTrips = async (studentId) => {
  try {
    const { data, error } = await getTripHistory(studentId, {
      status: 'COMPLETED',
      limit: 1000, // Get all completed trips for statistics
    });

    return { data, error };
  } catch (error) {
    console.error('Exception fetching completed trips:', error);
    return { data: null, error };
  }
};

/**
 * Generate mock statistics for demo mode
 */
const generateMockStatistics = () => {
  return {
    totalTrips: 12,
    totalDistance: 58.4,
    totalTimeMinutes: 540,
    totalTimeHours: 9.0,
  };
};

/**
 * Generate mock monthly statistics for multiple months (demo mode)
 */
const generateMockMonthlyData = (months = 6) => {
  const data = [];
  const now = new Date();
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    
    // Generate random but realistic data
    const trips = Math.floor(Math.random() * 15) + 5;
    const distance = Math.round((Math.random() * 30 + 20) * 10) / 10;
    const timeMinutes = Math.round(trips * (Math.random() * 20 + 30));
    
    data.push({
      month: monthName,
      trips,
      distance,
      timeMinutes,
    });
  }
  
  return data;
};

/**
 * Get monthly statistics for a student
 * @param {string} studentId - Student ID
 * @param {Date} month - Month to get statistics for (defaults to current month)
 * @returns {Promise<Object>} - Result object with statistics and error
 */
export const getMonthlyStatistics = async (studentId, month = new Date()) => {
  try {
    // Check if studentId is a valid UUID, if not return mock data (demo mode)
    if (!studentId || !isValidUUID(studentId)) {
      return { statistics: generateMockStatistics(), error: null };
    }

    // Get start and end of month
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);

    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'COMPLETED')
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString());

    if (error) {
      console.error('Error fetching monthly statistics:', error);
      return { statistics: null, error };
    }

    // Calculate statistics
    const trips = data || [];
    let totalDistance = 0;
    let totalDuration = 0;

    trips.forEach((trip) => {
      // Extract distance from route data
      if (trip.total_route?.total_distance) {
        totalDistance += trip.total_route.total_distance / 1000; // Convert to km
      } else if (trip.home_to_pickup_route?.distance && trip.pickup_to_destination_route?.distance) {
        totalDistance += (trip.home_to_pickup_route.distance + trip.pickup_to_destination_route.distance) / 1000;
      }

      // Extract duration from route data
      if (trip.total_route?.total_duration) {
        totalDuration += trip.total_route.total_duration / 60; // Convert to minutes
      } else if (trip.home_to_pickup_route?.duration && trip.pickup_to_destination_route?.duration) {
        totalDuration += (trip.home_to_pickup_route.duration + trip.pickup_to_destination_route.duration) / 60;
      } else if (trip.reach_destination_time && trip.leave_home_time) {
        // Calculate from timestamps if route data not available
        const start = new Date(trip.leave_home_time);
        const end = new Date(trip.reach_destination_time);
        totalDuration += (end - start) / (1000 * 60); // Convert to minutes
      }
    });

    const statistics = {
      totalTrips: trips.length,
      totalDistance: Math.round(totalDistance * 10) / 10, // Round to 1 decimal
      totalTimeMinutes: Math.round(totalDuration),
      totalTimeHours: Math.round(totalDuration / 60 * 10) / 10, // Round to 1 decimal
    };

    return { statistics, error: null };
  } catch (error) {
    console.error('Exception calculating monthly statistics:', error);
    return { statistics: null, error };
  }
};

/**
 * Get monthly statistics for multiple months
 * @param {string} studentId - Student ID
 * @param {number} months - Number of months to fetch (default: 6)
 * @returns {Promise<Object>} - Result object with monthly data array and error
 */
export const getMonthlyStatisticsChart = async (studentId, months = 6) => {
  try {
    // Check if studentId is a valid UUID, if not return mock data (demo mode)
    if (!studentId || !isValidUUID(studentId)) {
      return { data: generateMockMonthlyData(months), error: null };
    }

    const monthlyData = [];
    const now = new Date();

    // Get data for each month
    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'COMPLETED')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

      if (error) {
        console.error(`Error fetching data for month ${i}:`, error);
        continue;
      }

      const trips = data || [];
      let totalDistance = 0;
      let totalDuration = 0;

      trips.forEach((trip) => {
        // Extract distance from route data
        if (trip.total_route?.total_distance) {
          totalDistance += trip.total_route.total_distance / 1000; // Convert to km
        } else if (trip.home_to_pickup_route?.distance && trip.pickup_to_destination_route?.distance) {
          totalDistance += (trip.home_to_pickup_route.distance + trip.pickup_to_destination_route.distance) / 1000;
        }

        // Extract duration from route data
        if (trip.total_route?.total_duration) {
          totalDuration += trip.total_route.total_duration / 60; // Convert to minutes
        } else if (trip.home_to_pickup_route?.duration && trip.pickup_to_destination_route?.duration) {
          totalDuration += (trip.home_to_pickup_route.duration + trip.pickup_to_destination_route.duration) / 60;
        } else if (trip.reach_destination_time && trip.leave_home_time) {
          const start = new Date(trip.leave_home_time);
          const end = new Date(trip.reach_destination_time);
          totalDuration += (end - start) / (1000 * 60);
        }
      });

      const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
      monthlyData.push({
        month: monthName,
        trips: trips.length,
        distance: Math.round(totalDistance * 10) / 10,
        timeMinutes: Math.round(totalDuration),
      });
    }

    return { data: monthlyData, error: null };
  } catch (error) {
    console.error('Exception calculating monthly statistics chart:', error);
    return { data: null, error };
  }
};

/**
 * Get trip by ID with full details
 * @param {string} tripId - Trip ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getTripById = async (tripId) => {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (error) {
      console.error('Error fetching trip:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching trip:', error);
    return { data: null, error };
  }
};

