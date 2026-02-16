import React, { useState, useEffect } from "react";
import { Alert, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import SplashScreen from "./components/SplashScreen";
import WelcomeScreen from "./components/WelcomeScreen";
import LoginScreen from "./components/LoginScreen";
import SelectRoleScreen from "./components/SelectRoleScreen";
import StudentRegisterScreen from "./screens/students/StudentRegisterScreen";
import EmailVerificationScreen from "./screens/students/EmailVerificationScreen";
import StudentTabNavigator from "./components/StudentTabNavigator";
import DriverRegistrationFlow from "./screens/drivers/DriverRegistrationFlow";
import PendingApprovalScreen from "./screens/drivers/PendingApprovalScreen";
import DriverTabNavigator from "./components/DriverTabNavigator";
import TripLiveViewScreen from "./screens/drivers/TripLiveViewScreen";
import DriverTripDetailsScreen from "./screens/drivers/DriverTripDetailsScreen";
import TripDetailsScreen from "./screens/students/TripDetailsScreen";
import mockDriverScenario from "./src/mock/mockDriverData";
import { DEMO_STUDENT, DEMO_DRIVER } from "./src/data/demoData";
import {
  getSession,
  signIn,
  signInWithFacebook,
  requestPasswordResetCode,
  confirmPasswordResetWithCode,
  signOut,
} from "./src/services/authService";
import { getStudentByEmail } from "./src/services/studentService";
import { getDriverByEmail } from "./src/services/driverService";
import {
  startAssignedTrip,
  completeAssignedTrip,
} from "./src/services/groupingService";

const isValidCoordinate = (point) =>
  !!point &&
  Number.isFinite(Number(point.latitude)) &&
  Number.isFinite(Number(point.longitude)) &&
  Math.abs(Number(point.latitude)) <= 90 &&
  Math.abs(Number(point.longitude)) <= 180;

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentScreen, setCurrentScreen] = useState("welcome");
  const [language, setLanguage] = useState("en");
  const [selectedRole, setSelectedRole] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [driverData, setDriverData] = useState(null);
  const [tripLiveViewData, setTripLiveViewData] = useState(null);
  const [tripDetailsData, setTripDetailsData] = useState(null);
  const [studentTripDetailsData, setStudentTripDetailsData] = useState(null);
  const [isBootstrappingAuth, setIsBootstrappingAuth] = useState(true);

  // Load Ubuntu fonts
  const [fontsLoaded, fontError] = useFonts({
    "UbuntuSans-Thin": require("./assets/fonts/UbuntuSans-Thin.ttf"),
    "UbuntuSans-ThinItalic": require("./assets/fonts/UbuntuSans-ThinItalic.ttf"),
    "UbuntuSans-ExtraLight": require("./assets/fonts/UbuntuSans-ExtraLight.ttf"),
    "UbuntuSans-ExtraLightItalic": require("./assets/fonts/UbuntuSans-ExtraLightItalic.ttf"),
    "UbuntuSans-Light": require("./assets/fonts/UbuntuSans-Light.ttf"),
    "UbuntuSans-LightItalic": require("./assets/fonts/UbuntuSans-LightItalic.ttf"),
    "UbuntuSans-Regular": require("./assets/fonts/UbuntuSans-Regular.ttf"),
    "UbuntuSans-Italic": require("./assets/fonts/UbuntuSans-Italic.ttf"),
    "UbuntuSans-Medium": require("./assets/fonts/UbuntuSans-Medium.ttf"),
    "UbuntuSans-MediumItalic": require("./assets/fonts/UbuntuSans-MediumItalic.ttf"),
    "UbuntuSans-SemiBold": require("./assets/fonts/UbuntuSans-SemiBold.ttf"),
    "UbuntuSans-SemiBoldItalic": require("./assets/fonts/UbuntuSans-SemiBoldItalic.ttf"),
    "UbuntuSans-Bold": require("./assets/fonts/UbuntuSans-Bold.ttf"),
    "UbuntuSans-BoldItalic": require("./assets/fonts/UbuntuSans-BoldItalic.ttf"),
    "UbuntuSans-ExtraBold": require("./assets/fonts/UbuntuSans-ExtraBold.ttf"),
    "UbuntuSans-ExtraBoldItalic": require("./assets/fonts/UbuntuSans-ExtraBoldItalic.ttf"),
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

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { data, error } = await getSession();

        if (error || !data?.session?.user?.email) {
          setIsBootstrappingAuth(false);
          return;
        }

        const userEmail = data.session.user.email;

        const driverResult = await getDriverByEmail(userEmail);
        if (driverResult?.data?.id) {
          setDriverData({
            driverId: driverResult.data.id,
            email: userEmail,
          });
          setCurrentScreen(
            driverResult.data.status === "APPROVED"
              ? "driverHome"
              : "pendingApproval",
          );
          setIsBootstrappingAuth(false);
          return;
        }

        const studentResult = await getStudentByEmail(userEmail);
        if (studentResult?.data?.id) {
          setStudentData({
            studentId: studentResult.data.id,
            email: userEmail,
          });
          setCurrentScreen("studentHome");
          setIsBootstrappingAuth(false);
          return;
        }
      } catch (e) {
        // Fall through to welcome if restore fails
      } finally {
        setIsBootstrappingAuth(false);
      }
    };

    restoreSession();
  }, []);

  const handleFacebookLogin = async () => {
    const { data, error } = await signInWithFacebook();

    if (error) {
      Alert.alert(
        "Facebook Login Failed",
        error.message || "Please try again.",
      );
      return;
    }

    if (data?.user || data?.session?.user) {
      setCurrentScreen("selectRole");
      return;
    }

    Alert.alert(
      "Facebook Login Failed",
      "No user session returned from Supabase.",
    );
  };

  const handleEmailPasswordLogin = async ({ email, password }) => {
    if (!email || !password) {
      Alert.alert("Login Failed", "Please enter both email and password.");
      return;
    }

    const { data, error } = await signIn(email, password);

    if (error) {
      Alert.alert(
        "Login Failed",
        error.message || "Invalid email or password.",
      );
      return;
    }

    const userEmail = data?.user?.email || data?.session?.user?.email || email;

    const driverResult = await getDriverByEmail(userEmail);
    if (driverResult?.data?.id) {
      setDriverData({
        driverId: driverResult.data.id,
        email: userEmail,
      });

      if (driverResult.data.status === "APPROVED") {
        setCurrentScreen("driverHome");
      } else {
        setCurrentScreen("pendingApproval");
      }
      return;
    }

    const studentResult = await getStudentByEmail(userEmail);
    if (studentResult?.data?.id) {
      setStudentData({
        studentId: studentResult.data.id,
        email: userEmail,
      });
      setCurrentScreen("studentHome");
      return;
    }

    setCurrentScreen("selectRole");
  };

  const handleRequestPasswordResetCode = async (email) => {
    if (!email) {
      Alert.alert("Reset Password", "Please enter your email first.");
      return;
    }

    const { error } = await requestPasswordResetCode(email);
    if (error) {
      Alert.alert(
        "Reset Password",
        error.message || "Failed to send reset code.",
      );
      return;
    }

    Alert.alert(
      "Reset Password",
      __DEV__
        ? "Reset code generated. Check Metro console in dev mode."
        : "Reset code sent.",
    );
  };

  const handleConfirmResetPassword = async ({ email, code, newPassword }) => {
    if (!email || !code || !newPassword) {
      Alert.alert(
        "Reset Password",
        "Please fill email, code, and new password.",
      );
      return;
    }

    const { data, error } = await confirmPasswordResetWithCode(
      email,
      code,
      newPassword,
    );

    if (error) {
      Alert.alert("Reset Password", error.message || "Password reset failed.");
      return;
    }

    Alert.alert("Reset Password", data?.message || "Password reset started.");
  };

  const handleLogout = async () => {
    await signOut();

    setStudentData(null);
    setDriverData(null);
    setTripLiveViewData(null);
    setTripDetailsData(null);
    setStudentTripDetailsData(null);
    setSelectedRole(null);
    setIsDemoMode(false);
    setCurrentScreen("login");
  };

  // Show splash screen while fonts are loading or during initial splash
  if (!fontsLoaded && !fontError) {
    return <SplashScreen />;
  }

  if (isBootstrappingAuth) {
    return <SplashScreen />;
  }

  const renderScreen = () => {
    if (showSplash) {
      return <SplashScreen />;
    }

    if (currentScreen === "login") {
      return (
        <LoginScreen
          language={language}
          onBack={() => setCurrentScreen("welcome")}
          onSignUp={() => setCurrentScreen("selectRole")}
          onFacebookLogin={handleFacebookLogin}
          onLogin={handleEmailPasswordLogin}
          onRequestResetCode={handleRequestPasswordResetCode}
          onConfirmResetPassword={handleConfirmResetPassword}
        />
      );
    }

    if (currentScreen === "selectRole") {
      return (
        <SelectRoleScreen
          language={language}
          onBack={() => {
            setIsDemoMode(false);
            setCurrentScreen("welcome");
          }}
          onRoleSelect={(role) => {
            if (isDemoMode) {
              // Demo mode: redirect to home screen with demo data
              if (role === "student") {
                setStudentData({
                  studentId: DEMO_STUDENT.id,
                  email: DEMO_STUDENT.email,
                  isDemo: true,
                });
                setIsDemoMode(false);
                setCurrentScreen("studentHome");
              } else if (role === "driver") {
                setDriverData({
                  driverId: DEMO_DRIVER.id,
                  email: DEMO_DRIVER.email || "driver.demo@mobi.app",
                  isDemo: true,
                });
                setIsDemoMode(false);
                setCurrentScreen("driverHome");
              }
            } else {
              // Normal mode: go to registration
              if (role === "student") {
                setCurrentScreen("studentRegister");
              } else if (role === "driver") {
                setCurrentScreen("driverRegister");
              }
            }
          }}
        />
      );
    }

    if (currentScreen === "studentRegister") {
      return (
        <StudentRegisterScreen
          language={language}
          onBack={() => setCurrentScreen("selectRole")}
          onSuccess={(data) => {
            console.log("Student registered:", data);
            // Store student data and navigate to email verification
            setStudentData({ studentId: data.id, email: data.email });
            setCurrentScreen("emailVerification");
          }}
        />
      );
    }

    if (currentScreen === "emailVerification") {
      if (!studentData) {
        // If no student data, go back to registration
        setCurrentScreen("studentRegister");
        return null;
      }
      return (
        <EmailVerificationScreen
          studentId={studentData.studentId}
          email={studentData.email}
          language={language}
          onBack={() => setCurrentScreen("studentRegister")}
          onSuccess={() => {
            console.log("Email verified successfully");
            // Navigate to student home after successful verification
            setCurrentScreen("studentHome");
          }}
        />
      );
    }

    if (
      currentScreen === "studentHome" ||
      currentScreen === "history" ||
      currentScreen === "profile"
    ) {
      return (
        <StudentTabNavigator
          studentId={studentData?.studentId}
          isDemo={studentData?.isDemo || false}
          language={language}
          onLogout={handleLogout}
          onNavigateToTripDetails={(tripData) => {
            const hasValidPayload =
              isValidCoordinate(tripData?.homeLocation) &&
              isValidCoordinate(tripData?.destinationLocation);

            console.log("[App] onNavigateToTripDetails payload", {
              hasTripData: !!tripData,
              hasValidPayload,
              routePoints: Array.isArray(tripData?.routeCoordinates)
                ? tripData.routeCoordinates.length
                : 0,
            });

            if (!hasValidPayload) {
              Alert.alert(
                "Trip Data Error",
                "Trip details are incomplete. Please try again.",
              );
              return;
            }

            setStudentTripDetailsData(tripData);
            setCurrentScreen("studentTripDetails");
          }}
        />
      );
    }

    if (currentScreen === "studentTripDetails") {
      if (!studentTripDetailsData) {
        // If no trip data, go back to student home
        setCurrentScreen("studentHome");
        return null;
      }
      return (
        <TripDetailsScreen
          tripData={studentTripDetailsData}
          language={language}
          onBack={() => {
            setStudentTripDetailsData(null);
            setCurrentScreen("studentHome");
          }}
        />
      );
    }

    // Driver Registration Flow (Unified Multi-Step)
    if (currentScreen === "driverRegister") {
      return (
        <DriverRegistrationFlow
          language={language}
          onBack={() => setCurrentScreen("selectRole")}
          onSuccess={(data) => {
            console.log("Driver registration completed:", data);
            // After verification, navigate to pending approval
            // The flow handles verification internally, so we need to track when it's done
            // For now, we'll use the pendingApproval screen separately
            // The unified flow shows pending state internally, but we can also use the dedicated screen
            if (data && data.driverId) {
              setDriverData({ driverId: data.driverId, email: data.email });
              setCurrentScreen("pendingApproval");
            }
          }}
        />
      );
    }

    if (currentScreen === "pendingApproval") {
      if (!driverData) {
        // If no driver data, go back to registration
        setCurrentScreen("driverRegister");
        return null;
      }
      return (
        <PendingApprovalScreen
          driverId={driverData.driverId}
          language={language}
          onApproved={() => {
            console.log("Driver approved");
            // Navigate to driver home
            setCurrentScreen("driverHome");
          }}
          onRejected={() => {
            console.log("Driver rejected");
            // Could navigate to a rejection screen or back to welcome
            setCurrentScreen("welcome");
            setDriverData(null);
          }}
        />
      );
    }

    if (currentScreen === "driverHome") {
      return (
        <DriverTabNavigator
          driverId={driverData?.driverId}
          language={language}
          isDemo={driverData?.isDemo || false}
          onLogout={handleLogout}
          onTripPress={(tripData) => {
            setTripDetailsData(tripData);
            setCurrentScreen("tripDetails");
          }}
        />
      );
    }

    if (currentScreen === "tripDetails") {
      if (!tripDetailsData) {
        // If no trip data, go back to driver home
        setCurrentScreen("driverHome");
        return null;
      }
      return (
        <DriverTripDetailsScreen
          tripData={tripDetailsData}
          driverData={driverData}
          language={language}
          onBack={() => {
            setTripDetailsData(null);
            setCurrentScreen("driverHome");
          }}
          onStartTrip={(tripData) => {
            (async () => {
              if (tripData?.id && driverData?.driverId) {
                await startAssignedTrip({
                  tripId: tripData.id,
                  driverId: driverData.driverId,
                });
              }

              setTripLiveViewData({
                ...tripData,
                status: "trip_started",
              });
              setTripDetailsData(null);
              setCurrentScreen("tripLiveView");
            })();
          }}
        />
      );
    }

    if (currentScreen === "tripLiveView") {
      if (!tripLiveViewData) {
        // If no trip data, go back to driver home
        setCurrentScreen("driverHome");
        return null;
      }
      return (
        <TripLiveViewScreen
          tripData={tripLiveViewData}
          driverId={driverData?.driverId}
          language={language}
          isDemo={driverData?.isDemo || false}
          onCompleteTrip={async (tripData) => {
            if (tripData?.id && driverData?.driverId) {
              await completeAssignedTrip({
                tripId: tripData.id,
                driverId: driverData.driverId,
              });
            }
            setTripLiveViewData(null);
            setCurrentScreen("driverHome");
          }}
          onBack={() => {
            setTripLiveViewData(null);
            setCurrentScreen("driverHome");
          }}
        />
      );
    }

    return (
      <WelcomeScreen
        language={language}
        onLanguageChange={setLanguage}
        onLogin={() => setCurrentScreen("login")}
        onRegister={() => setCurrentScreen("selectRole")}
        onDemoMode={() => {
          // Navigate to role selection in demo mode
          setIsDemoMode(true);
          setCurrentScreen("selectRole");
        }}
      />
    );
  };

  return <SafeAreaProvider>{renderScreen()}</SafeAreaProvider>;
}
