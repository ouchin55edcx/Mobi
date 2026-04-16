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
 * Parse a start-time value into a Date on a specific date (defaults to today).
 * Accepts:
 *   – ISO string          e.g. "2024-09-01T08:00:00Z"
 *   – HH:MM string        e.g. "08:00"
 *   – Date object
 *   – null / undefined    → returns null
 * 
 * @param {any} value 
 * @param {string|Date} [tripDate] - Optional date to anchor the time to
 */
export const parseStartTime = (value, tripDate = null) => {
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
        const baseDate = tripDate ? new Date(tripDate) : new Date();
        baseDate.setHours(parts[0], parts[1], parts[2] || 0, 0);
        return baseDate;
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
 * @param {string|Date} [params.tripDate]
 *   The date of the trip (YYYY-MM-DD). If startTime is just "HH:MM",
 *   this anchors it to the correct day.
 *
 * @param {number} params.walkDistMeters
 *   Walking distance from home → pickup station (metres).
 *
 * @param {number} [params.driverEtaToSchoolSecs]
 *   Driver's travel time from the student's pickup point to school (seconds).
 *
 * @param {number} [params.pickupToSchoolDistMeters]
 *   Straight-line / route distance from pickup point to school (metres).
 *
 * @param {number} [params.studentOrder]
 *   1-based index of this student in the driver's pickup sequence.
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
    tripDate = null,
    walkDistMeters = 0,
    driverEtaToSchoolSecs = null,
    pickupToSchoolDistMeters = null,
    studentOrder = 1,
    totalStudents = 1,
    isRetour = false,
}) => {
    // 1. Determine the Anchor time (School start for aller, School end for retour)
    const anchorDate = parseStartTime(startTime, tripDate) || new Date();

    if (isRetour) {
        /**
         * RETOUR LOGIC (School -> Home)
         * Working forward from school end time.
         */
        
        // leaveHomeTime here acts as "Leaving school building"
        const leaveSchoolTime = anchorDate; 

        // 10 minutes to reach pickup station (at school)
        const pickupTime = addSeconds(leaveSchoolTime, 600); // Fixed 10 min margin at school

        // Driving duration (School -> Home)
        let baseEta = driverEtaToSchoolSecs;
        if (!Number.isFinite(baseEta) || baseEta <= 0) {
            const dist = Number.isFinite(pickupToSchoolDistMeters)
                ? pickupToSchoolDistMeters
                : 2_000;
            baseEta = Math.round(dist / DRIVE_SPEED_MPS);
        }

        /**
         * Drop-off delay:
         * If the student is studentOrder = 1, they are dropped off first.
         * If they are studentOrder = 5, 4 students were dropped off before them.
         */
        const dropOffDelay = Math.max(0, studentOrder - 1) * PICKUP_DWELL_SECS;
        const totalEtaToHome = baseEta + dropOffDelay;

        // Arrival at Home
        const arrivalHomeTime = addSeconds(pickupTime, totalEtaToHome);

        return {
            schoolTime: arrivalHomeTime,    // "Expected Arrival" at home
            pickupTime: pickupTime,         // "Pickup Station" at school
            leaveHomeTime: leaveSchoolTime, // "Leave Home" label (actually leave school)
            walkTimeSecs: 600,
            walkTimeMinutes: 10,
            driverEtaToSchoolSecs: totalEtaToHome,
            studentOrder: Math.max(1, studentOrder),
            formatted: {
                schoolTime: formatHHMM(arrivalHomeTime),
                pickupTime: formatHHMM(pickupTime),
                leaveHomeTime: formatHHMM(leaveSchoolTime),
            },
        };
    } else {
        /**
         * ALLER LOGIC (Home -> School)
         * Working backward from target school arrival.
         */
        
        /** 
         * Target School Arrival
         * Optimized: Student should arrive at school 10 mins before class starts.
         */
        const schoolTime = addSeconds(anchorDate, -600); 

        /** 
         * Driving Duration (Pickup -> School)
         * We must account for picking up the students that come AFTER this student.
         */
        let baseEta = driverEtaToSchoolSecs;
        if (!Number.isFinite(baseEta) || baseEta <= 0) {
            const dist = Number.isFinite(pickupToSchoolDistMeters)
                ? pickupToSchoolDistMeters
                : 2_000;
            baseEta = Math.round(dist / DRIVE_SPEED_MPS);
        }

        // Add 3 minutes for every student picked up after this one
        const subsequentStopsCount = Math.max(0, totalStudents - studentOrder);
        const subsequentStopsDelay = subsequentStopsCount * PICKUP_DWELL_SECS;
        const totalEtaToSchool = baseEta + subsequentStopsDelay;

        /**
         * Driver Arrival Time at this Student
         * Working backward from the target school arrival.
         */
        const driverArrivalAtStudent = addSeconds(schoolTime, -totalEtaToSchool);

        /**
         * Student Arrival at Pickup Station
         * Student should be at the station 2 minutes BEFORE the driver arrives.
         */
        const pickupTime = addSeconds(driverArrivalAtStudent, -EARLY_BUFFER_SECS);

        /** 
         * Leave Home Time
         * Student moves backward from their station arrival by their walk time.
         */
        const walkTimeSecs = Math.max(60, Math.round(walkDistMeters / WALK_SPEED_MPS));
        const leaveHomeTime = addSeconds(pickupTime, -walkTimeSecs);

        return {
            schoolTime,
            pickupTime,
            leaveHomeTime,
            walkTimeSecs,
            walkTimeMinutes: Math.max(1, Math.round(walkTimeSecs / 60)),
            driverEtaToSchoolSecs: totalEtaToSchool,
            studentOrder: Math.max(1, studentOrder),
            formatted: {
                schoolTime: formatHHMM(schoolTime),
                pickupTime: formatHHMM(pickupTime),
                leaveHomeTime: formatHHMM(leaveHomeTime),
            },
        };
    }
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
