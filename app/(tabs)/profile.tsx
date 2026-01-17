
import { Text } from '@/components/Themed';
import { useAuth } from '@/src/context/AuthContext';
import { createDefaultGrade, formatGradeDisplay, getExampleGrades } from '@/src/services/gradeService';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import { Climber, ClimbingGrade, ClimbingStyle, GeneralLevel, GradeSystem } from '@/src/types/climber';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import PocketBase from 'pocketbase';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View
} from 'react-native';

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

const pb = new PocketBase(`http://${process.env.EXPO_PUBLIC_IP}:8090`);

const GENERAL_LEVELS: GeneralLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
  'elite',
];

const GRADE_SYSTEMS: GradeSystem[] = [
  'unknown',
  'v-scale',
  'font',
  'french',
  'uiaa',
];

const CLIMBING_STYLES: ClimbingStyle[] = [
  'bouldering',
  'sport',
  'trad',
  'gym',
  'outdoor',
];

export default function ProfileScreen() {
  const { user, setUser, logout, isLoading, isAuthenticated, token, darkMode, setDarkMode } = useAuth();
  const typedUser = user as Climber | null;
  const router = useRouter();
  const theme = darkMode ? themeDark : themeLight;
  const styles = createStyles(theme);

  // Editable state
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);

  // Profile fields
  const [name, setName] = useState(typedUser?.name || '');
  const [bio, setBio] = useState(typedUser?.bio || '');
  const [age, setAge] = useState(typedUser?.age ? String(typedUser.age) : '');
  const [grade, setGrade] = useState<ClimbingGrade>(() => {
    if (typedUser?.grade && typeof typedUser.grade === 'object' && typedUser.grade.general_level) {
      return typedUser.grade;
    }
    return createDefaultGrade();
  });
  const [climbingStyles, setClimbingStyles] = useState<ClimbingStyle[]>(typedUser?.climbing_styles || []);
  const [homeGym, setHomeGym] = useState(typedUser?.home_gym || '');
  // intent: array of 'partner' | 'date'
  const [intent, setIntent] = useState<string[]>(Array.isArray(typedUser?.intent) ? typedUser.intent : []);
  // Remove photo state for display, only use for upload
  const [photo, setPhoto] = useState<string | null>(null);
  const [avatar, setAvatar] = useState(typedUser?.avatar || '');
  // Grade edit state
  const [showGradeSystemModal, setShowGradeSystemModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setName(typedUser?.name || '');
    setBio(typedUser?.bio || '');
    setAge(typedUser?.age ? String(typedUser.age) : '');
    setGrade(
      typedUser?.grade && typeof typedUser.grade === 'object' && typedUser.grade.general_level
        ? typedUser.grade
        : createDefaultGrade()
    );
    setClimbingStyles(typedUser?.climbing_styles || []);
    setHomeGym(typedUser?.home_gym || '');
    setAvatar(typedUser?.avatar || '');
    setIntent(Array.isArray(typedUser?.intent) ? typedUser.intent : []);
    setPhoto(null);
  }, [user]);

  useEffect(() => {
    if (token && pb.authStore.token !== token) {
      pb.authStore.save(token, user as any);
    }
  }, [token, user]);

  const handleLogout = async () => {
    await logout();
  };

  const handleDarkModeToggle = async (value: boolean) => {
    setDarkMode(value);
    await AsyncStorage.setItem('darkMode', JSON.stringify(value));
  };

  const handleIntentChange = async (selectedIntent: string) => {
    try {
      const newIntent: string[] = intent.includes(selectedIntent)
        ? intent.filter(i => i !== selectedIntent)
        : [...intent, selectedIntent];

      setIntent(newIntent);

      // Save to database immediately
      await pb.collection('users').update(user?.id!, {
        intent: newIntent,
      });
      if (user) {
        const updatedUser: Climber = {
          ...user,
          intent: newIntent as ("partner" | "date")[],
        };
        setUser(updatedUser);
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (e: any) {
      let errorMsg = 'Failed to update intent.';
      if (e?.message) errorMsg += '\n' + e.message;
      Alert.alert('Error', errorMsg);
      // Revert on error
      setIntent(Array.isArray(typedUser?.intent) ? typedUser.intent : []);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let avatarFile = null;
      if (photo && !photo.startsWith('http')) {
        const extension = photo.split('.').pop()?.toLowerCase() || 'jpg';
        let mimeType = 'image/jpeg';
        if (extension === 'png') mimeType = 'image/png';
        else if (extension === 'jpg' || extension === 'jpeg') mimeType = 'image/jpeg';
        else if (extension === 'webp') mimeType = 'image/webp';
        avatarFile = {
          uri: photo,
          name: `avatar.${extension}`,
          type: mimeType,
        };
      }

      // Ensure grade has all required fields
      const gradeToSave = {
        system: grade.system || 'unknown',
        value: grade.value || '',
        general_level: grade.general_level || 'beginner',
      };

      let formData: any;
      if (avatarFile) {
        formData = new FormData();
        formData.append('name', name);
        formData.append('bio', bio);
        formData.append('age', age);
        formData.append('grade', JSON.stringify(gradeToSave));
        formData.append('climbing_styles', JSON.stringify(climbingStyles));
        formData.append('home_gym', homeGym);
        // intent as array, not stringified
        intent.forEach((val) => formData.append('intent', val));
        // @ts-ignore
        formData.append('avatar', avatarFile);
        await pb.collection('users').update(user?.id!, formData);
      } else {
        formData = {
          name,
          bio,
          age: Number(age),
          grade: gradeToSave,
          climbing_styles: climbingStyles,
          home_gym: homeGym,
          intent,
        };
        await pb.collection('users').update(user?.id!, formData);
      }
      setEditMode(false);
      setPhoto(null); // Reset photo after save
      // Fetch latest user from backend and update context/cache
      if (user?.id && token) {
        try {
          const latestUser = await pb.collection('users').getOne(user.id, { headers: { Authorization: token } });
          // Parse grade if it's a string (JSON)
          let parsedGrade = createDefaultGrade();
          if (latestUser.grade) {
            if (typeof latestUser.grade === 'string') {
              try {
                parsedGrade = JSON.parse(latestUser.grade);
              } catch {
                parsedGrade = createDefaultGrade();
              }
            } else {
              parsedGrade = latestUser.grade;
            }
          }
          // Map to Climber type
          const mappedUser: Climber = {
            id: latestUser.id,
            name: latestUser.name || '',
            age: typeof latestUser.age === 'number' ? latestUser.age : 0,
            grade: parsedGrade,
            climbing_styles: Array.isArray(latestUser.climbing_styles) ? latestUser.climbing_styles : [],
            home_gym: latestUser.home_gym || '',
            bio: latestUser.bio || '',
            email: latestUser.email || '',
            avatar: latestUser.avatar || '',
            intent: Array.isArray(latestUser.intent) ? latestUser.intent : [],
          };
          setUser(mappedUser);
          await AsyncStorage.setItem('user', JSON.stringify(mappedUser));
        } catch (err) {
          // Optionally handle error
        }
      }
      Alert.alert('Profile updated!');
    } catch (e: any) {
      let errorMsg = 'Failed to update profile.';
      if (e?.message) errorMsg += '\n' + e.message;
      if (e?.response) errorMsg += '\n' + JSON.stringify(e.response, null, 2);
      if (e?.data) errorMsg += '\n' + JSON.stringify(e.data, null, 2);
      console.error('Save error details:', e);
      Alert.alert('Error', errorMsg);
    }
    setSaving(false);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  // Always show the avatar from the DB unless a new photo is picked
  const getAvatarUrl = () => {
    // 1. Priority: Locally picked photo (blob/uri)
    if (photo) return photo;

    // 2. Use the filename from state or the user object
    const filename = avatar || typedUser?.avatar;
    const userId = typedUser?.id;

    // 3. Manually construct the URL if we have the necessary parts
    if (filename && userId) {
      const baseUrl = `http://${process.env.EXPO_PUBLIC_IP}:8090`;
      // PocketBase file path format: /api/files/COLLECTION_ID_OR_NAME/RECORD_ID/FILENAME
      return `${baseUrl}/api/files/users/${userId}/${filename}?thumb=100x100`;
    }

    return '';
  };

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Please log in to view your profile</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.containerMinimal}>
        <View style={styles.headerWithSettingsRow}>
          <View style={styles.headerMinimal}>
            <Pressable onPress={editMode ? pickImage : () => setImageExpanded(true)}>
              {getAvatarUrl() ? (
                <Image
                  source={{ uri: getAvatarUrl() }}
                  style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.accent }}
                />
              ) : (
                <Ionicons name="person-circle" size={72} color={theme.colors.text} style={{ backgroundColor: theme.colors.accent, borderRadius: 36, padding: 8 }} />
              )}
              {editMode && (
                <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: theme.colors.text, borderRadius: 12, padding: 2 }}>
                  <Ionicons name="camera" size={18} color={theme.colors.accent} />
                </View>
              )}
            </Pressable>
            <Text style={styles.titleMinimal}>Profile</Text>
          </View>

          <Pressable
            onPress={() => setSettingsModalVisible(true)}
            style={styles.settingsButton}
          >
            <Ionicons name="settings" size={24} color={theme.colors.text} />
          </Pressable>
        </View>

        {/* Intent Selection Card */}
        <View style={[styles.intentCard, { marginHorizontal: 24, marginBottom: 24 }]}>
          <Text style={[styles.intentTitle, { color: theme.colors.text }]}>What are you looking for?</Text>
          <View style={{
            flexDirection: 'row', gap: 12, justifyContent: 'center', flexWrap: 'wrap', backgroundColor: "transparent"
          }}>
            {['partner', 'date'].map(opt => (
              <Pressable
                key={opt}
                style={[
                  styles.intentOptionCard,
                  {
                    backgroundColor: intent.includes(opt) ? theme.colors.accent : theme.colors.surface,
                    borderColor: intent.includes(opt) ? theme.colors.accent : theme.colors.border,
                  },
                ]}
                onPress={() => handleIntentChange(opt)}
              >
                <Text
                  style={[
                    styles.intentOptionText,
                    { color: intent.includes(opt) ? '#fff' : theme.colors.text },
                  ]}
                >
                  {opt === 'partner' ? '🧗 Climbing Partner' : '💕 Climbing Date'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.userInfoMinimal}>
          <View style={styles.infoCardMinimal}>
            <Text style={styles.labelMinimal}>Email</Text>
            <Text style={styles.valueMinimal}>{user.email}</Text>
          </View>

          <View style={styles.infoCardMinimal}>
            <Text style={styles.labelMinimal}>Name</Text>
            {editMode ? (
              <TextInput
                style={[styles.valueMinimal, { backgroundColor: theme.colors.surface, borderRadius: 8, padding: 8 }]}
                value={name}
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor={theme.colors.textSecondary}
              />
            ) : (
              <Text style={styles.valueMinimal}>{name || 'No name set.'}</Text>
            )}
          </View>

          <View style={styles.infoCardMinimal}>
            <Text style={styles.labelMinimal}>Age</Text>
            {editMode ? (
              <TextInput
                style={[styles.valueMinimal, { backgroundColor: theme.colors.surface, borderRadius: 8, padding: 8 }]}
                value={age}
                onChangeText={setAge}
                placeholder="Age"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.valueMinimal}>{age || 'No age set.'}</Text>
            )}
          </View>

          <View style={[styles.infoCardMinimal]}>
            <Text style={styles.labelMinimal}>Climbing Grade</Text>
            {editMode ? (
              <View style={{ backgroundColor: "transparent" }}>
                <Pressable
                  style={{
                    padding: 12,
                    backgroundColor: theme.colors.accent,
                    borderRadius: 8,
                    marginBottom: 12,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                  onPress={() => setShowGradeSystemModal(true)}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>
                    {formatGradeDisplay(grade)}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </Pressable>

                {/* General Level Quick Select */}
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8 }}>
                  General Level
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12, backgroundColor: "transparent" }}>
                  {GENERAL_LEVELS.map(level => (
                    <Pressable
                      key={level}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        backgroundColor: grade.general_level === level ? theme.colors.accent : theme.colors.surface,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                      }}
                      onPress={() => setGrade({ ...grade, general_level: level })}
                    >
                      <Text
                        style={{
                          color: grade.general_level === level ? '#fff' : theme.colors.text,
                          fontSize: 12,
                          fontWeight: '500',
                        }}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={styles.valueMinimal}>{formatGradeDisplay(grade)}</Text>
            )}
          </View>

          <View style={styles.infoCardMinimal}>
            <Text style={styles.labelMinimal}>Climbing Styles</Text>
            {editMode ? (
              <View style={{
                flexDirection: 'row', flexWrap: 'wrap', gap: 12, backgroundColor: "transparent"
              }}>
                {CLIMBING_STYLES.map(style => (
                  <Pressable
                    key={style}
                    style={{
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: climbingStyles.includes(style) ? theme.colors.accent : theme.colors.border,
                      width: '19%',
                      aspectRatio: 1,
                      overflow: 'hidden',
                    }}
                    onPress={() => {
                      setClimbingStyles(climbingStyles.includes(style)
                        ? climbingStyles.filter(s => s !== style)
                        : [...climbingStyles, style]);
                    }}
                  >
                    <ImageBackground
                      source={getStyleImage(style)}
                      resizeMode="cover"
                      style={{
                        width: '100%',
                        height: '100%',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      {climbingStyles.includes(style) && (
                        <View style={{
                          ...StyleSheet.absoluteFillObject,
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                          <Text style={{ 
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: '700',
                            textAlign: 'center',
                          }}>
                            {style.charAt(0).toUpperCase() + style.slice(1)}
                          </Text>
                        </View>
                      )}
                    </ImageBackground>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.valueMinimal}>
                {climbingStyles.length > 0
                  ? climbingStyles.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')
                  : 'No styles set.'}
              </Text>
            )}
          </View>

          <View style={styles.infoCardMinimal}>
            <Text style={styles.labelMinimal}>Home Gym</Text>
            {editMode ? (
              <TextInput
                style={[styles.valueMinimal, { backgroundColor: theme.colors.surface, borderRadius: 8, padding: 8 }]}
                value={homeGym}
                onChangeText={setHomeGym}
                placeholder="Home Gym"
                placeholderTextColor={theme.colors.textSecondary}
              />
            ) : (
              <Text style={styles.valueMinimal}>{homeGym || 'No home gym set.'}</Text>
            )}
          </View>

          <View style={styles.infoCardMinimal}>
            <Text style={styles.labelMinimal}>Bio</Text>
            {editMode ? (
              <TextInput
                style={[styles.valueMinimal, { backgroundColor: theme.colors.surface, borderRadius: 8, padding: 8, minHeight: 40 }]}
                value={bio}
                onChangeText={setBio}
                multiline
                placeholder="Tell us about yourself"
                placeholderTextColor={theme.colors.textSecondary}
              />
            ) : (
              <Text style={styles.valueMinimal}>{bio || 'No bio set.'}</Text>
            )}
          </View>
        </View>

        {editMode ? (
          <Pressable
            style={[styles.logoutButtonMinimal, saving && styles.buttonDisabledMinimal, { backgroundColor: theme.colors.success }]
            }
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.text} />
            ) : (
              <>
                <Ionicons name="save" size={20} color={theme.colors.text} />
                <Text style={styles.logoutButtonTextMinimal}>Save</Text>
              </>
            )}
          </Pressable>
        ) : (
          <Pressable
            style={[styles.logoutButtonMinimal, isLoading && styles.buttonDisabledMinimal, { backgroundColor: theme.colors.edit }]
            }
            onPress={() => setEditMode(true)}
          >
            <Ionicons name="create" size={20} color={theme.colors.text} />
            <Text style={styles.logoutButtonTextMinimal}>Edit Profile</Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.logoutButtonMinimal, isLoading && styles.buttonDisabledMinimal]}
          onPress={handleLogout}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color={theme.colors.text} />
          ) : (
            <>
              <Ionicons name="log-out" size={20} color={theme.colors.text} />
              <Text style={styles.logoutButtonTextMinimal}>Logout</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Expanded Avatar Modal */}
      <Modal visible={imageExpanded} transparent animationType="fade">
        <Pressable style={styles.expandedImageOverlay} onPress={() => setImageExpanded(false)}>
          {getAvatarUrl() && (
            <Image source={{ uri: getAvatarUrl() }} style={styles.expandedImage} />
          )}
        </Pressable>
      </Modal>

      {/* Grade System Selection Modal */}
      <Modal
        visible={showGradeSystemModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGradeSystemModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: theme.colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              paddingBottom: 40,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 16, color: theme.colors.text }}>
              Select Grade System
            </Text>

            {GRADE_SYSTEMS.map(system => (
              <Pressable
                key={system}
                onPress={() => {
                  setGrade({ ...grade, system });
                  setShowGradeSystemModal(false);
                }}
                style={{
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: "transparent" }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: grade.system === system ? '700' : '500',
                      color: grade.system === system ? theme.colors.accent : theme.colors.text,
                    }}
                  >
                    {system === 'unknown' ? 'General Level Only' : system.toUpperCase()}
                  </Text>
                  {grade.system === system && (
                    <Ionicons name="checkmark" size={20} color={theme.colors.accent} />
                  )}
                </View>
              </Pressable>
            ))}

            {/* Grade value input if not unknown */}
            {grade.system !== 'unknown' && (
              <View style={{ marginTop: 20, backgroundColor: "transparent" }}>
                <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8, color: theme.colors.text }}>
                  Enter your grade (e.g., {getExampleGrades(grade.system)[0]})
                </Text>
                <TextInput
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderRadius: 8,
                    padding: 12,
                    color: theme.colors.text,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                  value={grade.value}
                  onChangeText={(value) => setGrade({ ...grade, value })}
                  placeholder="e.g., V5, 7A, 6a+"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
            )}

            <Pressable
              onPress={() => setShowGradeSystemModal(false)}
              style={{
                marginTop: 20,
                paddingVertical: 12,
                backgroundColor: theme.colors.accent,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={settingsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Settings</Text>
              <Pressable onPress={() => setSettingsModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </Pressable>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLabelRow}>
                <Ionicons name="moon" size={20} color={theme.colors.text} style={{ marginRight: 12 }} />
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Dark Mode</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={handleDarkModeToggle}
                trackColor={{ false: theme.colors.border, true: theme.colors.accent + '50' }}
                thumbColor={darkMode ? theme.colors.accent : theme.colors.textSecondary}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (theme: typeof themeLight) =>
  StyleSheet.create({
    containerMinimal: {
      flex: 1,
      padding: 0,
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    headerWithSettingsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
      backgroundColor: 'transparent',
    },
    headerMinimal: {
      alignItems: 'center',
      gap: 8,
      flex: 1,
      backgroundColor: 'transparent',
    },
    titleMinimal: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: 1.1,
      marginTop: 8,
    },
    userInfoMinimal: {
      gap: 14,
      marginBottom: 32,
      marginHorizontal: 24,
      backgroundColor: 'transparent',
    },
    infoCardMinimal: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 18,
      marginBottom: 2,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    labelMinimal: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginBottom: 2,
      textTransform: 'uppercase',
      fontWeight: '600',
      letterSpacing: 1.1,
    },
    valueMinimal: {
      fontSize: 15,
      color: theme.colors.text,
      fontWeight: '500',
    },
    userIdMinimal: {
      fontSize: 11,
      fontFamily: 'monospace',
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    logoutButtonMinimal: {
      flexDirection: 'row',
      backgroundColor: theme.colors.error,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginHorizontal: 24,
      marginBottom: 24,
      shadowColor: theme.colors.error,
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 2,
    },
    buttonDisabledMinimal: {
      opacity: 0.5,
    },
    logoutButtonTextMinimal: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
      marginLeft: 8,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 16,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
      paddingVertical: 24,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
      maxHeight: '50%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
      backgroundColor: 'transparent',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: 'transparent',
    },
    settingLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: '600',
    },
    settingsButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      padding: 8,
    },
    expandedImageOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    expandedImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
    },
    intentCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 18,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    intentTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 12,
      textAlign: 'center',
    },
    intentOptionCard: {
      borderWidth: 2,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 8,
      minWidth: '45%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    intentOptionText: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
