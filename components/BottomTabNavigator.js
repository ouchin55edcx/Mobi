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
  ];

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map((tab, index) => {
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
                size={28}
                color={isActive ? '#1463ff' : '#8AB4FF'}
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
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  tabBar: {
    flexDirection: 'row',
    height: 68,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 4 : 12,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8AB4FF',
    marginTop: 5,
  },
  activeTabLabel: {
    color: '#1463ff',
    fontWeight: '700',
  },
  rtl: {
    textAlign: 'center',
  },
});

export default BottomTabNavigator;

