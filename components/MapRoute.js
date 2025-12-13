import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

const MapRoute = ({
  homeLocation = { latitude: 33.5731, longitude: -7.5898 }, // Default: Casablanca
  schoolLocation = { latitude: 33.5800, longitude: -7.5920 },
  language = 'en',
}) => {
  const [userLocation, setUserLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const mapRef = useRef(null);

  // Route coordinates (simplified - in production, use a routing service)
  const routeCoordinates = [
    homeLocation,
    {
      latitude: (homeLocation.latitude + schoolLocation.latitude) / 2,
      longitude: (homeLocation.longitude + schoolLocation.longitude) / 2,
    },
    schoolLocation,
  ];

  // Calculate region to fit both markers
  const getRegion = () => {
    const minLat = Math.min(homeLocation.latitude, schoolLocation.latitude);
    const maxLat = Math.max(homeLocation.latitude, schoolLocation.latitude);
    const minLng = Math.min(homeLocation.longitude, schoolLocation.longitude);
    const maxLng = Math.max(homeLocation.longitude, schoolLocation.longitude);

    const latDelta = (maxLat - minLat) * 1.5 || 0.01;
    const lngDelta = (maxLng - minLng) * 1.5 || 0.01;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(latDelta, 0.01),
      longitudeDelta: Math.max(lngDelta, 0.01),
    };
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(getRegion(), 500);
    }
  }, [homeLocation, schoolLocation]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasPermission(status === 'granted');
      if (status === 'granted') {
        getCurrentLocation();
      }
    } catch (err) {
      console.error('Error requesting location permission:', err);
      setHasPermission(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };

      setUserLocation(newLocation);

      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            ...newLocation,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500
        );
      }
    } catch (err) {
      console.error('Error getting current location:', err);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          initialRegion={getRegion()}
          showsUserLocation={hasPermission && userLocation !== null}
          showsMyLocationButton={false}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          mapType="standard"
        >
          {/* Home/Pickup Marker - Blue Circular */}
          <Marker
            coordinate={homeLocation}
            title={language === 'ar' ? 'المنزل' : 'Home'}
            description={language === 'ar' ? 'موقع المنزل' : 'Home location'}
          >
            <View style={styles.markerContainer}>
              <View style={styles.circularMarker}>
                <View style={styles.circularMarkerInner} />
              </View>
            </View>
          </Marker>

          {/* School/Destination Marker - Red Teardrop (Native Pin) */}
          <Marker
            coordinate={schoolLocation}
            title={language === 'ar' ? 'المدرسة' : 'School'}
            description={language === 'ar' ? 'موقع المدرسة' : 'School location'}
            pinColor="#EF4444"
          />

          {/* Route Line */}
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#3185FC"
            strokeWidth={4}
            lineDashPattern={[]}
          />
        </MapView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  mapContainer: {
    height: '100%',
    width: '100%',
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  locationButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#3185FC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  circularMarkerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
});

export default MapRoute;

