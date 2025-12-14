import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { UbuntuFonts } from '../src/utils/fonts';

const translations = {
  en: {
    tagline: 'Your mobile companion',
    register: 'Create Account',
    login: 'Login',
    skip: 'Skip Now',
    language: 'Language',
  },
  ar: {
    tagline: 'رفيقك المحمول',
    register: 'إنشاء حساب',
    login: 'تسجيل الدخول',
    skip: 'تخطي الآن',
    language: 'اللغة',
  },
};

const WelcomeScreen = ({
  language: propLanguage,
  onLanguageChange,
  onLogin,
  onRegister,
  onSkip,
}) => {
  const [language, setLanguage] = useState(propLanguage || 'ar');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  const t = translations[language];

  // Sync with parent language state
  useEffect(() => {
    if (propLanguage !== undefined && propLanguage !== language) {
      setLanguage(propLanguage);
    }
  }, [propLanguage]);

  const languages = [
    { code: 'en', icon: '🇬🇧' },
    { code: 'ar', icon: '🇲🇦' },
  ];

  const currentLanguage = languages.find((lang) => lang.code === language);

  const handleRegister = () => {
    if (onRegister) {
      onRegister();
    }
  };

  const handleLogin = () => {
    if (onLogin) {
      onLogin();
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  const selectLanguage = (langCode) => {
    setLanguage(langCode);
    setShowLanguageDropdown(false);
    if (onLanguageChange) {
      onLanguageChange(langCode);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      
      {/* Decorative Circles */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />

      {/* Language Switcher - Hidden but accessible */}
      <View style={styles.languageContainer}>
        <TouchableOpacity
          style={styles.languageSelect}
          onPress={() => setShowLanguageDropdown(true)}
          activeOpacity={0.7}
        >
          <View style={styles.languageSelectContent}>
            <Text style={styles.languageIcon}>{currentLanguage?.icon}</Text>
            <MaterialIcons
              name="keyboard-arrow-down"
              size={20}
              color="#FFFFFF"
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Language Dropdown Modal */}
      <Modal
        visible={showLanguageDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.dropdownOption,
                  language === lang.code && styles.dropdownOptionActive,
                ]}
                onPress={() => selectLanguage(lang.code)}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownIcon}>{lang.icon}</Text>
                {language === lang.code && (
                  <MaterialIcons
                    name="check"
                    size={20}
                    color="#3185FC"
                    style={styles.checkIcon}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>Mobi</Text>
          <Text style={[styles.tagline, language === 'ar' && styles.rtl]}>
            {t.tagline}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.loginButton]}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>{t.login}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.registerButton]}
            onPress={handleRegister}
            activeOpacity={0.8}
          >
            <Text style={styles.registerButtonText}>{t.register}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>{t.skip}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3185FC',
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -150,
    right: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 10,
    zIndex: 10,
  },
  languageSelect: {
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: 60,
  },
  languageSelectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    gap: 8,
  },
  languageIcon: {
    fontSize: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 60 : 80,
    paddingRight: 20,
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    position: 'relative',
  },
  dropdownOptionActive: {
    backgroundColor: '#F0F7FF',
  },
  dropdownIcon: {
    fontSize: 32,
  },
  checkIcon: {
    position: 'absolute',
    right: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  logo: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: UbuntuFonts.bold,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: UbuntuFonts.regular,
    opacity: 0.95,
  },
  rtl: {
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  button: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 14,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  loginButton: {
    backgroundColor: '#FFFFFF',
  },
  loginButtonText: {
    color: '#1E3A8A',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: UbuntuFonts.semiBold,
  },
  registerButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: UbuntuFonts.semiBold,
  },
  skipButton: {
    marginTop: 8,
    paddingVertical: 12,
  },
  skipButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: UbuntuFonts.medium,
  },
});

export default WelcomeScreen;

