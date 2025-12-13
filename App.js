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
import DriverRegisterScreen from './screens/drivers/DriverRegisterScreen';
import BusInformationScreen from './screens/drivers/BusInformationScreen';
import DriverEmailVerificationScreen from './screens/drivers/EmailVerificationScreen';
import PendingApprovalScreen from './screens/drivers/PendingApprovalScreen';
import DriverTabNavigator from './components/DriverTabNavigator';
import TripLiveViewScreen from './screens/drivers/TripLiveViewScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [language, setLanguage] = useState('en');
  const [selectedRole, setSelectedRole] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [driverData, setDriverData] = useState(null);
  const [tripLiveViewData, setTripLiveViewData] = useState(null);

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

    // Driver Registration Flow
    if (currentScreen === 'driverRegister') {
      return (
        <DriverRegisterScreen
          language={language}
          onBack={() => setCurrentScreen('selectRole')}
          onSuccess={(data) => {
            console.log('Driver registered:', data);
            // Store driver data and navigate to bus information
            setDriverData({ driverId: data.id, email: data.email });
            setCurrentScreen('busInformation');
          }}
        />
      );
    }

    if (currentScreen === 'busInformation') {
      if (!driverData) {
        // If no driver data, go back to registration
        setCurrentScreen('driverRegister');
        return null;
      }
      return (
        <BusInformationScreen
          driverId={driverData.driverId}
          language={language}
          onBack={() => setCurrentScreen('driverRegister')}
          onSuccess={(data) => {
            console.log('Bus information saved:', data);
            // Navigate to email verification
            setCurrentScreen('driverEmailVerification');
          }}
        />
      );
    }

    if (currentScreen === 'driverEmailVerification') {
      if (!driverData) {
        // If no driver data, go back to registration
        setCurrentScreen('driverRegister');
        return null;
      }
      return (
        <DriverEmailVerificationScreen
          driverId={driverData.driverId}
          email={driverData.email}
          language={language}
          onBack={() => setCurrentScreen('busInformation')}
          onSuccess={() => {
            console.log('Email verified successfully');
            // Navigate to pending approval
            setCurrentScreen('pendingApproval');
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
            setTripLiveViewData(tripData);
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
