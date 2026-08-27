import { getGymSuggestions, GymSuggestion } from '@/src/services/gymService';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

// Home gym is free text, so the same wall gets stored as "BW", "bw" and
// "Boulderwerk", and none of those match each other in search or filters. This
// offers up what other climbers already typed so people converge on one spelling.
//
// Deliberately still a plain text input underneath: someone at a wall nobody has
// entered yet must be able to just type it. Suggestions are a nudge, not a gate.

const DEBOUNCE_MS = 250;

interface GymInputProps {
  value: string;
  onChangeText: (value: string) => void;
  token: string | null;
  theme: any;
  style?: any;
  placeholder?: string;
}

export function GymInput({
  value,
  onChangeText,
  token,
  theme,
  style,
  placeholder = 'Home Gym',
}: GymInputProps) {
  const [suggestions, setSuggestions] = useState<GymSuggestion[]>([]);
  const [focused, setFocused] = useState(false);
  // Set when a suggestion is tapped, so the list does not immediately reopen on
  // the value change that tap causes.
  const justPickedRef = useRef(false);

  useEffect(() => {
    if (!focused || !token) {
      setSuggestions([]);
      return;
    }

    if (justPickedRef.current) {
      justPickedRef.current = false;
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      getGymSuggestions(value, token).then((items) => {
        if (cancelled) return;
        // Nothing to offer once what they typed already matches exactly.
        const typed = value.trim().toLowerCase();
        setSuggestions(
          items.filter((item) => item.name.toLowerCase() !== typed)
        );
      });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, focused, token]);

  const pick = (name: string) => {
    justPickedRef.current = true;
    onChangeText(name);
    setSuggestions([]);
  };

  const styles = createStyles(theme);

  return (
    <View>
      <TextInput
        style={style}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        onFocus={() => setFocused(true)}
        // Delayed so a tap on a suggestion registers before the list unmounts.
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        autoCorrect={false}
        autoCapitalize="words"
      />

      {focused && suggestions.length > 0 && (
        <View style={styles.suggestionList}>
          {suggestions.map((item) => (
            <Pressable
              key={item.name}
              onPress={() => pick(item.name)}
              style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
            >
              <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.suggestionName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.count > 1 && (
                <Text style={styles.suggestionCount}>
                  {item.count} climbers
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    // Rendered inline rather than as a floating overlay: both hosts sit inside a
    // ScrollView, where an absolutely positioned list gets clipped.
    suggestionList: {
      marginTop: 6,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    suggestion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    suggestionPressed: {
      backgroundColor: theme.colors.background,
    },
    suggestionName: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text,
    },
    suggestionCount: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
  });
