import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

const translations = {
  en: {
    title: 'Students',
    pending: 'Pending',
    picked: 'Picked',
    call: 'Call',
    close: 'Close',
  },
  ar: {
    title: 'الطلاب',
    pending: 'في الانتظار',
    picked: 'تم الاستلام',
    call: 'اتصال',
    close: 'إغلاق',
  },
};

const StudentPickupModal = ({
  visible,
  onClose,
  students = [],
  language = 'en',
  onCall,
}) => {
  const t = translations[language];
  const isRTL = language === 'ar';

  const handleCall = (phone) => {
    if (onCall) {
      onCall(phone);
    } else {
      Linking.openURL(`tel:${phone}`).catch((err) => {
        console.error('Error opening phone:', err);
      });
    }
  };

  const renderStudentItem = ({ item }) => (
    <View style={[styles.studentItem, isRTL && styles.studentItemRTL]}>
      <View style={styles.studentInfo}>
        <View style={[
          styles.studentOrderBadge,
          item.status === 'picked' && styles.studentOrderBadgePicked,
        ]}>
          <Text style={[
            styles.studentOrderText,
            item.status === 'picked' && styles.studentOrderTextPicked,
          ]}>
            {item.order}
          </Text>
        </View>
        <View style={styles.studentDetails}>
          <Text style={[styles.studentName, isRTL && styles.rtl]}>
            {item.name}
          </Text>
          <View style={styles.studentStatusRow}>
            <View style={[
              styles.statusDot,
              item.status === 'picked' ? styles.statusDotPicked : styles.statusDotPending,
            ]} />
            <Text style={[styles.studentStatus, isRTL && styles.rtl]}>
              {item.status === 'picked' ? t.picked : t.pending}
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={styles.callButton}
        onPress={() => handleCall(item.phone)}
        activeOpacity={0.7}
      >
        <MaterialIcons name="phone" size={20} color="#3185FC" />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, isRTL && styles.rtl]}>
              {t.title} ({students.length})
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          {/* Students List */}
          <FlatList
            data={students.sort((a, b) => a.order - b.order)}
            renderItem={renderStudentItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  studentItemRTL: {
    flexDirection: 'row-reverse',
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  studentOrderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3185FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentOrderBadgePicked: {
    backgroundColor: '#10B981',
  },
  studentOrderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  studentOrderTextPicked: {
    color: '#FFFFFF',
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  studentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotPending: {
    backgroundColor: '#F59E0B',
  },
  statusDotPicked: {
    backgroundColor: '#10B981',
  },
  studentStatus: {
    fontSize: 12,
    color: '#666666',
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rtl: {
    textAlign: 'right',
  },
});

export default StudentPickupModal;

