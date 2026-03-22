import { supabase } from "../../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createStudentBookingAndGroup,
  getStudentCurrentTrip,
} from "./groupingService";

/**
 * Booking Service
 * Handles all Supabase operations for bookings
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
 * Create a new booking
 * @param {Object} bookingData - Booking data object
 * @param {string} bookingData.studentId - Student ID
 * @param {string} bookingData.type - Booking type ('PICKUP' or 'DROPOFF')
 * @param {Date} bookingData.startTime - Start time
 * @param {Date} bookingData.endTime - End time
 * @returns {Promise<Object>} - Result object with data and error
 */
export const createBooking = async (bookingData) => {
  try {
    // Validate time range
    if (bookingData.endTime <= bookingData.startTime) {
      return {
        data: null,
        error: { message: "End time must be after start time" },
      };
    }

    // Validate future time
    const now = new Date();
    if (bookingData.startTime < now) {
      return {
        data: null,
        error: { message: "Start time must be in the future" },
      };
    }

    const groupingResult = await createStudentBookingAndGroup({
      studentId: bookingData.studentId,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
      type: bookingData.type || "PICKUP",
    });

    if (!groupingResult.error && groupingResult.data?.bookingId) {
      const { data: createdBooking } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", groupingResult.data.bookingId)
        .single();

      return {
        data: {
          ...(createdBooking || {}),
          grouping: groupingResult.data,
        },
        error: null,
      };
    }

    const { data, error } = await supabase
      .from("bookings")
      .insert([
        {
          student_id: bookingData.studentId,
          type: bookingData.type || "PICKUP",
          start_time: bookingData.startTime.toISOString(),
          end_time: bookingData.endTime.toISOString(),
          pickup_location: bookingData.pickupLocation || null,
          destination_location: bookingData.destinationLocation || null,
          route_coordinates: bookingData.routeCoordinates || null,
          status: "PENDING",
          lifecycle_status: "booking_created",
        },
      ])
      .select()
      .single();

    if (error) {
      console.warn("Supabase not available, creating booking locally");

      const localBooking = {
        id: generateUUID(),
        student_id: bookingData.studentId,
        type: bookingData.type,
        start_time: bookingData.startTime.toISOString(),
        end_time: bookingData.endTime.toISOString(),
        pickup_location: bookingData.pickupLocation || null,
        destination_location: bookingData.destinationLocation || null,
        route_coordinates: bookingData.routeCoordinates || null,
        status: "PENDING",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Store booking
      await AsyncStorage.setItem(
        `booking_${localBooking.id}`,
        JSON.stringify(localBooking),
      );

      // Update student's list of bookings (simplified)
      const studentBookingsStr = await AsyncStorage.getItem(
        `student_bookings_${bookingData.studentId}`,
      );
      const studentBookings = studentBookingsStr
        ? JSON.parse(studentBookingsStr)
        : [];
      studentBookings.push(localBooking.id);
      await AsyncStorage.setItem(
        `student_bookings_${bookingData.studentId}`,
        JSON.stringify(studentBookings),
      );

      return { data: localBooking, error: null };
    }

    return { data, error: null };
  } catch (error) {
    console.warn("Exception creating booking, saving locally:", error);

    const localBooking = {
      id: generateUUID(),
      student_id: bookingData.studentId,
      type: bookingData.type,
      start_time: bookingData.startTime.toISOString(),
      end_time: bookingData.endTime.toISOString(),
      pickup_location: bookingData.pickupLocation || null,
      destination_location: bookingData.destinationLocation || null,
      route_coordinates: bookingData.routeCoordinates || null,
      status: "PENDING",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await AsyncStorage.setItem(
        `booking_${localBooking.id}`,
        JSON.stringify(localBooking),
      );
      const studentBookingsStr = await AsyncStorage.getItem(
        `student_bookings_${bookingData.studentId}`,
      );
      const studentBookings = studentBookingsStr
        ? JSON.parse(studentBookingsStr)
        : [];
      studentBookings.push(localBooking.id);
      await AsyncStorage.setItem(
        `student_bookings_${bookingData.studentId}`,
        JSON.stringify(studentBookings),
      );
      return { data: localBooking, error: null };
    } catch (storageError) {
      return { data: null, error: storageError };
    }
  }
};

/**
 * Get bookings by student ID
 * @param {string} studentId - Student ID
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status
 * @param {number} options.limit - Limit results
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getBookingsByStudent = async (studentId, options = {}) => {
  try {
    let query = supabase
      .from("bookings")
      .select("*")
      .eq("student_id", studentId)
      .order("start_time", { ascending: false });

    if (options.status) {
      query = query.eq("status", options.status);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("Supabase not available, fetching bookings locally");
      const studentBookingsStr = await AsyncStorage.getItem(
        `student_bookings_${studentId}`,
      );
      if (!studentBookingsStr) return { data: [], error: null };

      const bookingIds = JSON.parse(studentBookingsStr);
      const bookings = [];

      for (const id of bookingIds) {
        const b = await AsyncStorage.getItem(`booking_${id}`);
        if (b) {
          const booking = JSON.parse(b);
          if (!options.status || booking.status === options.status) {
            bookings.push(booking);
          }
        }
      }

      // Sort by start_time descending
      bookings.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

      const limitedBookings = options.limit
        ? bookings.slice(0, options.limit)
        : bookings;
      return { data: limitedBookings, error: null };
    }

    return { data, error: null };
  } catch (error) {
    console.warn("Exception fetching bookings, looking locally:", error);
    const studentBookingsStr = await AsyncStorage.getItem(
      `student_bookings_${studentId}`,
    );
    if (!studentBookingsStr) return { data: [], error: null };
    return { data: [], error: null };
  }
};

/**
 * Get booking by ID
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getBookingById = async (bookingId) => {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (error) {
      console.warn("Supabase not available, searching booking locally");
      const b = await AsyncStorage.getItem(`booking_${bookingId}`);
      if (b) return { data: JSON.parse(b), error: null };
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    const b = await AsyncStorage.getItem(`booking_${bookingId}`);
    if (b) return { data: JSON.parse(b), error: null };
    return { data: null, error };
  }
};

/**
 * Update booking
 * @param {string} bookingId - Booking ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Result object with data and error
 */
export const updateBooking = async (bookingId, updates) => {
  try {
    // Convert Date objects to ISO strings if present
    const processedUpdates = { ...updates };
    if (updates.start_time instanceof Date) {
      processedUpdates.start_time = updates.start_time.toISOString();
    }
    if (updates.end_time instanceof Date) {
      processedUpdates.end_time = updates.end_time.toISOString();
    }

    const { data, error } = await supabase
      .from("bookings")
      .update(processedUpdates)
      .eq("id", bookingId)
      .select()
      .single();

    if (error) {
      console.warn("Supabase not available, updating booking locally");
      const b = await AsyncStorage.getItem(`booking_${bookingId}`);
      if (b) {
        const booking = JSON.parse(b);
        const updatedBooking = {
          ...booking,
          ...processedUpdates,
          updated_at: new Date().toISOString(),
        };
        await AsyncStorage.setItem(
          `booking_${bookingId}`,
          JSON.stringify(updatedBooking),
        );
        return { data: updatedBooking, error: null };
      }
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.warn("Exception updating booking, looking locally:", error);
    const b = await AsyncStorage.getItem(`booking_${bookingId}`);
    if (b) {
      const booking = JSON.parse(b);
      const updatedBooking = {
        ...booking,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      await AsyncStorage.setItem(
        `booking_${bookingId}`,
        JSON.stringify(updatedBooking),
      );
      return { data: updatedBooking, error: null };
    }
    return { data: null, error };
  }
};

/**
 * Get active booking for a student
 * Active booking = PENDING or CONFIRMED status, not completed/cancelled, and start_time is in the future or current
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const getActiveBooking = async (studentId) => {
  try {
    const groupedTripResult = await getStudentCurrentTrip(studentId);
    if (!groupedTripResult.error && groupedTripResult.data?.booking) {
      return {
        data: {
          ...groupedTripResult.data.booking,
          grouped_trip: groupedTripResult.data.trip,
        },
        error: null,
      };
    }

    const now = new Date();
    const nowISO = now.toISOString();

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("student_id", studentId)
      .in("status", ["PENDING", "CONFIRMED", "IN_PROGRESS"])
      .gte("start_time", nowISO)
      .order("start_time", { ascending: true })
      .limit(1)
      .single();

    if (error) {
      // If no active booking found, return null (not an error)
      if (error.code === "PGRST116") {
        return { data: null, error: null };
      }

      console.warn("Supabase not available, searching active booking locally");
      const studentBookingsStr = await AsyncStorage.getItem(
        `student_bookings_${studentId}`,
      );
      if (!studentBookingsStr) return { data: null, error: null };

      const bookingIds = JSON.parse(studentBookingsStr);
      let activeBooking = null;

      for (const id of bookingIds) {
        const b = await AsyncStorage.getItem(`booking_${id}`);
        if (b) {
          const booking = JSON.parse(b);
          const isPendingOrConfirmed = ["PENDING", "CONFIRMED"].includes(
            booking.status,
          );
          const isFutureOrCurrent = new Date(booking.start_time) >= now;

          if (isPendingOrConfirmed && isFutureOrCurrent) {
            if (
              !activeBooking ||
              new Date(booking.start_time) < new Date(activeBooking.start_time)
            ) {
              activeBooking = booking;
            }
          }
        }
      }
      return { data: activeBooking, error: null };
    }

    return { data, error: null };
  } catch (error) {
    console.warn("Exception fetching active booking, looking locally:", error);
    return { data: null, error: null };
  }
};

/**
 * Cancel booking
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object>} - Result object with data and error
 */
export const cancelBooking = async (bookingId) => {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "CANCELLED" })
      .eq("id", bookingId)
      .select()
      .single();

    if (error) {
      console.warn("Supabase not available, cancelling booking locally");
      const b = await AsyncStorage.getItem(`booking_${bookingId}`);
      if (b) {
        const booking = JSON.parse(b);
        const updatedBooking = {
          ...booking,
          status: "CANCELLED",
          updated_at: new Date().toISOString(),
        };
        await AsyncStorage.setItem(
          `booking_${bookingId}`,
          JSON.stringify(updatedBooking),
        );
        return { data: updatedBooking, error: null };
      }
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    const b = await AsyncStorage.getItem(`booking_${bookingId}`);
    if (b) {
      const booking = JSON.parse(b);
      const updatedBooking = {
        ...booking,
        status: "CANCELLED",
        updated_at: new Date().toISOString(),
      };
      await AsyncStorage.setItem(
        `booking_${bookingId}`,
        JSON.stringify(updatedBooking),
      );
      return { data: updatedBooking, error: null };
    }
    return { data: null, error };
  }
};

/**
 * Get bookings grouped by time slot for driver trips
 * Groups bookings by similar start times and destination
 * @param {Date} date - Date to get bookings for
 * @returns {Promise<Object>} - Grouped bookings
 */
export const getBookingsGroupedByTimeSlot = async (date = new Date()) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        students (
          id,
          fullname,
          phone,
          home_location,
          school
        )
      `,
      )
      .in("status", ["PENDING", "CONFIRMED"])
      .gte("start_time", startOfDay.toISOString())
      .lte("start_time", endOfDay.toISOString())
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching bookings:", error);
      return { data: null, error };
    }

    // Group bookings by time slot (within 30 minutes) and destination
    const grouped = {};

    if (data) {
      data.forEach((booking) => {
        const startTime = new Date(booking.start_time);
        const timeSlot = `${String(startTime.getHours()).padStart(2, "0")}:${String(startTime.getMinutes()).padStart(2, "0")}`;

        // Round to nearest 30 minutes for grouping
        const roundedMinutes = Math.floor(startTime.getMinutes() / 30) * 30;
        const slotTime = `${String(startTime.getHours()).padStart(2, "0")}:${String(roundedMinutes).padStart(2, "0")}`;

        // Create time range (30 min window)
        const slotStart = new Date(startTime);
        slotStart.setMinutes(roundedMinutes, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + 30);

        const timeRange = `${slotStart.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })} - ${slotEnd.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`;

        // Use school as destination key (assuming all students from same school go to same destination)
        const destination = booking.students?.school || "Unknown";
        const key = `${destination}_${slotTime}`;

        if (!grouped[key]) {
          grouped[key] = {
            timeSlot: timeRange,
            destination: destination,
            destinationLocation: booking.students?.home_location || {
              latitude: 33.58,
              longitude: -7.592,
            },
            students: [],
            studentCount: 0,
            bookings: [],
          };
        }

        if (booking.students) {
          grouped[key].students.push({
            id: booking.students.id,
            name: booking.students.fullname,
            phone: booking.students.phone,
            homeLocation: booking.students.home_location,
          });
          grouped[key].bookings.push(booking);
          grouped[key].studentCount++;
        }
      });
    }

    return { data: Object.values(grouped), error: null };
  } catch (error) {
    console.error("Exception fetching grouped bookings:", error);
    return { data: null, error };
  }
};
