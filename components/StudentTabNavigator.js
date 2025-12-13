import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StudentHomeScreen from '../screens/students/StudentHomeScreen';
import HistoryScreen from '../screens/students/HistoryScreen';
import ProfileScreen from '../screens/students/ProfileScreen';
import BottomTabNavigator from './BottomTabNavigator';

const StudentTabNavigator = ({
  studentId,
  isDemo = false,
  language = 'en',
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState('home');

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <StudentHomeScreen
            studentId={studentId}
            isDemo={isDemo}
            language={language}
          />
        );
      case 'history':
        return (
          <HistoryScreen
            studentId={studentId}
            isDemo={isDemo}
            language={language}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            studentId={studentId}
            isDemo={isDemo}
            language={language}
            onLogout={onLogout}
          />
        );
      default:
        return (
          <StudentHomeScreen
            studentId={studentId}
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

export default StudentTabNavigator;

