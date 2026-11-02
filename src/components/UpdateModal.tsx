import {
  getAvailableUpdate,
  PLAY_STORE_APP_URL,
  PLAY_STORE_WEB_URL,
} from '@/src/services/appVersionService';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import { Download } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

// Asks people on an old build to update when Play Store has a newer one.
// Checked once per app launch. "Later" hides it until the next launch, so it
// is noticed without being in the way. Android only: there is no iOS release.

export function UpdateModal({ darkMode }: { darkMode: boolean }) {
  const [latest, setLatest] = useState<string | null>(null);
  const theme = darkMode ? themeDark : themeLight;
  const styles = createStyles(theme);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let cancelled = false;
    getAvailableUpdate().then((version) => {
      if (!cancelled) setLatest(version);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const openStore = async () => {
    try {
      await Linking.openURL(PLAY_STORE_APP_URL);
    } catch {
      Linking.openURL(PLAY_STORE_WEB_URL).catch(() => {});
    }
  };

  return (
    <Modal
      visible={!!latest}
      transparent
      animationType="fade"
      onRequestClose={() => setLatest(null)}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.icon}>
            <Download size={26} color={theme.colors.accent} strokeWidth={2} />
          </View>
          <Text style={styles.title}>New version available</Text>
          <Text style={styles.body}>
            Version {latest} of Take! is out on Google Play. Update to get the newest features and fixes.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}
            onPress={openStore}
          >
            <Text style={styles.primaryText}>Update now</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => setLatest(null)} hitSlop={8}>
            <Text style={styles.secondaryText}>Later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      alignItems: 'center',
      padding: 24,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    icon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accent + '1A',
      marginBottom: 16,
    },
    title: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 8,
    },
    body: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      marginBottom: 24,
    },
    primary: {
      alignSelf: 'stretch',
      alignItems: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: theme.colors.accent,
    },
    primaryText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    secondary: {
      marginTop: 14,
    },
    secondaryText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
    },
  });
