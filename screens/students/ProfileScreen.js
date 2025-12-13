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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import Header from '../../components/Header';
import DemoBadge from '../../components/DemoBadge';
import { getStudentById, updateStudent } from '../../src/services/studentService';
import { DEMO_STUDENT } from '../../src/data/demoData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const translations = {
  en: {
    title: 'Profile',
    subtitle: 'Your personal information',
    personalInfo: 'Personal Information',
    fullname: 'Full Name',
    email: 'Email',
    phone: 'Phone',
    school: 'School',
    homeLocation: 'Home Location',
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
    locationPreview: 'Location Preview',
    latitude: 'Latitude',
    longitude: 'Longitude',
  },
  ar: {
    title: 'الملف الشخصي',
    subtitle: 'معلوماتك الشخصية',
    personalInfo: 'المعلومات الشخصية',
    fullname: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    school: 'المدرسة',
    homeLocation: 'موقع المنزل',
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
    locationPreview: 'معاينة الموقع',
    latitude: 'خط العرض',
    longitude: 'خط الطول',
  },
};

const ProfileScreen = ({
  studentId,
  isDemo = false,
  language = 'en',
  onLogout,
}) => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullname: '',
    phone: '',
    email: '',
    school: '',
  });

  const t = translations[language];

  useEffect(() => {
    if (studentId && !isDemo) {
      loadStudent();
    } else if (isDemo) {
      // Demo mode: use demo student data
      setStudent({
        id: DEMO_STUDENT.id,
        fullname: DEMO_STUDENT.fullname,
        email: DEMO_STUDENT.email,
        phone: DEMO_STUDENT.phone,
        school: DEMO_STUDENT.schoolName,
        home_location: DEMO_STUDENT.home_location,
      });
      setFormData({
        fullname: DEMO_STUDENT.fullname,
        email: DEMO_STUDENT.email,
        phone: DEMO_STUDENT.phone,
        school: DEMO_STUDENT.schoolName,
      });
      setLoading(false);
    }
  }, [studentId, isDemo]);

  const loadStudent = async () => {
    if (!studentId) return;

    try {
      setLoading(true);
      const { data, error } = await getStudentById(studentId);

      if (error) {
        console.error('Error loading student:', error);
        Alert.alert(t.error, t.errorMessage, [{ text: t.ok }]);
      } else if (data) {
        setStudent(data);
        setFormData({
          fullname: data.fullname || '',
          phone: data.phone || '',
          email: data.email || '',
          school: data.school || '',
        });
      }
    } catch (err) {
      console.error('Exception loading student:', err);
      Alert.alert(t.error, t.errorMessage, [{ text: t.ok }]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    // Reset form data
    if (student) {
      setFormData({
        fullname: student.fullname || '',
        phone: student.phone || '',
        email: student.email || '',
        school: student.school || '',
      });
    }
  };

  const handleSave = async () => {
    if (!studentId || isDemo) {
      Alert.alert(t.saved);
      setEditing(false);
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await updateStudent(studentId, {
        fullname: formData.fullname,
        phone: formData.phone,
        school: formData.school,
        // Note: email is typically not editable
      });

      if (error) {
        console.error('Error updating student:', error);
        Alert.alert(t.error, t.errorMessage, [{ text: t.ok }]);
      } else {
        setStudent(data);
        setEditing(false);
        Alert.alert(t.saved, '', [{ text: t.ok }]);
      }
    } catch (err) {
      console.error('Exception updating student:', err);
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
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        <Header
          title={t.title}
          subtitle={t.subtitle}
          language={language}
          studentId={studentId}
          isDemo={isDemo}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3185FC" />
          <Text style={styles.loadingText}>{t.loading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!student) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        <Header
          title={t.title}
          subtitle={t.subtitle}
          language={language}
          studentId={studentId}
          isDemo={isDemo}
        />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{t.errorMessage}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <Header
        title={t.title}
        subtitle={t.subtitle}
        language={language}
        studentId={studentId}
        isDemo={isDemo}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Personal Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, language === 'ar' && styles.rtl]}>
              {t.personalInfo}
            </Text>
            {!editing && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEdit}
                activeOpacity={0.7}
              >
                <MaterialIcons name="edit" size={20} color="#3185FC" />
                <Text style={styles.editButtonText}>{t.edit}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.infoContainer}>
            {/* Full Name */}
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, language === 'ar' && styles.rtl]}>
                {t.fullname}
              </Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.fullname}
                  onChangeText={(text) => setFormData({ ...formData, fullname: text })}
                  placeholder={t.fullname}
                />
              ) : (
                <Text style={[styles.infoValue, language === 'ar' && styles.rtl]}>
                  {student.fullname || '--'}
                </Text>
              )}
            </View>

            {/* Email */}
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, language === 'ar' && styles.rtl]}>
                {t.email}
              </Text>
              <Text style={[styles.infoValue, language === 'ar' && styles.rtl]}>
                {student.email || '--'}
              </Text>
            </View>

            {/* Phone */}
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, language === 'ar' && styles.rtl]}>
                {t.phone}
              </Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder={t.phone}
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={[styles.infoValue, language === 'ar' && styles.rtl]}>
                  {student.phone || '--'}
                </Text>
              )}
            </View>

            {/* School - Prominently displayed */}
            <View style={styles.schoolRow}>
              <View style={styles.schoolIconContainer}>
                <MaterialIcons name="school" size={24} color="#3185FC" />
              </View>
              <View style={styles.schoolInfo}>
                <Text style={[styles.schoolLabel, language === 'ar' && styles.rtl]}>
                  {t.school}
                </Text>
                {editing ? (
                  <TextInput
                    style={styles.schoolInput}
                    value={formData.school}
                    onChangeText={(text) => setFormData({ ...formData, school: text })}
                    placeholder={t.school}
                  />
                ) : (
                  <Text style={[styles.schoolValue, language === 'ar' && styles.rtl]}>
                    {student.school || '--'}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {editing && (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
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
        </View>

        {/* Home Location with Map */}
        {student.home_location && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, language === 'ar' && styles.rtl]}>
              {t.homeLocation}
            </Text>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: student.home_location.latitude || 33.5731,
                  longitude: student.home_location.longitude || -7.5898,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: student.home_location.latitude || 33.5731,
                    longitude: student.home_location.longitude || -7.5898,
                  }}
                  title={t.homeLocation}
                  pinColor="#3185FC"
                />
              </MapView>
            </View>
            <View style={styles.locationDetails}>
              <View style={styles.locationDetailItem}>
                <MaterialIcons name="place" size={16} color="#6B7280" />
                <Text style={styles.locationDetailText}>
                  {student.home_location.latitude?.toFixed(6) || '--'}, {student.home_location.longitude?.toFixed(6) || '--'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <MaterialIcons name="logout" size={20} color="#EF4444" />
          <Text style={styles.logoutButtonText}>{t.logout}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 16,
    textAlign: 'center',
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
    color: '#111827',
  },
  rtl: {
    textAlign: 'right',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: 16,
    color: '#3185FC',
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 16,
    gap: 16,
  },
  infoRow: {
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
  },
  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    marginTop: 8,
  },
  schoolIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  schoolInfo: {
    flex: 1,
  },
  schoolLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  schoolValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3185FC',
  },
  schoolInput: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3185FC',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  input: {
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    backgroundColor: '#3185FC',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  locationDetails: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  locationDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationDetailText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});

export default ProfileScreen;

