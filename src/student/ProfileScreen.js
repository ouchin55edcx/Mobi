import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MapboxRoutePreview from "../shared/components/common/MapboxRoutePreview";
import {
  getStudentById,
  updateStudent,
} from "../shared/services/studentService";
import { DEMO_STUDENT } from "../shared/data/demoData";

const translations = {
  en: {
    title: "Profile",
    subtitle: "Your personal information",
    personalInfo: "Personal Information",
    fullname: "Full Name",
    email: "Email",
    phone: "Phone",
    school: "School",
    homeLocation: "Home Location",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    logout: "Logout",
    logoutConfirm: "Are you sure you want to logout?",
    logoutConfirmTitle: "Logout",
    yes: "Yes",
    no: "No",
    saving: "Saving...",
    saved: "Profile updated successfully",
    error: "Error",
    errorMessage: "Failed to update profile",
    ok: "OK",
    loading: "Loading...",
    locationPreview: "Location Preview",
    latitude: "Latitude",
    longitude: "Longitude",
    locationUnavailable: "Home location is unavailable",
    selectSchool: "Select school",
    searchSchool: "Search school...",
    loadingSchools: "Loading schools...",
    noSchools: "No schools found",
    schoolLockedMvp: "School cannot be changed in MVP",
    tapToExpandMap: "Tap to expand map",
    locationMapTitle: "Home Location",
    close: "Close",
    fieldUpdateLimitTitle: "Update limit",
    phoneUpdateBlocked: "Phone can be updated once every 3 months.",
    emailUpdateBlocked: "Email can be updated once every 3 months.",
    nextUpdateOn: "Next update on",
    editableAfter: "Editable after",
  },
  ar: {
    title: "الملف الشخصي",
    subtitle: "معلوماتك الشخصية",
    personalInfo: "المعلومات الشخصية",
    fullname: "الاسم الكامل",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    school: "المدرسة",
    homeLocation: "موقع المنزل",
    edit: "تعديل",
    save: "حفظ",
    cancel: "إلغاء",
    logout: "تسجيل الخروج",
    logoutConfirm: "هل أنت متأكد من تسجيل الخروج؟",
    logoutConfirmTitle: "تسجيل الخروج",
    yes: "نعم",
    no: "لا",
    saving: "جاري الحفظ...",
    saved: "تم تحديث الملف الشخصي بنجاح",
    error: "خطأ",
    errorMessage: "فشل تحديث الملف الشخصي",
    ok: "حسناً",
    loading: "جاري التحميل...",
    locationPreview: "معاينة الموقع",
    latitude: "خط العرض",
    longitude: "خط الطول",
    locationUnavailable: "موقع المنزل غير متوفر",
    selectSchool: "اختر المدرسة",
    searchSchool: "ابحث عن مدرسة...",
    loadingSchools: "جاري تحميل المدارس...",
    noSchools: "لا توجد مدارس",
    schoolLockedMvp: "لا يمكن تغيير المدرسة في نسخة MVP",
    tapToExpandMap: "اضغط لتكبير الخريطة",
    locationMapTitle: "موقع المنزل",
    close: "إغلاق",
    fieldUpdateLimitTitle: "حد التعديل",
    phoneUpdateBlocked: "يمكن تعديل الهاتف مرة واحدة كل 3 أشهر.",
    emailUpdateBlocked: "يمكن تعديل البريد الإلكتروني مرة واحدة كل 3 أشهر.",
    nextUpdateOn: "يمكن التعديل في",
    editableAfter: "متاح بعد",
  },
};

const LOCK_WINDOW_DAYS = 90;
const buildProfileLockStorageKey = (studentId) =>
  `profile_update_locks_${studentId}`;
const toDateOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const addDays = (date, days) => new Date(date.getTime() + days * 86400000);
const formatLockDate = (date, language = "en") =>
  date
    ? date.toLocaleDateString(language === "ar" ? "ar-MA" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "--";

const ProfileScreen = ({
  studentId,
  isDemo = false,
  language = "en",
  onLogout,
}) => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullname: "",
    phone: "",
    email: "",
    school: "",
  });
  const [updateLocks, setUpdateLocks] = useState({
    phoneUpdatedAt: null,
    emailUpdatedAt: null,
  });
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  const t = translations[language];
  const hasValidHomeLocation =
    Number.isFinite(student?.home_location?.latitude) &&
    Number.isFinite(student?.home_location?.longitude);
  const phoneLockDate = toDateOrNull(updateLocks.phoneUpdatedAt);
  const emailLockDate = toDateOrNull(updateLocks.emailUpdatedAt);
  const phoneEditableAfter = phoneLockDate
    ? addDays(phoneLockDate, LOCK_WINDOW_DAYS)
    : null;
  const emailEditableAfter = emailLockDate
    ? addDays(emailLockDate, LOCK_WINDOW_DAYS)
    : null;
  const canEditPhone =
    !phoneEditableAfter || new Date().getTime() >= phoneEditableAfter.getTime();
  const canEditEmail =
    !emailEditableAfter || new Date().getTime() >= emailEditableAfter.getTime();

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
        school: DEMO_STUDENT.school || "",
      });
      setLoading(false);
    }
  }, [studentId, isDemo]);

  useEffect(() => {
    let active = true;
    const loadLocks = async () => {
      if (!studentId) return;
      try {
        const raw = await AsyncStorage.getItem(
          buildProfileLockStorageKey(studentId),
        );
        if (!active || !raw) return;
        const parsed = JSON.parse(raw);
        setUpdateLocks({
          phoneUpdatedAt: parsed?.phoneUpdatedAt || null,
          emailUpdatedAt: parsed?.emailUpdatedAt || null,
        });
      } catch (_error) {
        // Ignore local storage failures in MVP mode.
      }
    };
    loadLocks();
    return () => {
      active = false;
    };
  }, [studentId]);

  const loadStudent = async () => {
    if (!studentId) return;

    try {
      setLoading(true);
      const { data, error } = await getStudentById(studentId);

      if (error) {
        console.error("Error loading student:", error);
        Alert.alert(t.error, t.errorMessage, [{ text: t.ok }]);
      } else if (data) {
        setStudent(data);
        setFormData({
          fullname: data.fullname || "",
          phone: data.phone || "",
          email: data.email || "",
          school: data.school_id || data.school || "",
        });
      }
    } catch (err) {
      console.error("Exception loading student:", err);
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
        fullname: student.fullname || "",
        phone: student.phone || "",
        email: student.email || "",
        school: student.school || "",
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
      const nextPhone = (formData.phone || "").trim();
      const nextEmail = (formData.email || "").trim();
      const phoneChanged = nextPhone !== (student?.phone || "");
      const emailChanged = nextEmail !== (student?.email || "");

      if (phoneChanged && !canEditPhone) {
        Alert.alert(
          t.fieldUpdateLimitTitle,
          `${t.phoneUpdateBlocked}\n${t.nextUpdateOn}: ${formatLockDate(phoneEditableAfter, language)}`,
          [{ text: t.ok }],
        );
        return;
      }

      if (emailChanged && !canEditEmail) {
        Alert.alert(
          t.fieldUpdateLimitTitle,
          `${t.emailUpdateBlocked}\n${t.nextUpdateOn}: ${formatLockDate(emailEditableAfter, language)}`,
          [{ text: t.ok }],
        );
        return;
      }

      const nowIso = new Date().toISOString();
      const { data, error } = await updateStudent(studentId, {
        fullname: formData.fullname,
        phone: nextPhone,
        email: nextEmail,
      });

      if (error) {
        console.error("Error updating student:", error);
        Alert.alert(t.error, t.errorMessage, [{ text: t.ok }]);
      } else {
        const nextLocks = {
          phoneUpdatedAt: phoneChanged ? nowIso : updateLocks.phoneUpdatedAt,
          emailUpdatedAt: emailChanged ? nowIso : updateLocks.emailUpdatedAt,
        };
        setUpdateLocks(nextLocks);
        try {
          await AsyncStorage.setItem(
            buildProfileLockStorageKey(studentId),
            JSON.stringify(nextLocks),
          );
        } catch (_error) {
          // Ignore local storage failures in MVP mode.
        }
        setStudent(data);
        setEditing(false);
        Alert.alert(t.saved, "", [{ text: t.ok }]);
      }
    } catch (err) {
      console.error("Exception updating student:", err);
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
        { text: t.no, style: "cancel" },
        {
          text: t.yes,
          style: "destructive",
          onPress: () => {
            if (onLogout) {
              onLogout();
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3185FC" />
          <Text style={styles.loadingText}>{t.loading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!student) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <StatusBar style="dark" />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{t.errorMessage}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Personal Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              style={[styles.sectionTitle, language === "ar" && styles.rtl]}
            >
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
              <Text style={[styles.infoLabel, language === "ar" && styles.rtl]}>
                {t.fullname}
              </Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={formData.fullname}
                  onChangeText={(text) =>
                    setFormData({ ...formData, fullname: text })
                  }
                  placeholder={t.fullname}
                />
              ) : (
                <Text
                  style={[styles.infoValue, language === "ar" && styles.rtl]}
                >
                  {student.fullname || "--"}
                </Text>
              )}
            </View>

            {/* Email */}
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, language === "ar" && styles.rtl]}>
                {t.email}
              </Text>
              {editing ? (
                <>
                  <TextInput
                    style={[
                      styles.input,
                      !canEditEmail && styles.inputDisabled,
                    ]}
                    value={formData.email}
                    onChangeText={(text) =>
                      setFormData({ ...formData, email: text })
                    }
                    placeholder={t.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={canEditEmail}
                  />
                  {!canEditEmail && (
                    <Text style={styles.lockHint}>
                      {t.editableAfter}:{" "}
                      {formatLockDate(emailEditableAfter, language)}
                    </Text>
                  )}
                </>
              ) : (
                <Text
                  style={[styles.infoValue, language === "ar" && styles.rtl]}
                >
                  {student.email || "--"}
                </Text>
              )}
            </View>

            {/* Phone */}
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, language === "ar" && styles.rtl]}>
                {t.phone}
              </Text>
              {editing ? (
                <>
                  <TextInput
                    style={[
                      styles.input,
                      !canEditPhone && styles.inputDisabled,
                    ]}
                    value={formData.phone}
                    onChangeText={(text) =>
                      setFormData({ ...formData, phone: text })
                    }
                    placeholder={t.phone}
                    keyboardType="phone-pad"
                    editable={canEditPhone}
                  />
                  {!canEditPhone && (
                    <Text style={styles.lockHint}>
                      {t.editableAfter}:{" "}
                      {formatLockDate(phoneEditableAfter, language)}
                    </Text>
                  )}
                </>
              ) : (
                <Text
                  style={[styles.infoValue, language === "ar" && styles.rtl]}
                >
                  {student.phone || "--"}
                </Text>
              )}
            </View>

            {/* School - Prominently displayed */}
            <View style={styles.schoolRow}>
              <View style={styles.schoolIconContainer}>
                <MaterialIcons name="school" size={24} color="#3185FC" />
              </View>
              <View style={styles.schoolInfo}>
                <Text
                  style={[styles.schoolLabel, language === "ar" && styles.rtl]}
                >
                  {t.school}
                </Text>
                {editing ? (
                  <View style={styles.schoolLockedWrap}>
                    <Text
                      style={[
                        styles.schoolValue,
                        language === "ar" && styles.rtl,
                      ]}
                    >
                      {student.school || "--"}
                    </Text>
                    <Text
                      style={[styles.lockHint, language === "ar" && styles.rtl]}
                    >
                      {t.schoolLockedMvp}
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.schoolValue,
                      language === "ar" && styles.rtl,
                    ]}
                  >
                    {student.school || "--"}
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
            <Text
              style={[styles.sectionTitle, language === "ar" && styles.rtl]}
            >
              {t.homeLocation}
            </Text>
            <View style={styles.mapContainer}>
              <TouchableOpacity
                style={styles.locationMapTap}
                activeOpacity={0.85}
                onPress={() =>
                  hasValidHomeLocation && setLocationModalVisible(true)
                }
                disabled={!hasValidHomeLocation}
              >
                {hasValidHomeLocation ? (
                  <MapboxRoutePreview
                    style={styles.map}
                    homeLocation={{
                      latitude: student.home_location.latitude,
                      longitude: student.home_location.longitude,
                    }}
                    destinationLocation={null}
                    routeCoordinates={[]}
                    showRoute={false}
                    interactive={false}
                    focusOnStudent
                    studentLabel={t.homeLocation}
                  />
                ) : (
                  <View style={styles.mapFallback}>
                    <MaterialIcons name="map" size={22} color="#94A3B8" />
                    <Text style={styles.mapFallbackText}>
                      {t.locationUnavailable}
                    </Text>
                  </View>
                )}
                {hasValidHomeLocation && (
                  <View style={styles.mapTapHint}>
                    <MaterialIcons
                      name="fullscreen"
                      size={14}
                      color="#1D4ED8"
                    />
                    <Text style={styles.mapTapHintText}>
                      {t.tapToExpandMap}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.locationDetails}>
              <View style={styles.locationDetailItem}>
                <MaterialIcons name="place" size={16} color="#6B7280" />
                <Text style={styles.locationDetailText}>
                  {student.home_location.latitude?.toFixed(6) || "--"},{" "}
                  {student.home_location.longitude?.toFixed(6) || "--"}
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

      <Modal
        visible={locationModalVisible}
        animationType="slide"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <SafeAreaView
          style={styles.locationModalRoot}
          edges={["top", "left", "right"]}
        >
          <View style={styles.locationModalHeader}>
            <Text
              style={[
                styles.locationModalTitle,
                language === "ar" && styles.rtl,
              ]}
            >
              {t.locationMapTitle}
            </Text>
            <TouchableOpacity
              style={styles.locationCloseBtn}
              onPress={() => setLocationModalVisible(false)}
            >
              <Text style={styles.locationCloseText}>{t.close}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.locationModalMapWrap}>
            {hasValidHomeLocation ? (
              <MapboxRoutePreview
                style={styles.locationModalMap}
                homeLocation={{
                  latitude: student.home_location.latitude,
                  longitude: student.home_location.longitude,
                }}
                destinationLocation={null}
                routeCoordinates={[]}
                showRoute={false}
                interactive
                focusOnStudent
                studentLabel={t.homeLocation}
              />
            ) : (
              <View style={styles.mapFallback}>
                <MaterialIcons name="map" size={22} color="#94A3B8" />
                <Text style={styles.mapFallbackText}>
                  {t.locationUnavailable}
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    marginTop: 16,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  rtl: {
    textAlign: "right",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0F7FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "700",
  },
  infoContainer: {
    gap: 20,
  },
  infoRow: {
    gap: 6,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: "#0F172A",
    fontWeight: "600",
  },
  schoolRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginTop: 8,
  },
  schoolIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  schoolInfo: {
    flex: 1,
  },
  schoolLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
  },
  schoolValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#3B82F6",
  },
  schoolLockedWrap: {
    gap: 4,
  },
  input: {
    fontSize: 16,
    color: "#0F172A",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#F8FAFC",
    fontWeight: "600",
  },
  inputDisabled: {
    opacity: 0.55,
  },
  lockHint: {
    marginTop: 4,
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "600",
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F1F5F9",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#64748B",
  },
  saveButton: {
    backgroundColor: "#3B82F6",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  mapContainer: {
    height: 180,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    gap: 6,
  },
  mapFallbackText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  locationMapTap: {
    flex: 1,
    position: "relative",
  },
  mapTapHint: {
    position: "absolute",
    right: 8,
    top: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mapTapHintText: {
    color: "#1D4ED8",
    fontSize: 10,
    fontWeight: "700",
  },
  locationDetails: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
  },
  locationDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationDetailText: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    padding: 18,
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#EF4444",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  locationModalRoot: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  locationModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  locationModalTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "800",
  },
  locationCloseBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  locationCloseText: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "700",
  },
  locationModalMapWrap: {
    flex: 1,
  },
  locationModalMap: {
    flex: 1,
  },
});

export default ProfileScreen;
