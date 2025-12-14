import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

const BottomTabNavigator = ({ activeTab, onTabChange, language = 'en' }) => {
  const tabs = [
    {
      id: 'home',
      label: language === 'ar' ? 'الرئيسية' : 'Home',
      icon: 'home',
      activeIcon: 'home',
    },
    {
      id: 'history',
      label: language === 'ar' ? 'الرحلات' : 'Trips',
      icon: 'directions-car',
      activeIcon: 'directions-car',
    },
    {
      id: 'profile',
      label: language === 'ar' ? 'الملف الشخصي' : 'Profile',
      icon: 'person',
      activeIcon: 'person',
    },
    {
      id: 'explore',
      label: language === 'ar' ? 'استكشف' : 'Explore',
      icon: 'send',
      activeIcon: 'send',
    },
  ];

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => onTabChange(tab.id)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={isActive ? tab.activeIcon : tab.icon}
                size={24}
                color={isActive ? '#3185FC' : '#9CA3AF'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.activeTabLabel,
                  language === 'ar' && styles.rtl,
                ]}
              >
                {tab.label}
              </Text>
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2C2C2C',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 0 : 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 4,
  },
  activeTabLabel: {
    color: '#3185FC',
    fontWeight: '600',
  },
  rtl: {
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 3,
    backgroundColor: '#3185FC',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
});

export default BottomTabNavigator;

