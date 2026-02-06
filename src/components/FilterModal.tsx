import { Text } from '@/components/Themed';
import { useAuth } from '@/src/context/AuthContext';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import { ClimbingStyle, Gender, GeneralLevel } from '@/src/types/climber';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import {
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';
import RangeSlider from 'react-native-fast-range-slider';

const getStyleImage = (style: ClimbingStyle) => {
  const imageMap: Record<ClimbingStyle, any> = {
    bouldering: require('../../assets/images/boulder.png'),
    sport: require('../../assets/images/sport.png'),
    trad: require('../../assets/images/trad.png'),
    gym: require('../../assets/images/gym.png'),
    outdoor: require('../../assets/images/outdoor.png'),
  };
  return imageMap[style];
};

export interface DiscoverFilters {
  grade?: GeneralLevel[];
  styles?: string[];
  genders?: Gender[];
  maxAge?: number;
  minAge?: number;
  maxDistance?: number; // Maximum distance in kilometers (0-50)
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: DiscoverFilters) => void;
  currentFilters: DiscoverFilters;
}

const GENERAL_LEVELS: GeneralLevel[] = [
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
  'gym',
  'outdoor',
];
const GENDER_OPTIONS: Gender[] = [
  'male',
  'female',
  'non_binary',
  'prefer_not_to_say',
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

  const [minDifficulty, setMinDifficulty] = useState<number>(() => {
    if (currentFilters.grade && Array.isArray(currentFilters.grade) && currentFilters.grade.length > 0) {
      return GENERAL_LEVELS.indexOf(currentFilters.grade[0]);
    }
    return 0;
  });
  const [maxDifficulty, setMaxDifficulty] = useState<number>(() => {
    if (currentFilters.grade && Array.isArray(currentFilters.grade) && currentFilters.grade.length > 0) {
      return GENERAL_LEVELS.indexOf(currentFilters.grade[currentFilters.grade.length - 1]);
    }
    return GENERAL_LEVELS.length - 1;
  });
  const [selectedStyles, setSelectedStyles] = useState<string[]>(
    currentFilters.styles || []
  );
  const [selectedGenders, setSelectedGenders] = useState<Gender[]>(
    (currentFilters.genders as Gender[]) || []
  );
  const [minAge, setMinAge] = useState(currentFilters.minAge || 18);
  const [maxAge, setMaxAge] = useState(currentFilters.maxAge || 80);
  const [maxDistance, setMaxDistance] = useState(currentFilters.maxDistance || 50);

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style)
        ? prev.filter((s) => s !== style)
        : [...prev, style]
    );
  };

  const toggleGender = (genderOption: Gender) => {
    setSelectedGenders((prev) =>
      prev.includes(genderOption)
        ? prev.filter((g) => g !== genderOption)
        : [...prev, genderOption]
    );
  };

  const handleApply = () => {
    const gradeRange = GENERAL_LEVELS.slice(minDifficulty, maxDifficulty + 1);
    onApplyFilters({
      grade: gradeRange.length > 0 ? (gradeRange as GeneralLevel[]) : undefined,
      styles: selectedStyles.length > 0 ? selectedStyles : undefined,
      genders: selectedGenders.length > 0 ? selectedGenders : undefined,
      minAge: minAge !== 18 ? minAge : undefined,
      maxAge: maxAge !== 80 ? maxAge : undefined,
      maxDistance: maxDistance !== 50 ? maxDistance : undefined,
    });
    onClose();
  };

  const handleReset = () => {
    setMinDifficulty(0);
    setMaxDifficulty(GENERAL_LEVELS.length - 1);
    setSelectedStyles([]);
    setSelectedGenders([]);
    setMinAge(18);
    setMaxAge(80);
    setMaxDistance(50);
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
            {/* Gender Filter - MOVED TO TOP */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Gender</Text>
              <View style={styles.genderGrid}>
                {GENDER_OPTIONS.map((option) => (
                  <Pressable
                    key={option}
                    style={[
                      styles.filterTag,
                      styles.genderButton,
                      selectedGenders.includes(option) && styles.filterTagActive,
                    ]}
                    onPress={() => toggleGender(option)}
                  >
                    <Text
                      style={[
                        styles.filterTagText,
                        selectedGenders.includes(option) && styles.filterTagTextActive,
                      ]}
                    >
                      {option === 'non_binary' ? 'Non-binary' : option === 'prefer_not_to_say' ? 'Prefer not to say' : option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Age Range */}
            <View style={styles.section}>
              <View style={styles.ageHeader}>
                <Text style={styles.sectionTitle}>Age</Text>
                <Text style={styles.ageValue}>{Math.round(minAge)} - {Math.round(maxAge)}</Text>
              </View>
              
              <View style={styles.rangeSliderContainer}>
                <RangeSlider
                  min={18}
                  max={100}
                  initialMinValue={minAge}
                  initialMaxValue={maxAge}
                  step={1}
                  width={300}
                  thumbSize={32}
                  trackHeight={4}
                  minimumDistance={1}
                  selectedTrackStyle={{ backgroundColor: theme.colors.accent }}
                  unselectedTrackStyle={{ backgroundColor: theme.colors.border }}
                  thumbStyle={{
                    backgroundColor: theme.colors.accent,
                    borderRadius: 16,
                  }}
                  pressedThumbStyle={{ transform: [{ scale: 1.2 }] }}
                  showThumbLines={false}
                  onValuesChange={(values) => {
                    setMinAge(values[0]);
                    setMaxAge(values[1]);
                  }}
                  leftThumbAccessibilityLabel="Minimum age"
                  rightThumbAccessibilityLabel="Maximum age"
                />
              </View>
            </View>

            {/* Distance Range */}
            <View style={styles.section}>
              <View style={styles.distanceHeader}>
                <Text style={styles.sectionTitle}>Distance</Text>
                <Text style={styles.distanceValue}>{Math.round(maxDistance)} km</Text>
              </View>
              
              <View style={styles.rangeSliderContainer}>
                <RangeSlider
                  min={0}
                  max={50}
                  initialMinValue={0}
                  initialMaxValue={maxDistance}
                  step={1}
                  width={300}
                  thumbSize={32}
                  trackHeight={4}
                  minimumDistance={1}
                  selectedTrackStyle={{ backgroundColor: theme.colors.accent }}
                  unselectedTrackStyle={{ backgroundColor: theme.colors.border }}
                  thumbStyle={{
                    backgroundColor: theme.colors.accent,
                    borderRadius: 16,
                  }}
                  pressedThumbStyle={{ transform: [{ scale: 1.2 }] }}
                  showThumbLines={false}
                  onValuesChange={(values) => {
                    setMaxDistance(values[1]);
                  }}
                  leftThumbAccessibilityLabel="Minimum distance"
                  rightThumbAccessibilityLabel="Maximum distance"
                />
              </View>
              
              {/* Distance labels */}
              <View style={styles.distanceLabels}>
                <Text style={styles.distanceLabel}>0 km</Text>
                <Text style={styles.distanceLabel}>50 km</Text>
              </View>
            </View>

            {/* Climbing Difficulty Spectrum */}
            <View style={styles.section}>
              <View style={styles.difficultyHeader}>
                <Text style={styles.sectionTitle}>Difficulty</Text>
                <Text style={styles.difficultyValue}>
                  {GENERAL_LEVELS[minDifficulty].charAt(0).toUpperCase() + GENERAL_LEVELS[minDifficulty].slice(1)} - {GENERAL_LEVELS[maxDifficulty].charAt(0).toUpperCase() + GENERAL_LEVELS[maxDifficulty].slice(1)}
                </Text>
              </View>
              
              <View style={styles.rangeSliderContainer}>
                <RangeSlider
                  min={0}
                  max={GENERAL_LEVELS.length - 1}
                  initialMinValue={minDifficulty}
                  initialMaxValue={maxDifficulty}
                  step={1}
                  width={300}
                  thumbSize={32}
                  trackHeight={4}
                  minimumDistance={0}
                  selectedTrackStyle={{ backgroundColor: theme.colors.accent }}
                  unselectedTrackStyle={{ backgroundColor: theme.colors.border }}
                  thumbStyle={{
                    backgroundColor: theme.colors.accent,
                    borderRadius: 16,
                  }}
                  pressedThumbStyle={{ transform: [{ scale: 1.2 }] }}
                  showThumbLines={false}
                  onValuesChange={(values) => {
                    setMinDifficulty(values[0]);
                    setMaxDifficulty(values[1]);
                  }}
                  leftThumbAccessibilityLabel="Minimum difficulty"
                  rightThumbAccessibilityLabel="Maximum difficulty"
                />
              </View>
              
              {/* Difficulty labels */}
              <View style={styles.difficultyLabels}>
                <Text style={styles.difficultyLabel}>Beginner</Text>
                <Text style={styles.difficultyLabel}>Elite</Text>
              </View>
            </View>

            {/* Climbing Styles */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Climbing Styles</Text>
              <View style={styles.styleButtonGroup}>
                {CLIMBING_STYLES.map((style) => (
                  <Pressable
                    key={style}
                    onPress={() => toggleStyle(style)}
                    style={[
                      styles.styleButton,
                    ]}>
                    <ImageBackground
                      source={getStyleImage(style as ClimbingStyle)}
                      resizeMode="cover"
                      style={styles.styleImageBackground}
                    >
                      {selectedStyles.includes(style) && (
                        <View style={styles.styleTextOverlay}>
                          <Text
                            style={styles.styleButtonTextSelected}>
                            {style.charAt(0).toUpperCase() + style.slice(1)}
                          </Text>
                        </View>
                      )}
                    </ImageBackground>
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
      marginBottom: 8,
    },
    ageValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.accent,
    },
    rangeSliderContainer: {
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    dualSliderContainer: {
      height: 80,
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
    ageLabelsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
      marginTop: 8,
    },
    ageLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '500',
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
    difficultyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    difficultyValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.accent,
    },
    distanceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    distanceValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.accent,
    },
    distanceLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
      marginTop: 8,
    },
    distanceLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    difficultyLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
      marginTop: 8,
    },
    difficultyLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    styleButtonGroup: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
      gap: 8,
    },
    styleButton: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    styleImageBackground: {
      flex: 1,
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    styleTextOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    styleButtonTextSelected: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
    },
    filterTag: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    filterTagActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    filterTagText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.text,
      textAlign: 'center',
    },
    filterTagTextActive: {
      color: '#fff',
      fontWeight: '600',
    },
    genderGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'space-between',
    },
    genderButton: {
      flex: 1,
      minWidth: '47%',
    },
  });
