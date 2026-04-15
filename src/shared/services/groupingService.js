import { supabase } from "../../lib/supabase";
import { createNotification } from "./notificationService";
import { getDirectionsRoute, getEtaSeconds } from "./mapboxService";
import { buildStudentGroups } from "./studentGroupingService";

const toDate = (value) => (value instanceof Date ? value : new Date(value));
const toRadians = (value) => (value * Math.PI) / 180;

const haversineMeters = (a, b) => {
  if (!a || !b) return 0;
  const R = 6371000;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
};

const mapMemberToStudent = (member) => ({
  id: member.student_id,
  name: member.students?.fullname || "Student",
  phone: member.students?.phone || null,
  homeLocation: member.students?.home_location || null,
  pickupOrder: member.pickup_order,
  noShow: member.no_show,
});

const normalizeTripShape = (trip, members = []) => {
  const sortedMembers = [...members].sort(
    (a, b) => (a.pickup_order || 0) - (b.pickup_order || 0),
  );

  return {
    id: trip.id,
    tripId: trip.id,
    status: trip.status,
    startTime: trip.start_time,
    endTime: trip.end_time,
    timeSlot: `${new Date(trip.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })} - ${new Date(trip.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`,
    driverId: trip.driver_id,
    busId: trip.bus_id,
    membersCount: trip.members_count,
    capacity: trip.capacity,
    schoolLocation: trip.school_location,
    destination: "School",
    destinationLocation: trip.school_location,
    pickupLocation:
      sortedMembers[0]?.students?.home_location || trip.school_location,
    routeCoordinates: trip.route_polyline || [],
    totalDistanceKm: trip.total_distance_m
      ? trip.total_distance_m / 1000
      : null,
    totalDurationMinutes: trip.total_duration_s
      ? Math.round(trip.total_duration_s / 60)
      : null,
    students: sortedMembers.map(mapMemberToStudent),
    etaByMember: trip.eta_by_member || {},
    liveLocation: trip.live_location || null,
    isLocked: trip.is_locked,
  };
};

export const createStudentBookingAndGroup = async ({
  studentId,
  startTime,
  endTime,
  type = "PICKUP",
}) => {
  const start = toDate(startTime);
  const end = toDate(endTime);

  if (end <= start) {
    return {
      data: null,
      error: { message: "End time must be after start time." },
    };
  }

  if (start <= new Date()) {
    return {
      data: null,
      error: { message: "Start time must be in the future." },
    };
  }

  const { data, error } = await supabase.rpc("create_booking_and_group", {
    p_student_id: studentId,
    p_type: type,
    p_start_time: start.toISOString(),
    p_end_time: end.toISOString(),
  });

  if (error) {
    return { data: null, error };
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    data: {
      bookingId: row?.booking_id,
      tripId: row?.trip_id,
      lifecycleStatus: row?.booking_lifecycle_status,
      tripStatus: row?.trip_status,
      assignedDriverId: row?.assigned_driver_id,
      assignedBusId: row?.assigned_bus_id,
      membersCount: row?.members_count,
      capacity: row?.capacity,
      locked: row?.locked,
      reason: row?.reason,
    },
    error: null,
  };
};

export const getStudentCurrentTrip = async (studentId) => {
  // Find trips where this student is in the student_ids array
  const { data: trips, error: tripErr } = await supabase
    .from("trips")
    .select(`
      *,
      schools (
        latitude,
        longitude,
        name
      )
    `)
    .in("status", ["SCHEDULED", "IN_PROGRESS"])
    .order("start_time", { ascending: true });

  if (tripErr) {
    return { data: null, error: tripErr };
  }

  // Filter for trips that include this student
  const studentTrip = (trips || []).find(
    (t) => Array.isArray(t.student_ids) && t.student_ids.includes(studentId),
  );

  if (!studentTrip) {
    return { data: null, error: null };
  }

  // Manually fetch driver and bus data (no FK in Supabase)
  let driverName = null;
  let driverPhone = null;
  let plateNumber = null;
  let busCapacity = null;

  if (studentTrip.driver_id) {
    const { data: drv } = await supabase
      .from("drivers")
      .select("fullname, phone")
      .eq("id", studentTrip.driver_id)
      .maybeSingle();
    if (drv) {
      driverName = drv.fullname;
      driverPhone = drv.phone;
    }
  }

  if (studentTrip.bus_id) {
    const { data: bus } = await supabase
      .from("buses")
      .select("plate_number, capacity")
      .eq("id", studentTrip.bus_id)
      .maybeSingle();
    if (bus) {
      plateNumber = bus.plate_number;
      busCapacity = bus.capacity;
    }
  }

  const pickupOrder = studentTrip.pickup_order || studentTrip.student_ids || [];
  const pickupTimes = studentTrip.pickup_times || {};
  const studentIndex = pickupOrder.indexOf(studentId);

  const trip = {
    id: studentTrip.id,
    tripId: studentTrip.id,
    status: studentTrip.status,
    startTime: studentTrip.start_time,
    endTime: studentTrip.end_time || studentTrip.school_arrival,
    timeSlot: `${new Date(studentTrip.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })} - ${new Date(studentTrip.school_arrival || studentTrip.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`,
    driverId: studentTrip.driver_id,
    busId: studentTrip.bus_id,
    membersCount: pickupOrder.length,
    capacity: busCapacity || null,
    schoolLocation: studentTrip.schools ? {
      latitude: studentTrip.schools.latitude,
      longitude: studentTrip.schools.longitude
    } : studentTrip.school_location,
    destination: studentTrip.schools?.name || "School",
    destinationLocation: studentTrip.schools ? {
      latitude: studentTrip.schools.latitude,
      longitude: studentTrip.schools.longitude
    } : studentTrip.school_location,
    pickupLocation: studentTrip.school_location,
    routeCoordinates: studentTrip.route_polyline || [],
    totalDistanceKm: studentTrip.total_distance_m
      ? studentTrip.total_distance_m / 1000
      : null,
    totalDurationMinutes: studentTrip.total_duration_s
      ? Math.round(studentTrip.total_duration_s / 60)
      : null,
    students: pickupOrder.map((sid, i) => ({
      id: sid,
      name: sid === studentId ? "You" : `Student ${i + 1}`,
      phone: null,
      homeLocation: null,
      pickupOrder: i + 1,
      pickupTime: pickupTimes[sid] || null,
    })),
    etaByMember: studentTrip.eta_by_member || {},
    liveLocation:
      studentTrip.live_location || studentTrip.current_location ||
      (studentTrip.driver_lat && studentTrip.driver_lng ? { latitude: studentTrip.driver_lat, longitude: studentTrip.driver_lng } : null) || null,
    isLocked: studentTrip.is_locked,
    driverName,
    driverPhone,
    plateNumber,
    busModel: busCapacity ? `${busCapacity} seats` : null,
    pickupOrder,
    pickupTimes,
    studentOrder: studentIndex >= 0 ? studentIndex + 1 : 1,
    pickupTime: pickupTimes[studentId] || null,
  };

  return {
    data: {
      booking: null,
      trip,
    },
    error: null,
  };
};

export const getDriverAssignedTrips = async (driverId) => {
  console.log("[getDriverAssignedTrips] Querying for driverId:", driverId);

  const { data, error } = await supabase
    .from("trips")
    .select(`
      *,
      schools (
        latitude,
        longitude,
        name
      )
    `)
    .eq("driver_id", driverId)
    .in("status", ["SCHEDULED", "IN_PROGRESS"])
    .order("start_time", { ascending: true });

  console.log(
    "[getDriverAssignedTrips] Raw result:",
    data?.length ?? 0,
    "trips, error:",
    error,
  );

  if (error) {
    return { data: [], error };
  }

  if (!data?.length) {
    return { data: [], error: null };
  }

  console.log(
    "[getDriverAssignedTrips] Trip statuses:",
    data.map((t) => ({
      id: t.id,
      status: t.status,
      studentCount: t.student_ids?.length,
    })),
  );

  // Collect all student IDs, driver IDs, and bus IDs across all trips
  const allStudentIds = [
    ...new Set(
      data
        .flatMap((t) => t.student_ids || t.pickup_order || [])
        .filter(Boolean),
    ),
  ];
  const driverIds = [...new Set(data.map((t) => t.driver_id).filter(Boolean))];
  const busIds = [...new Set(data.map((t) => t.bus_id).filter(Boolean))];

  let studentsById = new Map();
  if (allStudentIds.length > 0) {
    const { data: students, error: stuErr } = await supabase
      .from("students")
      .select("id, fullname, phone, home_location")
      .in("id", allStudentIds);
    if (!stuErr && students) {
      studentsById = new Map(students.map((s) => [s.id, s]));
    }
  }

  let driversById = new Map();
  if (driverIds.length > 0) {
    const { data: drivers, error: drvErr } = await supabase
      .from("drivers")
      .select("id, fullname, phone")
      .in("id", driverIds);
    if (!drvErr && drivers) {
      driversById = new Map(drivers.map((d) => [d.id, d]));
    }
  }

  let busesById = new Map();
  if (busIds.length > 0) {
    const { data: buses, error: busErr } = await supabase
      .from("buses")
      .select("id, plate_number, capacity")
      .in("id", busIds);
    if (!busErr && buses) {
      busesById = new Map(buses.map((b) => [b.id, b]));
    }
  }

  // Normalize trip shape for DriverHomeScreen
  const normalized = data.map((trip) => {
    const pickupOrder = trip.pickup_order || trip.student_ids || [];
    const pickupTimes = trip.pickup_times || {};

    // Build student list with real data from students table
    const students = pickupOrder.map((sid, index) => {
      const stu = studentsById.get(sid);
      return {
        id: sid,
        name: stu?.fullname || `Student ${index + 1}`,
        phone: stu?.phone || null,
        homeLocation: stu?.home_location || null,
        pickupOrder: index + 1,
        pickupTime: pickupTimes[sid] || null,
      };
    });

    const bus = busesById.get(trip.bus_id);
    const driver = driversById.get(trip.driver_id);

    const schoolLoc = trip.schools ? {
      latitude: trip.schools.latitude,
      longitude: trip.schools.longitude
    } : trip.school_location;

    return {
      id: trip.id,
      tripId: trip.id,
      status: trip.status,
      startTime: trip.start_time,
      endTime: trip.end_time || trip.school_arrival,
      timeSlot: `${new Date(trip.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })} - ${new Date(trip.school_arrival || trip.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`,
      driverId: trip.driver_id,
      busId: trip.bus_id,
      membersCount: students.length,
      capacity: bus?.capacity || null,
      schoolLocation: schoolLoc,
      destination: trip.schools?.name || "School",
      destinationLocation: schoolLoc,
      pickupLocation: students[0]?.homeLocation || schoolLoc,
      routeCoordinates: trip.route_polyline || [],
      totalDistanceKm: trip.total_distance_m
        ? trip.total_distance_m / 1000
        : null,
      totalDurationMinutes: trip.total_duration_s
        ? Math.round(trip.total_duration_s / 60)
        : null,
      students,
      etaByMember: trip.eta_by_member || {},
      liveLocation: trip.live_location || trip.current_location ||
        (trip.driver_lat && trip.driver_lng ? { latitude: trip.driver_lat, longitude: trip.driver_lng } : null) || null,
      isLocked: trip.is_locked,
      driverName: driver?.fullname || null,
      driverPhone: driver?.phone || null,
      plateNumber: bus?.plate_number || null,
      busModel: bus?.capacity ? `${bus.capacity} seats` : null,
      pickupOrder,
      pickupTimes,
    };
  });

  return { data: normalized, error: null };
};

export const buildAndPersistTripRoute = async ({
  tripId,
  driverStartLocation = null,
}) => {
  const tripResult = await supabase
    .from("transport_trips")
    .select("*")
    .eq("id", tripId)
    .single();

  if (tripResult.error || !tripResult.data) {
    return {
      data: null,
      error: tripResult.error || { message: "Trip not found." },
    };
  }

  const membersResult = await supabase
    .from("transport_trip_members")
    .select(
      `
      *,
      students:student_id (id, fullname, home_location)
    `,
    )
    .eq("trip_id", tripId)
    .order("pickup_order", { ascending: true });

  if (membersResult.error) {
    return { data: null, error: membersResult.error };
  }

  const members = membersResult.data || [];
  const waypointHomes = members
    .filter((member) => member.students?.home_location)
    .map((member) => member.students.home_location);

  if (waypointHomes.length === 0 || !tripResult.data.school_location) {
    return {
      data: null,
      error: { message: "Trip has no members or school location." },
    };
  }

  const origin = driverStartLocation || waypointHomes[0];
  const route = await getDirectionsRoute({
    origin,
    waypoints: waypointHomes,
    destination: tripResult.data.school_location,
  });

  const etaByMember = {};
  let elapsed = 0;
  if (Array.isArray(route.legs) && route.legs.length > 0) {
    for (let i = 0; i < members.length; i += 1) {
      const leg = route.legs[i];
      elapsed += leg?.durationSeconds || 0;
      etaByMember[members[i].student_id] = elapsed;
    }
  }

  const { data, error } = await supabase
    .from("transport_trips")
    .update({
      route_polyline: route.coordinates,
      total_distance_m: route.distanceMeters,
      total_duration_s: route.durationSeconds,
      eta_by_member: etaByMember,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tripId)
    .select("*")
    .single();

  if (error) {
    return { data: null, error };
  }

  return {
    data: normalizeTripShape(data, members),
    error: null,
  };
};

export const startAssignedTrip = async ({ tripId, driverId }) => {
  const { data, error } = await supabase.rpc("start_transport_trip", {
    p_trip_id: tripId,
    p_driver_id: driverId,
  });

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
};

export const completeAssignedTrip = async ({ tripId, driverId }) => {
  const { data, error } = await supabase.rpc("complete_transport_trip", {
    p_trip_id: tripId,
    p_driver_id: driverId,
  });

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
};

export const updateDriverLiveLocation = async ({
  tripId,
  driverId,
  latitude,
  longitude,
  speedMps = null,
  heading = null,
}) => {
  const { error } = await supabase.rpc("update_trip_live_location", {
    p_trip_id: tripId,
    p_driver_id: driverId,
    p_latitude: latitude,
    p_longitude: longitude,
    p_speed_mps: speedMps,
    p_heading: heading,
  });

  return { error: error || null };
};

export const markStudentNoShow = async ({ tripId, studentId, driverId }) => {
  const { data, error } = await supabase
    .from("transport_trip_members")
    .update({ no_show: true })
    .eq("trip_id", tripId)
    .eq("student_id", studentId)
    .select("*")
    .single();

  if (error) {
    return { data: null, error };
  }

  await supabase.from("transport_trip_events").insert([
    {
      trip_id: tripId,
      actor_type: "driver",
      actor_id: driverId,
      event_type: "student_no_show",
      payload: { student_id: studentId },
    },
  ]);

  return { data, error: null };
};

export const notifyStudentsDriverDelayed = async ({ tripId, delayMinutes }) => {
  const membersResult = await supabase
    .from("transport_trip_members")
    .select("student_id")
    .eq("trip_id", tripId);

  if (membersResult.error) {
    return { error: membersResult.error };
  }

  await Promise.all(
    (membersResult.data || []).map((member) =>
      createNotification({
        studentId: member.student_id,
        type: "DRIVER_DELAYED",
        title: "Driver delayed",
        body: `Driver is delayed by about ${delayMinutes} minutes. ETA has been updated.`,
        data: { tripId, delayMinutes },
      }),
    ),
  );

  await supabase.from("transport_trip_events").insert([
    {
      trip_id: tripId,
      actor_type: "system",
      event_type: "driver_delayed_notification",
      payload: { delayMinutes },
    },
  ]);

  return { error: null };
};

export const subscribeToTripState = (tripId, callback) => {
  return supabase
    .channel(`transport-trip:${tripId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "transport_trips",
        filter: `id=eq.${tripId}`,
      },
      (payload) => callback(payload.new),
    )
    .subscribe();
};

export const subscribeToTripLiveLocations = (tripId, callback) => {
  return supabase
    .channel(`transport-trip-locations:${tripId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "transport_trip_locations",
        filter: `trip_id=eq.${tripId}`,
      },
      (payload) => callback(payload.new),
    )
    .subscribe();
};

export const unsubscribeChannel = async (channel) => {
  if (channel) {
    await supabase.removeChannel(channel);
  }
};

export const calculateLiveEtaForStudentPickup = async ({
  tripId,
  studentId,
}) => {
  const tripResult = await supabase
    .from("transport_trips")
    .select("live_location")
    .eq("id", tripId)
    .single();

  if (tripResult.error || !tripResult.data?.live_location) {
    return {
      data: null,
      error: tripResult.error || { message: "Live location unavailable." },
    };
  }

  const memberResult = await supabase
    .from("transport_trip_members")
    .select("students:student_id (home_location)")
    .eq("trip_id", tripId)
    .eq("student_id", studentId)
    .single();

  if (memberResult.error || !memberResult.data?.students?.home_location) {
    return {
      data: null,
      error: memberResult.error || {
        message: "Student pickup location unavailable.",
      },
    };
  }

  const etaSeconds = await getEtaSeconds({
    origin: {
      latitude: tripResult.data.live_location.latitude,
      longitude: tripResult.data.live_location.longitude,
    },
    destination: memberResult.data.students.home_location,
  });

  return {
    data: {
      etaSeconds,
      etaMinutes: Math.max(1, Math.round(etaSeconds / 60)),
    },
    error: null,
  };
};

/**
 * Backend-facing helper for mobile screens.
 * Returns a state machine result:
 * - ready: trip data exists and can be displayed
 * - processing: booking/grouping requested but trip not ready yet
 * - error: request failed
 */
export const requestStudentTripDetailsState = async ({
  studentId,
  startTime,
  endTime,
  type = "PICKUP",
}) => {
  const currentTrip = await getStudentCurrentTrip(studentId);
  if (currentTrip?.error) {
    return { state: "error", error: currentTrip.error };
  }

  if (currentTrip?.data?.trip) {
    return { state: "ready", data: currentTrip.data };
  }

  const bookingAttempt = await createStudentBookingAndGroup({
    studentId,
    startTime,
    endTime,
    type,
  });

  if (bookingAttempt?.error) {
    return { state: "error", error: bookingAttempt.error };
  }

  const bookingReason = bookingAttempt?.data?.reason || null;
  const bookingId = bookingAttempt?.data?.bookingId || null;

  // If DB grouping skipped assignment (e.g. distance_exceeds_15km),
  // force a singleton trip so every booking is persisted in trip/member tables.
  if (bookingReason === "distance_exceeds_15km" && bookingId) {
    const fallbackResult = await forceGroupSingleBooking({ bookingId });
    if (fallbackResult?.error) {
      return { state: "error", error: fallbackResult.error };
    }
  }

  const refreshedTrip = await getStudentCurrentTrip(studentId);
  if (refreshedTrip?.error) {
    return { state: "error", error: refreshedTrip.error };
  }

  if (refreshedTrip?.data?.trip) {
    return {
      state: "ready",
      data: refreshedTrip.data,
      booking: bookingAttempt.data || null,
    };
  }

  return {
    state: "processing",
    data: bookingAttempt.data || null,
    reason: bookingAttempt?.data?.reason || "grouping_in_progress",
  };
};

export const cancelStudentPendingTrip = async ({
  studentId,
  tripId = null,
  bookingId = null,
}) => {
  if (!studentId) {
    return { data: null, error: { message: "Student ID is required." } };
  }

  let selectedTrip = null;
  let selectedMembership = null;

  const membershipsResult = await supabase
    .from("transport_trip_members")
    .select("trip_id, booking_id, student_id, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (membershipsResult.error) {
    return { data: null, error: membershipsResult.error };
  }

  const memberships = membershipsResult.data || [];
  if (memberships.length === 0) {
    return {
      data: null,
      error: { message: "No grouped trip found to cancel." },
    };
  }

  const candidateTripIds = [...new Set(memberships.map((m) => m.trip_id))];
  const tripResult = await supabase
    .from("transport_trips")
    .select("id, status")
    .in("id", candidateTripIds);

  if (tripResult.error) {
    return { data: null, error: tripResult.error };
  }

  const tripsById = new Map(
    (tripResult.data || []).map((trip) => [trip.id, trip]),
  );

  if (tripId && tripsById.has(tripId)) {
    selectedTrip = tripsById.get(tripId);
    selectedMembership =
      memberships.find(
        (m) =>
          m.trip_id === tripId && (!bookingId || m.booking_id === bookingId),
      ) ||
      memberships.find((m) => m.trip_id === tripId) ||
      null;
  } else {
    selectedMembership =
      memberships.find((m) => {
        const trip = tripsById.get(m.trip_id);
        if (!trip) return false;
        return trip.status === "trip_pending" || trip.status === "trip_started";
      }) || null;
    selectedTrip = selectedMembership
      ? tripsById.get(selectedMembership.trip_id)
      : null;
  }

  if (!selectedTrip || !selectedMembership) {
    return {
      data: null,
      error: { message: "No active grouped trip found to cancel." },
    };
  }

  if (selectedTrip.status === "trip_started") {
    return {
      data: null,
      error: {
        message: "Trip already started and can no longer be cancelled.",
      },
    };
  }

  const memberDelete = await supabase
    .from("transport_trip_members")
    .delete()
    .eq("trip_id", selectedTrip.id)
    .eq("student_id", studentId);

  if (memberDelete.error) {
    return { data: null, error: memberDelete.error };
  }

  const tripMembersCount = await supabase
    .from("transport_trip_members")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", selectedTrip.id);

  if (tripMembersCount.error) {
    return { data: null, error: tripMembersCount.error };
  }

  const remainingMembers = tripMembersCount.count || 0;

  const tripUpdatePayload =
    remainingMembers === 0
      ? {
        status: "trip_completed",
        bus_id: null,
        driver_id: null,
        locked_at: null,
        members_count: 0,
        is_locked: false,
        updated_at: new Date().toISOString(),
      }
      : {
        members_count: remainingMembers,
        updated_at: new Date().toISOString(),
      };

  const tripUpdate = await supabase
    .from("transport_trips")
    .update(tripUpdatePayload)
    .eq("id", selectedTrip.id);

  if (tripUpdate.error) {
    return { data: null, error: tripUpdate.error };
  }

  const targetBookingId = bookingId || selectedMembership.booking_id || null;
  if (targetBookingId) {
    const bookingUpdate = await supabase
      .from("bookings")
      .update({
        status: "CANCELLED",
        assigned_trip_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetBookingId);

    if (bookingUpdate.error) {
      return { data: null, error: bookingUpdate.error };
    }
  }

  return {
    data: {
      cancelled: true,
      tripId: selectedTrip.id,
      bookingId: targetBookingId,
      remainingMembers,
    },
    error: null,
  };
};

const forceGroupSingleBooking = async ({ bookingId }) => {
  const existingMemberResult = await supabase
    .from("transport_trip_members")
    .select("trip_id")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (existingMemberResult.error) {
    return { data: null, error: existingMemberResult.error };
  }

  if (existingMemberResult.data?.trip_id) {
    return { data: { tripId: existingMemberResult.data.trip_id }, error: null };
  }

  const bookingResult = await supabase
    .from("bookings")
    .select(
      `
      id,
      student_id,
      type,
      start_time,
      end_time,
      students:student_id (
        id,
        school_id,
        home_location,
        schools:school_id (
          id,
          latitude,
          longitude
        )
      )
    `,
    )
    .eq("id", bookingId)
    .single();

  if (bookingResult.error || !bookingResult.data) {
    return {
      data: null,
      error: bookingResult.error || { message: "Booking not found." },
    };
  }

  const booking = bookingResult.data;
  const school = booking.students?.schools;
  const studentHome = booking.students?.home_location;

  if (
    !booking.students?.school_id ||
    !studentHome ||
    !Number.isFinite(school?.latitude) ||
    !Number.isFinite(school?.longitude)
  ) {
    return {
      data: null,
      error: { message: "Missing school or student coordinates for grouping." },
    };
  }

  const schoolLocation = {
    latitude: school.latitude,
    longitude: school.longitude,
  };
  const distanceToSchoolM = haversineMeters(studentHome, schoolLocation);
  const etaToSchoolS = Math.max(
    60,
    Math.round((distanceToSchoolM / 1000) * 120),
  );

  let tripId = null;

  const existingTrip = await supabase
    .from("transport_trips")
    .select("id")
    .eq("school_id", booking.students.school_id)
    .eq("type", booking.type || "PICKUP")
    .eq("start_time", booking.start_time)
    .eq("end_time", booking.end_time)
    .eq("status", "trip_pending")
    .eq("is_locked", false)
    .maybeSingle();

  if (existingTrip.error) {
    return { data: null, error: existingTrip.error };
  }

  if (existingTrip.data?.id) {
    tripId = existingTrip.data.id;
  } else {
    const tripInsert = await supabase
      .from("transport_trips")
      .insert([
        {
          school_id: booking.students.school_id,
          type: booking.type || "PICKUP",
          start_time: booking.start_time,
          end_time: booking.end_time,
          status: "trip_pending",
          capacity: null,
          members_count: 0,
          is_locked: false,
          school_location: {
            latitude: schoolLocation.latitude,
            longitude: schoolLocation.longitude,
          },
        },
      ])
      .select("id")
      .single();

    if (tripInsert.error || !tripInsert.data?.id) {
      return {
        data: null,
        error: tripInsert.error || {
          message: "Failed to create fallback trip.",
        },
      };
    }

    tripId = tripInsert.data.id;
  }

  const memberInsert = await supabase
    .from("transport_trip_members")
    .insert([
      {
        trip_id: tripId,
        booking_id: booking.id,
        student_id: booking.student_id,
        pickup_order: 1,
        distance_to_school_m: distanceToSchoolM,
        eta_to_school_s: etaToSchoolS,
      },
    ])
    .select("id")
    .maybeSingle();

  if (memberInsert.error) {
    return { data: null, error: memberInsert.error };
  }

  const membersCountResult = await supabase
    .from("transport_trip_members")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", tripId);

  if (membersCountResult.error) {
    return { data: null, error: membersCountResult.error };
  }

  const tripUpdate = await supabase
    .from("transport_trips")
    .update({
      members_count: membersCountResult.count || 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tripId);

  if (tripUpdate.error) {
    return { data: null, error: tripUpdate.error };
  }

  const bookingUpdate = await supabase
    .from("bookings")
    .update({
      assigned_trip_id: tripId,
      lifecycle_status: "grouped",
      grouped_at: new Date().toISOString(),
      grouped_key: `forced_single|${booking.students.school_id}|${booking.type}|${booking.start_time}|${booking.end_time}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", booking.id);

  if (bookingUpdate.error) {
    return { data: null, error: bookingUpdate.error };
  }

  return { data: { tripId }, error: null };
};

const getUtcDayBounds = (dateValue = new Date()) => {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

const buildGroupingPayload = ({
  groups,
  bookingById,
  schoolLocationsById,
  busCapacity,
}) => {
  return groups
    .map((group) => {
      const schoolLocation = schoolLocationsById[group.school_id];
      if (!schoolLocation) return null;

      const members = (group.optimized_pickup_order || [])
        .map((bookingId, index) => {
          const booking = bookingById.get(bookingId);
          if (!booking) return null;

          const studentLocation = booking.students?.home_location;
          const distanceToSchoolM = haversineMeters(
            studentLocation,
            schoolLocation,
          );
          return {
            booking_id: booking.id,
            student_id: booking.student_id,
            pickup_order: index + 1,
            distance_to_school_m: distanceToSchoolM,
            eta_to_school_s: Math.max(
              60,
              Math.round(
                ((group.estimated_total_time_minutes || 1) * 60 * (index + 1)) /
                Math.max(1, (group.optimized_pickup_order || []).length),
              ),
            ),
          };
        })
        .filter(Boolean);

      if (members.length === 0) return null;

      const firstBooking = bookingById.get(members[0].booking_id);
      return {
        school_id: group.school_id,
        type: firstBooking?.type || "PICKUP",
        start_time: firstBooking?.start_time,
        end_time: firstBooking?.end_time,
        capacity: busCapacity,
        school_latitude: schoolLocation.latitude,
        school_longitude: schoolLocation.longitude,
        estimated_total_distance_km: group.estimated_total_distance_km || 0,
        estimated_total_time_minutes: group.estimated_total_time_minutes || 0,
        members,
      };
    })
    .filter(Boolean);
};

/**
 * Fetch pending bookings, run grouping algorithm, and persist groups in one DB transaction (RPC).
 */
export const groupPendingBookingsForDay = async ({
  date = new Date(Date.now() + 24 * 60 * 60 * 1000),
  type = "PICKUP",
  busCapacity = 12,
  maxDetourDistanceKm = 1.5,
  maxPickupTimeDiffMinutes = 10,
  useRoutingApi = false,
}) => {
  const { start, end } = getUtcDayBounds(date);

  const bookingResult = await supabase
    .from("bookings")
    .select(
      `
      id,
      student_id,
      type,
      start_time,
      end_time,
      lifecycle_status,
      assigned_trip_id,
      students:student_id (
        id,
        school_id,
        home_location,
        schools:school_id (
          id,
          latitude,
          longitude
        )
      )
    `,
    )
    .eq("type", type)
    .in("lifecycle_status", ["booking_created"])
    .is("assigned_trip_id", null)
    .gte("start_time", start.toISOString())
    .lt("start_time", end.toISOString());

  if (bookingResult.error) {
    return { data: null, error: bookingResult.error };
  }

  const bookings = bookingResult.data || [];
  if (bookings.length === 0) {
    return {
      data: {
        groups: [],
        tripsCreated: 0,
        membersCreated: 0,
        bookingsGrouped: 0,
      },
      error: null,
    };
  }

  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
  const schoolLocationsById = {};

  const studentsForGrouping = bookings
    .map((booking) => {
      const schoolId = booking.students?.school_id;
      const school = booking.students?.schools;
      if (!schoolId || !booking.students?.home_location) return null;

      if (
        Number.isFinite(school?.latitude) &&
        Number.isFinite(school?.longitude)
      ) {
        schoolLocationsById[String(schoolId)] = {
          latitude: school.latitude,
          longitude: school.longitude,
        };
      }

      return {
        id: booking.id, // booking id for persistence mapping
        student_id: booking.student_id,
        school_id: String(schoolId),
        pickup_time: booking.start_time,
        home_location: booking.students.home_location,
      };
    })
    .filter(Boolean);

  const groups = await buildStudentGroups({
    students: studentsForGrouping,
    busCapacity,
    maxDetourDistanceKm,
    maxPickupTimeDiffMinutes,
    schoolLocationsById,
    useRoutingApi,
  });

  const groupingPayload = buildGroupingPayload({
    groups,
    bookingById,
    schoolLocationsById,
    busCapacity,
  });

  if (groupingPayload.length === 0) {
    return {
      data: {
        groups: [],
        tripsCreated: 0,
        membersCreated: 0,
        bookingsGrouped: 0,
      },
      error: null,
    };
  }

  const persistResult = await supabase.rpc("persist_grouping_plan", {
    p_plan: groupingPayload,
  });

  if (persistResult.error) {
    return { data: null, error: persistResult.error };
  }

  const summary = Array.isArray(persistResult.data)
    ? persistResult.data[0]
    : persistResult.data;

  return {
    data: {
      groups,
      tripsCreated: summary?.trips_created || 0,
      membersCreated: summary?.members_created || 0,
      bookingsGrouped: summary?.bookings_grouped || 0,
    },
    error: null,
  };
};
