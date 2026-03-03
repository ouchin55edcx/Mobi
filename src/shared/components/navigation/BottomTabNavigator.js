import React from "react";
import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

const BottomTabNavigator = ({ activeTab, onTabChange, language = "en" }) => {
  const tabs = [
    {
      id: "home",
      label: "Mobi",
      icon: "directions-bus",
      activeIcon: "directions-bus",
    },
    {
      id: "profile",
      label: language === "ar" ? "الملف الشخصي" : "Profile",
      icon: "person",
      activeIcon: "person",
    },
  ];

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <View style={styles.tabShell}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => onTabChange(tab.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
            >
              <View
                style={[styles.iconWrap, isActive && styles.iconWrapActive]}
              >
                <MaterialIcons
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={22}
                  color={isActive ? "#1F2937" : "#9CA3AF"}
                />
              </View>
              {isActive ? <View style={styles.activeIndicator} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 4 : 10,
  },
  tabShell: {
    flexDirection: "row",
    height: 76,
    backgroundColor: "rgba(37, 99, 235, 0.10)",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.28)",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  iconWrapActive: {
    backgroundColor: "rgba(255,255,255,0.95)",
    shadowColor: "#93C5FD",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  activeIndicator: {
    position: "absolute",
    bottom: 9,
    width: 26,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#2563EB",
  },
});

export default BottomTabNavigator;
