import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getAllSchools } from '../../services/schoolService';

const SchoolPicker = ({ 
  value, 
  onSelect, 
  language = 'en', 
  error = null,
  disabled = false 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorFetching, setErrorFetching] = useState(null);

  useEffect(() => {
    const fetchSchools = async () => {
      setLoading(true);
      setErrorFetching(null);
      const result = await getAllSchools();
      
      if (result.error) {
        setErrorFetching(result.error.message || 'Failed to load schools');
        setLoading(false);
        return;
      }

      if (result.data) {
        // Map the database fields to match the component's expected format
        const mappedSchools = result.data.map(school => ({
          id: school.id,
          name: school.name,
          nameAr: school.name_ar,
        }));
        setSchools(mappedSchools);
      }
      setLoading(false);
    };

    fetchSchools();
  }, []);

  const selectedSchool = schools.find((school) => school.id === value);

  const filteredSchools = schools.filter((school) => {
    const name = language === 'ar' ? school.nameAr : school.name;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSelect = (school) => {
    onSelect(school.id);
    setIsVisible(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {language === 'ar' ? 'المدرسة' : 'School'}
      </Text>
      <TouchableOpacity
        style={[
          styles.pickerButton,
          error && styles.pickerButtonError,
          disabled && styles.pickerButtonDisabled,
        ]}
        onPress={() => !disabled && setIsVisible(true)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <Text
          style={[
            styles.pickerText,
            !selectedSchool && styles.pickerPlaceholder,
            language === 'ar' && styles.rtl,
          ]}
        >
          {selectedSchool
            ? language === 'ar'
              ? selectedSchool.nameAr
              : selectedSchool.name
            : language === 'ar'
            ? 'اختر مدرستك'
            : 'Select your school'}
        </Text>
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
          error ? styles.underlineError : selectedSchool ? styles.underlineActive : styles.underlineInactive,
        ]}
      />

      {/* School Selection Modal */}
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {language === 'ar' ? 'اختر مدرستك' : 'Select Your School'}
              </Text>
              <TouchableOpacity
                onPress={() => setIsVisible(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <MaterialIcons name="search" size={20} color="#999999" />
              <TextInput
                style={styles.searchInput}
                placeholder={language === 'ar' ? 'ابحث عن مدرسة...' : 'Search schools...'}
                placeholderTextColor="#999999"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
            </View>

            {/* Schools List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3185FC" />
                <Text style={styles.loadingText}>
                  {language === 'ar' ? 'جاري التحميل...' : 'Loading schools...'}
                </Text>
              </View>
            ) : errorFetching ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={48} color="#EF4444" />
                <Text style={styles.errorText}>
                  {errorFetching}
                </Text>
              </View>
            ) : filteredSchools.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {language === 'ar' ? 'لا توجد مدارس' : 'No schools found'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredSchools}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.schoolItem,
                      value === item.id && styles.schoolItemSelected,
                    ]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.schoolName,
                        value === item.id && styles.schoolNameSelected,
                        language === 'ar' && styles.rtl,
                      ]}
                    >
                      {language === 'ar' ? item.nameAr : item.name}
                    </Text>
                    {value === item.id && (
                      <MaterialIcons name="check" size={20} color="#3185FC" />
                    )}
                  </TouchableOpacity>
                )}
                style={styles.schoolsList}
                showsVerticalScrollIndicator={false}
              />
            )}
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
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  pickerPlaceholder: {
    color: '#999999',
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
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
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
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  schoolsList: {
    maxHeight: 400,
  },
  schoolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  schoolItemSelected: {
    backgroundColor: '#F0F7FF',
  },
  schoolName: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  schoolNameSelected: {
    color: '#3185FC',
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
  },
});

export default SchoolPicker;

