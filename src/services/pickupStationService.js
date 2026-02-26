/**
 * pickupStationService.js
 *
 * Computes a dynamic, per-student pickup point that lies exactly on the
 * driver's principal route, within the 500 m walking constraint.
 *
 * Algorithm (route-projection approach):
 * 1. Iterate every segment of the polyline.
 * 2. For each segment, find the closest point on that segment to the student.
 * 3. Keep the globally-closest projected point that is ≤ MAX_WALK_METERS away.
 * 4. If no route point satisfies the constraint, fall back to the nearest
 *    route vertex (and report it as "out of range").
 */

const TO_RAD = Math.PI / 180;
const EARTH_R = 6_371_000; // metres

/** Haversine distance in metres between two {latitude, longitude} objects. */
export const haversineMeters = (a, b) => {
    if (!a || !b) return Infinity;
    const dLat = (b.latitude - a.latitude) * TO_RAD;
    const dLng = (b.longitude - a.longitude) * TO_RAD;
    const lat1 = a.latitude * TO_RAD;
    const lat2 = b.latitude * TO_RAD;
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_R * Math.asin(Math.sqrt(Math.min(1, h)));
};

/**
 * Project point P onto the line segment A→B in equirectangular space.
 * Returns the closest point on the segment as {latitude, longitude}.
 */
const projectPointOnSegment = (P, A, B) => {
    // Work in flat (cos-corrected) space to avoid distortion at large latitudes.
    const cosLat = Math.cos(((A.latitude + B.latitude) / 2) * TO_RAD);

    const ax = A.longitude * cosLat;
    const ay = A.latitude;
    const bx = B.longitude * cosLat;
    const by = B.latitude;
    const px = P.longitude * cosLat;
    const py = P.latitude;

    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) return A; // degenerate segment – A === B

    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    return {
        latitude: ay + t * dy,
        longitude: (ax + t * dx) / cosLat,
    };
};

/** Walking speed assumption: 5 km/h → 83.3 m/min → 1.389 m/s */
const WALK_SPEED_MPS = 5000 / 3600;

/** Maximum allowed walking distance in metres */
const MAX_WALK_METERS = 500;

/**
 * Find the optimal pickup point for a single student.
 *
 * @param {object}   studentLocation  – { latitude, longitude }
 * @param {object[]} routeCoordinates – ordered array of { latitude, longitude }
 *
 * @returns {{
 *   pickupPoint:     { latitude, longitude },
 *   walkDistMeters:  number,
 *   walkTimeSecs:    number,
 *   walkTimeMinutes: number,
 *   withinConstraint: boolean,
 *   segmentIndex:    number,   // which segment the pickup falls on
 * }}
 */
export const findOptimalPickupStation = (studentLocation, routeCoordinates) => {
    if (!studentLocation || !Array.isArray(routeCoordinates) || routeCoordinates.length < 2) {
        return null;
    }

    let bestPoint = null;
    let bestDist = Infinity;
    let bestSegIdx = 0;

    for (let i = 0; i < routeCoordinates.length - 1; i++) {
        const A = routeCoordinates[i];
        const B = routeCoordinates[i + 1];
        const proj = projectPointOnSegment(studentLocation, A, B);
        const dist = haversineMeters(studentLocation, proj);

        if (dist < bestDist) {
            bestDist = dist;
            bestPoint = proj;
            bestSegIdx = i;
        }
    }

    // If best projection is further than 500 m, still return it but flag it.
    const withinConstraint = bestDist <= MAX_WALK_METERS;
    const walkTimeSecs = bestDist / WALK_SPEED_MPS;

    return {
        pickupPoint: bestPoint,
        walkDistMeters: Math.round(bestDist),
        walkTimeSecs: Math.round(walkTimeSecs),
        walkTimeMinutes: Math.max(1, Math.round(walkTimeSecs / 60)),
        withinConstraint,
        segmentIndex: bestSegIdx,
        maxWalkMeters: MAX_WALK_METERS,
    };
};

/**
 * Compute pickup stations for multiple students at once.
 *
 * @param {Array<{ id, homeLocation }>} students
 * @param {object[]} routeCoordinates
 * @returns {Map<string|number, ReturnType<findOptimalPickupStation>>}
 */
export const computePickupStations = (students, routeCoordinates) => {
    const results = new Map();
    for (const student of students) {
        results.set(
            student.id,
            findOptimalPickupStation(student.homeLocation, routeCoordinates),
        );
    }
    return results;
};

/** Human-readable formatted distance, e.g. "320 m" or "1.2 km" */
export const formatWalkDistance = (meters) => {
    if (!Number.isFinite(meters)) return '--';
    if (meters < 1000) return `${meters} m`;
    return `${(meters / 1000).toFixed(1)} km`;
};

/** Human-readable walk time, e.g. "4 min" */
export const formatWalkTime = (minutes) => {
    if (!Number.isFinite(minutes)) return '--';
    return `${Math.max(1, minutes)} min`;
};
