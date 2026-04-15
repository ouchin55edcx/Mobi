import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DriverHomeScreen from "../screens/driver/DriverHomeScreen";
import DriverProfileScreen from "../screens/driver/DriverProfileScreen";
import BottomTabNavigator from "./BottomTabNavigator";

const DriverTabNavigator = ({
  driverId,
  language = "en",
  onLogout,
  onTripPress,
  onSkipToProfile,
}) => {
  const [activeTab, setActiveTab] = useState("home");

  const renderScreen = () => {
    switch (activeTab) {
      case "home":
        return (
          <DriverHomeScreen
            driverId={driverId}
            language={language}
            onTripPress={onTripPress}
            onSkipToProfile={() => setActiveTab("profile")}
          />
        );
      case "profile":
        return (
          <DriverProfileScreen
            driverId={driverId}
            language={language}
            onLogout={onLogout}
          />
        );
      default:
        return <DriverHomeScreen driverId={driverId} language={language} />;
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.screenContainer} edges={[]}>
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

export default DriverTabNavigator;
