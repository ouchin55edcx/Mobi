import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { UbuntuFonts } from "../../utils/fonts";

const DriverRegistrationProgressBar = ({ currentStep, totalSteps = 3, language = 'en' }) => {
  const progressAnim = useRef(new Animated.Value((currentStep - 1) / (totalSteps - 1) * 100)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: ((currentStep - 1) / (totalSteps - 1)) * 100,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [currentStep, totalSteps]);

  const steps = [
    {
      number: 1,
      icon: 'account-outline',
      label: language === 'ar' ? 'معلومات السائق' : 'Driver',
    },
    {
      number: 2,
      icon: 'bus-side',
      label: language === 'ar' ? 'معلومات الحافلة' : 'Vehicle',
    },
    {
      number: 3,
      icon: 'shield-check-outline',
      label: language === 'ar' ? 'التحقق' : 'Verify',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.stepIndicator}>
        {/* Progress Bar Background Line */}
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.trackFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        {/* Circles */}
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === currentStep;
            const isCompleted = stepNumber < currentStep;

            return (
              <View key={index} style={styles.stepWrapper}>
                <View
                  style={[
                    styles.circle,
                    isActive && styles.circleActive,
                    isCompleted && styles.circleCompleted,
                  ]}
                >
                  {isCompleted ? (
                    <MaterialIcons name="check" size={16} color="#FFFFFF" />
                  ) : (
                    <MaterialCommunityIcons
                      name={step.icon}
                      size={20}
                      color={isActive ? '#FFFFFF' : '#94A3B8'}
                    />
                  )}
                </View>
                <Text style={[
                  styles.label,
                  isActive && styles.labelActive,
                  isCompleted && styles.labelCompleted,
                  language === 'ar' && styles.rtl
                ]}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepIndicator: {
    height: 60,
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    top: 20, // Center of circle height (Circle height is 40)
    left: 20,
    right: 20,
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
  },
  trackFill: {
    height: '100%',
    backgroundColor: '#3185FC',
    borderRadius: 2,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepWrapper: {
    alignItems: 'center',
    width: 80,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  circleActive: {
    borderColor: '#3185FC',
    backgroundColor: '#3185FC',
    shadowColor: "#3185FC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  circleCompleted: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
  },
  label: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: UbuntuFonts.bold,
    marginTop: 8,
    textAlign: 'center',
  },
  labelActive: {
    color: '#3185FC',
  },
  labelCompleted: {
    color: '#10B981',
  },
  rtl: {
    textAlign: 'center',
  },
});

export default DriverRegistrationProgressBar;


