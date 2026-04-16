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
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { UbuntuFonts } from "../../shared/utils/fonts";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

const translations = {
  en: {
    title: "Driver Profile",
    subtitle: "Manage your account and vehicle",
    personalInfo: "Personal Details",
    busInfo: "Vehicle Details",
    fullname: "Full Name",
    email: "Email Address",
    phone: "Phone Number",
    licenseNumber: "License Number",
    busPlate: "Plate Number",
    busCapacity: "Seat Capacity",
    busModel: "Car Model",
    driver: "Driver",
    edit: "Edit Profile",
    save: "Save Changes",
    cancel: "Discard",
    logout: "Sign Out",
    logoutConfirm: "Are you sure you want to sign out of your account?",
    logoutConfirmTitle: "Logout",
    yes: "Yes, Logout",
    no: "Cancel",
    saving: "Saving...",
    saved: "Profile updated successfully",
    error: "Sync Error",
    errorMessage: "Unable to update profile data",
    ok: "Dismiss",
    loading: "Preparing Profile...",
    verified: "Verified Driver",
    notVerified: "Pending Sync",
    rejected: "Action Required",
    seats: "Seats",
  },
  ar: {
    title: "الملف الشخصي",
    subtitle: "إدارة حسابك ومركبتك",
    personalInfo: "التفاصيل الشخصية",
    busInfo: "تفاصيل المركبة",
    fullname: "الاسم الكامل",
    email: "البريد الإلكتروني",
    phone: "رقم الهاتف",
    licenseNumber: "رقم الرخصة",
    busPlate: "رقم اللوحة",
    busCapacity: "عدد المقاعد",
    busModel: "طراز السيارة",
    driver: "سائق",
    edit: "تعديل الملف",
    save: "حفظ التغييرات",
    cancel: "إلغاء",
    logout: "تسجيل الخروج",
    logoutConfirm: "هل أنت متأكد من تسجيل الخروج من حسابك؟",
    logoutConfirmTitle: "تسجيل الخروج",
    yes: "نعم، خروج",
    no: "إلغاء",
    saving: "جاري الحفظ...",
    saved: "تم تحديث الملف الشخصي",
    error: "خطأ في المزامنة",
    errorMessage: "تعذر تحديث بيانات الملف الشخصي",
    ok: "موافق",
    loading: "جاري التحميل...",
    verified: "سائق موثق",
    notVerified: "قيد المزامنة",
    rejected: "مرفوض",
    seats: "مقاعد",
  },
};


const InfoItem = ({ label, value, icon, editing, onChangeText, keyboardType, autoCapitalize, placeholder, isRTL }) => (
  <View style={[styles.infoItemRow, isRTL && styles.rtlRow]}>
    <View style={styles.infoIconWrapper}>
      <MaterialIcons name={icon} size={20} color="#3185FC" />
    </View>
    <View style={styles.infoTextWrapper}>
      <Text style={[styles.infoItemLabel, isRTL && styles.rtlText]}>{label}</Text>
      {editing ? (
        <TextInput
          style={[styles.infoItemInput, isRTL && styles.rtlText]}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
        />
      ) : (
        <Text style={[styles.infoItemValue, isRTL && styles.rtlText]}>{value || "--"}</Text>
      )}
    </View>
  </View>
);

const DriverProfileScreen = ({
  driverId,
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
  const displayName = formData.name || driver?.fullname || "--";
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
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", driverId)
        .single();

      if (error) throw error;

      if (data) {
        setDriver(data);
        const loc = data.location || {};
        setFormData({
          name: data.fullname || "",
          phone: loc.phone_number || "",
          email: data.email || "",
          license_number: data.permis_url || "", // Using permis_url as license placeholder if needed
          bus_plate: loc.car_plate_number || "",
          bus_capacity: loc.seat_capacity?.toString() || "",
          bus_model: loc.car_type || "",
        });
      }
    } catch (error) {
      console.error("Error loading driver data:", error);
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
      if (!formData.name.trim()) {
        Alert.alert(t.error, "Name cannot be empty");
        return;
      }

      setSaving(true);
      
      const updateData = {
        fullname: formData.name,
        email: formData.email,
        location: {
          ...driver.location,
          phone_number: formData.phone,
          car_plate_number: formData.bus_plate,
          car_type: formData.bus_model,
          seat_capacity: parseInt(formData.bus_capacity, 10) || 0,
        }
      };

      const { error } = await supabase
        .from("drivers")
        .update(updateData)
        .eq("id", driverId);

      if (error) throw error;

      setDriver({ ...driver, ...updateData });
      Alert.alert(t.saved, "", [{ text: t.ok }]);
      setEditing(false);
    } catch (error) {
      console.error("Save error:", error);
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

  const getStatusConfig = (status) => {
    switch (status) {
      case "APPROVED":
        return { label: t.verified, color: "#10B981", icon: "verified" };
      case "REJECTED":
        return { label: t.rejected, color: "#EF4444", icon: "error" };
      default:
        return { label: t.notVerified, color: "#F59E0B", icon: "pending" };
    }
  };

  const status = getStatusConfig(driver?.status);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3185FC" />
        <Text style={styles.loadingText}>{t.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Dynamic Header */}
      <LinearGradient
        colors={["#FFFFFF", "#F8FAFF"]}
        style={styles.header}
      >
        <View style={[styles.headerNav, isRTL && styles.rtlRow]}>
          <TouchableOpacity onPress={onBack} style={styles.headerIconBtn}>
            <MaterialIcons name={isRTL ? "arrow-forward" : "arrow-back"} size={26} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isRTL && styles.rtlText]}>{t.title}</Text>
          <TouchableOpacity 
            onPress={() => setEditing(!editing)} 
            style={styles.headerIconBtn}
          >
            <MaterialIcons name={editing ? "close" : "edit"} size={22} color={editing ? "#EF4444" : "#3185FC"} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileHero}>
           <View style={styles.avatarBorder}>
             <View style={styles.avatar}>
               <Text style={styles.avatarText}>{initials || "D"}</Text>
             </View>
             <TouchableOpacity style={styles.cameraBtn}>
               <MaterialIcons name="camera-alt" size={16} color="#FFFFFF" />
             </TouchableOpacity>
           </View>
           
           <Text style={styles.profileName}>{displayName}</Text>
           
           <View style={[styles.statusBadge, { backgroundColor: status.color + "15" }]}>
             <MaterialIcons name={status.icon} size={14} color={status.color} />
             <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
           </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentScroll}
        showsVerticalScrollIndicator={false}
      >

        {/* Section: Vehicle */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{t.busInfo}</Text>
          </View>
          <View style={styles.card}>
            <InfoItem
              label={t.busModel}
              value={formData.bus_model}
              icon="directions-car"
              editing={editing}
              onChangeText={(v) => handleInputChange("bus_model", v)}
              placeholder="e.g. Mercedes Sprinter"
              isRTL={isRTL}
            />
            <View style={styles.cardDivider} />
            <InfoItem
              label={t.busPlate}
              value={formData.bus_plate}
              icon="pin"
              editing={editing}
              onChangeText={(v) => handleInputChange("bus_plate", v)}
              placeholder="ABC-1234"
              autoCapitalize="characters"
              isRTL={isRTL}
            />
            <View style={styles.cardDivider} />
            <InfoItem
              label={t.busCapacity}
              value={editing ? formData.bus_capacity : `${formData.bus_capacity} ${t.seats}`}
              icon="people"
              editing={editing}
              onChangeText={(v) => handleInputChange("bus_capacity", v)}
              placeholder="50"
              keyboardType="numeric"
              isRTL={isRTL}
            />
          </View>
        </View>

        {/* Section: Account */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, isRTL && styles.rtlRow]}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>{t.personalInfo}</Text>
          </View>
          <View style={styles.card}>
            <InfoItem
              label={t.fullname}
              value={formData.name}
              icon="person"
              editing={editing}
              onChangeText={(v) => handleInputChange("name", v)}
              isRTL={isRTL}
            />
            <View style={styles.cardDivider} />
            <InfoItem
              label={t.phone}
              value={formData.phone}
              icon="phone"
              editing={editing}
              onChangeText={(v) => handleInputChange("phone", v)}
              keyboardType="phone-pad"
              isRTL={isRTL}
            />
            <View style={styles.cardDivider} />
            <InfoItem
              label={t.email}
              value={formData.email}
              icon="email"
              editing={editing}
              onChangeText={(v) => handleInputChange("email", v)}
              keyboardType="email-address"
              autoCapitalize="none"
              isRTL={isRTL}
            />
          </View>
        </View>

        {editing ? (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.btn, styles.btnOutline]} 
              onPress={() => {
                setEditing(false);
                loadDriverData(); // Reset
              }}
            >
              <Text style={styles.btnOutlineText}>{t.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.btn, styles.btnPrimary]} 
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.btnPrimaryText}>{t.save}</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.logoutBtn} 
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.logoutIconCircle}>
              <MaterialIcons name="logout" size={20} color="#EF4444" />
            </View>
            <Text style={[styles.logoutText, isRTL && styles.rtlText]}>{t.logout}</Text>
            <MaterialIcons name={isRTL ? "chevron-left" : "chevron-right"} size={24} color="#CBD5E1" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#64748B",
    fontFamily: UbuntuFonts.medium,
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 25,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#3185FC",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 5,
    backgroundColor: "#FFFFFF",
  },
  headerNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: UbuntuFonts.bold,
    color: "#1A1A1A",
  },
  profileHero: {
    alignItems: "center",
  },
  avatarBorder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    backgroundColor: "#3185FC",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3185FC",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 36,
    color: "#FFFFFF",
    fontFamily: UbuntuFonts.bold,
  },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3185FC",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  profileName: {
    fontSize: 24,
    fontFamily: UbuntuFonts.bold,
    color: "#1A1A1A",
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontFamily: UbuntuFonts.bold,
    textTransform: "uppercase",
  },
  content: {
    flex: 1,
  },
  contentScroll: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 30,
    marginHorizontal: 20,
  },
  sectionHeader: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: UbuntuFonts.bold,
    color: "#1A1A1A",
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 15,
    marginLeft: 44,
  },
  infoItemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoTextWrapper: {
    flex: 1,
  },
  infoItemLabel: {
    fontSize: 12,
    fontFamily: UbuntuFonts.medium,
    color: "#94A3B8",
    marginBottom: 4,
  },
  infoItemValue: {
    fontSize: 15,
    fontFamily: UbuntuFonts.bold,
    color: "#1A1A1A",
  },
  infoItemInput: {
    fontSize: 15,
    fontFamily: UbuntuFonts.bold,
    color: "#3185FC",
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#3185FC33",
  },
  actionRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 40,
    gap: 12,
  },
  btn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  btnPrimary: {
    backgroundColor: "#3185FC",
    shadowColor: "#3185FC",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontFamily: UbuntuFonts.bold,
    color: "#FFFFFF",
  },
  btnOutline: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  btnOutlineText: {
    fontSize: 16,
    fontFamily: UbuntuFonts.bold,
    color: "#64748B",
  },
  logoutBtn: {
    marginHorizontal: 20,
    marginTop: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  logoutIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  logoutText: {
    flex: 1,
    fontSize: 16,
    fontFamily: UbuntuFonts.bold,
    color: "#EF4444",
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
  rtlText: {
    textAlign: "right",
  },
});

export default DriverProfileScreen;

