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
    welcome: 'Welcome to Mobi',
    subtitle: 'Your journey starts here',
    register: 'Register',
    login: 'Login',
    demo: 'Try Demo',
    studentDemo: 'Student Demo',
    driverDemo: 'Driver Demo',
    language: 'Language',
  },
  ar: {
    welcome: 'مرحباً بك في موبي',
    subtitle: 'رحلتك تبدأ من هنا',
    register: 'تسجيل',
    login: 'تسجيل الدخول',
    demo: 'جرب العرض التوضيحي',
    studentDemo: 'عرض توضيحي للطالب',
    driverDemo: 'عرض توضيحي للسائق',
    language: 'اللغة',
  },
};

const WelcomeScreen = ({
  language: propLanguage,
  onLanguageChange,
  onLogin,
  onRegister,
  onDemo,
  onDriverDemo,
}) => {
  const [language, setLanguage] = useState(propLanguage || 'en');
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

  const handleDemo = () => {
    if (onDemo) {
      onDemo();
    }
  };

  const handleDriverDemo = () => {
    if (onDriverDemo) {
      onDriverDemo();
    }
  };

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
      
      {/* Language Switcher */}
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
              color="#666666"
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
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.welcomeText, language === 'ar' && styles.rtl]}>
            {t.welcome}
          </Text>
          <Text style={[styles.subtitleText, language === 'ar' && styles.rtl]}>
            {t.subtitle}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.registerButton]}
            onPress={handleRegister}
            activeOpacity={0.8}
          >
            <Text style={styles.registerButtonText}>{t.register}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.loginButton]}
            onPress={handleLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>{t.login}</Text>
          </TouchableOpacity>

          <View style={styles.demoContainer}>
            <TouchableOpacity
              style={styles.demoButton}
              onPress={handleDemo}
              activeOpacity={0.7}
            >
              <MaterialIcons name="school" size={20} color="#FFFFFF" style={styles.demoIcon} />
              <Text style={styles.demoButtonText}>{t.studentDemo}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.demoButton}
              onPress={handleDriverDemo}
              activeOpacity={0.7}
            >
              <MaterialIcons name="directions-bus" size={20} color="#FFFFFF" style={styles.demoIcon} />
              <Text style={styles.demoButtonText}>{t.driverDemo}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(23, 81, 204, 0.98)',
  },
  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 10,
  },
  languageSelect: {
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 60,
  },
  languageSelectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  },
  logoContainer: {
    marginBottom: 40,
  },
  logo: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: UbuntuFonts.bold,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: UbuntuFonts.bold,
  },
  subtitleText: {
    fontSize: 18,
    color: '#FFFFFA',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: UbuntuFonts.regular,
  },
  rtl: {
    textAlign: 'right',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  registerButton: {
    backgroundColor: '#3185FC',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: UbuntuFonts.semiBold,
  },
  loginButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3185FC',
  },
  loginButtonText: {
    color: '#3185FC',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: UbuntuFonts.semiBold,
  },
  demoContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  demoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  demoIcon: {
    marginRight: 8,
  },
  demoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: UbuntuFonts.semiBold,
  },
});

export default WelcomeScreen;

