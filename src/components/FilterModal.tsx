import { Text } from '@/components/Themed';
import { useAuth } from '@/src/context/AuthContext';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import Ionicons from '@expo/vector-icons/Ionicons';
import Slider from '@react-native-community/slider';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
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
  const { darkMode } = useAuth();
  const theme = darkMode ? themeDark : themeLight;
  const styles = createStyles(theme);

  const [selectedGrades, setSelectedGrades] = useState<string[]>(
    currentFilters.grade || []
  );
  const [selectedStyles, setSelectedStyles] = useState<string[]>(
    currentFilters.styles || []
  );
  const [minAge, setMinAge] = useState(currentFilters.minAge || 18);
  const [maxAge, setMaxAge] = useState(currentFilters.maxAge || 80);

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
      minAge: minAge !== 18 ? minAge : undefined,
      maxAge: maxAge !== 80 ? maxAge : undefined,
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedGrades([]);
    setSelectedStyles([]);
    setMinAge(18);
    setMaxAge(80);
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
              <View style={styles.ageHeader}>
                <Text style={styles.sectionTitle}>Age Range</Text>
                <Text style={styles.ageValue}>{Math.round(minAge)} - {Math.round(maxAge)}</Text>
              </View>
              <View style={styles.dualSliderContainer}>
                {/* Background Track */}
                <View style={styles.trackBackground} />
                
                {/* Selected Range Highlight */}
                <View
                  style={[
                    styles.selectedRangeTrack,
                    {
                      left: `${((minAge - 18) / 82) * 100}%`,
                      right: `${((100 - maxAge) / 82) * 100}%`,
                    },
                  ]}
                />
                
                {/* Min Slider (Lower Z-index when not active) */}
                <Slider
                  style={styles.sliderTrack}
                  minimumValue={18}
                  maximumValue={100}
                  value={minAge}
                  onValueChange={(value) => {
                    if (value <= maxAge) {
                      setMinAge(value);
                    }
                  }}
                  step={1}
                  thumbTintColor={theme.colors.accent}
                  minimumTrackTintColor="transparent"
                  maximumTrackTintColor="transparent"
                />

                {/* Max Slider (Higher Z-index) */}
                <Slider
                  style={[styles.sliderTrack, styles.sliderTrackTop]}
                  minimumValue={18}
                  maximumValue={100}
                  value={maxAge}
                  onValueChange={(value) => {
                    if (value >= minAge) {
                      setMaxAge(value);
                    }
                  }}
                  step={1}
                  thumbTintColor={theme.colors.accent}
                  minimumTrackTintColor="transparent"
                  maximumTrackTintColor="transparent"
                />
              </View>
              
              {/* Age Labels */}
              <View style={styles.ageLabelsRow}>
                <Text style={styles.ageLabel}>18</Text>
                <Text style={styles.ageLabel}>100</Text>
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

const createStyles = (theme: typeof themeLight) =>
  StyleSheet.create({
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
    ageHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    ageValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.accent,
    },
    dualSliderContainer: {
      height: 50,
      justifyContent: 'center',
    },
    trackBackground: {
      position: 'absolute',
      height: 6,
      backgroundColor: theme.colors.border,
      borderRadius: 3,
      width: '100%',
      top: 22,
      opacity: 0.3,
    },
    selectedRangeTrack: {
      position: 'absolute',
      height: 6,
      backgroundColor: theme.colors.accent,
      borderRadius: 3,
      top: 22,
      zIndex: 4,
    },
    sliderTrack: {
      position: 'absolute',
      width: '100%',
      height: 50,
      zIndex: 5,
    },
    sliderTrackTop: {
      zIndex: 6,
    },
    ageLabelsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
    },
    ageLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    sliderWrapper: {
      width: '100%',
      height: 80,
      justifyContent: 'center',
      paddingHorizontal: 10,
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
