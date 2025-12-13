import React, { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SplashScreen from './components/SplashScreen';
import WelcomeScreen from './components/WelcomeScreen';
import LoginScreen from './components/LoginScreen';
import SelectRoleScreen from './components/SelectRoleScreen';
import StudentRegisterScreen from './screens/students/StudentRegisterScreen';
import EmailVerificationScreen from './screens/students/EmailVerificationScreen';
import StudentTabNavigator from './components/StudentTabNavigator';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [language, setLanguage] = useState('en');
  const [selectedRole, setSelectedRole] = useState(null);
  const [studentData, setStudentData] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000); // 3 seconds

    return () => clearTimeout(timer);
  }, []);

  const renderScreen = () => {
    if (showSplash) {
      return <SplashScreen />;
    }

    if (currentScreen === 'login') {
      return (
        <LoginScreen
          language={language}
          onBack={() => setCurrentScreen('welcome')}
          onSignUp={() => setCurrentScreen('selectRole')}
        />
      );
    }

    if (currentScreen === 'selectRole') {
      return (
        <SelectRoleScreen
          language={language}
          onBack={() => setCurrentScreen('welcome')}
          onRoleSelect={(role) => {
            if (role === 'student') {
              setCurrentScreen('studentRegister');
            } else if (role === 'driver') {
              // Navigate to driver registration when implemented
              console.log('Driver registration coming soon');
            }
          }}
        />
      );
    }

    if (currentScreen === 'studentRegister') {
      return (
        <StudentRegisterScreen
          language={language}
          onBack={() => setCurrentScreen('selectRole')}
          onSuccess={(data) => {
            console.log('Student registered:', data);
            // Store student data and navigate to email verification
            setStudentData({ studentId: data.id, email: data.email });
            setCurrentScreen('emailVerification');
          }}
        />
      );
    }

    if (currentScreen === 'emailVerification') {
      if (!studentData) {
        // If no student data, go back to registration
        setCurrentScreen('studentRegister');
        return null;
      }
      return (
        <EmailVerificationScreen
          studentId={studentData.studentId}
          email={studentData.email}
          language={language}
          onBack={() => setCurrentScreen('studentRegister')}
          onSuccess={() => {
            console.log('Email verified successfully');
            // Navigate to student home after successful verification
            setCurrentScreen('studentHome');
          }}
        />
      );
    }

    if (currentScreen === 'studentHome' || currentScreen === 'history' || currentScreen === 'profile') {
      return (
        <StudentTabNavigator
          studentId={studentData?.studentId}
          isDemo={studentData?.isDemo || false}
          language={language}
          onLogout={() => {
            setStudentData(null);
            setCurrentScreen('welcome');
          }}
        />
      );
    }

    return (
      <WelcomeScreen
        language={language}
        onLanguageChange={setLanguage}
        onLogin={() => setCurrentScreen('login')}
        onRegister={() => setCurrentScreen('selectRole')}
        onDemo={() => {
          // Demo mode: navigate to student home with demo student ID
          setStudentData({ studentId: 'demo-student-id', email: 'demo@mobi.app', isDemo: true });
          setCurrentScreen('studentHome');
        }}
      />
    );
  };

  return <SafeAreaProvider>{renderScreen()}</SafeAreaProvider>;
}
