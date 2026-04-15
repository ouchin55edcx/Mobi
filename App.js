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
  const [currentScreen, setCurrentScreen] = useState("login");
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

  useEffect(() => {
    // Check onboarding status and pending driver registration
    const checkStartupState = async () => {
      try {
        const value = await AsyncStorage.getItem("@has_seen_onboarding");
        setHasSeenOnboarding(value === "true");

        // Check for pending driver registration
        const pending = await AsyncStorage.getItem(
          "@pending_driver_registration",
        );
        if (pending) {
          const data = JSON.parse(pending);
          const age = Date.now() - data.timestamp;
          // If pending and less than 24 hours old, redirect to driver registration
          if (age < 24 * 60 * 60 * 1000) {
            console.log("Found pending driver registration, redirecting...");
            setCurrentScreen("driverRegister");
            setDriverData({ email: data.email });
          } else {
            // Expired, clear it
            await AsyncStorage.removeItem("@pending_driver_registration");
          }
        }
      } catch (e) {
        setHasSeenOnboarding(false);
      }
    };
    checkStartupState();
  }, []);

  useEffect(() => {
    // Wait for fonts to load before showing the app
    if (fontsLoaded || fontError) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        // If onboarding is not seen, switch to onboarding screen
        if (hasSeenOnboarding === false) {
          setCurrentScreen("onboarding");
        }
      }, 3000); // 3 seconds

      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, fontError, hasSeenOnboarding]);

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
      try {
        const { data, error } = await getSession();

        if (data?.session?.user?.email) {
          const userEmail = data.session.user.email;

          const driverResult = await getDriverByEmail(userEmail);
          if (driverResult?.data?.id) {
            setDriverData({
              driverId: driverResult.data.id,
              email: userEmail,
            });
            setCurrentScreen("driverHome");
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
        }

        // Fallback: check local registration storage
        const localEmail = await AsyncStorage.getItem(
          "@registered_student_email",
        );
        const localId = await AsyncStorage.getItem("@registered_student_id");
        if (localEmail && localId) {
          const studentResult = await getStudentByEmail(localEmail);
          if (studentResult?.data?.id) {
            setStudentData({
              studentId: studentResult.data.id,
              email: localEmail,
            });
            setCurrentScreen("studentHome");
            setIsBootstrappingAuth(false);
            return;
          }
        }

        const localDriverEmail = await AsyncStorage.getItem(
          "@registered_driver_email",
        );
        const localDriverId = await AsyncStorage.getItem(
          "@registered_driver_id",
        );
        if (localDriverEmail && localDriverId) {
          const driverResult = await getDriverByEmail(localDriverEmail);
          if (driverResult?.data?.id) {
            setDriverData({
              driverId: driverResult.data.id,
              email: localDriverEmail,
            });
            setCurrentScreen("driverHome");
            setIsBootstrappingAuth(false);
            return;
          }
        }
      } catch (e) {
        // Fall through to login if restore fails
      } finally {
        setIsBootstrappingAuth(false);
      }
    };

    restoreSession();
  }, []);

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

    Alert.alert(
      "Google Login Failed",
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

      setCurrentScreen("driverHome");
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

  const handleSplashComplete = (targetScreen, params = null) => {
    setShowSplash(false);
    setCurrentScreen(targetScreen);
  };

  const renderScreen = () => {
    if (showSplash) {
      return <SplashScreen onSplashComplete={handleSplashComplete} />;
    }

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
          onBack={() => setCurrentScreen("studentHome")}
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
