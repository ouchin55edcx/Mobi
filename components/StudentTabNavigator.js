import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import StudentHomeScreen from "../screens/students/StudentHomeScreen";
import HistoryScreen from "../screens/students/HistoryScreen";
import ProfileScreen from "../screens/students/ProfileScreen";
import BottomTabNavigator from "./BottomTabNavigator";

const StudentTabNavigator = ({
  studentId,
  isDemo = false,
  language = "en",
  onLogout,
  onNavigateToTripDetails,
}) => {
  const [activeTab, setActiveTab] = useState("home");

  const renderScreen = () => {
    switch (activeTab) {
      case "home":
        return (
          <StudentHomeScreen
            studentId={studentId}
            isDemo={isDemo}
            language={language}
            onNavigateToTripDetails={onNavigateToTripDetails}
            onNavigateToProfile={() => setActiveTab("profile")}
          />
        );
      case "history":
        return (
          <HistoryScreen
            studentId={studentId}
            isDemo={isDemo}
            language={language}
          />
        );
      case "profile":
        return (
          <ProfileScreen
            studentId={studentId}
            isDemo={isDemo}
            language={language}
            onLogout={onLogout}
          />
        );
      case "explore":
        // For now, show history screen as explore
        return (
          <HistoryScreen
            studentId={studentId}
            isDemo={isDemo}
            language={language}
          />
        );
      default:
        return (
          <StudentHomeScreen
            studentId={studentId}
            isDemo={isDemo}
            language={language}
            onNavigateToProfile={() => setActiveTab("profile")}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView
        style={styles.screenContainer}
        edges={["top", "left", "right"]}
      >
        {renderScreen()}
      </SafeAreaView>
      <BottomTabNavigator
        activeTab={activeTab}
        onTabChange={setActiveTab}
        language={language}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  screenContainer: {
    flex: 1,
  },
});

export default StudentTabNavigator;
