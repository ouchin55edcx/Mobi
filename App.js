import React, { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import SplashScreen from './components/SplashScreen';
import WelcomeScreen from './components/WelcomeScreen';
import LoginScreen from './components/LoginScreen';
import SelectRoleScreen from './components/SelectRoleScreen';
import StudentRegisterScreen from './screens/students/StudentRegisterScreen';
import EmailVerificationScreen from './screens/students/EmailVerificationScreen';
import StudentTabNavigator from './components/StudentTabNavigator';
import DriverRegistrationFlow from './screens/drivers/DriverRegistrationFlow';
import PendingApprovalScreen from './screens/drivers/PendingApprovalScreen';
import DriverTabNavigator from './components/DriverTabNavigator';
import TripLiveViewScreen from './screens/drivers/TripLiveViewScreen';
import DriverTripDetailsScreen from './screens/drivers/DriverTripDetailsScreen';
import mockDriverScenario from './src/mock/mockDriverData';
import { DEMO_STUDENT, DEMO_DRIVER } from './src/data/demoData';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [language, setLanguage] = useState('en');
  const [selectedRole, setSelectedRole] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [driverData, setDriverData] = useState(null);
  const [tripLiveViewData, setTripLiveViewData] = useState(null);
  const [tripDetailsData, setTripDetailsData] = useState(null);

  // Load Ubuntu fonts
  const [fontsLoaded, fontError] = useFonts({
    'UbuntuSans-Thin': require('./assets/fonts/UbuntuSans-Thin.ttf'),
    'UbuntuSans-ThinItalic': require('./assets/fonts/UbuntuSans-ThinItalic.ttf'),
    'UbuntuSans-ExtraLight': require('./assets/fonts/UbuntuSans-ExtraLight.ttf'),
    'UbuntuSans-ExtraLightItalic': require('./assets/fonts/UbuntuSans-ExtraLightItalic.ttf'),
    'UbuntuSans-Light': require('./assets/fonts/UbuntuSans-Light.ttf'),
    'UbuntuSans-LightItalic': require('./assets/fonts/UbuntuSans-LightItalic.ttf'),
    'UbuntuSans-Regular': require('./assets/fonts/UbuntuSans-Regular.ttf'),
    'UbuntuSans-Italic': require('./assets/fonts/UbuntuSans-Italic.ttf'),
    'UbuntuSans-Medium': require('./assets/fonts/UbuntuSans-Medium.ttf'),
    'UbuntuSans-MediumItalic': require('./assets/fonts/UbuntuSans-MediumItalic.ttf'),
    'UbuntuSans-SemiBold': require('./assets/fonts/UbuntuSans-SemiBold.ttf'),
    'UbuntuSans-SemiBoldItalic': require('./assets/fonts/UbuntuSans-SemiBoldItalic.ttf'),
    'UbuntuSans-Bold': require('./assets/fonts/UbuntuSans-Bold.ttf'),
    'UbuntuSans-BoldItalic': require('./assets/fonts/UbuntuSans-BoldItalic.ttf'),
    'UbuntuSans-ExtraBold': require('./assets/fonts/UbuntuSans-ExtraBold.ttf'),
    'UbuntuSans-ExtraBoldItalic': require('./assets/fonts/UbuntuSans-ExtraBoldItalic.ttf'),
  });

  useEffect(() => {
    // Wait for fonts to load before showing the app
    if (fontsLoaded || fontError) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 3000); // 3 seconds

      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, fontError]);

  // Show splash screen while fonts are loading or during initial splash
  if (!fontsLoaded && !fontError) {
    return <SplashScreen />;
  }

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
              setCurrentScreen('driverRegister');
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

    // Driver Registration Flow (Unified Multi-Step)
    if (currentScreen === 'driverRegister') {
      return (
        <DriverRegistrationFlow
          language={language}
          onBack={() => setCurrentScreen('selectRole')}
          onSuccess={(data) => {
            console.log('Driver registration completed:', data);
            // After verification, navigate to pending approval
            // The flow handles verification internally, so we need to track when it's done
            // For now, we'll use the pendingApproval screen separately
            // The unified flow shows pending state internally, but we can also use the dedicated screen
            if (data && data.driverId) {
              setDriverData({ driverId: data.driverId, email: data.email });
              setCurrentScreen('pendingApproval');
            }
          }}
        />
      );
    }

    if (currentScreen === 'pendingApproval') {
      if (!driverData) {
        // If no driver data, go back to registration
        setCurrentScreen('driverRegister');
        return null;
      }
      return (
        <PendingApprovalScreen
          driverId={driverData.driverId}
          language={language}
          onApproved={() => {
            console.log('Driver approved');
            // Navigate to driver home
            setCurrentScreen('driverHome');
          }}
          onRejected={() => {
            console.log('Driver rejected');
            // Could navigate to a rejection screen or back to welcome
            setCurrentScreen('welcome');
            setDriverData(null);
          }}
        />
      );
    }

    if (currentScreen === 'driverHome') {
      return (
        <DriverTabNavigator
          driverId={driverData?.driverId}
          language={language}
          isDemo={driverData?.isDemo || false}
          onLogout={() => {
            setDriverData(null);
            setCurrentScreen('welcome');
          }}
          onTripPress={(tripData) => {
            setTripDetailsData(tripData);
            setCurrentScreen('tripDetails');
          }}
        />
      );
    }

    if (currentScreen === 'tripDetails') {
      if (!tripDetailsData) {
        // If no trip data, go back to driver home
        setCurrentScreen('driverHome');
        return null;
      }
      return (
        <DriverTripDetailsScreen
          tripData={tripDetailsData}
          driverData={driverData}
          language={language}
          onBack={() => {
            setTripDetailsData(null);
            setCurrentScreen('driverHome');
          }}
          onStartTrip={(tripData) => {
            // Navigate to live trip view when starting trip
            setTripLiveViewData(tripData);
            setTripDetailsData(null);
            setCurrentScreen('tripLiveView');
          }}
        />
      );
    }

    if (currentScreen === 'tripLiveView') {
      if (!tripLiveViewData) {
        // If no trip data, go back to driver home
        setCurrentScreen('driverHome');
        return null;
      }
      return (
        <TripLiveViewScreen
          tripData={tripLiveViewData}
          language={language}
          isDemo={driverData?.isDemo || false}
          onBack={() => {
            setTripLiveViewData(null);
            setCurrentScreen('driverHome');
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
        onSkip={() => {
          // Skip to demo mode: navigate to student home with static mock student data
          setStudentData({
            studentId: DEMO_STUDENT.id,
            email: DEMO_STUDENT.email,
            isDemo: true,
          });
          setCurrentScreen('studentHome');
        }}
        onSkipToDriver={() => {
          // Skip to driver demo mode: navigate to driver home with static mock driver data
          setDriverData({
            driverId: DEMO_DRIVER.id,
            email: DEMO_DRIVER.email || 'driver.demo@mobi.app',
            isDemo: true,
          });
          setCurrentScreen('driverHome');
        }}
      />
    );
  };

  return <SafeAreaProvider>{renderScreen()}</SafeAreaProvider>;
}
