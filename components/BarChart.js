import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48; // Account for padding

const BarChart = ({ data, label, unit, color = '#3185FC', maxValue, language = 'en' }) => {
  // Calculate max value if not provided
  const calculatedMax = maxValue || Math.max(...data.map(item => item.value), 1);
  const barWidth = (CHART_WIDTH - (data.length - 1) * 8) / data.length - 16; // Account for spacing

  return (
    <View style={styles.container}>
      <Text style={[styles.label, language === 'ar' && styles.rtl]}>{label}</Text>
      <View style={styles.chartContainer}>
        {/* Bars */}
        <View style={styles.barsContainer}>
          {data.map((item, index) => {
            const barHeight = (item.value / calculatedMax) * 150; // Max bar height 150px
            return (
              <View key={index} style={styles.barWrapper}>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(barHeight, 4), // Minimum 4px for visibility
                        width: barWidth,
                        backgroundColor: color,
                      },
                    ]}
                  />
                  {item.value > 0 && (
                    <Text style={styles.barValue}>{item.value}</Text>
                  )}
                </View>
                <Text style={[styles.monthLabel, language === 'ar' && styles.rtl]}>
                  {item.month}
                </Text>
              </View>
            );
          })}
        </View>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          <Text style={styles.yAxisLabel}>{calculatedMax}</Text>
          <Text style={styles.yAxisLabel}>{Math.round(calculatedMax / 2)}</Text>
          <Text style={styles.yAxisLabel}>0</Text>
        </View>
      </View>
      {unit && (
        <Text style={[styles.unit, language === 'ar' && styles.rtl]}>
          {unit}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  rtl: {
    textAlign: 'right',
  },
  chartContainer: {
    flexDirection: 'row',
    height: 200,
    marginBottom: 8,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  bar: {
    borderRadius: 4,
    minHeight: 4,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#111827',
    marginTop: 4,
  },
  monthLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  yAxis: {
    width: 30,
    justifyContent: 'space-between',
    paddingRight: 8,
    alignItems: 'flex-end',
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  unit: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
});

export default BarChart;

