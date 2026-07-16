
import { Text } from '@/components/Themed';
import { useAuth } from '@/src/context/AuthContext';
import { SkeletonProfile } from '@/src/components/SkeletonLoader';
import { getBlockedUsersData } from '@/src/services/accountService';
import { GradePicker } from '@/src/components/GradePicker';
import { createDefaultGrade, formatGradeDisplay } from '@/src/services/gradeService';
import { getReportService } from '@/src/services/reportService';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import { Climber, ClimbingGrade, ClimbingStyle, Gender, InterestedIn } from '@/src/types/climber';
import { getPocketBaseUrl } from '@/src/utils/helperFunctions';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef, useState } from 'react';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  Linking,
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


const CLIMBING_STYLES: ClimbingStyle[] = [
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
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [blockedUsersData, setBlockedUsersData] = useState<Record<string, { name: string; avatarId: string | null }>>({});
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);

  // Profile fields
  const [name, setName] = useState(typedUser?.name || '');
  const [bio, setBio] = useState(typedUser?.bio || '');
  const [age, setAge] = useState(typedUser?.age ? String(typedUser.age) : '');
  const [gender, setGender] = useState<Gender | undefined>(typedUser?.gender);
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
  const [interestedIn, setInterestedIn] = useState<InterestedIn>(typedUser?.interested_in || 'everyone');
  const [savingIntent, setSavingIntent] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const savingIntentRef = useRef(false);
  const savingPreferenceRef = useRef(false);
  // Image state for edit mode
  const [images, setImages] = useState(typedUser?.images || []);
  const [avatar, setAvatar] = useState(typedUser?.avatar || '');
  const [imageSlots, setImageSlots] = useState<Array<{ kind: 'existing' | 'new'; value: string } | null>>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setName(typedUser?.name || '');
    setBio(typedUser?.bio || '');
    setAge(typedUser?.age ? String(typedUser.age) : '');
    setGender(typedUser?.gender);
    setGrade(
      typedUser?.grade && typeof typedUser.grade === 'object' && typedUser.grade.general_level
        ? typedUser.grade
        : createDefaultGrade()
    );
    setClimbingStyles(typedUser?.climbing_styles || []);
    setHomeGym(typedUser?.home_gym || '');
    setImages(typedUser?.images || []);
    setAvatar(typedUser?.avatar || '');
    setIntent(Array.isArray(typedUser?.intent) ? typedUser.intent : []);
    setInterestedIn(typedUser?.interested_in || 'everyone');
  }, [user]);

  const handleLogout = async () => {
    await logout();
  };

  const handleDarkModeToggle = async (value: boolean) => {
    setDarkMode(value);
    await AsyncStorage.setItem('darkMode', JSON.stringify(value));
  };

  const fetchBlockedUsersData = async () => {
    if (!user?.id || !token) {
      return;
    }

    try {
      const reportService = getReportService();
      const ids = await reportService.getBlockedUsersByMe(user.id, token);
      setBlockedUserIds(ids);

      if (ids.length === 0) {
        setBlockedUsersData({});
        return;
      }

      const dataMap = await getBlockedUsersData(ids, token);
      setBlockedUsersData(dataMap);
    } catch (error: any) {
      console.error('Error fetching blocked users data:', error);
    }
  };

  useEffect(() => {
    if (showBlockedUsers) {
      fetchBlockedUsersData();
    }
  }, [showBlockedUsers, user?.id, token]);

  useEffect(() => {
    if (user?.id && token) {
      fetchBlockedUsersData();
    }
  }, [user?.id, token]);

  const handleUnblock = async (blockedUserId: string) => {
    if (!user?.id || !token) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    try {
      setUnblockingUserId(blockedUserId);
      const reportService = getReportService();
      await reportService.unblockUser(user.id, blockedUserId, token);

      const updatedBlockedUsers = blockedUserIds.filter((id) => id !== blockedUserId);
      setBlockedUserIds(updatedBlockedUsers);

      const newDataMap = { ...blockedUsersData };
      delete newDataMap[blockedUserId];
      setBlockedUsersData(newDataMap);

      if (updatedBlockedUsers.length > 0) {
        setTimeout(() => fetchBlockedUsersData(), 500);
      }

      Alert.alert('Success', 'User has been unblocked');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to unblock user');
    } finally {
      setUnblockingUserId(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id || !token) {
      Alert.alert('Error', 'Unable to delete account. Please try again.');
      return;
    }

    try {
      setDeleting(true);
      const POCKETBASE_URL = getPocketBaseUrl();
      
      const response = await fetch(
        `${POCKETBASE_URL}/api/collections/users/records/${user.id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      // Clear local storage and logout
      await AsyncStorage.removeItem('user');
      await SecureStore.deleteItemAsync('token');
      setDeleteConfirmationVisible(false);
      await logout();
      router.replace('/(auth)/login');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete account. Please try again.');
      console.error('Delete account error:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleIntentChange = async (selectedIntent: string) => {
    if (savingIntentRef.current) return;
    savingIntentRef.current = true;

    const newIntent: string[] = intent.includes(selectedIntent)
      ? intent.filter(i => i !== selectedIntent)
      : [...intent, selectedIntent];

    setIntent(newIntent);
    setSavingIntent(true);

    try {
      const POCKETBASE_URL = getPocketBaseUrl();
      const response = await fetch(
        `${POCKETBASE_URL}/api/collections/users/records/${user?.id}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ intent: newIntent }),
        }
      );
      if (!response.ok) {
        const body = await response.text();
        console.error(`[intent] PATCH failed ${response.status}:`, body);
        throw new Error(`${response.status}`);
      }
      if (user) {
        const updatedUser: Climber = { ...user, intent: newIntent as ('partner' | 'date')[] };
        setUser(updatedUser);
        AsyncStorage.setItem('user', JSON.stringify(updatedUser)).catch(() => {});
      }
    } catch {
      setIntent(Array.isArray(typedUser?.intent) ? typedUser.intent : []);
    } finally {
      savingIntentRef.current = false;
      setSavingIntent(false);
    }
  };

  const handleInterestedInChange = async (value: InterestedIn) => {
    if (savingPreferenceRef.current) return;
    savingPreferenceRef.current = true;

    setInterestedIn(value);
    setSavingPreference(true);

    try {
      const POCKETBASE_URL = getPocketBaseUrl();
      const response = await fetch(
        `${POCKETBASE_URL}/api/collections/users/records/${user?.id}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ interested_in: value }),
        }
      );
      if (!response.ok) {
        const body = await response.text();
        console.error(`[preference] PATCH failed ${response.status}:`, body);
        throw new Error(`${response.status}`);
      }
      if (user) {
        const updatedUser = { ...user, interested_in: value };
        setUser(updatedUser as Climber);
        AsyncStorage.setItem('user', JSON.stringify(updatedUser)).catch(() => {});
      }
    } catch {
      setInterestedIn(typedUser?.interested_in || 'everyone');
    } finally {
      savingPreferenceRef.current = false;
      setSavingPreference(false);
    }
  };

  const buildImageSlots = (existingImages: string[]) => {
    const slots: Array<{ kind: 'existing' | 'new'; value: string } | null> = [null, null, null];
    existingImages.slice(0, 3).forEach((image, index) => {
      slots[index] = { kind: 'existing', value: image };
    });
    return slots;
  };

  const getSlotData = (slots: Array<{ kind: 'existing' | 'new'; value: string } | null>) => {
    const existing: string[] = [];
    const newLocal: string[] = [];

    slots.forEach((slot) => {
      if (!slot) return;
      if (slot.kind === 'existing') {
        existing.push(slot.value);
      } else {
        newLocal.push(slot.value);
      }
    });

    return {
      existing,
      newLocal,
      total: existing.length + newLocal.length,
    };
  };

  const getFirstSlot = (slots: Array<{ kind: 'existing' | 'new'; value: string } | null>) =>
    slots.find((slot) => slot !== null) || null;

  useEffect(() => {
    if (editMode) {
      setImageSlots(buildImageSlots(images));
    } else {
      setImageSlots([]);
    }
  }, [editMode, images]);

  const pickImage = async (index: number) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const MAX_BYTES = 10 * 1024 * 1024;
      if (asset.fileSize && asset.fileSize > MAX_BYTES) {
        Alert.alert('Image too large', 'Please choose an image under 10 MB.');
        return;
      }
      const newUri = asset.uri;
      setImageSlots((prev) => {
        const next = [...prev];
        next[index] = { kind: 'new', value: newUri };
        return next;
      });
    }
  };

  const removeImage = (index: number) => {
    setImageSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  const handleSave = async () => {
    // Validate that we have images if this is edit mode for images
      const slotsForSave = imageSlots.length > 0 ? imageSlots : buildImageSlots(images);
      const { total: totalImages, newLocal: newPhotosForSave } = getSlotData(slotsForSave);
      const numericAge = Number(age);

    if (totalImages < 3) {
      Alert.alert('Required', `Please upload ${3 - totalImages} more image(s). You need 3 images total.`);
      return;
    }
    if (!age.trim() || Number.isNaN(numericAge)) {
      Alert.alert('Required', 'Please enter a valid age.');
      return;
    }
    if (numericAge < 18) {
      Alert.alert('Age Requirement', 'You must be at least 18 years old to use the app.');
      return;
    }

    setSaving(true);
    try {
      const POCKETBASE_URL = getPocketBaseUrl();

      // Ensure grade has all required fields
      const gradeToSave = {
        system: grade.system || 'unknown',
        value: grade.value || '',
        general_level: grade.general_level || 'beginner',
      };

      const formData = new FormData();
      formData.append('name', name);
      formData.append('bio', bio);
      formData.append('age', String(Number(age)));
      formData.append('interested_in', interestedIn);
      if (gender) {
        formData.append('gender', gender);
      }
      formData.append('grade', JSON.stringify(gradeToSave));
      formData.append('climbing_styles', JSON.stringify(climbingStyles));
      formData.append('home_gym', homeGym);
      
      // intent as array
      intent.forEach((val) => formData.append('intent', val));
      
      // Add existing and new image files in slot order
      slotsForSave.forEach((slot, index) => {
        if (!slot) return;
        if (slot.kind === 'existing') {
          formData.append('images', slot.value);
          return;
        }

        const photoUri = slot.value;
        const extension = photoUri.split('.').pop()?.toLowerCase() || 'jpg';
        let mimeType = 'image/jpeg';
        if (extension === 'png') mimeType = 'image/png';
        else if (extension === 'jpg' || extension === 'jpeg') mimeType = 'image/jpeg';
        else if (extension === 'webp') mimeType = 'image/webp';

        const file = {
          uri: photoUri,
          name: `image_${index}.${extension}`,
          type: mimeType,
        } as any;
        formData.append('images', file);
      });

      // Only set avatar if we have NEW images being uploaded
      // Don't touch avatar field if we're not uploading new images - PocketBase will keep the existing one
      if (newPhotosForSave.length > 0) {
        // We'll set the avatar after the upload completes and we know the filenames
        // For now, just don't append it
      }

      const response = await fetch(
        `${POCKETBASE_URL}/api/collections/users/records/${user?.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (e) {
          console.error('Failed to parse error response as JSON');
        }
        console.error('PocketBase error response:', errorData);
        console.error('Error status:', response.status);
        console.error('Error statusText:', response.statusText);
        
        // Provide detailed error message
        let detailedError = 'Failed to update record';
        if (errorData?.message) {
          detailedError = errorData.message;
        } else if (errorData?.data) {
          // PocketBase field-specific errors
          const fieldErrors = Object.entries(errorData.data)
            .map(([field, err]: [string, any]) => `${field}: ${err?.message || err}`)
            .join(', ');
          if (fieldErrors) detailedError = fieldErrors;
        } else if (errorData?.details) {
          detailedError = errorData.details;
        }
        
        throw new Error(detailedError);
      }

      setEditMode(false);
      
      // Fetch latest user from backend and update context/cache
      if (user?.id && token) {
        try {
          const latestResponse = await fetch(
            `${POCKETBASE_URL}/api/collections/users/records/${user.id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          
          if (latestResponse.ok) {
            const latestUser = await latestResponse.json();
            
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
              verified: latestUser.verified || false,
              name: latestUser.name || '',
              age: typeof latestUser.age === 'number' ? latestUser.age : 0,
              gender: latestUser.gender,
              grade: parsedGrade,
              climbing_styles: Array.isArray(latestUser.climbing_styles) ? latestUser.climbing_styles : [],
              home_gym: latestUser.home_gym || '',
              bio: latestUser.bio || '',
              email: latestUser.email || '',
              avatar: latestUser.avatar || '',
              images: Array.isArray(latestUser.images) ? latestUser.images : [],
              intent: Array.isArray(latestUser.intent) ? latestUser.intent : [],
              profile_completed: latestUser.profile_completed || false,
              interested_in: latestUser.interested_in || 'everyone',
            };
            setUser(mappedUser);
            await AsyncStorage.setItem('user', JSON.stringify(mappedUser));

            // If we uploaded new images, set avatar to the first image
            if (newPhotosForSave.length > 0 && latestUser.images?.length > 0) {
              try {
                const avatarResponse = await fetch(
                  `${POCKETBASE_URL}/api/collections/users/records/${user.id}`,
                  {
                    method: 'PATCH',
                    headers: {
                      Authorization: `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      avatar: latestUser.images[0],
                    }),
                  }
                );
                
                if (avatarResponse.ok) {
                  // Fetch again to get the final state
                  const finalResponse = await fetch(
                    `${POCKETBASE_URL}/api/collections/users/records/${user.id}`,
                    {
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    }
                  );
                  
                  if (finalResponse.ok) {
                    const finalUser = await finalResponse.json();
                    const finalMappedUser: Climber = {
                      ...mappedUser,
                      avatar: finalUser.avatar || '',
                      images: Array.isArray(finalUser.images) ? finalUser.images : [],
                    };
                    setUser(finalMappedUser);
                    await AsyncStorage.setItem('user', JSON.stringify(finalMappedUser));
                  }
                }
              } catch (avatarErr) {
                console.error('Error setting avatar:', avatarErr);
                // Continue anyway, the images are already uploaded
              }
            }
          }
        } catch (err) {
          // Silently handle fetch error
        }
      }
      
      Alert.alert('Profile updated!');
    } catch (e: any) {
      let errorMsg = 'Failed to update profile.';
      if (e?.message) errorMsg += '\n' + e.message;
      console.error('Save error details:', e);
      Alert.alert('Error', errorMsg);
    }
    setSaving(false);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <SkeletonProfile />
      </View>
    );
  }

  const slotsForDisplay = editMode && imageSlots.length > 0 ? imageSlots : buildImageSlots(images);
  const { total: totalImages } = getSlotData(slotsForDisplay);
  const imagesRequirementMet = totalImages >= 3;

  // Always show the avatar from the DB unless a new photo is picked
  const getAvatarUrl = () => {
    const firstSlot = getFirstSlot(slotsForDisplay);
    if (firstSlot?.kind === 'new') {
      return firstSlot.value;
    }

    if (firstSlot?.kind === 'existing') {
      const userId = typedUser?.id;
      if (userId) {
        const baseUrl = getPocketBaseUrl();
        return `${baseUrl}/api/files/users/${userId}/${firstSlot.value}?thumb=300x300`;
      }
    }

    // 3. Use the filename from state or the user object (legacy avatar)
    const filename = avatar || typedUser?.avatar;
    const userId = typedUser?.id;

    // 4. Manually construct the URL if we have the necessary parts
    if (filename && userId) {
      const baseUrl = getPocketBaseUrl();
      // PocketBase file path format: /api/files/COLLECTION_ID_OR_NAME/RECORD_ID/FILENAME
      return `${baseUrl}/api/files/users/${userId}/${filename}?thumb=300x300`;
    }

    return '';
  };

  // Full resolution avatar URL for expanded view
  const getFullResolutionAvatarUrl = () => {
    const firstSlot = getFirstSlot(slotsForDisplay);
    if (firstSlot?.kind === 'new') {
      return firstSlot.value;
    }

    if (firstSlot?.kind === 'existing') {
      const userId = typedUser?.id;
      if (userId) {
        const baseUrl = getPocketBaseUrl();
        return `${baseUrl}/api/files/users/${userId}/${firstSlot.value}`;
      }
    }

    // 3. Use the filename from state or the user object (legacy avatar)
    const filename = avatar || typedUser?.avatar;
    const userId = typedUser?.id;

    // 4. Manually construct the URL if we have the necessary parts
    if (filename && userId) {
      const baseUrl = getPocketBaseUrl();
      return `${baseUrl}/api/files/users/${userId}/${filename}`;
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
        <LinearGradient
          colors={
            darkMode
              ? ['rgba(52,211,207,0.12)', 'rgba(255,46,99,0.10)']
              : ['rgba(26,166,163,0.10)', 'rgba(255,46,99,0.08)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHeroCard}
        >
        <View style={styles.headerWithSettingsRow}>
          <View style={styles.headerMinimal}>
            <Pressable onPress={() => { if (editMode) { pickImage(0); } else { setCarouselIndex(0); setImageExpanded(true); } }}>
              {getAvatarUrl() ? (
                <Image
                  source={{ uri: getAvatarUrl() }}
                  style={styles.heroAvatar}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person-circle" size={72} color={theme.colors.text} style={styles.heroAvatarFallback} />
              )}
              {editMode && (
                <View style={styles.heroAvatarCamera}>
                  <Ionicons name="camera" size={18} color={theme.colors.accent} />
                </View>
              )}
            </Pressable>
            <Text style={styles.titleMinimal}>{name || 'Your Profile'}</Text>
          </View>

          <Pressable
            onPress={() => setSettingsModalVisible(true)}
            style={styles.settingsButton}
          >
            <Ionicons name="settings" size={24} color={theme.colors.text} />
          </Pressable>
        </View>
        </LinearGradient>

        {/* Intent Selection Card */}
        <View style={[styles.intentCard, { marginHorizontal: 24, marginBottom: 24 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent', marginBottom: 12 }}>
            <Text style={[styles.intentTitle, { color: theme.colors.text, marginBottom: 0 }]}>What are you looking for?</Text>
            {savingIntent && <ActivityIndicator size="small" color={theme.colors.accent} />}
          </View>
          <View style={{
            flexDirection: 'row', gap: 12, justifyContent: 'center', flexWrap: 'wrap', backgroundColor: "transparent"
          }}>
            {['partner', 'date'].map(opt => {
              const intentColor = opt === 'partner' ? theme.colors.edit : theme.colors.accent;
              return (
                <Pressable
                  key={opt}
                  disabled={savingIntent}
                  style={[
                    styles.intentOptionCard,
                    {
                      backgroundColor: intent.includes(opt) ? intentColor : theme.colors.surface,
                      borderColor: intent.includes(opt) ? intentColor : theme.colors.border,
                      opacity: savingIntent ? 0.6 : 1,
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
              );
            })}
          </View>
        </View>

        {/* Dating Preference Card — only shown when dating intent is active */}
        {intent.includes('date') && (
          <Animated.View
            entering={FadeIn.duration(250)}
            exiting={FadeOut.duration(200)}
            style={[styles.intentCard, { marginHorizontal: 24, marginBottom: 24 }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent', marginBottom: 12 }}>
              <Text style={[styles.intentTitle, { color: theme.colors.text, marginBottom: 0 }]}>For dating, show me</Text>
              {savingPreference && <ActivityIndicator size="small" color={theme.colors.accent} />}
            </View>
            <View style={{ flexDirection: 'column', gap: 8, backgroundColor: 'transparent' }}>
              {([
                { value: 'men', label: 'Men' },
                { value: 'women', label: 'Women' },
                { value: 'everyone', label: 'Everyone' },
              ] as { value: InterestedIn; label: string }[]).map(opt => (
                <Pressable
                  key={opt.value}
                  disabled={savingPreference}
                  style={[
                    styles.intentOptionCard,
                    {
                      backgroundColor: interestedIn === opt.value ? theme.colors.accent : theme.colors.surface,
                      borderColor: interestedIn === opt.value ? theme.colors.accent : theme.colors.border,
                      opacity: savingPreference ? 0.6 : 1,
                    },
                  ]}
                  onPress={() => handleInterestedInChange(opt.value)}
                >
                  <Text style={[styles.intentOptionText, { color: interestedIn === opt.value ? '#fff' : theme.colors.text }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ fontSize: 11, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8, backgroundColor: 'transparent' }}>
              Partner mode always shows everyone
            </Text>
          </Animated.View>
        )}

        {/* Images Section in Edit Mode */}
        {editMode && (
          <View style={styles.photosCard}>
            <View style={styles.photosHeader}>
              <View style={{ backgroundColor: 'transparent' }}>
                <Text style={[styles.labelMinimal, { marginBottom: 4 }]}>Photos</Text>
                <Text style={styles.photosRequirementText}>3 photos are required for every account</Text>
              </View>
              <View style={[
                styles.photoCountBadge,
                { backgroundColor: imagesRequirementMet ? theme.colors.success + '15' : theme.colors.error + '12' }
              ]}>
                <Text style={[
                  styles.photoCountBadgeText,
                  { color: imagesRequirementMet ? theme.colors.success : theme.colors.error }
                ]}>
                  {totalImages}/3
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.valueMinimal,
                {
                  fontSize: 12,
                  color: imagesRequirementMet ? theme.colors.textSecondary : theme.colors.error,
                  marginBottom: 12,
                },
              ]}
            >
              {imagesRequirementMet ? 'Requirement met' : 'Add the missing photos to keep the profile valid'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'space-between' }}>
              {[0, 1, 2].map((index) => {
                const slot = slotsForDisplay[index];
                const imageUri =
                  slot?.kind === 'existing'
                    ? `${getPocketBaseUrl()}/api/files/users/${user.id}/${slot.value}?thumb=200x200`
                    : slot?.kind === 'new'
                      ? slot.value
                      : null;

                return (
                  <View key={index} style={{ flex: 1, alignItems: 'center' }}>
                    <Pressable
                      style={{
                        width: '100%',
                        aspectRatio: 1,
                        borderRadius: 12,
                        backgroundColor: theme.colors.surface,
                        borderWidth: 2,
                        borderColor: theme.colors.border,
                        justifyContent: 'center',
                        alignItems: 'center',
                        overflow: 'hidden',
                      }}
                      onPress={() => pickImage(index)}
                    >
                      {imageUri ? (
                        <Image
                          source={{
                            uri: imageUri,
                          }}
                          style={{ width: '100%', height: '100%' }}
                        />
                      ) : (
                        <Ionicons
                          name="camera"
                          size={32}
                          color={theme.colors.textSecondary}
                        />
                      )}
                    </Pressable>
                    {imageUri && (
                      <Pressable
                        style={{
                          marginTop: 8,
                          padding: 6,
                          backgroundColor: '#ef4444',
                          borderRadius: 6,
                        }}
                        onPress={() => removeImage(index)}
                      >
                        <Ionicons name="trash" size={16} color="#fff" />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
            <Text
              style={[
                styles.valueMinimal,
                { marginTop: 8, fontSize: 12, color: imagesRequirementMet ? theme.colors.textSecondary : theme.colors.error },
              ]}
            >
              First photo is used as your main profile image
            </Text>
          </View>
        )}

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

          <View style={styles.infoCardMinimal}>
            <Text style={styles.labelMinimal}>Gender</Text>
            {editMode ? (
              <View style={{
                flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: "transparent"
              }}>
                {GENDER_OPTIONS.map(option => (
                  <Pressable
                    key={option}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: gender === option ? theme.colors.accent : theme.colors.surface,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: gender === option ? theme.colors.accent : theme.colors.border,
                    }}
                    onPress={() => setGender(option)}
                  >
                    <Text
                      style={{
                        color: gender === option ? '#fff' : theme.colors.text,
                        fontSize: 12,
                        fontWeight: '500',
                      }}
                    >
                      {option === 'non_binary' ? 'Non-binary' : option === 'prefer_not_to_say' ? 'Prefer not to say' : option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.valueMinimal}>
                {gender ? (gender === 'non_binary' ? 'Non-binary' : gender === 'prefer_not_to_say' ? 'Prefer not to say' : gender.charAt(0).toUpperCase() + gender.slice(1)) : 'No gender set.'}
              </Text>
            )}
          </View>

          <View style={[styles.infoCardMinimal]}>
            <Text style={styles.labelMinimal}>Climbing Grade</Text>
            {editMode ? (
              <GradePicker value={grade} onChange={setGrade} colors={theme.colors} />
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

      {/* Expanded Images Carousel Modal */}
      <Modal visible={imageExpanded} transparent animationType="fade">
        <View style={styles.expandedImageOverlay}>
          {(() => {
            const screenWidth = Dimensions.get('window').width;
            const allUrls = slotsForDisplay
              .filter((slot): slot is { kind: 'existing' | 'new'; value: string } => slot !== null)
              .map((slot) => {
                if (slot.kind === 'new') return slot.value;
                const userId = typedUser?.id;
                if (userId) {
                  const baseUrl = getPocketBaseUrl();
                  return `${baseUrl}/api/files/users/${userId}/${slot.value}`;
                }
                return '';
              })
              .filter(Boolean);

            if (allUrls.length === 0) {
              return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 16 }}>No images available</Text>
                </View>
              );
            }

            return (
              <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  style={{ flex: 1 }}
                  onMomentumScrollEnd={(e) => {
                    const page = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
                    setCarouselIndex(page);
                  }}
                >
                  {allUrls.map((url, idx) => (
                    <Image
                      key={idx}
                      source={{ uri: url }}
                      style={{ width: screenWidth, flex: 1, resizeMode: 'contain' }}
                    />
                  ))}
                </ScrollView>
                {allUrls.length > 1 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'center', paddingBottom: 80, gap: 8 }}>
                    {allUrls.map((_, idx) => (
                      <View
                        key={idx}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: idx === carouselIndex ? '#ffffff' : 'rgba(255,255,255,0.35)',
                        }}
                      />
                    ))}
                  </View>
                )}
              </>
            );
          })()}
          <Pressable
            style={{
              position: 'absolute',
              top: 40,
              right: 20,
              padding: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: 20,
            }}
            onPress={() => setImageExpanded(false)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
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

            <Pressable
              style={[styles.settingItem, { borderTopWidth: 1, borderTopColor: theme.colors.border }]}
              onPress={() => setShowBlockedUsers(true)}
            >
              <View style={styles.settingLabelRow}>
                <Ionicons name="ban" size={20} color={theme.colors.accent} style={{ marginRight: 12 }} />
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                  Blocked Users {blockedUserIds.length > 0 ? `(${blockedUserIds.length})` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </Pressable>

            <Pressable
              style={[styles.settingItem, { borderTopWidth: 1, borderTopColor: theme.colors.border }]}
              onPress={() => Linking.openURL('https://takeclimbing.live')}
            >
              <View style={styles.settingLabelRow}>
                <Ionicons name="globe-outline" size={20} color={theme.colors.accent} style={{ marginRight: 12 }} />
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Visit Website</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={theme.colors.textSecondary} />
            </Pressable>

            <Pressable
              style={[styles.settingItem, { borderTopWidth: 1, borderTopColor: theme.colors.border }]}
              onPress={() => setDeleteConfirmationVisible(true)}
            >
              <View style={styles.settingLabelRow}>
                <Ionicons name="trash" size={20} color={theme.colors.error} style={{ marginRight: 12 }} />
                <Text style={[styles.settingLabel, { color: theme.colors.error }]}>Delete Account</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirmationVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => !deleting && setDeleteConfirmationVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.confirmationModalContent, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.confirmationTitle, { color: theme.colors.text }]}>Delete Account?</Text>
            <Text style={[styles.confirmationMessage, { color: theme.colors.textSecondary }]}>
              This action cannot be undone. All your data will be permanently deleted.
            </Text>
            <View style={styles.confirmationButtonGroup}>
              <Pressable
                style={[styles.confirmationButton, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}
                onPress={() => setDeleteConfirmationVisible(false)}
                disabled={deleting}
              >
                <Text style={[styles.confirmationButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmationButton, { backgroundColor: theme.colors.error }, deleting && styles.buttonDisabledMinimal]}
                onPress={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.confirmationButtonText, { color: '#fff' }]}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Blocked Users Modal */}
      <Modal
        visible={showBlockedUsers}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBlockedUsers(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.blockedUsersModal, { backgroundColor: theme.colors.background }]}>
            <View style={styles.blockedUsersHeader}>
              <Text style={[styles.blockedUsersTitle, { color: theme.colors.text }]}>Blocked Users</Text>
              <Pressable onPress={() => setShowBlockedUsers(false)} style={styles.closeButton}>
                <Ionicons name="close" size={26} color={theme.colors.text} />
              </Pressable>
            </View>

            {blockedUserIds.length > 0 ? (
              <ScrollView style={styles.blockedUsersList} showsVerticalScrollIndicator={false}>
                {blockedUserIds.map((blockedUserId) => {
                  const userData = blockedUsersData[blockedUserId];
                  const avatarId = userData?.avatarId || null;
                  const userName = userData?.name || 'Unknown User';
                  const imageUrl = avatarId ? `${getPocketBaseUrl()}/api/files/users/${blockedUserId}/${avatarId}` : null;

                  return (
                    <View key={blockedUserId} style={[styles.blockedUserItem, { backgroundColor: theme.colors.surface }]}>
                      {imageUrl ? (
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.blockedUserAvatar}
                        />
                      ) : (
                        <View style={[styles.blockedUserAvatar, { backgroundColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center' }]}>
                          <Ionicons name="person" size={20} color={theme.colors.background} />
                        </View>
                      )}
                      <View style={styles.blockedUserInfo}>
                        <Text style={[styles.blockedUserName, { color: theme.colors.text }]} numberOfLines={1}>
                          {userName}
                        </Text>
                      </View>
                      <Pressable
                        style={[
                          styles.unblockButton,
                          unblockingUserId === blockedUserId && styles.unblockButtonLoading,
                        ]}
                        onPress={() => handleUnblock(blockedUserId)}
                        disabled={unblockingUserId === blockedUserId}
                      >
                        {unblockingUserId === blockedUserId ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={16} color="white" style={{ marginRight: 4 }} />
                            <Text style={styles.unblockButtonText}>Unblock</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyBlockedUsersContainer}>
                <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
                <Text style={[styles.emptyBlockedUsersText, { color: theme.colors.text }]}>
                  No blocked users
                </Text>
                <Text style={[styles.emptyBlockedUsersSubtext, { color: theme.colors.textSecondary }]}>
                  Users you block will appear here
                </Text>
              </View>
            )}
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
      marginBottom: 0,
      backgroundColor: 'transparent',
    },
    profileHeroCard: {
      marginHorizontal: 20,
      marginBottom: 24,
      padding: 18,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.10)',
      overflow: 'hidden',
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
      marginTop: 10,
    },
    profileSubtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      maxWidth: 220,
      lineHeight: 18,
    },
    heroAvatar: {
      width: 84,
      height: 84,
      borderRadius: 28,
      backgroundColor: theme.colors.accent,
      borderWidth: 3,
      borderColor: 'rgba(255,255,255,0.65)',
    },
    heroAvatarFallback: {
      backgroundColor: theme.colors.accent,
      borderRadius: 28,
      padding: 8,
    },
    heroAvatarCamera: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: theme.colors.text,
      borderRadius: 12,
      padding: 2,
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
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.55)',
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
      borderRadius: 18,
      padding: 18,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.colors.border,
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
    confirmationModalContent: {
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      marginHorizontal: 20,
    },
    confirmationTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 12,
      textAlign: 'center',
    },
    confirmationMessage: {
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 20,
    },
    confirmationButtonGroup: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    confirmationButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmationButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    photosCard: {
      marginHorizontal: 24,
      marginBottom: 24,
      padding: 16,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    photosHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      backgroundColor: 'transparent',
    },
    photosRequirementText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    photoCountBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    photoCountBadgeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    blockedUsersModal: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '90%',
      marginTop: 'auto',
      flex: 1,
    },
    blockedUsersHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    blockedUsersTitle: {
      fontSize: 18,
      fontWeight: '700',
      flex: 1,
    },
    closeButton: {
      padding: 4,
    },
    blockedUsersList: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    blockedUserItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginBottom: 10,
      borderRadius: 12,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    blockedUserAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      marginRight: 12,
    },
    blockedUserInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    blockedUserName: {
      fontSize: 14,
      fontWeight: '600',
    },
    unblockButton: {
      flexDirection: 'row',
      backgroundColor: theme.colors.success,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
    unblockButtonLoading: {
      opacity: 0.6,
    },
    unblockButtonText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyBlockedUsersContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 48,
    },
    emptyBlockedUsersText: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: 12,
      marginBottom: 4,
    },
    emptyBlockedUsersSubtext: {
      fontSize: 13,
      fontWeight: '500',
    },
  });
