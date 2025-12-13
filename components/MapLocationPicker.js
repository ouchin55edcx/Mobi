import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const MapLocationPicker = ({
  value,
  onSelect,
  language = 'en',
  error = null,
  disabled = false,
}) => {
  const [location, setLocation] = useState(
    value || { latitude: 33.5731, longitude: -7.5898 } // Default: Casablanca
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (value) {
      setLocation(value);
      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: value.latitude,
            longitude: value.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500
        );
      }
    }
  }, [value]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setHasPermission(true);
        getCurrentLocation();
      } else {
        setHasPermission(false);
      }
    } catch (err) {
      console.error('Error requesting location permission:', err);
      setHasPermission(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };

      setLocation(newLocation);
      onSelect(newLocation);

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
      Alert.alert(
        language === 'ar' ? 'خطأ' : 'Error',
        language === 'ar'
          ? 'فشل في الحصول على موقعك الحالي'
          : 'Failed to get your current location'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleMapPress = (event) => {
    if (disabled) return;

    const { latitude, longitude } = event.nativeEvent.coordinate;
    const newLocation = { latitude, longitude };
    setLocation(newLocation);
    onSelect(newLocation);
  };

  const handleConfirm = () => {
    if (location) {
      onSelect(location);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {language === 'ar' ? 'موقع المنزل' : 'Home Location'}
      </Text>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onPress={handleMapPress}
          showsUserLocation={hasPermission}
          showsMyLocationButton={false}
          scrollEnabled={!disabled}
          zoomEnabled={!disabled}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            draggable={!disabled}
            onDragEnd={(e) => {
              const newLocation = {
                latitude: e.nativeEvent.coordinate.latitude,
                longitude: e.nativeEvent.coordinate.longitude,
              };
              setLocation(newLocation);
              onSelect(newLocation);
            }}
          >
            <View style={styles.markerContainer}>
              <View style={styles.markerPin} />
              <View style={styles.markerDot} />
            </View>
          </Marker>
        </MapView>

        {/* Location Button */}
        <TouchableOpacity
          style={styles.locationButton}
          onPress={getCurrentLocation}
          disabled={isLoading || disabled}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator color="#3185FC" size="small" />
          ) : (
            <MaterialIcons name="my-location" size={24} color="#3185FC" />
          )}
        </TouchableOpacity>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <MaterialIcons name="info-outline" size={16} color="#666666" />
          <Text style={styles.instructionsText}>
            {language === 'ar'
              ? 'اضغط على الخريطة أو اسحب العلامة لتحديد موقعك'
              : 'Tap on the map or drag the marker to set your location'}
          </Text>
        </View>
      </View>

      {/* Coordinates Display */}
      <View style={styles.coordinatesContainer}>
        <View style={styles.coordinateItem}>
          <Text style={styles.coordinateLabel}>
            {language === 'ar' ? 'خط العرض' : 'Latitude'}
          </Text>
          <Text style={styles.coordinateValue}>
            {location.latitude.toFixed(6)}
          </Text>
        </View>
        <View style={styles.coordinateItem}>
          <Text style={styles.coordinateLabel}>
            {language === 'ar' ? 'خط الطول' : 'Longitude'}
          </Text>
          <Text style={styles.coordinateValue}>
            {location.longitude.toFixed(6)}
          </Text>
        </View>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
      <View
        style={[
          styles.underline,
          error
            ? styles.underlineError
            : location
            ? styles.underlineActive
            : styles.underlineInactive,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mapContainer: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  locationButton: {
    position: 'absolute',
    top: 16,
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
  instructionsContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  instructionsText: {
    flex: 1,
    fontSize: 12,
    color: '#666666',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3185FC',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  coordinatesContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  coordinateItem: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  coordinateLabel: {
    fontSize: 11,
    color: '#999999',
    marginBottom: 4,
  },
  coordinateValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  underline: {
    height: 2,
    marginTop: 4,
  },
  underlineActive: {
    backgroundColor: '#3185FC',
  },
  underlineInactive: {
    backgroundColor: '#E0E0E0',
  },
  underlineError: {
    backgroundColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
});

export default MapLocationPicker;

