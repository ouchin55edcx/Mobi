import React, { useMemo } from "react";
import { View, StyleSheet, Text } from "react-native";
import { WebView } from "react-native-webview";

const MAPBOX_STYLE = "mapbox://styles/mapbox/streets-v12";

const buildHtml = ({
  accessToken,
  routeCoordinates,
  homeLocation,
  destinationLocation,
  zoom,
  interactive,
  showRoute,
  studentLabel,
  schoolLabel,
  focusOnStudent,
}) => {
  const route = JSON.stringify(routeCoordinates || []);
  const home = JSON.stringify(homeLocation || null);
  const destination = JSON.stringify(destinationLocation || null);
  const safeStudentLabel = JSON.stringify(studentLabel || "Student");
  const safeSchoolLabel = JSON.stringify(schoolLabel || "School");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link href="https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.css" rel="stylesheet" />
    <style>
      html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #f8fafc; }
      #map { width: 100%; height: 100%; }
      .marker {
        width: 14px;
        height: 14px;
        border-radius: 999px;
        border: 2px solid #ffffff;
      }
      .student { background: #10b981; }
      .school { background: #2563eb; }
      .pin-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .bubble {
        color: #ffffff;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        border-radius: 10px;
        padding: 6px 9px;
        margin-bottom: 6px;
        white-space: nowrap;
      }
      .bubble.student { background: #10b981; }
      .bubble.school { background: #2563eb; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.js"></script>
    <script>
      mapboxgl.accessToken = "${accessToken}";

      const routeCoordinates = ${route};
      const homeLocation = ${home};
      const destinationLocation = ${destination};
      const studentLabel = ${safeStudentLabel};
      const schoolLabel = ${safeSchoolLabel};

      const center = homeLocation || destinationLocation || { latitude: 0, longitude: 0 };
      const map = new mapboxgl.Map({
        container: "map",
        style: "${MAPBOX_STYLE}",
        center: [center.longitude, center.latitude],
        zoom: ${Number.isFinite(zoom) ? zoom : 14},
        attributionControl: false,
        dragPan: ${interactive ? "true" : "false"},
        scrollZoom: ${interactive ? "true" : "false"},
        touchZoomRotate: ${interactive ? "true" : "false"},
        doubleClickZoom: ${interactive ? "true" : "false"},
      });

      map.on("load", () => {
        const points = [];

        if (${showRoute ? "true" : "false"} && Array.isArray(routeCoordinates) && routeCoordinates.length > 1) {
          map.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: routeCoordinates.map((p) => [p.longitude, p.latitude]),
              },
            },
          });

          map.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": "#3B82F6",
              "line-width": 4,
              "line-opacity": 0.85,
            },
          });

          routeCoordinates.forEach((p) => points.push([p.longitude, p.latitude]));
        }

        const addMarker = (point, className, label) => {
          if (!point) return;
          const wrap = document.createElement("div");
          wrap.className = "pin-wrap";
          const bubble = document.createElement("div");
          bubble.className = "bubble " + className;
          bubble.innerText = label;
          const dot = document.createElement("div");
          dot.className = "marker " + className;
          wrap.appendChild(bubble);
          wrap.appendChild(dot);
          new mapboxgl.Marker(wrap).setLngLat([point.longitude, point.latitude]).addTo(map);
          points.push([point.longitude, point.latitude]);
        };

        addMarker(homeLocation, "student", studentLabel);
        addMarker(destinationLocation, "school", schoolLabel);

        if (!${focusOnStudent ? "true" : "false"} && points.length > 1) {
          const bounds = points.reduce(
            (b, p) => b.extend(p),
            new mapboxgl.LngLatBounds(points[0], points[0])
          );
          map.fitBounds(bounds, { padding: 40, duration: 0 });
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
  routeCoordinates = [],
  zoom = 14,
  interactive = false,
  showRoute = true,
  studentLabel = "Student",
  schoolLabel = "School",
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
        zoom,
        interactive,
        showRoute,
        studentLabel,
        schoolLabel,
        focusOnStudent,
      }),
    [
      accessToken,
      routeCoordinates,
      homeLocation,
      destinationLocation,
      zoom,
      interactive,
      showRoute,
      studentLabel,
      schoolLabel,
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
