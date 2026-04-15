import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { UbuntuFonts } from "../shared/utils/fonts";

const BottomTabNavigator = ({
  activeTab,
  onTabChange,
  language = "en",
  notifications = [],
}) => {
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const tabs = [
    {
      id: "home",
      label: "Home",
      icon: "home",
      activeIcon: "home",
    },
    {
      id: "profile",
      label: language === "ar" ? "الملف الشخصي" : "Profile",
      icon: "person-outline",
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
                  color="#FFFFFF"
                />
                {tab.id === "home" && unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {Math.min(unreadCount, 9)}
                    </Text>
                  </View>
                )}
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
    backgroundColor: "#3185FC",
    borderRadius: 26,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#3185FC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    position: "relative",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    position: "relative",
  },
  iconWrapActive: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 8,
    width: 20,
    height: 3,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: UbuntuFonts.bold,
  },
});

export default BottomTabNavigator;
