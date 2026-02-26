import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MapView = (props) => (
  <View style={[styles.mockMap, props.style]}>
    <Text style={styles.mockText}>Map View Mock (Web)</Text>
    {props.children}
  </View>
);

const Marker = (props) => (
  <View style={styles.mockMarker}>
    <Text style={styles.mockMarkerText}>📍</Text>
    {props.children}
  </View>
);

const Polyline = () => <View style={styles.mockPolyline} />;
const Polygon = () => <View style={styles.mockPolyline} />;
const Circle = () => <View style={styles.mockPolyline} />;
const Callout = (props) => <View>{props.children}</View>;

const PROVIDER_GOOGLE = 'google';
const PROVIDER_DEFAULT = 'default';

export {
  Marker,
  Polyline,
  Polygon,
  Circle,
  Callout,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
};

export default MapView;

const styles = StyleSheet.create({
  mockMap: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  mockText: {
    color: '#666666',
    fontWeight: 'bold',
  },
  mockMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockMarkerText: {
    fontSize: 20,
  },
  mockPolyline: {
    height: 2,
    backgroundColor: '#3B82F6',
  },
});
