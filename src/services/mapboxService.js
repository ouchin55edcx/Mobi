const MAPBOX_DIRECTIONS_BASE = "https://api.mapbox.com/directions/v5/mapbox";

const toCoordPair = (point) => {
  if (!point) return null;
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
    return null;
  }
  return `${point.longitude},${point.latitude}`;
};

const toLatLng = (lngLat) => {
  if (!Array.isArray(lngLat) || lngLat.length < 2) return null;
  return {
    latitude: Number(lngLat[1]),
    longitude: Number(lngLat[0]),
  };
};

const haversineDistanceMeters = (a, b) => {
  if (!a || !b) return 0;
  const toRadians = (value) => (value * Math.PI) / 180;

  const R = 6371000;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
};

const buildFallbackRoute = ({ origin, destination, waypoints = [] }) => {
  const points = [origin, ...waypoints, destination].filter(Boolean);
  const legs = [];

  let totalDistance = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const legDistance = haversineDistanceMeters(points[index], points[index + 1]);
    totalDistance += legDistance;
    legs.push({
      distanceMeters: legDistance,
      durationSeconds: Math.round((legDistance / 1000) * 120),
    });
  }

  return {
    coordinates: points,
    distanceMeters: totalDistance,
    durationSeconds: legs.reduce((sum, leg) => sum + leg.durationSeconds, 0),
    legs,
    raw: null,
  };
};

export const getDirectionsRoute = async ({
  origin,
  destination,
  waypoints = [],
  profile = "driving",
}) => {
  const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (!origin || !destination) {
    throw new Error("Origin and destination are required.");
  }

  if (!accessToken) {
    return buildFallbackRoute({ origin, destination, waypoints });
  }

  const coordinatePairs = [origin, ...waypoints, destination]
    .map(toCoordPair)
    .filter(Boolean);

  if (coordinatePairs.length < 2) {
    return buildFallbackRoute({ origin, destination, waypoints });
  }

  const query = new URLSearchParams({
    access_token: accessToken,
    geometries: "geojson",
    overview: "full",
    steps: "false",
    alternatives: "false",
  });

  const url = `${MAPBOX_DIRECTIONS_BASE}/${profile}/${coordinatePairs.join(";")}?${query.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return buildFallbackRoute({ origin, destination, waypoints });
    }

    const data = await response.json();
    const route = data?.routes?.[0];

    if (!route || !route.geometry?.coordinates?.length) {
      return buildFallbackRoute({ origin, destination, waypoints });
    }

    return {
      coordinates: route.geometry.coordinates
        .map(toLatLng)
        .filter(Boolean),
      distanceMeters: route.distance || 0,
      durationSeconds: route.duration || 0,
      legs: (route.legs || []).map((leg) => ({
        distanceMeters: leg.distance || 0,
        durationSeconds: leg.duration || 0,
      })),
      raw: route,
    };
  } catch (_error) {
    return buildFallbackRoute({ origin, destination, waypoints });
  }
};

export const getEtaSeconds = async ({
  origin,
  destination,
  profile = "driving",
}) => {
  const route = await getDirectionsRoute({ origin, destination, profile });
  return Math.max(60, Math.round(route.durationSeconds || 0));
};

export const formatDistanceKm = (distanceMeters) => {
  const kilometers = (distanceMeters || 0) / 1000;
  return `${kilometers.toFixed(kilometers >= 10 ? 0 : 1)} km`;
};

export const formatDurationMinutes = (durationSeconds) => {
  const minutes = Math.max(1, Math.round((durationSeconds || 0) / 60));
  return `${minutes} min`;
};
