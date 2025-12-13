import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';

const translations = {
  en: {
    title: 'Select Your Role',
    subtitle: 'Choose the role that best describes you',
    driver: 'Driver',
    driverDescription: 'Offer rides and earn money',
    student: 'Student',
    studentDescription: 'Find rides and save money',
    continue: 'Continue',
  },
  ar: {
    title: 'اختر دورك',
    subtitle: 'اختر الدور الذي يصفك بشكل أفضل',
    driver: 'سائق',
    driverDescription: 'قدم الرحلات واكسب المال',
    student: 'طالب',
    studentDescription: 'ابحث عن الرحلات ووفر المال',
    continue: 'متابعة',
  },
};

const SelectRoleScreen = ({ language = 'en', onBack, onRoleSelect }) => {
  const [selectedRole, setSelectedRole] = useState(null);

  const t = translations[language];

  const roles = [
    {
      id: 'driver',
      title: t.driver,
      description: t.driverDescription,
      icon: 'directions-car',
      color: '#3185FC',
      gradient: ['#3185FC', '#2563EB'],
    },
    {
      id: 'student',
      title: t.student,
      description: t.studentDescription,
      icon: 'school',
      color: '#10B981',
      gradient: ['#10B981', '#059669'],
    },
  ];

  const handleContinue = () => {
    if (selectedRole && onRoleSelect) {
      onRoleSelect(selectedRole);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>

        {/* Language Switcher */}
        <View style={styles.languageContainer}>
          <TouchableOpacity
            style={styles.languageButton}
            activeOpacity={0.7}
          >
            <Text style={styles.languageIcon}>
              {language === 'en' ? '🇬🇧' : '🇲🇦'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, language === 'ar' && styles.rtl]}>
            {t.title}
          </Text>
          <Text style={[styles.subtitle, language === 'ar' && styles.rtl]}>
            {t.subtitle}
          </Text>
        </View>

        {/* Role Cards */}
        <View style={styles.rolesContainer}>
          {roles.map((role) => {
            const isSelected = selectedRole === role.id;
            return (
              <TouchableOpacity
                key={role.id}
                style={[
                  styles.roleCard,
                  isSelected && styles.roleCardSelected,
                ]}
                onPress={() => setSelectedRole(role.id)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.iconContainer,
                    isSelected && { backgroundColor: role.color },
                  ]}
                >
                  <MaterialIcons
                    name={role.icon}
                    size={48}
                    color={isSelected ? '#FFFFFF' : role.color}
                  />
                </View>
                <Text
                  style={[
                    styles.roleTitle,
                    isSelected && styles.roleTitleSelected,
                    language === 'ar' && styles.rtl,
                  ]}
                >
                  {role.title}
                </Text>
                <Text
                  style={[
                    styles.roleDescription,
                    language === 'ar' && styles.rtl,
                  ]}
                >
                  {role.description}
                </Text>
                {isSelected && (
                  <View style={styles.checkContainer}>
                    <View style={[styles.checkCircle, { backgroundColor: role.color }]}>
                      <MaterialIcons name="check" size={20} color="#FFFFFF" />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedRole && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedRole}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>{t.continue}</Text>
          <MaterialIcons
            name="arrow-forward"
            size={20}
            color="#FFFFFF"
            style={styles.continueIcon}
          />
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
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    marginTop: Platform.OS === 'ios' ? 10 : 20,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  languageButton: {
    padding: 8,
  },
  languageIcon: {
    fontSize: 24,
  },
  header: {
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
  },
  rtl: {
    textAlign: 'right',
  },
  rolesContainer: {
    flex: 1,
    gap: 20,
    marginBottom: 32,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 220,
    justifyContent: 'center',
  },
  roleCardSelected: {
    borderColor: '#3185FC',
    backgroundColor: '#F0F7FF',
    shadowColor: '#3185FC',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  roleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  roleTitleSelected: {
    color: '#3185FC',
  },
  roleDescription: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  checkContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3185FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButton: {
    backgroundColor: '#3185FC',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
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
  continueButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  continueIcon: {
    marginLeft: 8,
  },
});

export default SelectRoleScreen;

