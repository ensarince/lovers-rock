import { ClimberDetailModal } from '@/src/components/ClimberDetailModal';
import { useAuth } from '@/src/context/AuthContext';
import { formatGradeDisplay } from '@/src/services/gradeService';
import { getGymClimbers, GymClimber } from '@/src/services/gymService';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import { Climber } from '@/src/types/climber';
import { getFirstImageUrl } from '@/src/utils/helperFunctions';
import { ChevronDown, User } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// The gym page: who climbs at this gym. Regulars (home gym) first, then people
// who also climb here. Tapping someone opens their profile. Opened from a gym
// pin on the map. See handoff/MAP-PLAN.md, Phase 3.

interface Props {
  gymId: string | null;
  gymName: string;
  visible: boolean;
  onClose: () => void;
}

const toClimber = (c: GymClimber): Climber => ({
  id: c.id,
  name: c.name,
  age: typeof c.age === 'number' ? c.age : 0,
  verified: c.verified,
  gender: (c.gender || undefined) as Climber['gender'],
  grade: c.grade,
  climbing_styles: (c.climbing_styles || []) as Climber['climbing_styles'],
  home_gym: c.home_gym,
  other_gyms: c.other_gyms,
  bio: c.bio,
  email: '',
  images: c.images,
  intent: (c.intent || []) as Climber['intent'],
  profile_completed: true,
});

export function GymClimbersModal({ gymId, gymName, visible, onClose }: Props) {
  const { token, darkMode } = useAuth();
  const theme = darkMode ? themeDark : themeLight;
  const styles = createStyles(theme);

  const [climbers, setClimbers] = useState<GymClimber[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<Climber | null>(null);

  const load = useCallback(async () => {
    if (!gymId || !token) return;
    setLoading(true);
    setFailed(false);
    try {
      const result = await getGymClimbers(gymId, token);
      setClimbers(result.items);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [gymId, token]);

  useEffect(() => {
    if (visible) {
      setClimbers([]);
      load();
    }
  }, [visible, load]);

  const regulars = climbers.filter((c) => c.home).length;

  const renderRow = ({ item, index }: { item: GymClimber; index: number }) => {
    const photo = getFirstImageUrl(item.images, item.id);
    // A small heading where the "also climbs here" group starts.
    const startsAlsoGroup = !item.home && (index === 0 || climbers[index - 1].home);
    return (
      <>
        {startsAlsoGroup && <Text style={styles.groupLabel}>Also climb here</Text>}
        <Pressable
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
          onPress={() => setSelected(toClimber(item))}
        >
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoEmpty]}>
              <User size={20} color={theme.colors.textSecondary} />
            </View>
          )}
          <View style={styles.rowBody}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
              {item.age ? `, ${item.age}` : ''}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {formatGradeDisplay(item.grade)}
              {item.climbing_styles?.length
                ? ` · ${item.climbing_styles.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}`
                : ''}
            </Text>
          </View>
        </Pressable>
      </>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeButton} accessibilityLabel="Close">
            <ChevronDown size={26} color={theme.colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {gymName}
            </Text>
            {!loading && !failed && (
              <Text style={styles.subtitle}>
                {climbers.length === 0
                  ? 'No climbers to show yet'
                  : `${regulars} call${regulars === 1 ? 's' : ''} it home · ${climbers.length - regulars} also climb${climbers.length - regulars === 1 ? 's' : ''} here`}
              </Text>
            )}
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.accent} />
          </View>
        ) : failed ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>Couldn't load climbers.</Text>
            <Pressable onPress={load} style={styles.retry}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : climbers.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              Nobody here has a finished profile yet. Add this gym to your profile and be the first!
            </Text>
          </View>
        ) : (
          <FlatList
            data={climbers}
            keyExtractor={(c) => c.id}
            renderItem={renderRow}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              regulars > 0 ? <Text style={styles.groupLabel}>Home gym</Text> : null
            }
          />
        )}
      </View>

      <ClimberDetailModal
        climber={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
      />
    </Modal>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 48,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    closeButton: {
      padding: 2,
    },
    title: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      marginTop: 2,
    },
    list: {
      padding: 16,
      paddingBottom: 40,
    },
    groupLabel: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 8,
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      marginBottom: 8,
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    photo: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    photoEmpty: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
    },
    rowBody: {
      flex: 1,
    },
    name: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    meta: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      marginTop: 2,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
    retry: {
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: theme.colors.accent,
    },
    retryText: {
      color: '#fff',
      fontWeight: '600',
    },
  });
