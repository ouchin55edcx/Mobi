import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import MapRoute from './MapRoute';

const TripCard = ({
  tripData,
  language = 'en',
  onPress,
  homeLocation,
  schoolLocation,
}) => {
  const isRTL = language === 'ar';

  // Format date and time
  const formatDateTime = (date) => {
    if (!date) return { time: '--:--', date: '--' };
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const day = d.getDate();
    const month = d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short' });
    return {
      time: `${hours}:${minutes}`,
      date: `${day} ${month}`,
    };
  };

  // Format duration in minutes to readable format
  const formatDuration = (minutes) => {
    if (!minutes) return '--';
    if (minutes < 60) {
      return `${minutes} ${language === 'ar' ? 'دقيقة' : 'min'}`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} ${language === 'ar' ? 'ساعة' : 'h'}`;
    }
    return `${hours}${language === 'ar' ? 'س' : 'h'} ${mins}${language === 'ar' ? 'د' : 'min'}`;
  };

  // Calculate duration from start to end time
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return null;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    return Math.round(diffMs / (1000 * 60)); // Convert to minutes
  };

  // Get status display
  const getStatusInfo = (status, startTime) => {
    const now = new Date();
    const start = new Date(startTime);

    if (status === 'COMPLETED' || status === 'CANCELLED') {
      return {
        label: language === 'ar' 
          ? (status === 'COMPLETED' ? 'مكتملة' : 'ملغاة')
          : (status === 'COMPLETED' ? 'Completed' : 'Cancelled'),
        color: status === 'COMPLETED' ? '#10B981' : '#EF4444',
        bgColor: status === 'COMPLETED' ? '#ECFDF5' : '#FEF2F2',
      };
    }

    if (start <= now) {
      return {
        label: language === 'ar' ? 'قيد التنفيذ' : 'Ongoing',
        color: '#3185FC',
        bgColor: '#F0F7FF',
      };
    }

    return {
      label: language === 'ar' ? 'مجدولة' : 'Scheduled',
      color: '#F59E0B',
      bgColor: '#FFFBEB',
    };
  };

  const startDateTime = formatDateTime(tripData?.start_time || tripData?.leaveHomeTime);
  const endDateTime = formatDateTime(tripData?.end_time || tripData?.arriveDestinationTime);
  const statusInfo = getStatusInfo(
    tripData?.status || 'PENDING',
    tripData?.start_time || tripData?.leaveHomeTime
  );
  const tripType = tripData?.type || 'PICKUP';
  const duration = calculateDuration(
    tripData?.start_time || tripData?.leaveHomeTime,
    tripData?.end_time || tripData?.arriveDestinationTime
  ) || tripData?.totalDurationMinutes || 45;
  const distance = tripData?.totalDistanceKm || 5.2;

  // Get trip type label
  const getTripTypeLabel = () => {
    if (tripType === 'PICKUP') {
      return language === 'ar' ? 'استلام' : 'Pickup';
    }
    return language === 'ar' ? 'توصيل' : 'Dropoff';
  };

  // Get opposite trip type label (for "to Dropoff" text)
  const getOppositeTripTypeLabel = () => {
    if (tripType === 'PICKUP') {
      return language === 'ar' ? 'توصيل' : 'Dropoff';
    }
    return language === 'ar' ? 'استلام' : 'Pickup';
  };

  return (
    <View style={[styles.card, isRTL && styles.cardRTL]}>
      {/* Map Section with Status Badge Overlay */}
      <View style={styles.mapWrapper}>
        <MapRoute
          homeLocation={homeLocation}
          schoolLocation={schoolLocation}
          language={language}
        />
        {/* Status Badge on Map */}
        <View style={[
          styles.mapStatusBadge,
          { backgroundColor: statusInfo.bgColor },
          isRTL && styles.mapStatusBadgeRTL
        ]}>
          <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
          <Text style={[styles.mapStatusText, { color: statusInfo.color }, isRTL && styles.rtl]}>
            {statusInfo.label}
          </Text>
        </View>
      </View>

      {/* Trip Info */}
      <View style={styles.tripInfo}>
        {/* Trip Type, Time, and Date */}
        <View style={styles.tripMainInfo}>
          <Text style={[styles.tripMainText, isRTL && styles.rtl]}>
            {getTripTypeLabel()}: {startDateTime.time}, {startDateTime.date}
          </Text>
          {endDateTime.time !== '--:--' && (
            <Text style={[styles.tripSecondaryText, isRTL && styles.rtl]}>
              {language === 'ar' ? 'إلى' : 'to'} {getOppositeTripTypeLabel()}: {endDateTime.time}
            </Text>
          )}
        </View>

        {/* Duration and Distance Info Badges */}
        <View style={[styles.infoBadges, isRTL && styles.infoBadgesRTL]}>
          <View style={styles.infoBadge}>
            <MaterialIcons name="schedule" size={16} color="#3185FC" />
            <Text style={[styles.infoBadgeText, isRTL && styles.rtl]}>
              {formatDuration(duration)}
            </Text>
          </View>
          <View style={styles.infoBadge}>
            <MaterialIcons name="directions-car" size={16} color="#3185FC" />
            <Text style={[styles.infoBadgeText, isRTL && styles.rtl]}>
              {distance.toFixed(1)} {language === 'ar' ? 'كم' : 'km'}
            </Text>
          </View>
        </View>

        {/* View Details Button */}
        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Text style={styles.viewDetailsText}>
            {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 24,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  cardRTL: {
    // RTL support
  },
  mapWrapper: {
    height: 200,
    overflow: 'hidden',
    position: 'relative',
  },
  mapStatusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  mapStatusBadgeRTL: {
    right: 'auto',
    left: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mapStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tripInfo: {
    padding: 16,
  },
  tripMainInfo: {
    marginBottom: 16,
  },
  tripMainText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  tripSecondaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  infoBadges: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  infoBadgesRTL: {
    flexDirection: 'row-reverse',
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  infoBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  viewDetailsButton: {
    backgroundColor: '#3185FC',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3185FC',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  viewDetailsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rtl: {
    textAlign: 'right',
  },
});

export default TripCard;

