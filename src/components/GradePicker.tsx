import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getExampleGrades } from '../services/gradeService';
import { ClimbingGrade, GeneralLevel, GradeSystem } from '../types/climber';

interface Colors {
  accent: string;
  surface: string;
  background: string;
  text: string;
  textSecondary: string;
  border: string;
}

export interface GradePickerProps {
  value: ClimbingGrade;
  onChange: (grade: ClimbingGrade) => void;
  colors: Colors;
}

const SYSTEMS: { key: GradeSystem; label: string }[] = [
  { key: 'french', label: 'French' },
  { key: 'uiaa', label: 'UIAA' },
];

const LEVELS: { key: GeneralLevel; label: string }[] = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
  { key: 'expert', label: 'Expert' },
  { key: 'elite', label: 'Elite' },
];

const GRADE_TO_LEVEL: Record<GradeSystem, Record<string, GeneralLevel>> = {
  french: {
    '4b': 'beginner', '4b+': 'beginner', '4c': 'beginner',
    '5a': 'beginner', '5a+': 'beginner', '5b': 'beginner',
    '5b+': 'beginner', '5c': 'beginner', '5c+': 'beginner',
    '6a': 'intermediate', '6a+': 'intermediate', '6b': 'intermediate',
    '6b+': 'intermediate', '6c': 'intermediate', '6c+': 'intermediate',
    '7a': 'advanced', '7a+': 'advanced', '7b': 'advanced',
    '7b+': 'advanced', '7c': 'advanced', '7c+': 'advanced',
    '8a': 'expert', '8a+': 'expert', '8b': 'expert',
    '8b+': 'expert', '8c': 'expert', '8c+': 'expert',
    '9a': 'elite',
  },
  uiaa: {
    'IV': 'beginner', 'IV+': 'beginner', 'V-': 'beginner', 'V': 'beginner', 'V+': 'beginner',
    'VI-': 'intermediate', 'VI': 'intermediate', 'VI+': 'intermediate',
    'VII-': 'intermediate', 'VII': 'intermediate',
    'VII+': 'advanced', 'VIII-': 'advanced', 'VIII': 'advanced', 'VIII+': 'advanced',
    'IX-': 'expert', 'IX': 'expert', 'IX+': 'expert',
    'X-': 'expert', 'X': 'expert', 'X+': 'expert',
    'XI-': 'elite', 'XI': 'elite', 'XI+': 'elite', 'XII': 'elite',
  },
};

export const GradePicker: React.FC<GradePickerProps> = ({ value, onChange, colors }) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(value.system === 'uiaa' ? 1 : 0)).current;
  const gradeScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: value.system === 'uiaa' ? 1 : 0,
      tension: 280,
      friction: 22,
      useNativeDriver: true,
    }).start();
  }, [value.system]);

  const thumbWidth = Math.max(0, (containerWidth - 4) / 2);
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 2 + thumbWidth],
  });

  const handleSystemChange = (system: GradeSystem) => {
    onChange({ ...value, system, value: '' });
    gradeScrollRef.current?.scrollTo({ x: 0, animated: false });
  };

  const handleGradeSelect = (g: string) => {
    const inferredLevel = GRADE_TO_LEVEL[value.system]?.[g];
    onChange({
      ...value,
      value: g,
      ...(inferredLevel ? { general_level: inferredLevel } : {}),
    });
  };

  const grades = getExampleGrades(value.system);

  return (
    <View style={styles.container}>
      {/* System segmented control */}
      <View
        style={[styles.toggle, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {containerWidth > 0 && (
          <Animated.View
            style={[
              styles.toggleThumb,
              { width: thumbWidth, backgroundColor: colors.accent, transform: [{ translateX }] },
            ]}
          />
        )}
        {SYSTEMS.map((sys) => (
          <Pressable key={sys.key} style={styles.toggleOption} onPress={() => handleSystemChange(sys.key)}>
            <Text
              style={[
                styles.toggleLabel,
                {
                  color: value.system === sys.key ? '#fff' : colors.textSecondary,
                  fontWeight: value.system === sys.key ? '700' : '400',
                },
              ]}
            >
              {sys.label.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Scrollable grade chip strip */}
      <ScrollView
        ref={gradeScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gradeStrip}
      >
        {grades.map((g) => {
          const sel = value.value === g;
          return (
            <Pressable
              key={g}
              onPress={() => handleGradeSelect(g)}
              style={[
                styles.gradeChip,
                {
                  backgroundColor: sel ? colors.accent : colors.surface,
                  borderColor: sel ? colors.accent : colors.border,
                },
              ]}
            >
              <Text style={[styles.gradeChipText, { color: sel ? '#fff' : colors.textSecondary }]}>
                {g}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* General level pills */}
      <View style={styles.levelRow}>
        {LEVELS.map((lv) => {
          const active = value.general_level === lv.key;
          return (
            <Pressable
              key={lv.key}
              onPress={() => onChange({ ...value, general_level: lv.key })}
              style={[
                styles.levelPill,
                {
                  backgroundColor: active ? colors.accent + '22' : 'transparent',
                  borderColor: active ? colors.accent : colors.border,
                },
              ]}
            >
              <Text style={[styles.levelText, { color: active ? colors.accent : colors.textSecondary }]}>
                {lv.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  toggle: {
    flexDirection: 'row',
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  toggleThumb: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    borderRadius: 8,
  },
  toggleOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  toggleLabel: {
    fontSize: 12,
    letterSpacing: 1.5,
  },
  gradeStrip: {
    paddingVertical: 2,
    gap: 6,
  },
  gradeChip: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 42,
    alignItems: 'center',
  },
  gradeChipText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  levelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  levelPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
