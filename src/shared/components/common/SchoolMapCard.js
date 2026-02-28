import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const SchoolMapCard = ({
  school,
  language = 'en',
}) => {
  const mapRef = useRef(null);

  useEffect(() => {
    if (school && school.latitude && school.longitude && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: school.latitude,
          longitude: school.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
    }
  }, [school]);

  if (!school || !school.latitude || !school.longitude) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3185FC" />
          <Text style={styles.loadingText}>
            {language === 'ar' ? 'جاري التحميل...' : 'Loading school location...'}
          </Text>
        </View>
      </View>
    );
  }

  // Handle both database format (name_ar) and component format (nameAr)
  const schoolName = language === 'ar' 
    ? (school.name_ar || school.nameAr || school.name)
    : school.name;

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          initialRegion={{
            latitude: school.latitude,
            longitude: school.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          scrollEnabled={true}
          zoomEnabled={true}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          <Marker
            coordinate={{
              latitude: school.latitude,
              longitude: school.longitude,
            }}
            draggable={false}
          >
            <View style={styles.markerContainer}>
              <View style={styles.markerPin}>
                <MaterialIcons name="school" size={20} color="#FFFFFF" />
              </View>
            </View>
          </Marker>
        </MapView>
      </View>

      {/* School Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="school" size={24} color="#3185FC" />
          </View>
          <View style={styles.infoContent}>
            <Text style={[styles.schoolName, language === 'ar' && styles.rtl]}>
              {schoolName}
            </Text>
            {school.address && (
              <View style={styles.addressRow}>
                <MaterialIcons name="location-on" size={16} color="#666666" />
                <Text style={[styles.address, language === 'ar' && styles.rtl]}>
                  {school.address}
                </Text>
              </View>
            )}
            {school.city && (
              <View style={styles.cityRow}>
                <MaterialIcons name="place" size={16} color="#666666" />
                <Text style={[styles.city, language === 'ar' && styles.rtl]}>
                  {school.city}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
  },
  mapContainer: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3185FC',
    borderWidth: 3,
    borderColor: '#FFFFFF',
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
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  rtl: {
    textAlign: 'right',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  address: {
    flex: 1,
    fontSize: 14,
    color: '#666666',
    marginLeft: 4,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  city: {
    flex: 1,
    fontSize: 14,
    color: '#666666',
    marginLeft: 4,
  },
});

export default SchoolMapCard;

