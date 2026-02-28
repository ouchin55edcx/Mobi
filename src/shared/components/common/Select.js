import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const Select = ({
  label,
  placeholder,
  value,
  options = [],
  onSelect,
  icon,
  hasError,
  language = 'en',
  disabled = false,
  renderItem,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option) => {
    onSelect(option);
    setIsOpen(false);
  };

  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : '';

  return (
    <View style={styles.container}>
      <Text style={[styles.label, language === 'ar' && styles.rtl]}>{label}</Text>
      
      <TouchableOpacity
        style={[
          styles.selectButton,
          hasError && styles.selectButtonError,
          disabled && styles.selectButtonDisabled,
        ]}
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={styles.selectButtonContent}>
          {icon && (
            <MaterialIcons
              name={icon}
              size={20}
              color={value ? '#3185FC' : '#9CA3AF'}
              style={styles.icon}
            />
          )}
          <Text
            style={[
              styles.selectButtonText,
              !value && styles.selectButtonTextPlaceholder,
              language === 'ar' && styles.rtl,
            ]}
          >
            {value ? displayValue : placeholder}
          </Text>
        </View>
        <MaterialIcons
          name="arrow-drop-down"
          size={24}
          color={value ? '#3185FC' : '#9CA3AF'}
        />
      </TouchableOpacity>

      {hasError && <Text style={styles.errorText}>{hasError}</Text>}

      <View
        style={[
          styles.underline,
          hasError
            ? styles.underlineError
            : value
            ? styles.underlineActive
            : styles.underlineInactive,
        ]}
      />

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, language === 'ar' && styles.rtl]}>
                {label}
              </Text>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    value === item.value && styles.optionItemSelected,
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  {renderItem ? (
                    renderItem(item, value === item.value)
                  ) : (
                    <>
                      <Text
                        style={[
                          styles.optionText,
                          value === item.value && styles.optionTextSelected,
                          language === 'ar' && styles.rtl,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {value === item.value && (
                        <MaterialIcons name="check" size={20} color="#3185FC" />
                      )}
                    </>
                  )}
                </TouchableOpacity>
              )}
              style={styles.optionsList}
            />
          </View>
        </View>
      </Modal>
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
  rtl: {
    textAlign: 'right',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderRadius: 0,
  },
  selectButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 12,
  },
  selectButtonText: {
    fontSize: 16,
    color: '#1A1A1A',
    flex: 1,
  },
  selectButtonTextPlaceholder: {
    color: '#999999',
  },
  selectButtonError: {
    // Error styling handled by underline
  },
  selectButtonDisabled: {
    opacity: 0.5,
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
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 4,
  },
  optionsList: {
    maxHeight: 400,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionItemSelected: {
    backgroundColor: '#F0F7FF',
  },
  optionText: {
    fontSize: 16,
    color: '#1A1A1A',
    flex: 1,
  },
  optionTextSelected: {
    color: '#3185FC',
    fontWeight: '600',
  },
});

export default Select;

