/**
 * tripTimingService.js
 *
 * Computes the three critical times shown in TripDetailsScreen:
 *
 *   1. leaveHomeTime  – when the student must leave home
 *   2. pickupTime     – when the student must be at the pickup station
 *   3. schoolTime     – estimated school arrival (≈ student's start_time)
 *
 * ─── Calculation logic (works backward from schoolTime) ──────────────────
 *
 *  schoolTime     = tripData.startTime  (student's desired arrival e.g. 08:00)
 *
 *  pickupTime     = schoolTime
 *                 – driverTimeFromPickupToSchool  (how long the driver takes
 *                   to reach school after picking up the student)
 *
 *  leaveHomeTime  = pickupTime
 *                 – walkTimeSeconds  (how long it takes to walk from home
 *                   to the pickup station on foot)
 *                 – EARLY_BUFFER_SECS  (2-min safety buffer)
 *
 * ─── Student order factor ─────────────────────────────────────────────────
 *
 *  If the driver picks up N students before this student (studentOrder > 1),
 *  the driver won't reach this student's pickup point until later.
 *  We add PICKUP_DWELL_SECS per earlier stop so the student doesn't wait.
 *
 *  driverArrivalBuffer = (studentOrder - 1) × PICKUP_DWELL_SECS
 *  leaveHomeTime      -= driverArrivalBuffer   (leave home even later because
 *                        the driver arrives later)
 *
 * ─── Time helpers ─────────────────────────────────────────────────────────
 */

/** Average walking speed: 5 km/h → 83.33 m/min */
const WALK_SPEED_MPS = 5_000 / 3_600;

/** Safety buffer before pickup (seconds) – student should arrive 2 min early */
const EARLY_BUFFER_SECS = 2 * 60;

/** Average time the driver spends at each stop (pick-up + board + pull off) */
const PICKUP_DWELL_SECS = 3 * 60;  // 3 min per stop

/** Average driving speed assumption used only as fallback (40 km/h city speed) */
const DRIVE_SPEED_MPS = 40_000 / 3_600;

/* ────────────────────────────── utilities ──────────────────────────────── */

/**
 * Parse a start-time value into a Date on today's date.
 * Accepts:
 *   – ISO string          e.g. "2024-09-01T08:00:00Z"
 *   – HH:MM string        e.g. "08:00"
 *   – Date object
 *   – null / undefined    → returns null
 */
export const parseStartTime = (value) => {
    if (!value) return null;

    if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value;
    }

    const str = String(value).trim();

    // ISO-8601 full datetime
    if (str.includes('T') || str.includes('Z')) {
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
    }

    // "HH:MM" or "HH:MM:SS"
    const parts = str.split(':').map(Number);
    if (parts.length >= 2 && parts.every(Number.isFinite)) {
        const now = new Date();
        now.setHours(parts[0], parts[1], parts[2] || 0, 0);
        return now;
    }

    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
};

/** Add (or subtract) seconds to a Date, returning a new Date */
export const addSeconds = (date, seconds) =>
    new Date(date.getTime() + seconds * 1_000);

/** Format a Date as "HH:MM" */
export const formatHHMM = (date) => {
    if (!date || isNaN(date.getTime())) return '--:--';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

/* ──────────────────────────────── main API ─────────────────────────────── */

/**
 * Compute the three timeline times for a student's trip.
 *
 * @param {object} params
 * @param {Date|string|null} params.startTime
 *   Student's desired school arrival time (e.g. 08:00).
 *   This becomes the schoolTime target.
 *
 * @param {number} params.walkDistMeters
 *   Walking distance from home → pickup station (metres).
 *   Provided by pickupStationService.
 *
 * @param {number} [params.driverEtaToSchoolSecs]
 *   Driver's travel time from the student's pickup point to school (seconds).
 *   Comes from the Mapbox route; we'll estimate from distance if absent.
 *
 * @param {number} [params.pickupToSchoolDistMeters]
 *   Straight-line / route distance from pickup point to school (metres).
 *   Used ONLY as fallback when driverEtaToSchoolSecs is not provided.
 *
 * @param {number} [params.studentOrder]
 *   1-based index of this student in the driver's pickup sequence.
 *   studentOrder = 1 → first pickup (driver arrives early).
 *   studentOrder = 3 → third pickup (driver 6 min later than first stop).
 *
 * @returns {{
 *   schoolTime:    Date,
 *   pickupTime:    Date,
 *   leaveHomeTime: Date,
 *   walkTimeSecs:  number,
 *   walkTimeMinutes: number,
 *   driverEtaToSchoolSecs: number,
 *   studentOrder:  number,
 *   formatted: { schoolTime: string, pickupTime: string, leaveHomeTime: string },
 * }}
 */
export const computeTripTimes = ({
    startTime,
    walkDistMeters = 0,
    driverEtaToSchoolSecs = null,
    pickupToSchoolDistMeters = null,
    studentOrder = 1,
}) => {
    /* 1. Anchor: school arrival = student's startTime */
    const schoolTime = parseStartTime(startTime) || new Date();

    /* 2. Driver time from pickup → school */
    let etaToSchool = driverEtaToSchoolSecs;
    if (!Number.isFinite(etaToSchool) || etaToSchool <= 0) {
        // Fallback: estimate from distance at 40 km/h city driving
        const dist = Number.isFinite(pickupToSchoolDistMeters)
            ? pickupToSchoolDistMeters
            : 2_000; // assume 2 km if we know nothing
        etaToSchool = Math.round(dist / DRIVE_SPEED_MPS);
    }

    /* 3. pickupTime = schoolTime − driver travel to school */
    const pickupTime = addSeconds(schoolTime, -etaToSchool);

    /* 4. Walk time home → pickup */
    const walkTimeSecs = Math.max(60, Math.round(walkDistMeters / WALK_SPEED_MPS));

    /* 5. Driver arrival offset for student order (students picked up before this one) */
    const orderOffsetSecs = Math.max(0, (studentOrder - 1)) * PICKUP_DWELL_SECS;

    /* 6. leaveHomeTime = pickupTime − walkTime − early buffer + order offset
     *
     *  The student must leave home early enough to:
     *    a) walk to the pickup station
     *    b) arrive 2 min before the driver
     *  But the driver arrives LATER if this student is further down the route,
     *  so the student can wait longer (leave home later).
     */
    const leaveHomeTime = addSeconds(pickupTime, -(walkTimeSecs + EARLY_BUFFER_SECS) + orderOffsetSecs);

    return {
        schoolTime,
        pickupTime,
        leaveHomeTime,
        walkTimeSecs,
        walkTimeMinutes: Math.max(1, Math.round(walkTimeSecs / 60)),
        driverEtaToSchoolSecs: etaToSchool,
        studentOrder: Math.max(1, studentOrder),
        formatted: {
            schoolTime: formatHHMM(schoolTime),
            pickupTime: formatHHMM(pickupTime),
            leaveHomeTime: formatHHMM(leaveHomeTime),
        },
    };
};

/**
 * Determine timeline badge status based on current clock time.
 *
 * @param {Date} time  – the event time
 * @param {number} toleranceSecs – window (seconds) around the event deemed "NOW"
 * @returns {'DONE' | 'NOW' | 'SOON'}
 */
export const getTimeBadge = (time, toleranceSecs = 5 * 60) => {
    if (!time || isNaN(time.getTime())) return 'SOON';
    const now = Date.now();
    const diff = time.getTime() - now; // positive = future
    if (diff < -toleranceSecs) return 'DONE';
    if (diff < toleranceSecs) return 'NOW';
    return 'SOON';
};

/** Badge colours for each status */
export const BADGE_STYLE = {
    DONE: { bg: '#E8F5E9', color: '#4CAF50' },
    NOW: { bg: '#E3F2FD', color: '#2196F3' },
    SOON: { bg: '#F5F5F5', color: '#9E9E9E' },
};
