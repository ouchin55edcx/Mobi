/**
 * MapboxRoutePreview.js
 *
 * Renders a Mapbox GL map inside a WebView.
 * Supports:
 *  – driver route polyline
 *  – student home marker (green)
 *  – school/destination marker (blue)
 *  – pickup station marker (orange pin, dashed walk-line from student to pickup)
 */
import React, { useMemo } from "react";
import { View, StyleSheet, Text } from "react-native";
import { WebView } from "react-native-webview";

const MAPBOX_STYLE = "mapbox://styles/mapbox/streets-v12";

const buildHtml = ({
  accessToken,
  routeCoordinates,
  homeLocation,
  destinationLocation,
  pickupLocation,
  zoom,
  interactive,
  showRoute,
  studentLabel,
  schoolLabel,
  pickupLabel,
  focusOnStudent,
}) => {
  const route = JSON.stringify(routeCoordinates || []);
  const home = JSON.stringify(homeLocation || null);
  const destination = JSON.stringify(destinationLocation || null);
  const pickup = JSON.stringify(pickupLocation || null);
  const safeStudentLabel = JSON.stringify(studentLabel || "Student");
  const safeSchoolLabel = JSON.stringify(schoolLabel || "School");
  const safePickupLabel = JSON.stringify(pickupLabel || "Pickup");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link href="https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.css" rel="stylesheet" />
    <style>
      html, body { margin:0; padding:0; width:100%; height:100%; background:#f8fafc; }
      #map { width:100%; height:100%; }
      .pin-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .bubble {
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        line-height: 1;
        border-radius: 10px;
        padding: 6px 9px;
        margin-bottom: 6px;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      }
      .marker-dot {
        width: 14px;
        height: 14px;
        border-radius: 999px;
        border: 3px solid #fff;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      }
      .student  .bubble     { background: #10b981; }
      .student  .marker-dot { background: #10b981; }
      .school   .bubble     { background: #2563eb; }
      .school   .marker-dot { background: #2563eb; }
      .pickup   .bubble     { background: #f97316; }
      .pickup-pin {
        width: 0;
        height: 0;
        border-left:  10px solid transparent;
        border-right: 10px solid transparent;
        border-top:   22px solid #f97316;
        filter: drop-shadow(0 2px 3px rgba(0,0,0,0.35));
        margin-top: 3px;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.js"></script>
    <script>
      mapboxgl.accessToken = "${accessToken}";

      const routeCoordinates   = ${route};
      const homeLocation        = ${home};
      const destinationLocation = ${destination};
      const pickupLocation      = ${pickup};
      const studentLabel        = ${safeStudentLabel};
      const schoolLabel         = ${safeSchoolLabel};
      const pickupLabel         = ${safePickupLabel};

      const center = pickupLocation || homeLocation || destinationLocation || { latitude: 0, longitude: 0 };

      const map = new mapboxgl.Map({
        container: "map",
        style: "${MAPBOX_STYLE}",
        center: [center.longitude, center.latitude],
        zoom: ${Number.isFinite(zoom) ? zoom : 14},
        attributionControl: false,
        dragPan:          ${interactive ? "true" : "false"},
        scrollZoom:       ${interactive ? "true" : "false"},
        touchZoomRotate:  ${interactive ? "true" : "false"},
        doubleClickZoom:  ${interactive ? "true" : "false"},
      });

      map.on("load", () => {
        const boundsPoints = [];

        /* ── 1. Driver route ────────────────────────────────────────────── */
        if (${showRoute ? "true" : "false"} && Array.isArray(routeCoordinates) && routeCoordinates.length > 1) {
          map.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: routeCoordinates.map(p => [p.longitude, p.latitude]),
              },
            },
          });
          map.addLayer({
            id: "route-casing",
            type: "line",
            source: "route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#bfdbfe", "line-width": 8, "line-opacity": 0.7 },
          });
          map.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#3B82F6", "line-width": 4, "line-opacity": 0.9 },
          });
          routeCoordinates.forEach(p => boundsPoints.push([p.longitude, p.latitude]));
        }

        /* ── 2. Walk line: student → pickup (dashed orange) ─────────────── */
        if (homeLocation && pickupLocation) {
          map.addSource("walk-line", {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: [
                  [homeLocation.longitude, homeLocation.latitude],
                  [pickupLocation.longitude, pickupLocation.latitude],
                ],
              },
            },
          });
          map.addLayer({
            id: "walk-line",
            type: "line",
            source: "walk-line",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#f97316",
              "line-width": 2.5,
              "line-dasharray": [2, 3],
              "line-opacity": 0.85,
            },
          });
        }

        /* ── 3. Helper: add a bubble-dot marker ──────────────────────────── */
        const addBubbleMarker = (point, type, label) => {
          if (!point) return;
          const wrap   = document.createElement("div");
          wrap.className = "pin-wrap";
          const bubble = document.createElement("div");
          bubble.className = "bubble " + type;
          bubble.innerText = label;
          const dot    = document.createElement("div");
          dot.className = "marker-dot " + type;
          wrap.appendChild(bubble);
          wrap.appendChild(dot);
          new mapboxgl.Marker({ element: wrap, anchor: "bottom" })
            .setLngLat([point.longitude, point.latitude])
            .addTo(map);
          boundsPoints.push([point.longitude, point.latitude]);
        };

        /* ── 4. Pickup station: teardrop pin ────────────────────────────── */
        const addPickupMarker = (point, label) => {
          if (!point) return;
          const wrap   = document.createElement("div");
          wrap.className = "pin-wrap pickup";
          const bubble = document.createElement("div");
          bubble.className = "bubble pickup";
          bubble.innerText = label;
          const pin    = document.createElement("div");
          pin.className = "pickup-pin";
          wrap.appendChild(bubble);
          wrap.appendChild(pin);
          new mapboxgl.Marker({ element: wrap, anchor: "bottom" })
            .setLngLat([point.longitude, point.latitude])
            .addTo(map);
          boundsPoints.push([point.longitude, point.latitude]);
        };

        addBubbleMarker(homeLocation, "student", studentLabel);
        addBubbleMarker(destinationLocation, "school",  schoolLabel);
        addPickupMarker(pickupLocation, pickupLabel);

        /* ── 5. Fit camera to all points ─────────────────────────────────── */
        if (!${focusOnStudent ? "true" : "false"} && boundsPoints.length > 1) {
          const bounds = boundsPoints.reduce(
            (b, p) => b.extend(p),
            new mapboxgl.LngLatBounds(boundsPoints[0], boundsPoints[0])
          );
          map.fitBounds(bounds, { padding: 52, duration: 300 });
        }
      });
    </script>
  </body>
</html>`;
};

const MapboxRoutePreview = ({
  style,
  homeLocation,
  destinationLocation,
  pickupLocation = null,
  routeCoordinates = [],
  zoom = 14,
  interactive = false,
  showRoute = true,
  studentLabel = "Student",
  schoolLabel = "School",
  pickupLabel = "Pickup",
  focusOnStudent = false,
}) => {
  const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

  const html = useMemo(
    () =>
      buildHtml({
        accessToken,
        routeCoordinates,
        homeLocation,
        destinationLocation,
        pickupLocation,
        zoom,
        interactive,
        showRoute,
        studentLabel,
        schoolLabel,
        pickupLabel,
        focusOnStudent,
      }),
    [
      accessToken,
      routeCoordinates,
      homeLocation,
      destinationLocation,
      pickupLocation,
      zoom,
      interactive,
      showRoute,
      studentLabel,
      schoolLabel,
      pickupLabel,
      focusOnStudent,
    ],
  );

  if (!accessToken) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>
          Mapbox token missing: set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
        </Text>
      </View>
    );
  }

  return (
    <View style={style}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={interactive}
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2E8F0",
    padding: 12,
  },
  fallbackText: {
    color: "#334155",
    fontSize: 12,
    textAlign: "center",
  },
});

export default MapboxRoutePreview;
