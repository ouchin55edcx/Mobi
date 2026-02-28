import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const DateTimePickerComponent = ({
  value,
  onSelect,
  label,
  language = 'en',
  error = null,
  disabled = false,
  minimumDate = null,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tempDateTime, setTempDateTime] = useState(value || new Date());
  const [pickerMode, setPickerMode] = useState('date'); // 'date' or 'time'
  const [showAndroidDatePicker, setShowAndroidDatePicker] = useState(false);
  const [showAndroidTimePicker, setShowAndroidTimePicker] = useState(false);

  const formatDate = (date) => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (date) => {
    if (!date) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDateTime = (date) => {
    if (!date) return '';
    return `${formatDate(date)} ${formatTime(date)}`;
  };

  const handleOpen = () => {
    setTempDateTime(value || new Date());
    if (Platform.OS === 'android') {
      setShowAndroidDatePicker(true);
    } else {
      setPickerMode('date');
      setIsVisible(true);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowAndroidDatePicker(false);
      if (event.type === 'set' && selectedDate) {
        const newDateTime = new Date(selectedDate);
        // Preserve time if already set
        if (value) {
          newDateTime.setHours(value.getHours());
          newDateTime.setMinutes(value.getMinutes());
        }
        setTempDateTime(newDateTime);
        // Show time picker after date is selected
        setTimeout(() => setShowAndroidTimePicker(true), 100);
      }
    } else if (Platform.OS === 'ios') {
      if (selectedDate) {
        setTempDateTime(selectedDate);
      }
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowAndroidTimePicker(false);
      if (event.type === 'set' && selectedTime) {
        const newDateTime = new Date(tempDateTime);
        newDateTime.setHours(selectedTime.getHours());
        newDateTime.setMinutes(selectedTime.getMinutes());
        onSelect(newDateTime);
      }
    } else if (Platform.OS === 'ios') {
      if (selectedTime) {
        const newDateTime = new Date(tempDateTime);
        newDateTime.setHours(selectedTime.getHours());
        newDateTime.setMinutes(selectedTime.getMinutes());
        setTempDateTime(newDateTime);
      }
    }
  };

  const handleConfirm = () => {
    onSelect(tempDateTime);
    setIsVisible(false);
  };

  const handleCancel = () => {
    setTempDateTime(value || new Date());
    setIsVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.pickerButton,
          error && styles.pickerButtonError,
          disabled && styles.pickerButtonDisabled,
        ]}
        onPress={() => !disabled && handleOpen()}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <View style={styles.pickerContent}>
          <MaterialIcons
            name="event"
            size={20}
            color={error ? '#EF4444' : '#3185FC'}
          />
          <Text
            style={[
              styles.pickerText,
              !value && styles.pickerPlaceholder,
              language === 'ar' && styles.rtl,
            ]}
          >
            {value
              ? formatDateTime(value)
              : language === 'ar'
              ? 'اختر التاريخ والوقت'
              : 'Select date & time'}
          </Text>
        </View>
        <MaterialIcons
          name="keyboard-arrow-down"
          size={24}
          color={error ? '#EF4444' : '#666666'}
        />
      </TouchableOpacity>
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

      {/* DateTime Picker Modal */}
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {language === 'ar'
                  ? pickerMode === 'date'
                    ? 'اختر التاريخ'
                    : 'اختر الوقت'
                  : pickerMode === 'date'
                  ? 'Select Date'
                  : 'Select Time'}
              </Text>
              <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              {Platform.OS === 'ios' && (
                <>
                  <DateTimePicker
                    value={tempDateTime}
                    mode="date"
                    display="spinner"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        setTempDateTime(selectedDate);
                      }
                    }}
                    minimumDate={minimumDate}
                    style={styles.iosPicker}
                  />
                  <DateTimePicker
                    value={tempDateTime}
                    mode="time"
                    display="spinner"
                    onChange={(event, selectedTime) => {
                      if (selectedTime) {
                        const newDateTime = new Date(tempDateTime);
                        newDateTime.setHours(selectedTime.getHours());
                        newDateTime.setMinutes(selectedTime.getMinutes());
                        setTempDateTime(newDateTime);
                      }
                    }}
                    style={styles.iosPicker}
                  />
                </>
              )}
            </View>

            {Platform.OS === 'ios' && (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmButtonText}>
                    {language === 'ar' ? 'تأكيد' : 'Confirm'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Android Native Pickers */}
      {Platform.OS === 'android' && showAndroidDatePicker && (
        <DateTimePicker
          value={tempDateTime}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={minimumDate}
        />
      )}
      {Platform.OS === 'android' && showAndroidTimePicker && (
        <DateTimePicker
          value={tempDateTime}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
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
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingRight: 0,
  },
  pickerButtonError: {
    // Error styling handled by underline
  },
  pickerButtonDisabled: {
    opacity: 0.5,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pickerText: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  pickerPlaceholder: {
    color: '#999999',
    fontWeight: '400',
  },
  rtl: {
    textAlign: 'right',
  },
  underline: {
    height: 2,
    marginTop: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  pickerContainer: {
    padding: 20,
    alignItems: 'center',
  },
  iosPicker: {
    width: '100%',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3185FC',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default DateTimePickerComponent;

