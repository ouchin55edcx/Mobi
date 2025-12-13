import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';

const translations = {
  en: {
    title: 'Login to Mobi',
    subtitle: 'Be logged in allows you to use Mobi more comfortable.',
    emailLabel: 'EMAIL ADDRESS',
    passwordLabel: 'PASSWORD',
    signUpText: "If you don't have an account",
    signUpLink: 'sign up',
  },
  ar: {
    title: 'تسجيل الدخول إلى موبي',
    subtitle: 'تسجيل الدخول يسمح لك باستخدام موبي بشكل أكثر راحة.',
    emailLabel: 'عنوان البريد الإلكتروني',
    passwordLabel: 'كلمة المرور',
    signUpText: 'إذا لم يكن لديك حساب',
    signUpLink: 'سجل',
  },
};

const LoginScreen = ({ language = 'en', onBack, onSignUp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const t = translations[language];

  const handleLogin = () => {
    // Handle login logic here
    console.log('Login:', { email, password });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
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
              onPress={() => {
                // Language switching can be handled by parent
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.languageIcon}>
                {language === 'en' ? '🇬🇧' : '🇲🇦'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={[styles.title, language === 'ar' && styles.rtl]}>
                {t.title}
              </Text>
              <Text style={[styles.subtitle, language === 'ar' && styles.rtl]}>
                {t.subtitle}
              </Text>
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t.emailLabel}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    emailFocused && styles.inputFocused,
                    language === 'ar' && styles.rtl,
                  ]}
                  placeholder="michal@tonik.pl"
                  placeholderTextColor="#999999"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.emailIcon}>
                  <MaterialIcons name="alternate-email" size={20} color="#FFFFFF" />
                </View>
              </View>
              <View
                style={[
                  styles.underline,
                  emailFocused ? styles.underlineActive : styles.underlineInactive,
                ]}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t.passwordLabel}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    passwordFocused && styles.inputFocused,
                    language === 'ar' && styles.rtl,
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor="#999999"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={20}
                    color="#666666"
                  />
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.underline,
                  passwordFocused
                    ? styles.underlineActive
                    : styles.underlineInactive,
                ]}
              />
            </View>

            {/* Login Button and Sign Up Link */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                activeOpacity={0.8}
              >
                <MaterialIcons name="arrow-forward" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>{t.signUpText} </Text>
                <TouchableOpacity onPress={onSignUp} activeOpacity={0.7}>
                  <Text style={styles.signUpLink}>{t.signUpLink}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  header: {
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3185FC',
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
  inputContainer: {
    marginBottom: 32,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    paddingVertical: 12,
    paddingRight: 50,
  },
  inputFocused: {
    color: '#1A1A1A',
  },
  emailIcon: {
    position: 'absolute',
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3185FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: 0,
    padding: 6,
  },
  underline: {
    height: 2,
    marginTop: 4,
  },
  underlineActive: {
    backgroundColor: '#3185FC',
  },
  underlineInactive: {
    backgroundColor: '#E0E0E0',
  },
  footer: {
    marginTop: 40,
  },
  loginButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3185FC',
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
    marginBottom: 24,
  },
  signUpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  signUpText: {
    fontSize: 14,
    color: '#666666',
  },
  signUpLink: {
    fontSize: 14,
    color: '#3185FC',
    fontWeight: '600',
  },
});

export default LoginScreen;

