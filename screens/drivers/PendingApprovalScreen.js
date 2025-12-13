import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { subscribeToDriverApproval, checkDriverStatus } from '../../src/services/driverApprovalService';
import { getDriverById } from '../../src/services/driverService';

const translations = {
  en: {
    title: 'Pending Verification',
    subtitle: 'Your registration is under review',
    message: 'We are reviewing your driver registration. You will be notified once your account is approved.',
    status: 'Status',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    refresh: 'Refresh Status',
    refreshing: 'Refreshing...',
    approvedTitle: 'Account Approved',
    approvedMessage: 'Your driver account has been approved! You can now start using the app.',
    rejectedTitle: 'Account Rejected',
    rejectedMessage: 'Your driver account has been rejected. Please contact support for more information.',
    ok: 'OK',
    error: 'Error',
    errorMessage: 'Failed to check status',
  },
  ar: {
    title: 'قيد المراجعة',
    subtitle: 'تسجيلك قيد المراجعة',
    message: 'نحن نراجع تسجيل السائق الخاص بك. سيتم إشعارك بمجرد الموافقة على حسابك.',
    status: 'الحالة',
    pending: 'قيد الانتظار',
    approved: 'موافق عليه',
    rejected: 'مرفوض',
    refresh: 'تحديث الحالة',
    refreshing: 'جاري التحديث...',
    approvedTitle: 'تمت الموافقة على الحساب',
    approvedMessage: 'تمت الموافقة على حساب السائق الخاص بك! يمكنك الآن البدء في استخدام التطبيق.',
    rejectedTitle: 'تم رفض الحساب',
    rejectedMessage: 'تم رفض حساب السائق الخاص بك. يرجى الاتصال بالدعم لمزيد من المعلومات.',
    ok: 'حسناً',
    error: 'خطأ',
    errorMessage: 'فشل التحقق من الحالة',
  },
};

const PendingApprovalScreen = ({ driverId, language = 'en', onApproved, onRejected }) => {
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const subscriptionRef = useRef(null);

  const t = translations[language];

  useEffect(() => {
    if (driverId) {
      loadDriver();
      subscribeToStatusUpdates();
    }

    return () => {
      if (subscriptionRef.current) {
        // Unsubscribe from real-time updates
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [driverId]);

  const loadDriver = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: driverError } = await getDriverById(driverId);

      if (driverError) {
        console.error('Error loading driver:', driverError);
        setError(t.errorMessage);
      } else if (data) {
        setDriver(data);
        checkStatusAndNavigate(data.status);
      }
    } catch (err) {
      console.error('Exception loading driver:', err);
      setError(t.errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToStatusUpdates = () => {
    if (!driverId) return;

    try {
      const channel = subscribeToDriverApproval(driverId, (updatedDriver) => {
        console.log('Driver status updated:', updatedDriver);
        setDriver(updatedDriver);
        checkStatusAndNavigate(updatedDriver.status);
      });

      subscriptionRef.current = channel;
    } catch (err) {
      console.error('Error subscribing to status updates:', err);
    }
  };

  const checkStatusAndNavigate = (status) => {
    if (status === 'APPROVED' && onApproved) {
      Alert.alert(
        t.approvedTitle,
        t.approvedMessage,
        [
          {
            text: t.ok,
            onPress: () => {
              onApproved();
            },
          },
        ]
      );
    } else if (status === 'REJECTED' && onRejected) {
      Alert.alert(
        t.rejectedTitle,
        t.rejectedMessage,
        [
          {
            text: t.ok,
            onPress: () => {
              onRejected();
            },
          },
        ]
      );
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data: status, error: statusError } = await checkDriverStatus(driverId);

      if (statusError) {
        Alert.alert(
          t.error,
          t.errorMessage,
          [{ text: t.ok }]
        );
      } else {
        // Reload full driver data
        await loadDriver();
      }
    } catch (err) {
      console.error('Error refreshing status:', err);
      Alert.alert(
        t.error,
        t.errorMessage,
        [{ text: t.ok }]
      );
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED':
        return '#10B981';
      case 'REJECTED':
        return '#EF4444';
      case 'PENDING':
      default:
        return '#F59E0B';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'check-circle';
      case 'REJECTED':
        return 'cancel';
      case 'PENDING':
      default:
        return 'schedule';
    }
  };

  if (loading && !driver) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3185FC" />
          <Text style={styles.loadingText}>
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="pending" size={64} color="#F59E0B" />
          </View>
          <Text style={[styles.title, language === 'ar' && styles.rtl]}>
            {t.title}
          </Text>
          <Text style={[styles.subtitle, language === 'ar' && styles.rtl]}>
            {t.subtitle}
          </Text>
        </View>

        {/* Status Card */}
        {driver && (
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <MaterialIcons
                name={getStatusIcon(driver.status)}
                size={32}
                color={getStatusColor(driver.status)}
              />
              <View style={styles.statusInfo}>
                <Text style={[styles.statusLabel, language === 'ar' && styles.rtl]}>
                  {t.status}
                </Text>
                <Text
                  style={[
                    styles.statusValue,
                    { color: getStatusColor(driver.status) },
                    language === 'ar' && styles.rtl,
                  ]}
                >
                  {driver.status === 'PENDING' && t.pending}
                  {driver.status === 'APPROVED' && t.approved}
                  {driver.status === 'REJECTED' && t.rejected}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Message */}
        <View style={styles.messageContainer}>
          <Text style={[styles.messageText, language === 'ar' && styles.rtl]}>
            {t.message}
          </Text>
        </View>

        {/* Driver Info */}
        {driver && (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MaterialIcons name="person" size={20} color="#666666" />
              <Text style={[styles.infoLabel, language === 'ar' && styles.rtl]}>
                {driver.fullname}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={20} color="#666666" />
              <Text style={[styles.infoLabel, language === 'ar' && styles.rtl]}>
                {driver.email}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="phone" size={20} color="#666666" />
              <Text style={[styles.infoLabel, language === 'ar' && styles.rtl]}>
                {driver.phone}
              </Text>
            </View>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={24} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Refresh Button */}
        <TouchableOpacity
          style={[styles.refreshButton, refreshing && styles.refreshButtonDisabled]}
          onPress={handleRefresh}
          disabled={refreshing}
          activeOpacity={0.8}
        >
          {refreshing ? (
            <ActivityIndicator color="#3185FC" />
          ) : (
            <>
              <MaterialIcons name="refresh" size={20} color="#3185FC" />
              <Text style={styles.refreshButtonText}>{t.refresh}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 20 : 40,
    marginBottom: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3185FC',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  rtl: {
    textAlign: 'right',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  messageContainer: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  messageText: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#1A1A1A',
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    flex: 1,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3185FC',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshButtonText: {
    color: '#3185FC',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PendingApprovalScreen;

