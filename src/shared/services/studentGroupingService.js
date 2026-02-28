import { getDirectionsRoute } from "./mapboxService";

const EARTH_RADIUS_KM = 6371;

const toRadians = (value) => (value * Math.PI) / 180;

const haversineKm = (a, b) => {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const h =
    sinLat * sinLat +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      sinLng *
      sinLng;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};

const toMinutes = (timeValue) => {
  if (typeof timeValue === "number" && Number.isFinite(timeValue)) {
    return timeValue;
  }

  if (!timeValue) return null;

  if (timeValue instanceof Date) {
    return timeValue.getHours() * 60 + timeValue.getMinutes();
  }

  if (typeof timeValue === "string") {
    const hhmm = timeValue.match(/^(\d{1,2}):(\d{2})/);
    if (hhmm) {
      const hours = Number(hhmm[1]);
      const minutes = Number(hhmm[2]);
      if (Number.isFinite(hours) && Number.isFinite(minutes)) {
        return hours * 60 + minutes;
      }
    }

    const parsed = new Date(timeValue);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getHours() * 60 + parsed.getMinutes();
    }
  }

  return null;
};

const normalizeStudent = (student) => {
  const latitude = Number.isFinite(student?.latitude)
    ? student.latitude
    : student?.home_location?.latitude;
  const longitude = Number.isFinite(student?.longitude)
    ? student.longitude
    : student?.home_location?.longitude;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const pickupMinutes = toMinutes(student?.pickup_time);

  return {
    ...student,
    latitude,
    longitude,
    pickupMinutes,
  };
};

const geoCellKey = (student, cellSizeKm = 1) => {
  const latCell = Math.floor(student.latitude / (cellSizeKm / 111));
  const lngDivisor = Math.max(0.1, 111 * Math.cos(toRadians(student.latitude)));
  const lngCell = Math.floor(student.longitude / (cellSizeKm / lngDivisor));
  return `${latCell}:${lngCell}`;
};

const buildGeoIndex = (students, cellSizeKm = 1) => {
  const map = new Map();

  students.forEach((student) => {
    const key = geoCellKey(student, cellSizeKm);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(student);
  });

  return map;
};

const getNeighborCells = (student, cellSizeKm = 1) => {
  const latCell = Math.floor(student.latitude / (cellSizeKm / 111));
  const lngDivisor = Math.max(0.1, 111 * Math.cos(toRadians(student.latitude)));
  const lngCell = Math.floor(student.longitude / (cellSizeKm / lngDivisor));

  const cells = [];
  for (let di = -1; di <= 1; di += 1) {
    for (let dj = -1; dj <= 1; dj += 1) {
      cells.push(`${latCell + di}:${lngCell + dj}`);
    }
  }

  return cells;
};

const isPairFeasible = (a, b, maxDetourKm, maxPickupTimeDiffMinutes) => {
  const distance = haversineKm(a, b);
  if (distance > maxDetourKm) return false;

  if (a.pickupMinutes == null || b.pickupMinutes == null) return true;

  return (
    Math.abs(a.pickupMinutes - b.pickupMinutes) <= maxPickupTimeDiffMinutes
  );
};

const buildFeasibilityGraph = (
  students,
  maxDetourKm,
  maxPickupTimeDiffMinutes,
) => {
  const adjacency = new Map();
  students.forEach((student) => adjacency.set(student.id, new Set()));
  const byId = new Map(students.map((student) => [student.id, student]));

  const index = buildGeoIndex(students, Math.max(0.5, maxDetourKm));

  students.forEach((student) => {
    const candidateIds = new Set();

    getNeighborCells(student, Math.max(0.5, maxDetourKm)).forEach((cell) => {
      const bucket = index.get(cell) || [];
      bucket.forEach((other) => {
        if (other.id !== student.id) {
          candidateIds.add(other.id);
        }
      });
    });

    candidateIds.forEach((candidateId) => {
      const candidate = byId.get(candidateId);
      if (!candidate) return;

      if (
        isPairFeasible(
          student,
          candidate,
          maxDetourKm,
          maxPickupTimeDiffMinutes,
        )
      ) {
        adjacency.get(student.id).add(candidate.id);
        adjacency.get(candidate.id).add(student.id);
      }
    });
  });

  return adjacency;
};

const calcGroupCentroid = (students, ids) => {
  const points = ids.map((id) => students.get(id));
  const latitude =
    points.reduce((sum, s) => sum + s.latitude, 0) / points.length;
  const longitude =
    points.reduce((sum, s) => sum + s.longitude, 0) / points.length;
  return { latitude, longitude };
};

const isGroupTimeFeasible = (
  studentsMap,
  groupIds,
  candidateId,
  maxDiffMinutes,
) => {
  const candidate = studentsMap.get(candidateId);
  if (!candidate || candidate.pickupMinutes == null) return true;

  for (const groupId of groupIds) {
    const member = studentsMap.get(groupId);
    if (!member || member.pickupMinutes == null) continue;
    if (
      Math.abs(member.pickupMinutes - candidate.pickupMinutes) > maxDiffMinutes
    ) {
      return false;
    }
  }

  return true;
};

const incrementalCost = (studentsMap, groupIds, candidateId) => {
  if (groupIds.length === 0) return 0;
  const centroid = calcGroupCentroid(studentsMap, groupIds);
  const candidate = studentsMap.get(candidateId);
  return haversineKm(centroid, candidate);
};

const sortSeedCandidates = (studentsMap, unassigned, adjacency) => {
  return [...unassigned].sort((a, b) => {
    const degreeDiff = adjacency.get(b).size - adjacency.get(a).size;
    if (degreeDiff !== 0) return degreeDiff;

    const aTime = studentsMap.get(a).pickupMinutes ?? Number.MAX_SAFE_INTEGER;
    const bTime = studentsMap.get(b).pickupMinutes ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
};

const optimizePickupOrder = (members, schoolLocation) => {
  if (members.length <= 1) return members.map((m) => m.id);

  const remaining = new Map(members.map((s) => [s.id, s]));
  const farthest = members.reduce((best, student) => {
    const d = haversineKm(student, schoolLocation);
    if (!best || d > best.distance) {
      return { id: student.id, distance: d };
    }
    return best;
  }, null);

  const order = [];
  let current = remaining.get(farthest.id);
  order.push(current.id);
  remaining.delete(current.id);

  while (remaining.size > 0) {
    let next = null;
    let nextDistance = Number.POSITIVE_INFINITY;

    remaining.forEach((candidate) => {
      const d = haversineKm(current, candidate);
      if (d < nextDistance) {
        nextDistance = d;
        next = candidate;
      }
    });

    order.push(next.id);
    remaining.delete(next.id);
    current = next;
  }

  // Lightweight 2-opt improvement for pickup sequence (school is fixed destination).
  let improved = true;
  while (improved) {
    improved = false;

    for (let i = 0; i < order.length - 2; i += 1) {
      for (let k = i + 1; k < order.length - 1; k += 1) {
        const newOrder = [
          ...order.slice(0, i),
          ...order.slice(i, k + 1).reverse(),
          ...order.slice(k + 1),
        ];

        const oldDist = estimateRouteDistanceFromOrder(
          order,
          members,
          schoolLocation,
        );
        const newDist = estimateRouteDistanceFromOrder(
          newOrder,
          members,
          schoolLocation,
        );

        if (newDist + 0.001 < oldDist) {
          order.splice(0, order.length, ...newOrder);
          improved = true;
        }
      }
    }
  }

  return order;
};

const estimateRouteDistanceFromOrder = (order, members, schoolLocation) => {
  const byId = new Map(members.map((m) => [m.id, m]));
  if (order.length === 0) return 0;

  let total = 0;
  for (let i = 0; i < order.length - 1; i += 1) {
    total += haversineKm(byId.get(order[i]), byId.get(order[i + 1]));
  }

  total += haversineKm(byId.get(order[order.length - 1]), schoolLocation);
  return total;
};

const estimateRouteMetrics = async ({
  orderedStudents,
  schoolLocation,
  useRoutingApi,
  averageSpeedKmh,
}) => {
  const coordinates = orderedStudents.map((s) => ({
    latitude: s.latitude,
    longitude: s.longitude,
  }));

  const fallbackDistanceKm = estimateRouteDistanceFromOrder(
    orderedStudents.map((s) => s.id),
    orderedStudents,
    schoolLocation,
  );

  if (!useRoutingApi || coordinates.length === 0) {
    const totalTimeMinutes = Math.max(
      1,
      Math.round((fallbackDistanceKm / averageSpeedKmh) * 60),
    );

    return {
      totalDistanceKm: Number(fallbackDistanceKm.toFixed(2)),
      totalTimeMinutes,
    };
  }

  try {
    const route = await getDirectionsRoute({
      origin: coordinates[0],
      waypoints: coordinates.slice(1),
      destination: schoolLocation,
    });

    if (!route?.distanceMeters) {
      throw new Error("No routing result");
    }

    return {
      totalDistanceKm: Number((route.distanceMeters / 1000).toFixed(2)),
      totalTimeMinutes: Math.max(
        1,
        Math.round((route.durationSeconds || 0) / 60),
      ),
    };
  } catch (_error) {
    const totalTimeMinutes = Math.max(
      1,
      Math.round((fallbackDistanceKm / averageSpeedKmh) * 60),
    );

    return {
      totalDistanceKm: Number(fallbackDistanceKm.toFixed(2)),
      totalTimeMinutes,
    };
  }
};

const buildGroupsForSingleSchool = ({
  schoolStudents,
  capacity,
  maxDetourKm,
  maxPickupTimeDiffMinutes,
}) => {
  const studentsMap = new Map(schoolStudents.map((s) => [s.id, s]));
  const adjacency = buildFeasibilityGraph(
    schoolStudents,
    maxDetourKm,
    maxPickupTimeDiffMinutes,
  );

  const unassigned = new Set(schoolStudents.map((s) => s.id));
  const groups = [];

  while (unassigned.size > 0) {
    const seed = sortSeedCandidates(studentsMap, unassigned, adjacency)[0];
    const groupIds = [seed];
    unassigned.delete(seed);

    while (groupIds.length < capacity) {
      const candidates = [...unassigned].filter(
        (candidateId) =>
          adjacency.get(candidateId).has(groupIds[0]) ||
          groupIds.some((groupId) => adjacency.get(groupId).has(candidateId)),
      );

      if (candidates.length === 0) break;

      const feasible = candidates
        .filter((candidateId) =>
          isGroupTimeFeasible(
            studentsMap,
            groupIds,
            candidateId,
            maxPickupTimeDiffMinutes,
          ),
        )
        .map((candidateId) => ({
          id: candidateId,
          score: incrementalCost(studentsMap, groupIds, candidateId),
        }))
        .sort((a, b) => a.score - b.score);

      if (feasible.length === 0) break;

      const chosen = feasible[0].id;
      groupIds.push(chosen);
      unassigned.delete(chosen);
    }

    groups.push(groupIds);
  }

  return groups;
};

/**
 * Build student groups for transport planning.
 *
 * @param {Object} params
 * @param {Array<Object>} params.students - Input students with id, school_id, pickup_time and either latitude/longitude or home_location.
 * @param {number} params.busCapacity - Max students per group.
 * @param {number} params.maxDetourDistanceKm - Max allowed geographic gap for compatibility.
 * @param {number} params.maxPickupTimeDiffMinutes - Max pickup-time difference in minutes.
 * @param {Object<string, {latitude:number,longitude:number}>} params.schoolLocationsById - School coordinates by school_id.
 * @param {boolean} [params.useRoutingApi=false] - If true, route metrics use Mapbox directions.
 * @param {number} [params.averageSpeedKmh=24] - Used for fallback time estimation.
 * @returns {Promise<Array<Object>>}
 */
export const buildStudentGroups = async ({
  students,
  busCapacity,
  maxDetourDistanceKm,
  maxPickupTimeDiffMinutes,
  schoolLocationsById = {},
  useRoutingApi = false,
  averageSpeedKmh = 24,
}) => {
  if (!Array.isArray(students) || students.length === 0) {
    return [];
  }

  const normalized = students
    .map(normalizeStudent)
    .filter(Boolean)
    .filter((student) => student?.id && student?.school_id);

  const bySchool = new Map();
  normalized.forEach((student) => {
    const key = String(student.school_id);
    if (!bySchool.has(key)) {
      bySchool.set(key, []);
    }
    bySchool.get(key).push(student);
  });

  const groups = [];
  let groupCounter = 1;

  for (const [schoolId, schoolStudents] of bySchool.entries()) {
    const schoolLocation = schoolLocationsById[schoolId];
    if (!schoolLocation) {
      // School location is needed for ordered route and metrics.
      continue;
    }

    const rawGroups = buildGroupsForSingleSchool({
      schoolStudents,
      capacity: busCapacity,
      maxDetourKm: maxDetourDistanceKm,
      maxPickupTimeDiffMinutes,
    });

    const byId = new Map(schoolStudents.map((s) => [s.id, s]));

    for (const groupIds of rawGroups) {
      const members = groupIds.map((id) => byId.get(id)).filter(Boolean);
      const pickupOrder = optimizePickupOrder(members, schoolLocation);
      const orderedStudents = pickupOrder
        .map((id) => byId.get(id))
        .filter(Boolean);

      const metrics = await estimateRouteMetrics({
        orderedStudents,
        schoolLocation,
        useRoutingApi,
        averageSpeedKmh,
      });

      groups.push({
        group_id: `grp_${schoolId}_${groupCounter}`,
        school_id: schoolId,
        student_ids: members.map((m) => m.id),
        optimized_pickup_order: pickupOrder,
        estimated_total_distance_km: metrics.totalDistanceKm,
        estimated_total_time_minutes: metrics.totalTimeMinutes,
      });

      groupCounter += 1;
    }
  }

  return groups;
};

/**
 * Real-time helper to place one student in existing groups if feasible.
 * Creates a new group if no feasible insertion exists.
 */
export const assignStudentIncremental = ({
  student,
  existingGroups,
  busCapacity,
  maxDetourDistanceKm,
  maxPickupTimeDiffMinutes,
  studentsById,
}) => {
  const normalized = normalizeStudent(student);
  if (!normalized) {
    return { assigned: false, groups: existingGroups };
  }

  let bestGroupIndex = -1;
  let bestScore = Number.POSITIVE_INFINITY;

  existingGroups.forEach((group, index) => {
    if (String(group.school_id) !== String(normalized.school_id)) return;
    if ((group.student_ids || []).length >= busCapacity) return;

    const members = (group.student_ids || [])
      .map((id) => normalizeStudent(studentsById[id]))
      .filter(Boolean);

    const allTimeCompatible = members.every((member) =>
      isPairFeasible(
        member,
        normalized,
        maxDetourDistanceKm,
        maxPickupTimeDiffMinutes,
      ),
    );

    if (!allTimeCompatible) return;

    const centroid = {
      latitude:
        members.reduce((sum, s) => sum + s.latitude, 0) /
        Math.max(1, members.length),
      longitude:
        members.reduce((sum, s) => sum + s.longitude, 0) /
        Math.max(1, members.length),
    };

    const score = haversineKm(centroid, normalized);
    if (score < bestScore) {
      bestScore = score;
      bestGroupIndex = index;
    }
  });

  if (bestGroupIndex >= 0) {
    const updated = [...existingGroups];
    updated[bestGroupIndex] = {
      ...updated[bestGroupIndex],
      student_ids: [
        ...(updated[bestGroupIndex].student_ids || []),
        normalized.id,
      ],
      optimized_pickup_order: [
        ...(updated[bestGroupIndex].optimized_pickup_order || []),
        normalized.id,
      ],
    };

    return { assigned: true, groups: updated };
  }

  const newGroup = {
    group_id: `grp_${normalized.school_id}_${Date.now()}`,
    school_id: String(normalized.school_id),
    student_ids: [normalized.id],
    optimized_pickup_order: [normalized.id],
    estimated_total_distance_km: 0,
    estimated_total_time_minutes: 0,
  };

  return { assigned: true, groups: [...existingGroups, newGroup] };
};
