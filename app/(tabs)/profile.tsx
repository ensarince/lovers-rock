import { Text, View } from '@/components/Themed';
import {
    ProfileEditorForm,
    UserProfile,
} from '@/src/components/ProfileEditorForm';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';

export default function ProfileScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const handleSaveProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    setIsEditing(false);
    Alert.alert('Success', 'Your profile has been saved!');
  };

  if (isEditing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => setIsEditing(false)}
            style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#ffffff" />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 44 }} />
        </View>
        <ProfileEditorForm
          onSave={handleSaveProfile}
          initialData={userProfile || undefined}
        />
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="person-circle" size={80} color="#6b7280" />
        <Text style={styles.title}>Create Your Profile</Text>
        <Text style={styles.subtitle}>
          Set up your climbing profile to get started
        </Text>
        <Pressable
          style={styles.createButton}
          onPress={() => setIsEditing(true)}>
          <Text style={styles.createButtonText}>Create Profile</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileContent}>
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={60} color="#ec4899" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {userProfile.name}, {userProfile.age}
            </Text>
            <Text style={styles.profileGym}>{userProfile.homeGym}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bio}>{userProfile.bio}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Climbing Grade</Text>
          <Text style={styles.grade}>
            {userProfile.climbingGrade.charAt(0).toUpperCase() +
              userProfile.climbingGrade.slice(1)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Climbing Styles</Text>
          <View style={styles.stylesContainer}>
            {userProfile.climbingStyles.map((style) => (
              <View key={style} style={styles.styleBadge}>
                <Text style={styles.styleText}>
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          style={styles.editButton}
          onPress={() => setIsEditing(true)}>
          <Ionicons name="pencil" size={18} color="#ffffff" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </Pressable>

        <Pressable style={styles.logoutButton}>
          <Ionicons name="log-out" size={18} color="#ef4444" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  createButton: {
    marginTop: 24,
    backgroundColor: '#ec4899',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  profileContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  profileGym: {
    fontSize: 13,
    color: '#9ca3af',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ec4899',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 22,
  },
  grade: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  stylesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  styleBadge: {
    backgroundColor: '#ec4899',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  styleText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ec4899',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 'auto',
    marginBottom: 12,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});
