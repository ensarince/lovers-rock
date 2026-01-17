import { Text } from '@/components/Themed';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View
} from 'react-native';

export interface UserProfile {
  name: string;
  age: string;
  bio: string;
  homeGym: string;
  climbingGrade: string;
  climbingStyles: string[];
}

interface ProfileEditorFormProps {
  onSave: (profile: UserProfile) => void;
  initialData?: UserProfile;
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
  'gym',
  'outdoor',
];

export const ProfileEditorForm: React.FC<ProfileEditorFormProps> = ({
  onSave,
  initialData,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [age, setAge] = useState(initialData?.age || '');
  const [bio, setBio] = useState(initialData?.bio || '');
  const [homeGym, setHomeGym] = useState(initialData?.homeGym || '');
  const [climbingGrade, setClimbingGrade] = useState(
    initialData?.climbingGrade || ''
  );
  const [climbingStyles, setClimbingStyles] = useState(
    initialData?.climbingStyles || []
  );

  const toggleStyle = (style: string) => {
    setClimbingStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const handleSave = () => {
    if (!name || !age || !bio || !homeGym || !climbingGrade) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (climbingStyles.length === 0) {
      Alert.alert('Error', 'Please select at least one climbing style');
      return;
    }

    onSave({
      name,
      age,
      bio,
      homeGym,
      climbingGrade,
      climbingStyles,
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Photo Placeholder */}
      <View style={styles.photoSection}>
        <View style={styles.photoPlaceholder}>
          <Ionicons name="image" size={48} color="#6b7280" />
        </View>
        <Text style={styles.photoText}>Tap to upload photo</Text>
      </View>

      {/* Form Fields */}
      <View style={styles.formSection}>
        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#6b7280"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Age */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            placeholder="Your age"
            placeholderTextColor="#6b7280"
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
          />
        </View>

        {/* Bio */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>About You</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Tell others about yourself and your climbing interests"
            placeholderTextColor="#6b7280"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Home Gym */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Home Gym</Text>
          <TextInput
            style={styles.input}
            placeholder="Your favorite climbing gym"
            placeholderTextColor="#6b7280"
            value={homeGym}
            onChangeText={setHomeGym}
          />
        </View>

        {/* Climbing Grade */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Climbing Grade</Text>
          <View style={styles.gradeContainer}>
            {CLIMBING_GRADES.map((grade) => (
              <Pressable
                key={grade}
                onPress={() => setClimbingGrade(grade)}
                style={[
                  styles.gradeButton,
                  climbingGrade === grade && styles.gradeButtonActive,
                ]}>
                <Text
                  style={[
                    styles.gradeButtonText,
                    climbingGrade === grade && styles.gradeButtonTextActive,
                  ]}>
                  {grade.charAt(0).toUpperCase() + grade.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Climbing Styles */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Climbing Styles</Text>
          <View style={styles.stylesContainer}>
            {CLIMBING_STYLES.map((style) => (
              <Pressable
                key={style}
                onPress={() => toggleStyle(style)}
                style={[
                  styles.styleButton,
                  climbingStyles.includes(style) &&
                    styles.styleButtonActive,
                ]}>
                <Text
                  style={[
                    styles.styleButtonText,
                    climbingStyles.includes(style) &&
                      styles.styleButtonTextActive,
                  ]}>
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Save Button */}
      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Profile</Text>
      </Pressable>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ec4899',
    borderStyle: 'dashed',
  },
  photoText: {
    marginTop: 12,
    fontSize: 13,
    color: '#6b7280',
  },
  formSection: {
    paddingHorizontal: 16,
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  bioInput: {
    paddingTop: 10,
    paddingBottom: 40,
    textAlignVertical: 'top',
  },
  gradeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gradeButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  gradeButtonActive: {
    backgroundColor: '#ec4899',
    borderColor: '#ec4899',
  },
  gradeButtonText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
  gradeButtonTextActive: {
    color: '#ffffff',
  },
  stylesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  styleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1f2937',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  styleButtonActive: {
    backgroundColor: '#ec4899',
    borderColor: '#ec4899',
  },
  styleButtonText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
  styleButtonTextActive: {
    color: '#ffffff',
  },
  saveButton: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#ec4899',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
