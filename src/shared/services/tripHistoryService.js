import { supabase } from "../../lib/supabase";
import { isValidUUID } from "../utils/validation";

/**
 * Trip History Service
 * Reads student history from transport grouping tables:
 * - transport_trip_members
 * - transport_trips
 * - bookings
 */

const generateMockTrips = () => {
  const now = new Date();
  return [
    {
      id: "mock-trip-1",
      type: "PICKUP",
      status: "COMPLETED",
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      total_route: { total_distance: 5200, total_duration: 2700 },
    },
    {
      id: "mock-trip-2",
      type: "DROPOFF",
      status: "COMPLETED",
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      total_route: { total_distance: 4800, total_duration: 2400 },
    },
    {
      id: "mock-trip-3",
      type: "PICKUP",
      status: "COMPLETED",
      created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      total_route: { total_distance: 5500, total_duration: 3000 },
    },
  ];
};

const generateMockStatistics = () => ({
  totalTrips: 12,
  totalDistance: 58.4,
  totalTimeMinutes: 540,
  totalTimeHours: 9.0,
});

const generateMockMonthlyData = (months = 6) => {
  const data = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = date.toLocaleDateString("en-US", { month: "short" });

    const trips = Math.floor(Math.random() * 15) + 5;
    const distance = Math.round((Math.random() * 30 + 20) * 10) / 10;
    const timeMinutes = Math.round(trips * (Math.random() * 20 + 30));

    data.push({ month: monthName, trips, distance, timeMinutes });
  }

  return data;
};

const mapTransportStatus = (tripStatus, bookingStatus) => {
  if ((bookingStatus || "").toUpperCase() === "CANCELLED") return "CANCELLED";

  switch (tripStatus) {
    case "trip_completed":
      return "COMPLETED";
    case "trip_started":
      return "IN_PROGRESS";
    case "trip_pending":
      return "PENDING";
    default:
      if ((bookingStatus || "").toUpperCase() === "COMPLETED") return "COMPLETED";
      return (bookingStatus || "PENDING").toUpperCase();
  }
};

const mapMemberRowToHistoryTrip = (row) => {
  const booking = row?.bookings || null;
  const trip = row?.transport_trips || null;

  const durationSeconds = Number.isFinite(trip?.total_duration_s)
    ? trip.total_duration_s
    : booking?.start_time && booking?.end_time
      ? Math.max(0, Math.round((new Date(booking.end_time) - new Date(booking.start_time)) / 1000))
      : 0;

  const distanceMeters = Number.isFinite(trip?.total_distance_m)
    ? trip.total_distance_m
    : 0;

  return {
    id: booking?.id || `${row.trip_id || "trip"}-${row.booking_id || row.created_at}`,
    type: booking?.type || "PICKUP",
    status: mapTransportStatus(trip?.status, booking?.status),
    created_at:
      trip?.end_time || booking?.end_time || booking?.updated_at || row?.created_at || new Date().toISOString(),
    total_route: {
      total_distance: distanceMeters,
      total_duration: durationSeconds,
    },
  };
};

const filterHistoryByStatus = (trips, status) => {
  if (!status) return trips;
  const target = String(status).toUpperCase();
  return trips.filter((trip) => String(trip.status).toUpperCase() === target);
};

const fetchTransportHistoryRows = async ({ studentId, limit = 20, offset = 0 }) => {
  return supabase
    .from("transport_trip_members")
    .select(
      `
      trip_id,
      booking_id,
      created_at,
      bookings:booking_id (
        id,
        type,
        status,
        start_time,
        end_time,
        created_at,
        updated_at
      ),
      transport_trips:trip_id (
        id,
        status,
        start_time,
        end_time,
        total_distance_m,
        total_duration_s,
        updated_at
      )
    `,
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
};

const computeStatsFromTrips = (trips = []) => {
  const totalTrips = trips.length;
  const totalDistance = trips.reduce(
    (sum, trip) => sum + ((trip?.total_route?.total_distance || 0) / 1000),
    0,
  );
  const totalTimeMinutes = trips.reduce(
    (sum, trip) => sum + ((trip?.total_route?.total_duration || 0) / 60),
    0,
  );

  return {
    totalTrips,
    totalDistance: Math.round(totalDistance * 10) / 10,
    totalTimeMinutes: Math.round(totalTimeMinutes),
    totalTimeHours: Math.round((totalTimeMinutes / 60) * 10) / 10,
  };
};

const isDateWithinMonth = (dateValue, month) => {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === month.getFullYear() &&
    date.getMonth() === month.getMonth()
  );
};

export const getTripHistory = async (studentId, options = {}) => {
  try {
    if (!studentId || !isValidUUID(studentId)) {
      const mockTrips = generateMockTrips();
      return { data: filterHistoryByStatus(mockTrips, options.status), error: null };
    }

    const { limit = 20, offset = 0, status } = options;

    const { data, error } = await fetchTransportHistoryRows({ studentId, limit, offset });

    if (error) {
      return { data: [], error };
    }

    const mapped = (data || []).map(mapMemberRowToHistoryTrip);
    return { data: filterHistoryByStatus(mapped, status), error: null };
  } catch (error) {
    return { data: [], error };
  }
};

export const getCompletedTrips = async (studentId) => {
  return getTripHistory(studentId, { status: "COMPLETED", limit: 1000 });
};

export const getMonthlyStatistics = async (studentId, month = new Date()) => {
  try {
    if (!studentId || !isValidUUID(studentId)) {
      return { statistics: generateMockStatistics(), error: null };
    }

    const { data, error } = await getTripHistory(studentId, { limit: 500 });
    if (error) return { statistics: null, error };

    const completedThisMonth = (data || []).filter(
      (trip) => trip.status === "COMPLETED" && isDateWithinMonth(trip.created_at, month),
    );

    return {
      statistics: computeStatsFromTrips(completedThisMonth),
      error: null,
    };
  } catch (error) {
    return { statistics: null, error };
  }
};

export const getMonthlyStatisticsChart = async (studentId, months = 6) => {
  try {
    if (!studentId || !isValidUUID(studentId)) {
      return { data: generateMockMonthlyData(months), error: null };
    }

    const { data, error } = await getTripHistory(studentId, { limit: 1000 });
    if (error) return { data: [], error };

    const allCompleted = (data || []).filter((trip) => trip.status === "COMPLETED");
    const now = new Date();
    const monthlyData = [];

    for (let i = months - 1; i >= 0; i -= 1) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthTrips = allCompleted.filter((trip) =>
        isDateWithinMonth(trip.created_at, monthDate),
      );
      const stats = computeStatsFromTrips(monthTrips);

      monthlyData.push({
        month: monthDate.toLocaleDateString("en-US", { month: "short" }),
        trips: stats.totalTrips,
        distance: stats.totalDistance,
        timeMinutes: stats.totalTimeMinutes,
      });
    }

    return { data: monthlyData, error: null };
  } catch (error) {
    return { data: [], error };
  }
};

export const getTripById = async (tripId) => {
  try {
    const { data, error } = await supabase
      .from("transport_trip_members")
      .select(
        `
        trip_id,
        booking_id,
        created_at,
        bookings:booking_id (
          id,
          type,
          status,
          start_time,
          end_time,
          created_at,
          updated_at
        ),
        transport_trips:trip_id (
          id,
          status,
          start_time,
          end_time,
          total_distance_m,
          total_duration_s,
          updated_at
        )
      `,
      )
      .eq("trip_id", tripId)
      .limit(1)
      .maybeSingle();

    if (error) return { data: null, error };
    if (!data) return { data: null, error: null };

    return { data: mapMemberRowToHistoryTrip(data), error: null };
  } catch (error) {
    return { data: null, error };
  }
};
