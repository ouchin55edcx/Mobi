import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { UbuntuFonts } from "../../shared/utils/fonts";

const translations = {
  en: {
    title: 'Choose Your Role',
    subtitle: 'Select the profile that fits your needs to get started.',
    driver: 'Driver',
    driverDescription: 'Share your rides, help students, and earn rewards.',
    student: 'Student',
    studentDescription: 'Find safe, reliable, and affordable campus rides.',
    continue: 'Continue',
    languageName: "English",
    languageFlag: "🇬🇧",
  },
  ar: {
    title: 'اختر دورك',
    subtitle: 'اختر الملف الشخصي الذي يناسب احتياجاتك للبدء.',
    driver: 'سائق',
    driverDescription: 'شارك رحلاتك، ساعد الطلاب، واكسب المكافآت.',
    student: 'طالب',
    studentDescription: 'ابحث عن رحلات جامعية آمنة وموثوقة وبأسعار معقولة.',
    continue: 'متابعة',
    languageName: "العربية",
    languageFlag: "🇲🇦",
  },
};

const SelectRoleScreen = ({ language = 'en', onBack, onRoleSelect, onLanguageChange }) => {
  const [selectedRole, setSelectedRole] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const t = translations[language];

  const roles = [
    {
      id: 'student',
      title: t.student,
      description: t.studentDescription,
      icon: 'school-outline',
      iconFamily: 'MaterialCommunityIcons',
      color: '#3185FC',
      bg: '#F8FAFF',
    },
    {
      id: 'driver',
      title: t.driver,
      description: t.driverDescription,
      icon: 'car-outline',
      iconFamily: 'MaterialCommunityIcons',
      color: '#10B981',
      bg: '#F0FDF4',
    },
  ];

  const handleContinue = () => {
    if (selectedRole && onRoleSelect) {
      onRoleSelect(selectedRole);
    }
  };

  const RoleCard = ({ role }) => {
    const isSelected = selectedRole === role.id;
    return (
      <TouchableOpacity
        key={role.id}
        style={[
          styles.roleCard,
          isSelected && { borderColor: role.color, backgroundColor: role.bg },
          isSelected && styles.roleCardActive
        ]}
        onPress={() => setSelectedRole(role.id)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconBox, { backgroundColor: isSelected ? role.color : '#F1F5F9' }]}>
          {role.iconFamily === 'MaterialCommunityIcons' ? (
            <MaterialCommunityIcons
              name={role.icon}
              size={32}
              color={isSelected ? '#FFFFFF' : '#64748B'}
            />
          ) : (
            <MaterialIcons
              name={role.icon}
              size={32}
              color={isSelected ? '#FFFFFF' : '#64748B'}
            />
          )}
        </View>
        <View style={styles.roleInfo}>
          <Text style={[
            styles.roleTitle,
            isSelected && { color: role.color },
            language === 'ar' && styles.rtlText
          ]}>
            {role.title}
          </Text>
          <Text style={[
            styles.roleDescription,
            language === 'ar' && styles.rtlText
          ]}>
            {role.description}
          </Text>
        </View>
        <View style={[
          styles.radioButton,
          isSelected && { borderColor: role.color }
        ]}>
          {isSelected && <View style={[styles.radioButtonInner, { backgroundColor: role.color }]} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={styles.navHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back-ios" size={20} color="#1A1A1A" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.languagePill}
          onPress={() => onLanguageChange && onLanguageChange(language === "en" ? "ar" : "en")}
          activeOpacity={0.8}
        >
          <Text style={styles.languagePillText}>
            {language === "en" ? "العربية" : "English"}
          </Text>
          <Text style={styles.languagePillFlag}>
            {language === "en" ? "🇲🇦" : "🇬🇧"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.titleSection}>
            <Text style={[styles.title, language === 'ar' && styles.rtlText]}>
              {t.title}
            </Text>
            <Text style={[styles.subtitle, language === 'ar' && styles.rtlText]}>
              {t.subtitle}
            </Text>
          </View>

          <View style={styles.rolesContainer}>
            {roles.map((role) => <RoleCard key={role.id} role={role} />)}
          </View>

          <TouchableOpacity
            style={[
              styles.continueButton,
              !selectedRole && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!selectedRole}
            activeOpacity={0.9}
          >
            <Text style={styles.continueButtonText}>{t.continue}</Text>
            <MaterialIcons
              name="arrow-forward"
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  languagePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  languagePillText: {
    fontSize: 13,
    color: "#475569",
    fontFamily: UbuntuFonts.medium,
  },
  languagePillFlag: {
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 40,
    marginTop: 10,
  },
  title: {
    fontSize: 34,
    color: "#1A1A1A",
    fontFamily: UbuntuFonts.bold,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    fontFamily: UbuntuFonts.regular,
    lineHeight: 24,
  },
  rolesContainer: {
    gap: 20,
    marginBottom: 40,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#EBF2FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  roleCardActive: {
    shadowColor: "#3185FC",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 4,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 20,
    color: '#1A1A1A',
    fontFamily: UbuntuFonts.bold,
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: UbuntuFonts.regular,
    lineHeight: 20,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  continueButton: {
    backgroundColor: '#3185FC',
    borderRadius: 18,
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#3185FC",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: UbuntuFonts.bold,
  },
  rtlText: {
    textAlign: 'right',
  },
});

export default SelectRoleScreen;


