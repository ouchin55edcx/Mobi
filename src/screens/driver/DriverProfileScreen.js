import React, { useState, useEffect } from "react";
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
  Vibration,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import Header from "../../shared/components/common/Header";
import DemoBadge from "../../shared/components/common/DemoBadge";

const translations = {
  en: {
    title: "Profile",
    subtitle: "Your driver information",
    personalInfo: "Contact & Information",
    busInfo: "Vehicle Information",
    fullname: "Full Name",
    email: "Email",
    phone: "Phone",
    licenseNumber: "License Number",
    busPlate: "Bus Plate Number",
    busCapacity: "Bus Capacity",
    busModel: "Bus Model",
    rating: "Rating",
    driver: "Driver",
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
  },
  ar: {
    title: "الملف الشخصي",
    subtitle: "معلومات السائق",
    personalInfo: "التواصل والمعلومات",
    busInfo: "معلومات المركبة",
    fullname: "الاسم الكامل",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    licenseNumber: "رقم الرخصة",
    busPlate: "رقم لوحة الحافلة",
    busCapacity: "سعة الحافلة",
    busModel: "طراز الحافلة",
    rating: "التقييم",
    driver: "سائق",
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
  },
};

const DEMO_DRIVER = {
  id: "demo-driver-id",
  name: "Mohamed Alami",
  email: "mohamed.alami@example.com",
  phone: "+212612345678",
  license_number: "DL-123456",
  rating: 4.8,
  bus: {
    plate_number: "12345-A-67",
    capacity: 50,
    model: "Mercedes Sprinter",
  },
};

const DriverProfileScreen = ({
  driverId,
  isDemo = false,
  language = "en",
  onLogout,
  onBack,
}) => {
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    license_number: "",
    bus_plate: "",
    bus_capacity: "",
    bus_model: "",
  });

  const t = translations[language];
  const isRTL = language === "ar";
  const displayName = formData.name || driver?.name || "--";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  useEffect(() => {
    loadDriverData();
  }, [driverId]);

  const loadDriverData = async () => {
    try {
      setLoading(true);

      if (isDemo) {
        await new Promise((resolve) => setTimeout(resolve, 500));
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
      console.error("Error loading driver:", error);
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
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setDriver((prev) => ({
          ...prev,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          license_number: formData.license_number,
          bus: {
            ...prev.bus,
            plate_number: formData.bus_plate,
            capacity: parseInt(formData.bus_capacity, 10),
            model: formData.bus_model,
          },
        }));
        Alert.alert(t.saved, "", [{ text: t.ok }]);
      } else {
        Alert.alert(t.saved, "", [{ text: t.ok }]);
      }

      setEditing(false);
    } catch (error) {
      console.error("Error saving driver:", error);
      Alert.alert(t.error, t.errorMessage, [{ text: t.ok }]);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS !== "web") {
      Vibration.vibrate(50);
    }
    Alert.alert(
      t.logoutConfirmTitle,
      t.logoutConfirm,
      [
        { text: t.no, style: "cancel" },
        {
          text: t.yes,
          style: "destructive",
          onPress: async () => {
            if (onLogout) {
              await onLogout();
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title={t.title} subtitle={t.subtitle} language={language} onBack={onBack} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0D6EFD" />
          <Text style={[styles.loadingText, isRTL && styles.rtl]}>{t.loading}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Header title={t.title} subtitle={t.subtitle} language={language} onBack={onBack} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isDemo && <DemoBadge />}

        <View style={styles.heroCard}>
          <View style={styles.heroTopAccent} />
          <View style={styles.heroMain}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || "D"}</Text>
            </View>

            <View style={styles.heroIdentity}>
              {editing ? (
                <TextInput
                  style={[styles.heroInput, isRTL && styles.rtl]}
                  value={formData.name}
                  onChangeText={(value) => handleInputChange("name", value)}
                  placeholder={t.fullname}
                />
              ) : (
                <Text style={[styles.heroName, isRTL && styles.rtl]}>{displayName}</Text>
              )}
              <Text style={[styles.heroRole, isRTL && styles.rtl]}>{t.driver}</Text>
              <View style={styles.ratingPill}>
                <MaterialIcons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>{(driver?.rating || DEMO_DRIVER.rating).toFixed(1)}</Text>
              </View>
            </View>

            {!editing && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setEditing(true)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="edit" size={18} color="#0D6EFD" />
                <Text style={[styles.editButtonText, isRTL && styles.rtl]}>{t.edit}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>{t.busInfo}</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.iconWrap}>
                <MaterialIcons name="directions-car" size={18} color="#0D6EFD" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, isRTL && styles.rtl]}>{t.busModel}</Text>
                {editing ? (
                  <TextInput
                    style={[styles.input, isRTL && styles.rtl]}
                    value={formData.bus_model}
                    onChangeText={(value) => handleInputChange("bus_model", value)}
                    placeholder={t.busModel}
                  />
                ) : (
                  <Text style={[styles.infoValue, isRTL && styles.rtl]}>{driver?.bus?.model || "--"}</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconWrap}>
                <MaterialIcons name="confirmation-number" size={18} color="#0D6EFD" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, isRTL && styles.rtl]}>{t.busPlate}</Text>
                {editing ? (
                  <TextInput
                    style={[styles.input, isRTL && styles.rtl]}
                    value={formData.bus_plate}
                    onChangeText={(value) => handleInputChange("bus_plate", value)}
                    placeholder={t.busPlate}
                  />
                ) : (
                  <Text style={[styles.infoValue, isRTL && styles.rtl]}>{driver?.bus?.plate_number || "--"}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>{t.personalInfo}</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.iconWrap}>
                <MaterialIcons name="phone" size={18} color="#0D6EFD" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, isRTL && styles.rtl]}>{t.phone}</Text>
                {editing ? (
                  <TextInput
                    style={[styles.input, isRTL && styles.rtl]}
                    value={formData.phone}
                    onChangeText={(value) => handleInputChange("phone", value)}
                    placeholder={t.phone}
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={[styles.infoValue, isRTL && styles.rtl]}>{driver?.phone || "--"}</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconWrap}>
                <MaterialIcons name="email" size={18} color="#0D6EFD" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, isRTL && styles.rtl]}>{t.email}</Text>
                {editing ? (
                  <TextInput
                    style={[styles.input, isRTL && styles.rtl]}
                    value={formData.email}
                    onChangeText={(value) => handleInputChange("email", value)}
                    placeholder={t.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                ) : (
                  <Text style={[styles.infoValue, isRTL && styles.rtl]}>{driver?.email || "--"}</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconWrap}>
                <MaterialIcons name="badge" size={18} color="#0D6EFD" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, isRTL && styles.rtl]}>{t.licenseNumber}</Text>
                {editing ? (
                  <TextInput
                    style={[styles.input, isRTL && styles.rtl]}
                    value={formData.license_number}
                    onChangeText={(value) => handleInputChange("license_number", value)}
                    placeholder={t.licenseNumber}
                  />
                ) : (
                  <Text style={[styles.infoValue, isRTL && styles.rtl]}>{driver?.license_number || "--"}</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconWrap}>
                <MaterialIcons name="people" size={18} color="#0D6EFD" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, isRTL && styles.rtl]}>{t.busCapacity}</Text>
                {editing ? (
                  <TextInput
                    style={[styles.input, isRTL && styles.rtl]}
                    value={formData.bus_capacity}
                    onChangeText={(value) => handleInputChange("bus_capacity", value)}
                    placeholder={t.busCapacity}
                    keyboardType="numeric"
                  />
                ) : (
                  <Text style={[styles.infoValue, isRTL && styles.rtl]}>
                    {driver?.bus?.capacity || "--"} {language === "ar" ? "مقعد" : "seats"}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {editing && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setEditing(false);
                setFormData({
                  name: driver?.name || "",
                  phone: driver?.phone || "",
                  email: driver?.email || "",
                  license_number: driver?.license_number || "",
                  bus_plate: driver?.bus?.plate_number || "",
                  bus_capacity: driver?.bus?.capacity?.toString() || "",
                  bus_model: driver?.bus?.model || "",
                });
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>{t.cancel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>{t.save}</Text>}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <MaterialIcons name="logout" size={20} color="#DC2626" />
          <Text style={[styles.logoutButtonText, isRTL && styles.rtl]}>{t.logout}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F8FF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 42,
    rowGap: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#475569",
    fontWeight: "500",
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#0A2540",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  heroTopAccent: {
    height: 56,
    backgroundColor: "#0D6EFD",
  },
  heroMain: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginTop: -24,
    columnGap: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EAF2FF",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0D6EFD",
  },
  heroIdentity: {
    flex: 1,
  },
  heroName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  heroInput: {
    fontSize: 21,
    fontWeight: "700",
    color: "#0F172A",
    borderBottomWidth: 1,
    borderBottomColor: "#BFDBFE",
    paddingVertical: 2,
  },
  heroRole: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
  },
  ratingPill: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#FFF8E8",
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B45309",
  },
  editButton: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#F5FAFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0D6EFD",
  },
  section: {
    rowGap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F3B73",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: "#0A2540",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#EEF2F7",
    marginLeft: 44,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    columnGap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF2FF",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  input: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    borderBottomWidth: 1,
    borderBottomColor: "#D8E2F0",
    paddingBottom: 3,
  },
  actionButtons: {
    flexDirection: "row",
    columnGap: 12,
    marginTop: 2,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#EEF2F7",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#475569",
  },
  saveButton: {
    backgroundColor: "#0D6EFD",
    shadowColor: "#0D6EFD",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  logoutButton: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 8,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#DC2626",
  },
  rtl: {
    textAlign: "right",
  },
});

export default DriverProfileScreen;
