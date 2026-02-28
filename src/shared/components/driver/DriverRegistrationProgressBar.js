import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const DriverRegistrationProgressBar = ({ currentStep, totalSteps = 3, language = 'en' }) => {
  const progressAnim = useRef(new Animated.Value((currentStep / totalSteps) * 100)).current;
  
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (currentStep / totalSteps) * 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep, totalSteps]);

  const steps = [
    {
      number: 1,
      icon: 'person',
      label: language === 'ar' ? 'معلومات السائق' : 'Driver Information',
    },
    {
      number: 2,
      icon: 'directions-bus',
      label: language === 'ar' ? 'معلومات الحافلة' : 'Bus Information',
    },
    {
      number: 3,
      icon: 'verified',
      label: language === 'ar' ? 'التحقق' : 'Verification',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Progress Bar Background */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground} />
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {/* Steps */}
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <View key={index} style={styles.stepWrapper}>
              <View style={styles.stepContent}>
                {/* Step Circle */}
                <View
                  style={[
                    styles.stepCircle,
                    isActive && styles.stepCircleActive,
                    isCompleted && styles.stepCircleCompleted,
                  ]}
                >
                  {isCompleted ? (
                    <MaterialIcons name="check" size={20} color="#FFFFFF" />
                  ) : (
                    <MaterialIcons
                      name={step.icon}
                      size={20}
                      color={isActive ? '#FFFFFF' : '#9CA3AF'}
                    />
                  )}
                </View>

                {/* Step Number */}
                <Text
                  style={[
                    styles.stepNumber,
                    isActive && styles.stepNumberActive,
                    isCompleted && styles.stepNumberCompleted,
                  ]}
                >
                  {step.number}
                </Text>

                {/* Step Label */}
                <Text
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                    isCompleted && styles.stepLabelCompleted,
                    language === 'ar' && styles.rtl,
                  ]}
                  numberOfLines={2}
                >
                  {step.label}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#E5E7EB',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3185FC',
    borderRadius: 2,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  stepContent: {
    alignItems: 'center',
    width: '100%',
  },
  stepCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: '#3185FC',
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  stepNumberActive: {
    color: '#3185FC',
  },
  stepNumberCompleted: {
    color: '#10B981',
  },
  stepLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },
  stepLabelActive: {
    color: '#3185FC',
    fontWeight: '600',
  },
  stepLabelCompleted: {
    color: '#10B981',
  },
  rtl: {
    textAlign: 'center',
  },
});

export default DriverRegistrationProgressBar;

