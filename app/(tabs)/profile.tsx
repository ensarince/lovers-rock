import { Text, View } from '@/components/Themed';
import { useAuth } from '@/src/context/AuthContext';
import { User } from '@/src/types/user';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import PocketBase from 'pocketbase';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

const pb = new PocketBase(`http://${process.env.EXPO_PUBLIC_IP}:8090`);

export default function ProfileScreen() {
  const { user, logout, isLoading, isAuthenticated, token } = useAuth(); // <-- make sure your context provides the token
  const typedUser = user as User | null;
  const router = useRouter();

  // Editable state
  const [bio, setBio] = useState(typedUser?.bio || '');
  const [preferences, setPreferences] = useState(typedUser?.preferences || '');
  // Use avatar field, not avatarUrl, and construct the URL as needed
  const [photo, setPhoto] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setBio(typedUser?.bio || '');
    setPreferences(typedUser?.preferences || '');
    // If user.avatar is set, construct the Pocketbase file URL
    if (typedUser?.avatar) {
      setPhoto(pb.files.getUrl(typedUser, typedUser.avatar, { thumb: '100x100' }));
    } else {
      setPhoto('');
    }
  }, [user]);

  useEffect(() => {
    // Set the PocketBase auth token if available and not already set
    if (token && pb.authStore.token !== token) {
      pb.authStore.save(token, user);
      console.log('PocketBase authStore updated with token:', token);
    }
  }, [token, user]);

  const handleLogout = async () => {
    await logout();
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // updated to use array of MediaType
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
      // Debug: check authentication
      console.log('Is authenticated:', pb.authStore.isValid);
      console.log('Auth token:', pb.authStore.token);

      // Try to fetch the user record before updating
      try {
        const fetched = await pb.collection('users').getOne(user?.id!);
        console.log('Fetched user record:', fetched);
      } catch (fetchErr) {
        console.error('Could not fetch user record:', fetchErr);
        Alert.alert('Error', 'Could not fetch user record. Check if the user exists and you are authenticated.');
        setSaving(false);
        return;
      }

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
        console.log('Avatar file:', avatarFile);
      }
      // Debug: log PocketBase URL, collection, and user id
      console.log('PocketBase URL:', `http://${process.env.EXPO_PUBLIC_IP}:8090`);
      console.log('Collection:', 'users');
      console.log('User ID:', user?.id);

      const endpoint = `http://${process.env.EXPO_PUBLIC_IP}:8090/api/collections/users/records/${user?.id}`;
      console.log('Testing endpoint:', endpoint);

      let formData: any;
      if (avatarFile) {
        formData = new FormData();
        formData.append('bio', bio);
        formData.append('preferences', preferences);
        // @ts-ignore
        formData.append('avatar', avatarFile);
        if (formData instanceof FormData && formData._parts) {
          console.log('FormData parts:', formData._parts);
        }
        await pb.collection('users').update(user?.id!, formData);
      } else {
        formData = {
          bio,
          preferences,
        };
        console.log('FormData (no avatar):', formData);
        await pb.collection('users').update(user?.id!, formData);
      }
      setEditMode(false);
      Alert.alert('Profile updated!');
    } catch (e: any) {
      console.error('Profile update error:', e, e?.response);
      let errorMsg = 'Failed to update profile.';
      if (e?.message) errorMsg += '\n' + e.message;
      if (e?.response) errorMsg += '\n' + JSON.stringify(e.response, null, 2);
      // Add more debug info
      errorMsg += `\nPocketBase URL: http://${process.env.EXPO_PUBLIC_IP}:8090`;
      errorMsg += `\nCollection: users`;
      errorMsg += `\nUser ID: ${user?.id}`;
      Alert.alert('Error', errorMsg);
    }
    setSaving(false);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Please log in to view your profile</Text>
      </View>
    );
  }

  // Helper to get the correct avatar URL for display
  const getAvatarUrl = () => {
    if (photo && photo.startsWith('file')) return photo;
    if (typedUser?.avatar) return pb.files.getUrl(typedUser, typedUser.avatar, { thumb: '100x100' });
    return '';
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.containerMinimal}>
        <View style={styles.headerMinimal}>
          <Pressable onPress={editMode ? pickImage : undefined}>
            {getAvatarUrl() ? (
              <Image
                source={{ uri: getAvatarUrl() }}
                style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#ec4899' }}
              />
            ) : (
              <Ionicons name="person-circle" size={72} color="#fff" style={{ backgroundColor: '#ec4899', borderRadius: 36, padding: 8 }} />
            )}
            {editMode && (
              <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fff', borderRadius: 12, padding: 2 }}>
                <Ionicons name="camera" size={18} color="#ec4899" />
              </View>
            )}
          </Pressable>
          <Text style={styles.titleMinimal}>Profile</Text>
        </View>

        <View style={styles.userInfoMinimal}>
          <View style={styles.infoCardMinimal}>
            <Text style={styles.labelMinimal}>Email</Text>
            <Text style={styles.valueMinimal}>{user.email}</Text>
          </View>

          {user.name && (
            <View style={styles.infoCardMinimal}>
              <Text style={styles.labelMinimal}>Name</Text>
              <Text style={styles.valueMinimal}>{user.name}</Text>
            </View>
          )}

          <View style={styles.infoCardMinimal}>
            <Text style={styles.labelMinimal}>Bio</Text>
            {editMode ? (
              <TextInput
                style={[styles.valueMinimal, { backgroundColor: '#23232b', borderRadius: 8, padding: 8, minHeight: 40 }]}
                value={bio}
                onChangeText={setBio}
                multiline
                placeholder="Tell us about yourself"
                placeholderTextColor="#888"
              />
            ) : (
              <Text style={styles.valueMinimal}>{typedUser?.bio || 'No bio set.'}</Text>
            )}
          </View>

          <View style={styles.infoCardMinimal}>
            <Text style={styles.labelMinimal}>Preferences</Text>
            {editMode ? (
              <TextInput
                style={[styles.valueMinimal, { backgroundColor: '#23232b', borderRadius: 8, padding: 8, minHeight: 40 }]}
                value={preferences}
                onChangeText={setPreferences}
                multiline
                placeholder="Your preferences"
                placeholderTextColor="#888"
              />
            ) : (
              <Text style={styles.valueMinimal}>{typedUser?.preferences || 'No preferences set.'}</Text>
            )}
          </View>
        </View>

        {editMode ? (
          <Pressable
            style={[styles.logoutButtonMinimal, saving && styles.buttonDisabledMinimal, { backgroundColor: '#22c55e' }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.logoutButtonTextMinimal}>Save</Text>
              </>
            )}
          </Pressable>
        ) : (
          <Pressable
            style={[styles.logoutButtonMinimal, isLoading && styles.buttonDisabledMinimal, { backgroundColor: '#6366f1' }]}
            onPress={() => setEditMode(true)}
          >
            <Ionicons name="create" size={20} color="#fff" />
            <Text style={styles.logoutButtonTextMinimal}>Edit Profile</Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.logoutButtonMinimal, isLoading && styles.buttonDisabledMinimal]}
          onPress={handleLogout}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="log-out" size={20} color="#fff" />
              <Text style={styles.logoutButtonTextMinimal}>Logout</Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  containerMinimal: {
    flex: 1,
    padding: 0,
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerMinimal: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  titleMinimal: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1.1,
    marginTop: 8,
  },
  userInfoMinimal: {
    gap: 14,
    marginBottom: 32,
    marginHorizontal: 24,
  },
  infoCardMinimal: {
    backgroundColor: '#18181b',
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
    color: '#a1a1aa',
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 1.1,
  },
  valueMinimal: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  userIdMinimal: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#a1a1aa',
    marginTop: 2,
  },
  logoutButtonMinimal: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 24,
    marginBottom: 24,
    shadowColor: '#ef4444',
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
    color: '#ef4444',
    fontSize: 16,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: '#101014',
    paddingVertical: 24,
  },
});
