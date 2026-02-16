# Student Grouping Algorithm

## Service
- `src/services/studentGroupingService.js`

## Inputs
- `students[]`: `id`, `latitude/longitude` or `home_location`, `school_id`, `pickup_time`
- `busCapacity`
- `maxDetourDistanceKm`
- `maxPickupTimeDiffMinutes`
- `schoolLocationsById`

## Core Logic
1. Normalize each student location:
- Use `latitude/longitude` when present.
- If not present (GPS denied), fallback to `home_location`.

2. Split by `school_id`.

3. Build a feasibility graph per school:
- Edge between students if:
  - distance <= `maxDetourDistanceKm`
  - pickup-time difference <= `maxPickupTimeDiffMinutes`
- Uses a grid-based spatial index to reduce candidate pair checks.

4. Build groups (capacity aware):
- Seed = high-connectivity student (then earliest pickup tie-break).
- Greedily add feasible students with lowest centroid insertion cost.
- Never exceed bus capacity.
- Students with no feasible neighbors become singleton groups.

5. Optimize pickup order inside group:
- Start from farthest student from school.
- Nearest-neighbor route construction.
- Improve with 2-opt local search.

6. Estimate metrics:
- Fast mode: Haversine distance + speed-based ETA.
- Optional precise mode: Mapbox Directions API (`useRoutingApi: true`).

## Output Shape
```json
[
  {
    "group_id": "grp_<school>_<n>",
    "school_id": "<school>",
    "student_ids": ["..."],
    "optimized_pickup_order": ["..."],
    "estimated_total_distance_km": 8.4,
    "estimated_total_time_minutes": 26
  }
]
```

## Real-Time Mode
- Use `assignStudentIncremental(...)` to insert one incoming student into existing groups:
  - checks school match, capacity, geo/time compatibility
  - chooses best feasible group by centroid proximity
  - if none is feasible, creates a new group

## Complexity (per school)
- Feasibility graph with spatial pruning: ~`O(n * k)` average (instead of `O(n^2)`)
- Group build: `O(n * c)` where `c` is capacity-bound candidate checks
- Intra-group 2-opt: `O(g^3)` worst-case per group, but small due to bus capacity

## Usage Example
```js
import { buildStudentGroups } from "./studentGroupingService";

const groups = await buildStudentGroups({
  students,
  busCapacity: 12,
  maxDetourDistanceKm: 1.5,
  maxPickupTimeDiffMinutes: 10,
  schoolLocationsById: {
    "school-1": { latitude: 33.57, longitude: -7.58 },
  },
  useRoutingApi: false,
});
```
