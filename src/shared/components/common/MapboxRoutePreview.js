/**
 * MapboxRoutePreview.js
 *
 * Renders a Mapbox GL map inside a WebView.
 * Supports:
 *  – driver route polyline
 *  – student home marker
 *  – school/destination marker
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
  driverLocation,
  zoom,
  interactive,
  showRoute,
  studentLabel,
  schoolLabel,
  pickupLabel,
  driverLabel,
  focusOnStudent,
  fitPadding,
}) => {
  const route = JSON.stringify(routeCoordinates || []);
  const home = JSON.stringify(homeLocation || null);
  const destination = JSON.stringify(destinationLocation || null);
  const pickup = JSON.stringify(pickupLocation || null);
  const driver = JSON.stringify(driverLocation || null);
  const safeStudentLabel = JSON.stringify(studentLabel || "Student");
  const safeSchoolLabel = JSON.stringify(schoolLabel || "School");
  const safePickupLabel = JSON.stringify(pickupLabel || "Pickup");
  const safeDriverLabel = JSON.stringify(driverLabel || "Driver");
  const safeFitPadding = JSON.stringify(
    fitPadding || { top: 80, right: 48, bottom: 160, left: 48 },
  );

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
      .marker-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .marker-core {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        border: 3px solid #ffffff;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.28);
      }
      .marker-label {
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.2;
        padding: 4px 10px;
        border-radius: 20px;
        margin-top: 4px;
        text-align: center;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.18);
      }
      .marker-stem {
        width: 2px;
        height: 8px;
        margin-top: 2px;
        border-radius: 999px;
      }
      .student-wrap .marker-core,
      .school-wrap .marker-core {
        width: 44px;
        height: 44px;
        border-radius: 22px;
        font-size: 20px;
      }
      .student-wrap .marker-label,
      .school-wrap .marker-label {
        max-width: 120px;
      }
      .student-wrap .marker-core,
      .student-wrap .marker-label,
      .student-wrap .marker-stem {
        background: #16A34A;
      }
      .school-wrap .marker-core,
      .school-wrap .marker-label,
      .school-wrap .marker-stem {
        background: #7C3AED;
      }
      .driver-wrap {
        position: relative;
        gap: 4px;
      }
      .driver-pulse {
        position: absolute;
        width: 64px;
        height: 64px;
        border-radius: 32px;
        top: -8px;
        background: rgba(49, 133, 252, 0.2);
        animation: driverPulse 1.8s ease-out infinite;
      }
      .driver-core {
        position: relative;
        z-index: 1;
        width: 48px;
        height: 48px;
        border-radius: 24px;
        background: #1D4ED8;
        font-size: 22px;
        box-shadow: 0 4px 12px rgba(29, 78, 216, 0.4);
      }
      .driver-label {
        position: relative;
        z-index: 1;
        background: #1D4ED8;
        letter-spacing: 0.3px;
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
      .popup-label {
        color: #ffffff;
        font-size: 12px;
        font-weight: 700;
        line-height: 1;
        border-radius: 999px;
        padding: 8px 10px;
        white-space: nowrap;
      }
      .popup-label.student { background: #10b981; }
      .popup-label.school { background: #7C3AED; }
      .popup-label.pickup { background: #f97316; }
      .popup-label.driver { background: #1D4ED8; }
      .mapboxgl-popup-content {
        background: transparent;
        box-shadow: none;
        border-radius: 0;
        padding: 0;
      }
      .mapboxgl-popup-tip {
        border-top-color: rgba(15, 23, 42, 0.18) !important;
      }
      @keyframes driverPulse {
        0% {
          transform: scale(0.72);
          opacity: 0.75;
        }
        100% {
          transform: scale(1.1);
          opacity: 0;
        }
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
      const driverLocation      = ${driver};
      const studentLabel        = ${safeStudentLabel};
      const schoolLabel         = ${safeSchoolLabel};
      const pickupLabel         = ${safePickupLabel};
      const driverLabel         = ${safeDriverLabel};
      const fitPadding          = ${safeFitPadding};

      const center = driverLocation || pickupLocation || homeLocation || destinationLocation || { latitude: 0, longitude: 0 };

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

        /* ── 3. Helpers: add high-contrast markers ───────────────────────── */
        const createPopupHtml = (label, type) =>
          '<div class="popup-label ' + type + '">' + label + '</div>';

        const addStudentOrSchoolMarker = (point, type, label, icon) => {
          if (!point) return;
          const wrap = document.createElement("div");
          wrap.className = 'marker-wrap ' + type + '-wrap';

          const core = document.createElement("div");
          core.className = "marker-core";
          core.textContent = icon;

          const badge = document.createElement("div");
          badge.className = "marker-label";
          badge.textContent = label;

          const stem = document.createElement("div");
          stem.className = "marker-stem";

          wrap.appendChild(core);
          wrap.appendChild(badge);
          wrap.appendChild(stem);
          wrap.style.cursor = "pointer";

          new mapboxgl.Marker({ element: wrap, anchor: "bottom" })
            .setLngLat([point.longitude, point.latitude])
            .addTo(map);

          boundsPoints.push([point.longitude, point.latitude]);
        };

        const addDriverMarker = (point, label) => {
          if (!point) return;
          const wrap = document.createElement("div");
          wrap.className = "marker-wrap driver-wrap";

          const pulse = document.createElement("div");
          pulse.className = "driver-pulse";

          const core = document.createElement("div");
          core.className = "marker-core driver-core";
          core.textContent = "🚌";

          const badge = document.createElement("div");
          badge.className = "marker-label driver-label";
          badge.textContent = label;

          wrap.appendChild(pulse);
          wrap.appendChild(core);
          wrap.appendChild(badge);
          wrap.style.cursor = "pointer";

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

        addStudentOrSchoolMarker(homeLocation, "student", studentLabel, "🏠");
        addStudentOrSchoolMarker(destinationLocation, "school", schoolLabel, "🏫");
        addDriverMarker(driverLocation, driverLabel);
        addPickupMarker(pickupLocation, pickupLabel);

        /* ── 5. Fit camera to all points ─────────────────────────────────── */
        if (!${focusOnStudent ? "true" : "false"} && boundsPoints.length > 1) {
          const bounds = boundsPoints.reduce(
            (b, p) => b.extend(p),
            new mapboxgl.LngLatBounds(boundsPoints[0], boundsPoints[0])
          );
          map.fitBounds(bounds, {
            padding: {
              top: Number(fitPadding.top) || 80,
              right: Number(fitPadding.right) || 48,
              bottom: Number(fitPadding.bottom) || 160,
              left: Number(fitPadding.left) || 48,
            },
            duration: 300,
          });
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
  driverLocation = null,
  routeCoordinates = [],
  zoom = 14,
  interactive = false,
  showRoute = true,
  studentLabel = "Student",
  schoolLabel = "School",
  pickupLabel = "Pickup",
  driverLabel = "Driver",
  focusOnStudent = false,
  fitPadding = null,
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
        driverLocation,
        zoom,
        interactive,
        showRoute,
        studentLabel,
        schoolLabel,
        pickupLabel,
        driverLabel,
        focusOnStudent,
        fitPadding,
      }),
    [
      accessToken,
      routeCoordinates,
      homeLocation,
      destinationLocation,
      pickupLocation,
      driverLocation,
      zoom,
      interactive,
      showRoute,
      studentLabel,
      schoolLabel,
      pickupLabel,
      driverLabel,
      focusOnStudent,
      fitPadding,
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
