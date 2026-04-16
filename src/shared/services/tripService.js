import { supabase } from "../../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Trip Service
 * Handles all Supabase operations for trip tracking and live updates
 */

/**
 * Generate a simple UUID for offline mode
 */
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Create a new trip from a booking
 * @param {Object} tripData - Trip data object
 * @param {string} tripData.bookingId - Booking ID
 * @param {string} tripData.driverId - Driver ID
 * @param {string} tripData.busId - Bus ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const createTrip = async (tripData) => {
  try {
    const { data, error } = await supabase
      .from("trips")
      .insert([
        {
          booking_id: tripData.bookingId,
          driver_id: tripData.driverId,
          bus_id: tripData.busId,
          status: "SCHEDULED",
        },
      ])
      .select()
      .single();

    if (error) {
      // warning: console.warn('Supabase not available, creating trip locally');

      const localTrip = {
        id: generateUUID(),
        booking_id: tripData.bookingId,
        driver_id: tripData.driverId,
        bus_id: tripData.busId,
        status: "SCHEDULED",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        `trip_${localTrip.id}`,
        JSON.stringify(localTrip),
      );
      await AsyncStorage.setItem(
        `booking_trip_${tripData.bookingId}`,
        localTrip.id,
      );

      return { data: localTrip, error: null };
    }

    return { data, error: null };
  } catch (error) {
    // warning: console.warn('Exception during createTrip, mocking locally:', error);
    return { data: null, error };
  }
};

/**
 * Get trip by ID with all related data
 * @param {string} tripId - Trip ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getTripById = async (tripId) => {
  try {
    const { data, error } = await supabase
      .from("trips")
      .select(
        `
        *,
        bookings (
          *,
          students (
            id,
            fullname,
            phone,
            home_location
          )
        )
        plate_number,
          capacity
      `,
      )
      .eq("id", tripId)
      .single();

    if (error) {
      // warning: console.warn('Supabase not available, fetching trip locally');
      const t = await AsyncStorage.getItem(`trip_${tripId}`);
      if (t) return { data: JSON.parse(t), error: null };
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    const t = await AsyncStorage.getItem(`trip_${tripId}`);
    if (t) return { data: JSON.parse(t), error: null };
    return { data: null, error };
  }
};

/**
 * Get trip by booking ID
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getTripByBookingId = async (bookingId) => {
  try {
    const { data, error } = await supabase
      .from("trips")
      .select(
        `
        *,
        bookings (
          *,
          students (
            id,
            fullname,
            phone,
            home_location
          )
        )
        plate_number,
          capacity
      `,
      )
      .eq("booking_id", bookingId)
      .single();

    if (error) {
      // warning: console.warn('Supabase not available, fetching trip by booking ID locally');
      const tripId = await AsyncStorage.getItem(`booking_trip_${bookingId}`);
      if (tripId) {
        const t = await AsyncStorage.getItem(`trip_${tripId}`);
        if (t) return { data: JSON.parse(t), error: null };
      }
      return { data: null, error: null };
    }

    return { data, error: null };
  } catch (error) {
    const tripId = await AsyncStorage.getItem(`booking_trip_${bookingId}`);
    if (tripId) {
      const t = await AsyncStorage.getItem(`trip_${tripId}`);
      if (t) return { data: JSON.parse(t), error: null };
    }
    return { data: null, error: null };
  }
};

/**
 * Update trip location (for live tracking)
 * @param {string} tripId - Trip ID
 * @param {Object} location - Location object with latitude and longitude
 * @returns {Promise<Object>} - Result object with data and error
 */
export const updateTripLocation = async (tripId, location) => {
  try {
    const { data, error } = await supabase
      .from("trips")
      .update({
        current_location: location,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tripId)
      .select()
      .single();

    if (error) {
      // warning: console.warn('Supabase not available, updating trip location locally');
      const t = await AsyncStorage.getItem(`trip_${tripId}`);
      if (t) {
        const trip = JSON.parse(t);
        const updatedTrip = {
          ...trip,
          current_location: location,
          updated_at: new Date().toISOString(),
        };
        await AsyncStorage.setItem(
          `trip_${tripId}`,
          JSON.stringify(updatedTrip),
        );
        return { data: updatedTrip, error: null };
      }
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Start a trip
 * @param {string} tripId - Trip ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const startTrip = async (tripId) => {
  try {
    const { data, error } = await supabase
      .from("trips")
      .update({
        status: "IN_PROGRESS",
        started_at: new Date().toISOString(),
      })
      .eq("id", tripId)
      .select()
      .single();

    if (error) {
      const t = await AsyncStorage.getItem(`trip_${tripId}`);
      if (t) {
        const trip = JSON.parse(t);
        const updatedTrip = {
          ...trip,
          status: "IN_PROGRESS",
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await AsyncStorage.setItem(
          `trip_${tripId}`,
          JSON.stringify(updatedTrip),
        );
        return { data: updatedTrip, error: null };
      }
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Complete a trip
 * @param {string} tripId - Trip ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const completeTrip = async (tripId) => {
  try {
    const { data, error } = await supabase
      .from("trips")
      .update({
        status: "COMPLETED",
        completed_at: new Date().toISOString(),
      })
      .eq("id", tripId)
      .select()
      .single();

    if (error) {
      const t = await AsyncStorage.getItem(`trip_${tripId}`);
      if (t) {
        const trip = JSON.parse(t);
        const updatedTrip = {
          ...trip,
          status: "COMPLETED",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await AsyncStorage.setItem(
          `trip_${tripId}`,
          JSON.stringify(updatedTrip),
        );
        return { data: updatedTrip, error: null };
      }
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Cancel a trip
 * @param {string} tripId - Trip ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const cancelTrip = async (tripId) => {
  try {
    const { data, error } = await supabase
      .from("trips")
      .update({
        status: "CANCELLED",
      })
      .eq("id", tripId)
      .select()
      .single();

    if (error) {
      const t = await AsyncStorage.getItem(`trip_${tripId}`);
      if (t) {
        const trip = JSON.parse(t);
        const updatedTrip = {
          ...trip,
          status: "CANCELLED",
          updated_at: new Date().toISOString(),
        };
        await AsyncStorage.setItem(
          `trip_${tripId}`,
          JSON.stringify(updatedTrip),
        );
        return { data: updatedTrip, error: null };
      }
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Subscribe to trip location updates
 * @param {string} tripId - Trip ID
 * @param {Function} callback - Callback function to handle updates
 * @returns {Object} - Subscription channel
 */
export const subscribeTripUpdates = (tripId, callback) => {
  // Check if we are in local fallback mode
  const channel = supabase
    .channel(`trip:${tripId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "trips",
        filter: `id=eq.${tripId}`,
      },
      (payload) => {
        callback(payload.new);
      },
    )
    .subscribe();

  // Setup local mock updates if needed (simplified)
  const interval = setInterval(async () => {
    const t = await AsyncStorage.getItem(`trip_${tripId}`);
    if (t) {
      callback(JSON.parse(t));
    }
  }, 5000);

  return { ...channel, intervalId: interval };
};

/**
 * Unsubscribe from trip updates
 * @param {Object} channel - Subscription channel
 */
export const unsubscribeTripUpdates = async (channel) => {
  if (channel && channel.unsubscribe) {
    await supabase.removeChannel(channel);
  }
  if (channel && channel.intervalId) {
    clearInterval(channel.intervalId);
  }
};

/**
 * Get active trips for a driver
 * @param {string} driverId - Driver ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getActiveTripsForDriver = async (driverId) => {
  try {
    const { data, error } = await supabase
      .from("trips")
      .select(
        `
        *,
        bookings (
          *,
          students (
            id,
            fullname,
            phone,
            home_location
          )
        ),
        plate_number,
          capacity
      `,
      )
      .eq("driver_id", driverId)
      .in("status", ["SCHEDULED", "IN_PROGRESS"])
      .order("created_at", { ascending: false });

    if (error) {
      return { data: [], error: null }; // Return empty array on error for mock flow
    }

    return { data, error: null };
  } catch (error) {
    return { data: [], error: null };
  }
};

/**
 * Get active trip for a student (via booking)
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getActiveTripForStudent = async (studentId) => {
  try {
    // First get active booking from Supabase
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id")
      .eq("student_id", studentId)
      .in("status", ["PENDING", "CONFIRMED", "IN_PROGRESS"])
      .order("start_time", { ascending: true })
      .limit(1)
      .single();

    if (bookingError || !booking) {
      // Fallback: check local storage for active booking
      const studentBookingsStr = await AsyncStorage.getItem(
        `student_bookings_${studentId}`,
      );
      if (!studentBookingsStr) return { data: null, error: null };

      const bookingIds = JSON.parse(studentBookingsStr);
      let localActiveBookingId = null;

      for (const id of bookingIds) {
        const b = await AsyncStorage.getItem(`booking_${id}`);
        if (b) {
          const bObj = JSON.parse(b);
          if (["PENDING", "CONFIRMED", "IN_PROGRESS"].includes(bObj.status)) {
            localActiveBookingId = id;
            break;
          }
        }
      }

      if (!localActiveBookingId) return { data: null, error: null };

      return await getTripByBookingId(localActiveBookingId);
    }

    // Then get trip for that booking
    const { data, error } = await supabase
      .from("trips")
      .select(
        `
        *
        plate_number,
          capacity
      `,
      )
      .eq("booking_id", booking.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { data: null, error: null };
      }
      return await getTripByBookingId(booking.id);
    }

    return { data, error: null };
  } catch (error) {
    // error: console.error('Exception fetching active trip:', error);
    return { data: null, error: null };
  }
};

/**
 * Fetch a trip by student ID and trip date, enriched with driver, bus,
 * pickup order, and pickup times. Used when a student taps an ASSIGNED
 * booking card to view full trip details.
 *
 * @param {string} studentId - Student UUID
 * @param {string} tripDate  - Date string "YYYY-MM-DD"
 * @returns {Promise<Object>}  - { data: <enriched trip payload>, error }
 */
export const getAssignedTripForStudent = async (studentId, tripDate) => {
  try {
    // 1. Find the trip that includes this student in student_ids
    console.log("[tripService] getAssignedTripForStudent start:", { studentId, tripDate });
    const { data: trips, error: tripErr } = await supabase
      .from("trips")
      .select("*")
      .eq("trip_date", tripDate)
      .in("status", ["SCHEDULED", "IN_PROGRESS"]);

    if (tripErr) {
        console.error("[tripService] supabase trips query error:", tripErr);
        return { data: null, error: tripErr };
    }

    console.log("[tripService] candidate trips found:", trips?.length || 0);

    // 2. Filter client-side for student in student_ids (JSONB array)
    const trip = (trips || []).find(
      (t) => Array.isArray(t.student_ids) && t.student_ids.includes(studentId),
    );

    if (!trip) {
        console.warn("[tripService] no trip found matching studentId in array for date:", tripDate);
        return { data: null, error: null };
    }

    console.log("[tripService] trip matched. driverId:", trip.driver_id);

    // 3. Manually fetch driver and bus (no FK relationship)
    let driverName = null;
    let driverPhone = null;
    let driverAvatar = null;
    let driverRating = null;
    let plateNumber = null;
    let busCapacity = null;

    if (trip.driver_id) {
      const cleanDriverId = String(trip.driver_id).trim();
      
      // DIAGNOSTIC: Fetch EVERYTHING to see what columns exist
      const { data: drv, error: drvErr } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", cleanDriverId)
        .maybeSingle();

      if (drvErr) console.error("[tripService] Driver query error:", drvErr);

      if (drv) {
        console.log("[tripService] Keys found in drivers table:", Object.keys(drv));
        console.log("[tripService] Driver record found:", drv.fullname);
        driverName = drv.fullname;
        // Check various possible names for phone
        driverPhone = drv.phone || drv.phone_number || drv.phoneNumber || drv.tel || null;
        driverAvatar = drv.avatar_url;
        driverRating = drv.rating;
      } else {
        console.warn("[tripService] Driver record not found for ID:", cleanDriverId);
      }
    }

    if (trip.bus_id) {
      const { data: bus } = await supabase
        .from("buses")
        .select("plate_number, capacity")
        .eq("id", trip.bus_id)
        .maybeSingle();
      if (bus) {
        plateNumber = bus.plate_number;
        busCapacity = bus.capacity;
      }
    }

    // 4. Build enriched payload for TripDetailsScreen
    const pickupOrder = trip.pickup_order || trip.student_ids || [];
    const pickupTimes = trip.pickup_times || {};
    const studentIndex = pickupOrder.indexOf(studentId);

    return {
      data: {
        id: trip.id,
        tripId: trip.id,
        studentId,
        status: trip.status,
        startTime: trip.start_time,
        schoolArrival: trip.school_arrival,
        driverName,
        driverPhone,
        driverAvatar,
        driverRating: driverRating || 4.8,
        plateNumber,
        busModel: busCapacity ? `${busCapacity} seats` : null,
        studentOrder: studentIndex >= 0 ? studentIndex + 1 : 1,
        pickupTime: pickupTimes[studentId] || null,
        pickupOrder,
        pickupTimes,
        totalStudents: pickupOrder.length,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
};
