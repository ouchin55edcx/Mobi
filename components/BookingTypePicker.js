import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const BookingTypePicker = ({ value, onSelect, language = 'en', error = null, disabled = false }) => {
  const types = [
    {
      id: 'PICKUP',
      label: language === 'ar' ? 'استلام' : 'Pickup',
      labelAr: 'استلام',
      icon: 'arrow-upward',
      description: language === 'ar' ? 'من المدرسة' : 'From School',
      descriptionAr: 'من المدرسة',
      color: '#3185FC',
    },
    {
      id: 'DROPOFF',
      label: language === 'ar' ? 'توصيل' : 'Dropoff',
      labelAr: 'توصيل',
      icon: 'arrow-downward',
      description: language === 'ar' ? 'إلى المدرسة' : 'To School',
      descriptionAr: 'إلى المدرسة',
      color: '#10B981',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {language === 'ar' ? 'نوع الحجز' : 'Booking Type'}
      </Text>
      <View style={styles.typesContainer}>
        {types.map((type) => {
          const isSelected = value === type.id;
          return (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeCard,
                isSelected && styles.typeCardSelected,
                isSelected && { borderColor: type.color },
                error && !isSelected && styles.typeCardError,
                disabled && styles.typeCardDisabled,
              ]}
              onPress={() => !disabled && onSelect(type.id)}
              activeOpacity={0.7}
              disabled={disabled}
            >
              <View
                style={[
                  styles.iconContainer,
                  isSelected && { backgroundColor: type.color },
                ]}
              >
                <MaterialIcons
                  name={type.icon}
                  size={32}
                  color={isSelected ? '#FFFFFF' : type.color}
                />
              </View>
              <Text
                style={[
                  styles.typeLabel,
                  isSelected && styles.typeLabelSelected,
                  language === 'ar' && styles.rtl,
                ]}
              >
                {language === 'ar' ? type.labelAr : type.label}
              </Text>
              <Text
                style={[
                  styles.typeDescription,
                  language === 'ar' && styles.rtl,
                ]}
              >
                {language === 'ar' ? type.descriptionAr : type.description}
              </Text>
              {isSelected && (
                <View style={[styles.checkContainer, { backgroundColor: type.color }]}>
                  <MaterialIcons name="check" size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <View
        style={[
          styles.underline,
          error
            ? styles.underlineError
            : value
            ? styles.underlineActive
            : styles.underlineInactive,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typesContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  typeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    position: 'relative',
    minHeight: 160,
    justifyContent: 'center',
  },
  typeCardSelected: {
    backgroundColor: '#F0F7FF',
    shadowColor: '#3185FC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  typeCardError: {
    borderColor: '#EF4444',
  },
  typeCardDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
    textAlign: 'center',
  },
  typeLabelSelected: {
    color: '#3185FC',
  },
  typeDescription: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  rtl: {
    textAlign: 'right',
  },
  checkContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3185FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  underline: {
    height: 2,
    marginTop: 8,
  },
  underlineActive: {
    backgroundColor: '#3185FC',
  },
  underlineInactive: {
    backgroundColor: '#E0E0E0',
  },
  underlineError: {
    backgroundColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
});

export default BookingTypePicker;

