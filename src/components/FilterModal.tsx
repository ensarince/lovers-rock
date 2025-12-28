import { Text } from '@/components/Themed';
import { theme } from '@/src/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

export interface DiscoverFilters {
  grade?: string[];
  styles?: string[];
  maxAge?: number;
  minAge?: number;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: DiscoverFilters) => void;
  currentFilters: DiscoverFilters;
}

const CLIMBING_GRADES = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
  'elite',
];
const CLIMBING_STYLES = [
  'bouldering',
  'sport',
  'trad',
  'speed',
  'gym',
  'outdoor',
];

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApplyFilters,
  currentFilters,
}) => {
  const [selectedGrades, setSelectedGrades] = useState<string[]>(
    currentFilters.grade || []
  );
  const [selectedStyles, setSelectedStyles] = useState<string[]>(
    currentFilters.styles || []
  );
  const [minAge, setMinAge] = useState(currentFilters.minAge?.toString() || '18');
  const [maxAge, setMaxAge] = useState(currentFilters.maxAge?.toString() || '80');

  const toggleGrade = (grade: string) => {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    );
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style)
        ? prev.filter((s) => s !== style)
        : [...prev, style]
    );
  };

  const handleApply = () => {
    onApplyFilters({
      grade: selectedGrades.length > 0 ? selectedGrades : undefined,
      styles: selectedStyles.length > 0 ? selectedStyles : undefined,
      minAge: parseInt(minAge) || undefined,
      maxAge: parseInt(maxAge) || undefined,
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedGrades([]);
    setSelectedStyles([]);
    setMinAge('18');
    setMaxAge('80');
    onApplyFilters({});
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Filters</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Age Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Age Range</Text>
              <View style={styles.ageInputs}>
                <View style={styles.ageInput}>
                  <Text style={styles.ageLabel}>Min</Text>
                  <TextInput
                    style={styles.input}
                    value={minAge}
                    onChangeText={setMinAge}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
                <Text style={styles.ageDash}>-</Text>
                <View style={styles.ageInput}>
                  <Text style={styles.ageLabel}>Max</Text>
                  <TextInput
                    style={styles.input}
                    value={maxAge}
                    onChangeText={setMaxAge}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
              </View>
            </View>

            {/* Climbing Grades */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Climbing Level</Text>
              <View style={styles.buttonGroup}>
                {CLIMBING_GRADES.map((grade) => (
                  <Pressable
                    key={grade}
                    onPress={() => toggleGrade(grade)}
                    style={[
                      styles.filterButton,
                      selectedGrades.includes(grade) && styles.filterButtonActive,
                    ]}>
                    <Text
                      style={[
                        styles.filterButtonText,
                        selectedGrades.includes(grade) &&
                          styles.filterButtonTextActive,
                      ]}>
                      {grade.charAt(0).toUpperCase() + grade.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Climbing Styles */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Climbing Styles</Text>
              <View style={styles.buttonGroup}>
                {CLIMBING_STYLES.map((style) => (
                  <Pressable
                    key={style}
                    onPress={() => toggleStyle(style)}
                    style={[
                      styles.filterButton,
                      selectedStyles.includes(style) && styles.filterButtonActive,
                    ]}>
                    <Text
                      style={[
                        styles.filterButtonText,
                        selectedStyles.includes(style) &&
                          styles.filterButtonTextActive,
                      ]}>
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <Pressable
              style={styles.resetButton}
              onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </Pressable>
            <Pressable
              style={styles.applyButton}
              onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingTop: 40,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  ageInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ageInput: {
    flex: 1,
  },
  ageLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  ageDash: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    marginBottom: 16,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: 14,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  filterButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: theme.colors.text,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  resetButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resetButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    backgroundColor: theme.colors.accent,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
