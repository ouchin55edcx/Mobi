import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Header from '../../components/Header';
import DriverNotificationsModal from '../../components/DriverNotificationsModal';
import { UbuntuFonts } from '../../src/utils/fonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const translations = {
  en: {
    title: 'Driver Home',
    subtitle: 'Manage your availability and trips',
    tomorrowAvailability: 'Tomorrow Availability',
    timeSlot: 'Time Slot',
    available: 'Available',
    saveAvailability: 'Save Availability',
    saving: 'Saving...',
    availabilitySaved: 'Availability Saved',
    availabilitySavedMessage: 'Your availability has been saved. You will be notified when trips are assigned.',
    assignedTrip: 'Assigned Trip',
    tripDate: 'Trip Date',
    pickupTime: 'Pickup Time',
    studentCount: 'Student Count',
    status: 'Status',
    scheduled: 'Scheduled',
    pickup: 'Pickup',
    destination: 'Destination',
    showAvailability: 'Show Availability',
    hideAvailability: 'Hide Availability',
    ok: 'OK',
  },
  ar: {
    title: 'الصفحة الرئيسية للسائق',
    subtitle: 'إدارة التوفر والرحلات',
    tomorrowAvailability: 'التوفر غداً',
    timeSlot: 'الفترة الزمنية',
    available: 'متاح',
    saveAvailability: 'حفظ التوفر',
    saving: 'جاري الحفظ...',
    availabilitySaved: 'تم حفظ التوفر',
    availabilitySavedMessage: 'تم حفظ توفرك. سيتم إشعارك عند تعيين الرحلات.',
    assignedTrip: 'رحلة معينة',
    tripDate: 'تاريخ الرحلة',
    pickupTime: 'وقت الاستلام',
    studentCount: 'عدد الطلاب',
    status: 'الحالة',
    scheduled: 'مجدولة',
    pickup: 'نقطة الاستلام',
    destination: 'الوجهة',
    showAvailability: 'إظهار التوفر',
    hideAvailability: 'إخفاء التوفر',
    ok: 'حسناً',
  },
};

// Time slots configuration
const TIME_SLOTS = [
  { id: 'morning', label: { en: 'Morning', ar: 'صباح' }, start: '06:00', end: '09:00' },
  { id: 'midday', label: { en: 'Midday', ar: 'ظهر' }, start: '11:00', end: '14:00' },
  { id: 'afternoon', label: { en: 'Afternoon', ar: 'بعد الظهر' }, start: '16:00', end: '19:00' },
];

// Demo trip data
const getDemoTrip = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(7, 30, 0, 0);

  // Generate student pickup points
  const students = [
    {
      id: 'student-1',
      name: 'Ahmed Alami',
      phone: '+212612345678',
      pickupLocation: { latitude: 33.5750, longitude: -7.5900 },
      status: 'pending',
      order: 1,
    },
    {
      id: 'student-2',
      name: 'Fatima Zahra',
      phone: '+212612345679',
      pickupLocation: { latitude: 33.5760, longitude: -7.5905 },
      status: 'pending',
      order: 2,
    },
    {
      id: 'student-3',
      name: 'Youssef Benali',
      phone: '+212612345680',
      pickupLocation: { latitude: 33.5770, longitude: -7.5910 },
      status: 'pending',
      order: 3,
    },
    {
      id: 'student-4',
      name: 'Aicha Mansouri',
      phone: '+212612345681',
      pickupLocation: { latitude: 33.5775, longitude: -7.5912 },
      status: 'pending',
      order: 4,
    },
    {
      id: 'student-5',
      name: 'Mohamed Tazi',
      phone: '+212612345682',
      pickupLocation: { latitude: 33.5780, longitude: -7.5914 },
      status: 'pending',
      order: 5,
    },
    {
      id: 'student-6',
      name: 'Sanae El Fassi',
      phone: '+212612345683',
      pickupLocation: { latitude: 33.5785, longitude: -7.5916 },
      status: 'pending',
      order: 6,
    },
    {
      id: 'student-7',
      name: 'Omar Idrissi',
      phone: '+212612345684',
      pickupLocation: { latitude: 33.5790, longitude: -7.5918 },
      status: 'pending',
      order: 7,
    },
    {
      id: 'student-8',
      name: 'Layla Amrani',
      phone: '+212612345685',
      pickupLocation: { latitude: 33.5795, longitude: -7.5920 },
      status: 'pending',
      order: 8,
    },
  ];

  return {
    id: 'demo-trip-001',
    date: tomorrow,
    pickupTime: '07:30',
    studentCount: students.length,
    status: 'SCHEDULED',
    students,
    pickupLocation: {
      latitude: 33.5750,
      longitude: -7.5900,
      name: 'Main Pickup Point',
    },
    destinationLocation: {
      latitude: 33.5800,
      longitude: -7.5920,
      name: 'Casablanca International School',
    },
    schoolLocation: {
      latitude: 33.5800,
      longitude: -7.5920,
      name: 'Casablanca International School',
    },
    estimatedArrivalMinutes: 45,
  };
};

// Demo notifications
const getDemoNotifications = () => [
  {
    id: 'notif-1',
    type: 'TRIP_ASSIGNED',
    message: 'You have been assigned a trip for tomorrow',
    timestamp: '2 hours ago',
    read: false,
  },
  {
    id: 'notif-2',
    type: 'PICKUP_REMINDER',
    message: 'Pickup starts in 30 minutes',
    timestamp: '1 hour ago',
    read: false,
  },
];

const DriverHomeScreen = ({ driverId, language = 'en', isDemo = false, onTripPress }) => {
  const [availability, setAvailability] = useState({
    morning: false,
    midday: false,
    afternoon: false,
  });
  const [availabilitySaved, setAvailabilitySaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assignedTrip, setAssignedTrip] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [notifications] = useState(getDemoNotifications());
  const [unreadCount] = useState(notifications.filter(n => !n.read).length);

  const t = translations[language];

  // Handle trip card press
  const handleTripPress = useCallback(() => {
    if (assignedTrip && onTripPress) {
      onTripPress(assignedTrip);
    }
  }, [assignedTrip, onTripPress]);

  // Toggle availability for a time slot
  const toggleAvailability = useCallback((slotId) => {
    if (availabilitySaved) return; // Lock after save
    setAvailability((prev) => ({
      ...prev,
      [slotId]: !prev[slotId],
    }));
  }, [availabilitySaved]);

  // Save availability
  const handleSaveAvailability = useCallback(async () => {
    const hasAnyAvailability = Object.values(availability).some(v => v);
    
    if (!hasAnyAvailability) {
      // Could show an alert here
      return;
    }

    setSaving(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    setAvailabilitySaved(true);
    setSaving(false);

    // Assign a demo trip if morning or midday is available
    if (availability.morning || availability.midday) {
      setTimeout(() => {
        setAssignedTrip(getDemoTrip());
        // Hide availability when trip is assigned
        setShowAvailability(false);
      }, 500);
    }
  }, [availability]);

  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate();
    const month = d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short' });
    return `${day} ${month}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      
      {/* Header with Notifications and Calendar */}
      <View style={styles.headerContainer}>
        <View style={styles.headerWrapper}>
          <Header
            title={t.title}
            subtitle={t.subtitle}
            language={language}
            isDemo={isDemo}
            showNotifications={false}
          />
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => setShowAvailability(!showAvailability)}
              activeOpacity={0.7}
            >
              <MaterialIcons 
                name="calendar-today" 
                size={24} 
                color={showAvailability ? "#3185FC" : "#666666"} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => setShowNotifications(true)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="notifications" size={24} color="#666666" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Availability Section - Hidden when trip is assigned, can be toggled with calendar icon */}
        {(!assignedTrip || showAvailability) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, language === 'ar' && styles.rtl]}>
              {t.tomorrowAvailability}
            </Text>
            
            <View style={styles.availabilityCard}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.timeSlotColumn, language === 'ar' && styles.rtl]}>
                  {t.timeSlot}
                </Text>
                <Text style={[styles.tableHeaderText, styles.availableColumn, language === 'ar' && styles.rtl]}>
                  {t.available}
                </Text>
              </View>

              {/* Table Rows */}
              {TIME_SLOTS.map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                  style={[
                    styles.tableRow,
                    availability[slot.id] && styles.tableRowSelected,
                    availabilitySaved && styles.tableRowLocked,
                  ]}
                  onPress={() => toggleAvailability(slot.id)}
                  disabled={availabilitySaved}
                  activeOpacity={0.7}
                >
                  <View style={styles.timeSlotCell}>
                    <Text style={[styles.timeSlotLabel, language === 'ar' && styles.rtl]}>
                      {slot.label[language]}
                    </Text>
                    <Text style={[styles.timeSlotTime, language === 'ar' && styles.rtl]}>
                      {slot.start} – {slot.end}
                    </Text>
                  </View>
                  <View style={styles.checkboxCell}>
                    <View
                      style={[
                        styles.checkbox,
                        availability[slot.id] && styles.checkboxChecked,
                        availabilitySaved && !availability[slot.id] && styles.checkboxDisabled,
                      ]}
                    >
                      {availability[slot.id] && (
                        <MaterialIcons name="check" size={18} color="#FFFFFF" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Save Button */}
            {!availabilitySaved && (
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveAvailability}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>{t.saveAvailability}</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Saved Indicator */}
            {availabilitySaved && (
              <View style={styles.savedIndicator}>
                <MaterialIcons name="check-circle" size={20} color="#10B981" />
                <Text style={[styles.savedText, language === 'ar' && styles.rtl]}>
                  {t.availabilitySaved}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Assigned Trip Section */}
        {assignedTrip && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, language === 'ar' && styles.rtl]}>
              {t.assignedTrip}
            </Text>
            
            <TouchableOpacity
              style={styles.tripCard}
              onPress={handleTripPress}
              activeOpacity={0.9}
            >
              {/* Map */}
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: (assignedTrip.pickupLocation.latitude + assignedTrip.destinationLocation.latitude) / 2,
                    longitude: (assignedTrip.pickupLocation.longitude + assignedTrip.destinationLocation.longitude) / 2,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                >
                  <Marker
                    coordinate={assignedTrip.pickupLocation}
                    title={t.pickup}
                    pinColor="#3185FC"
                  />
                  <Marker
                    coordinate={assignedTrip.destinationLocation}
                    title={t.destination}
                    pinColor="#10B981"
                  />
                  <Polyline
                    coordinates={[assignedTrip.pickupLocation, assignedTrip.destinationLocation]}
                    strokeColor="#3185FC"
                    strokeWidth={3}
                  />
                </MapView>
              </View>

              {/* Trip Info */}
              <View style={styles.tripInfo}>
                <View style={styles.tripInfoRow}>
                  <MaterialIcons name="calendar-today" size={20} color="#666666" />
                  <Text style={[styles.tripInfoLabel, language === 'ar' && styles.rtl]}>
                    {t.tripDate}:
                  </Text>
                  <Text style={[styles.tripInfoValue, language === 'ar' && styles.rtl]}>
                    {formatDate(assignedTrip.date)}
                  </Text>
                </View>

                <View style={styles.tripInfoRow}>
                  <MaterialIcons name="schedule" size={20} color="#666666" />
                  <Text style={[styles.tripInfoLabel, language === 'ar' && styles.rtl]}>
                    {t.pickupTime}:
                  </Text>
                  <Text style={[styles.tripInfoValue, language === 'ar' && styles.rtl]}>
                    {assignedTrip.pickupTime}
                  </Text>
                </View>

                <View style={styles.tripInfoRow}>
                  <MaterialIcons name="people" size={20} color="#666666" />
                  <Text style={[styles.tripInfoLabel, language === 'ar' && styles.rtl]}>
                    {t.studentCount}:
                  </Text>
                  <Text style={[styles.tripInfoValue, language === 'ar' && styles.rtl]}>
                    {assignedTrip.studentCount}
                  </Text>
                </View>

                <View style={styles.tripInfoRow}>
                  <MaterialIcons name="info" size={20} color="#666666" />
                  <Text style={[styles.tripInfoLabel, language === 'ar' && styles.rtl]}>
                    {t.status}:
                  </Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{t.scheduled}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Notifications Modal */}
      <DriverNotificationsModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        driverId={driverId}
        language={language}
        notifications={notifications}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginTop: -48,
  },
  headerWrapper: {
    position: 'relative',
  },
  headerActions: {
    position: 'absolute',
    top: 20,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  headerActionButton: {
    padding: 8,
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: UbuntuFonts.bold,
  },
  rtl: {
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
    fontFamily: UbuntuFonts.bold,
  },
  availabilityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: UbuntuFonts.semiBold,
  },
  timeSlotColumn: {
    flex: 1,
  },
  availableColumn: {
    width: 80,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableRowSelected: {
    backgroundColor: '#F0F7FF',
  },
  tableRowLocked: {
    opacity: 0.7,
  },
  timeSlotCell: {
    flex: 1,
  },
  timeSlotLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
    fontFamily: UbuntuFonts.semiBold,
  },
  timeSlotTime: {
    fontSize: 14,
    color: '#666666',
    fontFamily: UbuntuFonts.regular,
  },
  checkboxCell: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3185FC',
    borderColor: '#3185FC',
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  saveButton: {
    backgroundColor: '#3185FC',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3185FC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: UbuntuFonts.semiBold,
  },
  savedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  savedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    fontFamily: UbuntuFonts.semiBold,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mapContainer: {
    height: 200,
    width: '100%',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  tripInfo: {
    padding: 20,
    gap: 16,
  },
  tripInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tripInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    flex: 1,
    fontFamily: UbuntuFonts.medium,
  },
  tripInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: UbuntuFonts.semiBold,
  },
  statusBadge: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    fontFamily: UbuntuFonts.semiBold,
  },
});

export default DriverHomeScreen;
