import { supabase } from "../../lib/supabase";
import { getDirectionsRoute } from "./mapboxService";
import Constants from "expo-constants";

const BUFFER_MINUTES = 10; // class_start - 10min = school_arrival
const TIME_WINDOW_MINUTES = 15; // group students within ±15min of each other
const MAX_DISTANCE_KM = 6; // max distance between any 2 students in same group

// ─── Haversine distance between two coordinates (in km) ──────────────────────
const haversine = (a, b) => {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
};

// ─── Get city from lat/lng using reverse geocode ──────────────────────────────
const getCityFromCoords = async (lat, lng) => {
  try {
    const token = Constants.expoConfig?.extra?.mapboxToken;
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
        `?types=place&access_token=${token}`,
    );
    const json = await res.json();
    return json.features?.[0]?.text?.toLowerCase() ?? "unknown";
  } catch {
    return "unknown";
  }
};

// ─── Centroid of a group of students ─────────────────────────────────────────
const centroid = (students) => ({
  latitude:
    students.reduce((s, st) => s + st.home_location.latitude, 0) /
    students.length,
  longitude:
    students.reduce((s, st) => s + st.home_location.longitude, 0) /
    students.length,
});

// ─── Check if two bookings fall within the same time window ──────────────────
const sameTimeWindow = (startA, startB) => {
  const diffMin = Math.abs(new Date(startA) - new Date(startB)) / 60000;
  return diffMin <= TIME_WINDOW_MINUTES;
};

// ─── Check if all students in a group are within MAX_DISTANCE_KM ─────────────
const withinProximity = (students) => {
  for (let i = 0; i < students.length; i++) {
    for (let j = i + 1; j < students.length; j++) {
      if (
        haversine(students[i].home_location, students[j].home_location) >
        MAX_DISTANCE_KM
      )
        return false;
    }
  }
  return true;
};

// ─── Calculate backwards timing for a group ──────────────────────────────────
const calculateGroupTiming = async (students, school, classStartISO) => {
  const classStart = new Date(classStartISO);
  const schoolArrival = new Date(classStart.getTime() - BUFFER_MINUTES * 60000);

  // Bus ride: pickup_point → school (use centroid as pickup point estimate)
  const center = centroid(students);
  const busRoute = await getDirectionsRoute({
    origin: center,
    destination: { latitude: school.latitude, longitude: school.longitude },
    profile: "driving",
  });
  const busMinutes = busRoute ? Math.ceil(busRoute.durationSeconds / 60) : 20;

  const pickupWindowStart = new Date(
    schoolArrival.getTime() - busMinutes * 60000,
  );

  return { schoolArrival, pickupWindowStart, busMinutes };
};

// ─── Optimize pickup order (nearest neighbor) ─────────────────────────────────
const optimizePickupOrder = (driver, students) => {
  const remaining = [...students];
  const ordered = [];
  let current = driver.location ?? centroid(students);

  while (remaining.length > 0) {
    let nearest = 0;
    let minDist = Infinity;
    remaining.forEach((st, i) => {
      const d = haversine(current, st.home_location);
      if (d < minDist) {
        minDist = d;
        nearest = i;
      }
    });
    ordered.push(remaining.splice(nearest, 1)[0]);
    current = ordered[ordered.length - 1].home_location;
  }
  return ordered;
};

// ─── MAIN FUNCTION ────────────────────────────────────────────────────────────
export const runGroupingForDate = async (tripDate) => {
  console.log(`[Grouping] Running for date: ${tripDate}`);
  const results = { grouped: 0, assigned: 0, unassigned: 0, errors: [] };

  // 1. Fetch all PENDING bookings for this date + student + school data
  const { data: bookings, error: bErr } = await supabase
    .from("bookings")
    .select(
      `
            *,
            students ( id, fullname, home_location, school_id ),
            schools  ( id, name, latitude, longitude, city )
        `,
    )
    .eq("trip_date", tripDate)
    .eq("status", "PENDING");

  if (bErr || !bookings?.length) {
    console.log("[Grouping] No pending bookings found.");
    return results;
  }

  // 2. Fetch available APPROVED drivers with their buses
  const { data: drivers, error: dErr } = await supabase
    .from("drivers")
    .select(`*, buses ( id, capacity )`)
    .eq("status", "APPROVED");

  if (dErr || !drivers?.length) {
    console.log("[Grouping] No available drivers.");
    results.unassigned = bookings.length;
    return results;
  }

  // 3. Filter 1 — group by city
  const byCityMap = {};
  await Promise.all(
    bookings.map(async (b) => {
      const loc = b.students.home_location;
      const city =
        b.schools?.city?.toLowerCase() ??
        (await getCityFromCoords(loc.latitude, loc.longitude));
      if (!byCityMap[city]) byCityMap[city] = [];
      byCityMap[city].push(b);
    }),
  );

  // 4. Filter 2 — group by school + time window
  const timeGroups = [];
  for (const city of Object.keys(byCityMap)) {
    const cityBookings = byCityMap[city];
    const used = new Set();

    for (let i = 0; i < cityBookings.length; i++) {
      if (used.has(i)) continue;
      const group = [cityBookings[i]];
      used.add(i);

      for (let j = i + 1; j < cityBookings.length; j++) {
        if (used.has(j)) continue;
        const same =
          cityBookings[j].school_id === cityBookings[i].school_id &&
          sameTimeWindow(
            cityBookings[j].start_time,
            cityBookings[i].start_time,
          );
        if (same) {
          group.push(cityBookings[j]);
          used.add(j);
        }
      }
      timeGroups.push({
        city,
        school: cityBookings[i].schools,
        bookings: group,
      });
    }
  }

  // 5. Filter 3 — split by proximity (max 6km between any 2 students)
  const finalGroups = [];
  for (const tg of timeGroups) {
    const remaining = [...tg.bookings];
    while (remaining.length > 0) {
      const group = [remaining.shift()];
      let i = 0;
      while (i < remaining.length) {
        const candidate = [
          ...group.map((b) => b.students),
          remaining[i].students,
        ];
        if (withinProximity(candidate)) {
          group.push(remaining.splice(i, 1)[0]);
        } else {
          i++;
        }
      }
      finalGroups.push({ ...tg, bookings: group });
    }
  }

  // 6. Assign drivers — check capacity, pick nearest
  const assignedDriverIds = new Set();

  // Debug: log all drivers
  console.log(
    "[Grouping] Fetched drivers:",
    drivers.map((d) => ({
      id: d.id,
      fullname: d.fullname,
      city: d.city,
      busCapacity: d.buses?.[0]?.capacity ?? "no bus",
    })),
  );

  for (const group of finalGroups) {
    const students = group.bookings.map((b) => b.students);
    const groupSize = students.length;
    const center = centroid(students);
    const classStart = group.bookings[0].start_time;

    console.log(
      `[Grouping] Processing group — city: "${group.city}", school_id: ${group.school?.id}, size: ${groupSize}`,
    );

    // Find best driver: same city, enough capacity, not already assigned
    const candidates = drivers.filter((d) => {
      if (assignedDriverIds.has(d.id)) return false;
      if (d.city?.toLowerCase() !== group.city && d.city) return false;
      // buses is an array (1:N) — get max capacity bus
      const bus = d.buses?.[0];
      return bus?.capacity >= groupSize;
    });

    console.log(
      `[Grouping] Group in ${group.city} — size: ${groupSize}, candidates:`,
      candidates.map((d) => d.fullname),
    );

    if (!candidates.length) {
      results.unassigned += groupSize;
      results.errors.push(
        `No driver for group in ${group.city} (${groupSize} students)`,
      );
      continue;
    }

    // Pick nearest driver to group centroid
    const driver = candidates.reduce((best, d) => {
      if (!d.location) return best;
      const dist = haversine(center, d.location);
      return !best || dist < haversine(center, best.location) ? d : best;
    }, candidates[0]);

    assignedDriverIds.add(driver.id);

    // 7. Calculate timing
    const { schoolArrival, pickupWindowStart, busMinutes } =
      await calculateGroupTiming(students, group.school, classStart);

    // 8. Optimize pickup order
    const ordered = optimizePickupOrder(driver, students);

    // Calculate individual pickup times
    const pickupTimes = {};
    let pickupMinutes = 0;
    for (const st of ordered) {
      const t = new Date(pickupWindowStart.getTime() + pickupMinutes * 60000);
      pickupTimes[st.id] = t.toTimeString().slice(0, 5); // "HH:MM"
      const nextStudent = ordered[ordered.indexOf(st) + 1] ?? group.school;
      pickupMinutes += Math.ceil(
        haversine(ordered[ordered.indexOf(st)], nextStudent) * 2, // ~2 min per km estimate
      );
    }

    // 9. Write trip to DB
    const { data: trip, error: tErr } = await supabase
      .from("trips")
      .insert({
        driver_id: driver.id,
        school_id: group.school.id,
        trip_date: group.bookings[0].trip_date,
        start_time: pickupWindowStart.toISOString(),
        school_arrival: schoolArrival.toISOString(),
        status: "SCHEDULED",
        student_ids: ordered.map((s) => s.id),
        pickup_order: ordered.map((s) => s.id),
        pickup_times: pickupTimes,
      })
      .select()
      .single();

    if (tErr) {
      results.errors.push(`Trip insert failed: ${tErr.message}`);
      continue;
    }

    // 10. Update bookings to ASSIGNED
    const bookingIds = group.bookings.map((b) => b.id);
    await supabase
      .from("bookings")
      .update({ status: "ASSIGNED", driver_id: driver.id })
      .in("id", bookingIds);

    // 11. Insert notifications for each student
    const notifications = ordered.map((st) => ({
      user_id: st.id,
      user_type: "STUDENT",
      title: "Driver assigned",
      message: `Your pickup is at ${pickupTimes[st.id]}. Driver: ${driver.fullname}`,
      type: "DRIVER_ASSIGNED",
    }));
    await supabase.from("notifications").insert(notifications);

    results.grouped += groupSize;
    results.assigned += 1;
    console.log(
      `[Grouping] Group assigned: ${groupSize} students → driver ${driver.fullname}`,
    );
  }

  console.log("[Grouping] Done:", results);
  return results;
};
