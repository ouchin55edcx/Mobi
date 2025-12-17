import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DriverHomeScreen from '../screens/drivers/DriverHomeScreen';
import DriverHistoryScreen from '../screens/drivers/DriverHistoryScreen';
import DriverProfileScreen from '../screens/drivers/DriverProfileScreen';
import BottomTabNavigator from './BottomTabNavigator';

const DriverTabNavigator = ({
  driverId,
  isDemo = false,
  language = 'en',
  onLogout,
  onTripPress,
  onSkipToProfile,
}) => {
  const [activeTab, setActiveTab] = useState('home');

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <DriverHomeScreen
            driverId={driverId}
            isDemo={isDemo}
            language={language}
            onTripPress={onTripPress}
            onSkipToProfile={() => setActiveTab('profile')}
          />
        );
      case 'history':
        return (
          <DriverHistoryScreen
            driverId={driverId}
            isDemo={isDemo}
            language={language}
          />
        );
      case 'profile':
        return (
          <DriverProfileScreen
            driverId={driverId}
            isDemo={isDemo}
            language={language}
            onLogout={onLogout}
          />
        );
      default:
        return (
          <DriverHomeScreen
            driverId={driverId}
            isDemo={isDemo}
            language={language}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.screenContainer} edges={['top', 'left', 'right']}>
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
    backgroundColor: '#FFFFFF',
  },
  screenContainer: {
    flex: 1,
  },
});

export default DriverTabNavigator;

