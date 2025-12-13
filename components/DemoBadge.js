import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const DemoBadge = ({ language = 'en' }) => {
  return (
    <View style={styles.badge}>
      <MaterialIcons name="info" size={14} color="#F59E0B" />
      <Text style={styles.badgeText}>
        {language === 'ar' ? 'عرض توضيحي' : 'DEMO'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
});

export default DemoBadge;

