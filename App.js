import React, { useState, useEffect, useRef } from "react";
import { Alert, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SplashScreen from "./src/screens/public/SplashScreen";
import OnboardingScreen from "./src/screens/public/OnboardingScreen";
import SelectRoleScreen from "./src/screens/auth/SelectRoleScreen";
import StudentRegisterScreen from "./src/screens/student/StudentRegisterScreen";
import StudentHomeScreen from "./src/screens/student/StudentHomeScreen";
import ProfileScreen from "./src/screens/student/ProfileScreen";
import DriverRegisterScreen from "./src/screens/driver/DriverRegistrationFlow";
import DriverVehicleScreen from "./src/screens/driver/DriverVehicleScreen";
import DriverTabNavigator from "./src/navigation/DriverTabNavigator";
import DriverProfileScreen from "./src/screens/driver/DriverProfileScreen";
import TripLiveViewScreen from "./src/screens/driver/TripLiveViewScreen";
import DriverTripDetailsScreen from "./src/screens/driver/DriverTripDetailsScreen";
import TripDetailsScreen from "./src/screens/student/TripDetailsScreen";
import {
  getSession,
  signIn,
  signInWithGoogle,
  requestPasswordResetCode,
  confirmPasswordResetWithCode,
  signOut,
} from "./src/shared/services/authService";
import { getStudentByEmail } from "./src/shared/services/studentService";
import { getDriverByEmail } from "./src/shared/services/driverService";
import {
  startAssignedTrip,
  completeAssignedTrip,
} from "./src/shared/services/groupingService";

const isValidCoordinate = (point) =>
  !!point &&
  Number.isFinite(Number(point.latitude)) &&
  Number.isFinite(Number(point.longitude)) &&
  Math.abs(Number(point.latitude)) <= 90 &&
  Math.abs(Number(point.longitude)) <= 180;

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentScreen, setCurrentScreen] = useState("selectRole");
  const [language, setLanguage] = useState("en");
  const [studentData, setStudentData] = useState(null);
  const [driverData, setDriverData] = useState(null);
  const [driverRegisterParams, setDriverRegisterParams] = useState(null);
  const [tripLiveViewData, setTripLiveViewData] = useState(null);
  const [tripDetailsData, setTripDetailsData] = useState(null);
  const [studentTripDetailsData, setStudentTripDetailsData] = useState(null);
  const [isBootstrappingAuth, setIsBootstrappingAuth] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
  const studentHomeRefreshRef = useRef(null);

  // Load Ubuntu fonts
  const [fontsLoaded, fontError] = useFonts({
    "UbuntuSans-Thin": require("./src/assets/fonts/UbuntuSans-Thin.ttf"),
    "UbuntuSans-ThinItalic": require("./src/assets/fonts/UbuntuSans-ThinItalic.ttf"),
    "UbuntuSans-ExtraLight": require("./src/assets/fonts/UbuntuSans-ExtraLight.ttf"),
    "UbuntuSans-ExtraLightItalic": require("./src/assets/fonts/UbuntuSans-ExtraLightItalic.ttf"),
    "UbuntuSans-Light": require("./src/assets/fonts/UbuntuSans-Light.ttf"),
    "UbuntuSans-LightItalic": require("./src/assets/fonts/UbuntuSans-LightItalic.ttf"),
    "UbuntuSans-Regular": require("./src/assets/fonts/UbuntuSans-Regular.ttf"),
    "UbuntuSans-Italic": require("./src/assets/fonts/UbuntuSans-Italic.ttf"),
    "UbuntuSans-Medium": require("./src/assets/fonts/UbuntuSans-Medium.ttf"),
    "UbuntuSans-MediumItalic": require("./src/assets/fonts/UbuntuSans-MediumItalic.ttf"),
    "UbuntuSans-SemiBold": require("./src/assets/fonts/UbuntuSans-SemiBold.ttf"),
    "UbuntuSans-SemiBoldItalic": require("./src/assets/fonts/UbuntuSans-SemiBoldItalic.ttf"),
    "UbuntuSans-Bold": require("./src/assets/fonts/UbuntuSans-Bold.ttf"),
    "UbuntuSans-BoldItalic": require("./src/assets/fonts/UbuntuSans-BoldItalic.ttf"),
    "UbuntuSans-ExtraBold": require("./src/assets/fonts/UbuntuSans-ExtraBold.ttf"),
    "UbuntuSans-ExtraBoldItalic": require("./src/assets/fonts/UbuntuSans-ExtraBoldItalic.ttf"),
  });

  // No longer needed: checkStartupState and fontsLoaded useEffects have been consolidated
  // below into the restoreSession logic for better reliability.

  const handleFinishOnboarding = async () => {
    try {
      await AsyncStorage.setItem("@has_seen_onboarding", "true");
      setHasSeenOnboarding(true);
      setCurrentScreen("selectRole");
    } catch (e) {
      setCurrentScreen("selectRole");
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      // 1. Wait for fonts
      if (!fontsLoaded && !fontError) return;

      const startTime = Date.now();
      try {
        // 2. Check if onboarding is needed
        const onboardingValue = await AsyncStorage.getItem("@has_seen_onboarding");
        const seenOnboarding = onboardingValue === "true";
        setHasSeenOnboarding(seenOnboarding);

        // 3. Check for pending driver registration (multi-step flow)
        const pending = await AsyncStorage.getItem("@pending_driver_registration");
        if (pending) {
          const data = JSON.parse(pending);
          const age = Date.now() - data.timestamp;
          if (age < 24 * 60 * 60 * 1000) {
            setDriverData({ email: data.email });
            setCurrentScreen("driverRegister");
            return;
          } else {
            await AsyncStorage.removeItem("@pending_driver_registration");
          }
        }

        // 4. Try to restore active session from Supabase
        const { data, error } = await getSession();
        const userEmail = data?.session?.user?.email;

        if (userEmail) {
          const driverResult = await getDriverByEmail(userEmail);
          if (driverResult?.data?.id) {
            setDriverData({ driverId: driverResult.data.id, email: userEmail });
            setCurrentScreen("driverHome");
            return;
          }

          const studentResult = await getStudentByEmail(userEmail);
          if (studentResult?.data?.id) {
            setStudentData({ studentId: studentResult.data.id, email: userEmail });
            setCurrentScreen("studentHome");
            return;
          }
        }

        // 5. Fallback: Local identity (Persistent Role)
        const localStudentId = await AsyncStorage.getItem("@registered_student_id");
        const localStudentEmail = await AsyncStorage.getItem("@registered_student_email");
        if (localStudentId && localStudentEmail) {
          const studentResult = await getStudentByEmail(localStudentEmail);
          if (studentResult?.data?.id) {
            setStudentData({ studentId: studentResult.data.id, email: localStudentEmail });
            setCurrentScreen("studentHome");
            return;
          }
        }

        const localDriverId = await AsyncStorage.getItem("@registered_driver_id");
        const localDriverEmail = await AsyncStorage.getItem("@registered_driver_email");
        if (localDriverId && localDriverEmail) {
          const driverResult = await getDriverByEmail(localDriverEmail);
          if (driverResult?.data?.id) {
            setDriverData({ driverId: driverResult.data.id, email: localDriverEmail });
            setCurrentScreen("driverHome");
            return;
          }
        }

        // 6. Final fallbacks
        if (!seenOnboarding) {
          setCurrentScreen("onboarding");
        } else {
          setCurrentScreen("selectRole");
        }
      } catch (e) {
        console.error("Session restoration error:", e);
        setCurrentScreen("selectRole");
      } finally {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 1500 - elapsedTime);
        setTimeout(() => {
          setIsBootstrappingAuth(false);
          setShowSplash(false);
        }, remainingTime);
      }
    };

    restoreSession();
  }, [fontsLoaded, fontError]);

  const handleGoogleLogin = async () => {
    const { data, error } = await signInWithGoogle();
    if (error) {
      Alert.alert("Google Login Failed", error.message || "Please try again.");
      return;
    }
    if (data?.user || data?.session?.user) {
      setCurrentScreen("selectRole");
      return;
    }
  };

  const handleEmailPasswordLogin = async ({ email, password }) => {
    if (!email || !password) {
      Alert.alert("Login Failed", "Please enter both email and password.");
      return;
    }
    const { data, error } = await signIn(email, password);
    if (error) {
      Alert.alert("Login Failed", error.message || "Invalid email or password.");
      return;
    }
    const userEmail = data?.user?.email || data?.session?.user?.email || email;

    const driverResult = await getDriverByEmail(userEmail);
    if (driverResult?.data?.id) {
      setDriverData({ driverId: driverResult.data.id, email: userEmail });
      setCurrentScreen("driverHome");
      return;
    }

    const studentResult = await getStudentByEmail(userEmail);
    if (studentResult?.data?.id) {
      setStudentData({ studentId: studentResult.data.id, email: userEmail });
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
    setDriverRegisterParams(null);
    setTripLiveViewData(null);
    setTripDetailsData(null);
    setStudentTripDetailsData(null);
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

    if (currentScreen === "onboarding") {
      return (
        <OnboardingScreen
          language={language}
          onFinish={handleFinishOnboarding}
        />
      );
    }

    if (currentScreen === "selectRole") {
      return (
        <SelectRoleScreen
          language={language}
          onLanguageChange={setLanguage}
          onBack={() => setCurrentScreen("onboarding")}
          onRoleSelect={(role) => {
            if (role === "student") {
              setCurrentScreen("studentRegister");
            } else if (role === "driver") {
              setCurrentScreen("driverRegister");
            }
          }}
        />
      );
    }

    if (currentScreen === "studentRegister") {
      return (
        <StudentRegisterScreen
          language={language}
          onLanguageChange={setLanguage}
          onBack={() => setCurrentScreen("selectRole")}
          onSuccess={(data) => {
            console.log("Student registered successfully:", data);
            setStudentData({
              studentId: data.studentId,
              email: data.email,
            });
            setCurrentScreen("studentHome");
          }}
        />
      );
    }

    if (currentScreen === "studentHome") {
      return (
        <StudentHomeScreen
          studentId={studentData?.studentId}
          language={language}
          onNavigateToTripDetails={(tripData) => {
            const hasValidPayload =
              isValidCoordinate(tripData?.homeLocation) &&
              isValidCoordinate(tripData?.destinationLocation);

            if (!hasValidPayload) {
              Alert.alert("Trip Data Error", "Trip details are incomplete.");
              return;
            }

            setStudentTripDetailsData(tripData);
            setCurrentScreen("studentTripDetails");
          }}
          onNavigateToProfile={() => setCurrentScreen("studentProfile")}
          onFocus={(refreshFn) => {
            // Store refresh function to call when returning from trip details
            studentHomeRefreshRef.current = refreshFn;
          }}
        />
      );
    }

    if (currentScreen === "studentProfile") {
      return (
        <ProfileScreen
          studentId={studentData?.studentId}
          language={language}
          onLogout={handleLogout}
          onBack={() => {
            setCurrentScreen("studentHome");
            if (studentHomeRefreshRef.current) {
              studentHomeRefreshRef.current();
            }
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
            // Refresh booking status when returning from trip details
            if (studentHomeRefreshRef.current) {
              studentHomeRefreshRef.current();
            }
          }}
        />
      );
    }

    if (currentScreen === "driverRegister") {
      return (
        <DriverRegisterScreen
          language={language}
          onLanguageChange={setLanguage}
          onBack={() => setCurrentScreen("selectRole")}
          onSuccess={(data) => {
            console.log("Driver registered:", data);
            if (data.isDriver) {
              setDriverData({ driverId: data.driverId, email: data.email });
              setCurrentScreen("driverHome");
            }
          }}
        />
      );
    }

    if (currentScreen === "driverHome") {
      return (
        <DriverTabNavigator
          driverId={driverData?.driverId}
          language={language}
          onLogout={handleLogout}
          onTripPress={async (tripData) => {
            try {
              if (tripData?.id && driverData?.driverId) {
                await startAssignedTrip({
                  tripId: tripData.id,
                  driverId: driverData.driverId,
                });
              }
            } catch (_error) {
              Alert.alert(
                "Trip start sync failed",
                "Trip will start in live view, but server sync could not be completed.",
              );
            }

            setTripLiveViewData({
              ...tripData,
              status: "trip_started",
            });
            setCurrentScreen("tripLiveView");
          }}
        />
      );
    }

    if (currentScreen === "driverProfile") {
      return (
        <DriverProfileScreen
          driverId={driverData?.driverId}
          language={language}
          onLogout={handleLogout}
          onBack={() => setCurrentScreen("driverHome")}
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

    return null;
  };

  return <SafeAreaProvider>{renderScreen()}</SafeAreaProvider>;
}
