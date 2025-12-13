import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../../components/Header';
import DemoBadge from '../../components/DemoBadge';

const translations = {
  en: {
    title: 'Profile',
    subtitle: 'Your driver information',
    personalInfo: 'Personal Information',
    busInfo: 'Bus Information',
    fullname: 'Full Name',
    email: 'Email',
    phone: 'Phone',
    licenseNumber: 'License Number',
    busPlate: 'Bus Plate Number',
    busCapacity: 'Bus Capacity',
    busModel: 'Bus Model',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    logout: 'Logout',
    logoutConfirm: 'Are you sure you want to logout?',
    logoutConfirmTitle: 'Logout',
    yes: 'Yes',
    no: 'No',
    saving: 'Saving...',
    saved: 'Profile updated successfully',
    error: 'Error',
    errorMessage: 'Failed to update profile',
    ok: 'OK',
    loading: 'Loading...',
    availability: 'Availability',
    settings: 'Settings',
    notifications: 'Notifications',
    language: 'Language',
    about: 'About',
    version: 'Version',
  },
  ar: {
    title: 'الملف الشخصي',
    subtitle: 'معلومات السائق',
    personalInfo: 'المعلومات الشخصية',
    busInfo: 'معلومات الحافلة',
    fullname: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    licenseNumber: 'رقم الرخصة',
    busPlate: 'رقم لوحة الحافلة',
    busCapacity: 'سعة الحافلة',
    busModel: 'طراز الحافلة',
    edit: 'تعديل',
    save: 'حفظ',
    cancel: 'إلغاء',
    logout: 'تسجيل الخروج',
    logoutConfirm: 'هل أنت متأكد من تسجيل الخروج؟',
    logoutConfirmTitle: 'تسجيل الخروج',
    yes: 'نعم',
    no: 'لا',
    saving: 'جاري الحفظ...',
    saved: 'تم تحديث الملف الشخصي بنجاح',
    error: 'خطأ',
    errorMessage: 'فشل تحديث الملف الشخصي',
    ok: 'حسناً',
    loading: 'جاري التحميل...',
    availability: 'التوفر',
    settings: 'الإعدادات',
    notifications: 'الإشعارات',
    language: 'اللغة',
    about: 'حول',
    version: 'الإصدار',
  },
};

// Demo driver data
const DEMO_DRIVER = {
  id: 'demo-driver-id',
  name: 'Mohamed Alami',
  email: 'mohamed.alami@example.com',
  phone: '+212612345678',
  license_number: 'DL-123456',
  bus: {
    plate_number: '12345-A-67',
    capacity: 50,
    model: 'Mercedes Sprinter',
  },
};

const DriverProfileScreen = ({
  driverId,
  isDemo = false,
  language = 'en',
  onLogout,
}) => {
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    license_number: '',
    bus_plate: '',
    bus_capacity: '',
    bus_model: '',
  });

  const t = translations[language];
  const isRTL = language === 'ar';

  useEffect(() => {
    loadDriverData();
  }, [driverId]);

  const loadDriverData = async () => {
    try {
      setLoading(true);
      
      if (isDemo) {
        // Use demo data
        await new Promise(resolve => setTimeout(resolve, 500));
        setDriver(DEMO_DRIVER);
        setFormData({
          name: DEMO_DRIVER.name,
          phone: DEMO_DRIVER.phone,
          email: DEMO_DRIVER.email,
          license_number: DEMO_DRIVER.license_number,
          bus_plate: DEMO_DRIVER.bus.plate_number,
          bus_capacity: DEMO_DRIVER.bus.capacity.toString(),
          bus_model: DEMO_DRIVER.bus.model,
        });
      } else {
        // TODO: Load from API
        // const { data, error } = await getDriverById(driverId);
        // if (error) throw error;
        // setDriver(data);
        // setFormData({...});
        setDriver(DEMO_DRIVER);
        setFormData({
          name: DEMO_DRIVER.name,
          phone: DEMO_DRIVER.phone,
          email: DEMO_DRIVER.email,
          license_number: DEMO_DRIVER.license_number,
          bus_plate: DEMO_DRIVER.bus.plate_number,
          bus_capacity: DEMO_DRIVER.bus.capacity.toString(),
          bus_model: DEMO_DRIVER.bus.model,
        });
      }
    } catch (error) {
      console.error('Error loading driver:', error);
      Alert.alert(t.error, t.errorMessage, [{ text: t.ok }]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (isDemo) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setDriver((prev) => ({
          ...prev,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          license_number: formData.license_number,
          bus: {
            ...prev.bus,
            plate_number: formData.bus_plate,
            capacity: parseInt(formData.bus_capacity),
            model: formData.bus_model,
          },
        }));
        Alert.alert(t.saved, '', [{ text: t.ok }]);
      } else {
        // TODO: Update via API
        // const { error } = await updateDriver(driverId, formData);
        // if (error) throw error;
        Alert.alert(t.saved, '', [{ text: t.ok }]);
      }
      
      setEditing(false);
    } catch (error) {
      console.error('Error saving driver:', error);
      Alert.alert(t.error, t.errorMessage, [{ text: t.ok }]);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t.logoutConfirmTitle,
      t.logoutConfirm,
      [
        { text: t.no, style: 'cancel' },
        {
          text: t.yes,
          style: 'destructive',
          onPress: () => {
            if (onLogout) {
              onLogout();
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title={t.title} subtitle={t.subtitle} language={language} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3185FC" />
          <Text style={[styles.loadingText, isRTL && styles.rtl]}>
            {t.loading}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Header title={t.title} subtitle={t.subtitle} language={language} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Personal Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>
              {t.personalInfo}
            </Text>
            {!editing && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setEditing(true)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="edit" size={20} color="#3185FC" />
                <Text style={[styles.editButtonText, isRTL && styles.rtl]}>
                  {t.edit}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MaterialIcons name="person" size={20} color="#666666" />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, isRTL && styles.rtl]}>
                  {t.fullname}
                </Text>
                {editing ? (
                  <TextInput
                    style={[styles.input, isRTL && styles.rtl]}
                    value={formData.name}
                    onChangeText={(value) => handleInputChange('name', value)}
                    placeholder={t.fullname}
                  />
                ) : (
                  <Text style={[styles.infoValue, isRTL && styles.rtl]}>
                    {driver?.name || '--'}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={20} color="#666666" />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, isRTL && styles.rtl]}>
                  {t.email}
                </Text>
                {editing ? (
                  <TextInput
                    style={[styles.input, isRTL && styles.rtl]}
                    value={formData.email}
                    onChangeText={(value) => handleInputChange('email', value)}
                    placeholder={t.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                ) : (
                  <Text style={[styles.infoValue, isRTL && styles.rtl]}>
                    {driver?.email || '--'}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <MaterialIcons name="phone" size={20} color="#666666" />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, isRTL && styles.rtl]}>
                  {t.phone}
                </Text>
                {editing ? (
                  <TextInput
                    style={[styles.input, isRTL && styles.rtl]}
                    value={formData.phone}
                    onChangeText={(value) => handleInputChange('phone', value)}
                    placeholder={t.phone}
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={[styles.infoValue, isRTL && styles.rtl]}>
                    {driver?.phone || '--'}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <MaterialIcons name="badge" size={20} color="#666666" />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, isRTL && styles.rtl]}>
                  {t.licenseNumber}
                </Text>
                {editing ? (
                  <TextInput
                    style={[styles.input, isRTL && styles.rtl]}
                    value={formData.license_number}
                    onChangeText={(value) => handleInputChange('license_number', value)}
                    placeholder={t.licenseNumber}
                  />
                ) : (
                  <Text style={[styles.infoValue, isRTL && styles.rtl]}>
                    {driver?.license_number || '--'}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Bus Information Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>
            {t.busInfo}
          </Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MaterialIcons name="directions-bus" size={20} color="#666666" />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, isRTL && styles.rtl]}>
                  {t.busPlate}
                </Text>
                {editing ? (
                  <TextInput
                    style={[styles.input, isRTL && styles.rtl]}
                    value={formData.bus_plate}
                    onChangeText={(value) => handleInputChange('bus_plate', value)}
                    placeholder={t.busPlate}
                  />
                ) : (
                  <Text style={[styles.infoValue, isRTL && styles.rtl]}>
                    {driver?.bus?.plate_number || '--'}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <MaterialIcons name="people" size={20} color="#666666" />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, isRTL && styles.rtl]}>
                  {t.busCapacity}
                </Text>
                {editing ? (
                  <TextInput
                    style={[styles.input, isRTL && styles.rtl]}
                    value={formData.bus_capacity}
                    onChangeText={(value) => handleInputChange('bus_capacity', value)}
                    placeholder={t.busCapacity}
                    keyboardType="numeric"
                  />
                ) : (
                  <Text style={[styles.infoValue, isRTL && styles.rtl]}>
                    {driver?.bus?.capacity || '--'} {language === 'ar' ? 'مقعد' : 'seats'}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <MaterialIcons name="directions-car" size={20} color="#666666" />
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, isRTL && styles.rtl]}>
                  {t.busModel}
                </Text>
                {editing ? (
                  <TextInput
                    style={[styles.input, isRTL && styles.rtl]}
                    value={formData.bus_model}
                    onChangeText={(value) => handleInputChange('bus_model', value)}
                    placeholder={t.busModel}
                  />
                ) : (
                  <Text style={[styles.infoValue, isRTL && styles.rtl]}>
                    {driver?.bus?.model || '--'}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {editing && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setEditing(false);
                // Reset form data
                setFormData({
                  name: driver?.name || '',
                  phone: driver?.phone || '',
                  email: driver?.email || '',
                  license_number: driver?.license_number || '',
                  bus_plate: driver?.bus?.plate_number || '',
                  bus_capacity: driver?.bus?.capacity?.toString() || '',
                  bus_model: driver?.bus?.model || '',
                });
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>{t.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.7}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>{t.save}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <MaterialIcons name="logout" size={20} color="#EF4444" />
          <Text style={[styles.logoutButtonText, isRTL && styles.rtl]}>
            {t.logout}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3185FC',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  saveButton: {
    backgroundColor: '#3185FC',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginTop: 16,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  rtl: {
    textAlign: 'right',
  },
});

export default DriverProfileScreen;

