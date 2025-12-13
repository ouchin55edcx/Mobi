import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48;

const LineChart = ({ data, label, unit, color = '#3185FC', maxValue, language = 'en' }) => {
  const calculatedMax = maxValue || Math.max(...data.map(item => item.value), 1);
  const chartHeight = 150;
  const pointRadius = 4;
  const spacing = (CHART_WIDTH - 60) / (data.length - 1 || 1); // Account for padding

  // Generate path for line
  const points = data.map((item, index) => {
    const x = 30 + index * spacing;
    const y = chartHeight - (item.value / calculatedMax) * chartHeight;
    return { x, y, value: item.value };
  });

  return (
    <View style={styles.container}>
      <Text style={[styles.label, language === 'ar' && styles.rtl]}>{label}</Text>
      <View style={styles.chartContainer}>
        <View style={[styles.chart, { height: chartHeight }]}>
          {/* Grid lines */}
          <View style={styles.gridLine} />
          <View style={[styles.gridLine, { top: chartHeight / 2 }]} />
          <View style={[styles.gridLine, { top: chartHeight }]} />

          {/* Line */}
          {points.length > 1 && (
            <View style={styles.lineContainer}>
              {points.map((point, index) => {
                if (index === 0) return null;
                const prevPoint = points[index - 1];
                const length = Math.sqrt(
                  Math.pow(point.x - prevPoint.x, 2) + Math.pow(point.y - prevPoint.y, 2)
                );
                const angle = Math.atan2(point.y - prevPoint.y, point.x - prevPoint.x) * (180 / Math.PI);

                return (
                  <View
                    key={`line-${index}`}
                    style={[
                      styles.line,
                      {
                        left: prevPoint.x,
                        top: prevPoint.y,
                        width: length,
                        transform: [{ rotate: `${angle}deg` }],
                        backgroundColor: color,
                      },
                    ]}
                  />
                );
              })}
            </View>
          )}

          {/* Points */}
          {points.map((point, index) => (
            <View
              key={index}
              style={[
                styles.point,
                {
                  left: point.x - pointRadius,
                  top: point.y - pointRadius,
                  backgroundColor: color,
                },
              ]}
            >
              {point.value > 0 && (
                <View style={styles.pointValue}>
                  <Text style={styles.pointValueText}>{point.value}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* X-axis labels */}
        <View style={styles.xAxis}>
          {data.map((item, index) => (
            <Text key={index} style={[styles.monthLabel, language === 'ar' && styles.rtl]}>
              {item.month}
            </Text>
          ))}
        </View>

        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          <Text style={styles.yAxisLabel}>{calculatedMax}</Text>
          <Text style={styles.yAxisLabel}>{Math.round(calculatedMax / 2)}</Text>
          <Text style={styles.yAxisLabel}>0</Text>
        </View>
      </View>
      {unit && (
        <Text style={[styles.unit, language === 'ar' && styles.rtl]}>{unit}</Text>
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
    marginBottom: 8,
  },
  chart: {
    flex: 1,
    position: 'relative',
    marginLeft: 30,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  lineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  line: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left center',
  },
  point: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pointValue: {
    position: 'absolute',
    top: -20,
    left: -10,
    backgroundColor: '#111827',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pointValueText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  xAxis: {
    position: 'absolute',
    bottom: -20,
    left: 30,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  monthLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    flex: 1,
  },
  yAxis: {
    width: 30,
    justifyContent: 'space-between',
    paddingRight: 8,
    alignItems: 'flex-end',
    marginTop: -150,
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  unit: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 24,
  },
});

export default LineChart;

