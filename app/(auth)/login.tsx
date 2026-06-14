import { Text, View } from '@/components/Themed';
import { useAuth } from '@/src/context/AuthContext';
import { authService } from '@/src/services/authService';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { width: SW, height: SH } = Dimensions.get('window');

function Orb({ color, size, left, top, dx, dy, dur }: {
  color: string; size: number; left: number; top: number;
  dx: number; dy: number; dur: number;
}) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const ease = Easing.inOut(Easing.sin);

  useEffect(() => {
    x.value = withRepeat(withSequence(
      withTiming(dx, { duration: dur, easing: ease }),
      withTiming(0,  { duration: dur, easing: ease }),
    ), -1);
    y.value = withRepeat(withSequence(
      withTiming(dy, { duration: Math.round(dur * 1.3), easing: ease }),
      withTiming(0,  { duration: Math.round(dur * 1.3), easing: ease }),
    ), -1);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: 'absolute',
        width: size, height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: 0.09,
        left, top,
      }, style]}
    />
  );
}

function FloatingOrbs({ accent, teal }: { accent: string; teal: string }) {
  return (
    <>
      <Orb color={accent} size={320} left={-120} top={-100}    dx={50}  dy={70}  dur={9000} />
      <Orb color={teal}   size={260} left={SW-140} top={60}    dx={-60} dy={90}  dur={11000} />
      <Orb color={accent} size={200} left={20}   top={SH-280}  dx={70}  dy={-50} dur={10000} />
      <Orb color={teal}   size={240} left={SW-100} top={SH-220} dx={-50} dy={-70} dur={12000} />
    </>
  );
}

// Animated input with focus glow
function AnimatedInput({
  style,
  containerStyle,
  accentColor,
  surfaceColor,
  borderColor,
  children,
  focused,
}: {
  style?: object;
  containerStyle?: object;
  accentColor: string;
  surfaceColor: string;
  borderColor: string;
  children: React.ReactNode;
  focused: boolean;
}) {
  const focus = useSharedValue(0);

  useEffect(() => {
    focus.value = withTiming(focused ? 1 : 0, { duration: 200 });
  }, [focused]);

  const animBorder = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [borderColor, accentColor]),
    shadowOpacity: interpolate(focus.value, [0, 1], [0, 0.35]),
    shadowColor: accentColor,
    shadowRadius: interpolate(focus.value, [0, 1], [0, 10]),
  }));

  return (
    <Animated.View
      style={[
        {
          backgroundColor: surfaceColor,
          borderRadius: 14,
          borderWidth: 1.5,
          shadowOffset: { width: 0, height: 0 },
          elevation: 0,
        },
        containerStyle,
        animBorder,
      ]}
    >
      {children}
    </Animated.View>
  );
}

function ErrorText({ message, color }: { message: string; color: string }) {
  const shake = useSharedValue(0);

  useEffect(() => {
    shake.value = withSequence(
      withTiming(-9, { duration: 45 }),
      withTiming(9,  { duration: 45 }),
      withTiming(-5, { duration: 45 }),
      withTiming(5,  { duration: 45 }),
      withTiming(0,  { duration: 45 }),
    );
  }, [message]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  return (
    <Animated.View style={[{ alignItems: 'center' }, style]}>
      <Text style={{ color, fontSize: 13, textAlign: 'center', fontStyle: 'italic', letterSpacing: 0.3, opacity: 0.9 }}>
        {message}
      </Text>
    </Animated.View>
  );
}

// Press-scale animated button
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ScaleButton({
  onPress,
  disabled,
  style,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  style?: object;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
      onPress={onPress}
      disabled={disabled}
      style={[animStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}

export default function LoginScreen() {
  const { login, register, loginWithGoogle, isLoading, darkMode } = useAuth();
  const theme = darkMode ? themeDark : themeLight;
  const styles = createStyles(theme);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false);
  const [forgotStep, setForgotStep] = useState<'form' | 'sent' | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setError(null);
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const handleSignup = async () => {    
    if (!email || !password || !confirmPassword) {
      if (__DEV__) console.log('❌ Missing fields:', { email: !!email, password: !!password, confirmPassword: !!confirmPassword });
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      if (__DEV__) console.log('❌ Passwords do not match');
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      if (__DEV__) console.log('❌ Password too short');
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      if (__DEV__) console.log('📝 Starting signup for:', email);
      setError(null);
      await register(email, password);
      
      try {
        await authService.requestVerification(email);
      } catch (verifyErr: any) {
        if (__DEV__) console.warn('⚠️ Verification email failed:', verifyErr.message);
      }
      
      setVerificationStep(true);
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      if (__DEV__) console.error('❌ Signup error:', err.message);
      setError(err.message || 'Signup failed');
    }
  };

  const handleLoginAfterVerification = async () => {
    try {
      setError(null);
      await login(email, password);
      // Reset verification state
      setVerificationStep(false);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    try {
      setError(null);
      await authService.requestPasswordReset(email);
      setForgotStep('sent');
    } catch {
      setForgotStep('sent'); // Don't reveal whether email exists
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setError(null);
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
    }
  };

  return (
    <View style={styles.container}>
      <FloatingOrbs accent={theme.colors.accent} teal={theme.colors.edit} />

      {/* Header — logo with accent ring + spaced title */}
      <View style={styles.headerMinimal}>
        <View style={styles.logoRing}>
          <Image
            source={require('../../assets/images/logodark.png')}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>
        <Text style={styles.tagline}>find your climbing partner</Text>
      </View>

      {forgotStep ? (
        // Forgot Password Screen
        <View style={styles.formMinimal}>
          <View style={styles.verificationIconRow}>
            <Ionicons name={forgotStep === 'sent' ? 'mail-outline' : 'lock-open-outline'} size={36} color={theme.colors.accent} />
          </View>
          <Text style={styles.verificationTitleMinimal}>
            {forgotStep === 'sent' ? 'Check Your Email' : 'Reset Password'}
          </Text>
          <Text style={styles.verificationSubtitleMinimal}>
            {forgotStep === 'sent'
              ? <>We sent a reset link to{'\n'}<Text style={styles.verificationEmail}>{email}</Text></>
              : 'Enter your email and we\'ll send you a link to reset your password.'}
          </Text>

          {error && <ErrorText message={error} color={theme.colors.error} />}

          {forgotStep === 'form' && (
            <AnimatedInput
              accentColor={theme.colors.accent}
              surfaceColor={theme.colors.surface}
              borderColor={theme.colors.border}
              focused={focusedField === 'email'}
            >
              <TextInput
                style={styles.inputMinimal}
                placeholder="Email"
                placeholderTextColor={theme.colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                editable={!isLoading}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </AnimatedInput>
          )}

          {forgotStep === 'form' ? (
            <ScaleButton
              style={[styles.buttonMinimal, isLoading && styles.buttonDisabledMinimal]}
              onPress={handleForgotPassword}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonTextMinimal}>SEND RESET LINK</Text>
              )}
            </ScaleButton>
          ) : (
            <Text style={styles.verificationInfoMinimal}>
              Click the link in the email to set a new password, then come back and sign in.
            </Text>
          )}

          <Pressable onPress={() => { setForgotStep(null); setError(null); }}>
            <Text style={[styles.footerMinimal, { marginTop: 12 }]}>
              <Text style={styles.footerAccent}>Back to Sign In</Text>
            </Text>
          </Pressable>
        </View>
      ) : verificationStep ? (
        // Email Verification Screen
        <View style={styles.formMinimal}>
          <View style={styles.verificationIconRow}>
            <Ionicons name="mail-outline" size={36} color={theme.colors.accent} />
          </View>
          <Text style={styles.verificationTitleMinimal}>Check Your Email</Text>
          <Text style={styles.verificationSubtitleMinimal}>
            We sent a link to{'\n'}<Text style={styles.verificationEmail}>{email}</Text>
          </Text>

          {error && <ErrorText message={error} color={theme.colors.error} />}

          <ScaleButton
            style={styles.buttonMinimal}
            onPress={() => {
              setVerificationStep(false);
              setIsSignup(false);
              setEmail('');
              setPassword('');
              setConfirmPassword('');
              setError(null);
            }}>
            <Text style={styles.buttonTextMinimal}>Back to Login</Text>
          </ScaleButton>

          <Text style={styles.verificationInfoMinimal}>
            Once verified, return here and log in with your credentials.
          </Text>
        </View>
      ) : (
        // Login/Signup Screen
        <View style={styles.formMinimal}>
          {error && <ErrorText message={error} color={theme.colors.error} />}

          <AnimatedInput
            accentColor={theme.colors.accent}
            surfaceColor={theme.colors.surface}
            borderColor={theme.colors.border}
            focused={focusedField === 'email'}
          >
            <TextInput
              style={styles.inputMinimal}
              placeholder="Email"
              placeholderTextColor={theme.colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </AnimatedInput>

          <AnimatedInput
            accentColor={theme.colors.accent}
            surfaceColor={theme.colors.surface}
            borderColor={theme.colors.border}
            focused={focusedField === 'password'}
            containerStyle={styles.passwordContainerMinimal}
          >
            <TextInput
              style={styles.passwordInputMinimal}
              placeholder="Password"
              placeholderTextColor={theme.colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
              secureTextEntry={!showPassword}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Ionicons
                name={showPassword ? 'eye' : 'eye-off'}
                size={20}
                color={focusedField === 'password' ? theme.colors.accent : theme.colors.textSecondary}
              />
            </Pressable>
          </AnimatedInput>

          {!isSignup && (
            <Pressable onPress={() => { setForgotStep('form'); setError(null); }} style={{ alignSelf: 'flex-end' }}>
              <Text style={[styles.footerMinimal, { marginTop: -4, fontSize: 13 }]}>
                <Text style={styles.footerAccent}>Forgot Password?</Text>
              </Text>
            </Pressable>
          )}

          {isSignup && (
            <AnimatedInput
              accentColor={theme.colors.accent}
              surfaceColor={theme.colors.surface}
              borderColor={theme.colors.border}
              focused={focusedField === 'confirm'}
              containerStyle={styles.passwordContainerMinimal}
            >
              <TextInput
                style={styles.passwordInputMinimal}
                placeholder="Confirm Password"
                placeholderTextColor={theme.colors.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!isLoading}
                secureTextEntry={!showConfirmPassword}
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField(null)}
              />
              <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton}>
                <Ionicons
                  name={showConfirmPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color={focusedField === 'confirm' ? theme.colors.accent : theme.colors.textSecondary}
                />
              </Pressable>
            </AnimatedInput>
          )}

          <ScaleButton
            style={[styles.buttonMinimal, isLoading && styles.buttonDisabledMinimal]}
            onPress={isSignup ? handleSignup : handleLogin}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonTextMinimal}>{isSignup ? 'CREATE ACCOUNT' : 'SIGN IN'}</Text>
            )}
          </ScaleButton>
        </View>
      )}

      {!verificationStep && !forgotStep && (
        <>
          <View style={styles.dividerMinimal}>
            <View style={styles.lineMinimal} />
            <Text style={styles.dividerTextMinimal}>OR</Text>
            <View style={styles.lineMinimal} />
          </View>

          <ScaleButton
            style={[styles.googleButtonMinimal, isLoading && styles.buttonDisabledMinimal]}
            onPress={handleGoogleAuth}
            disabled={isLoading}>
            <View style={styles.googleIconWrap}>
              <Ionicons name="logo-google" size={18} color="#fff" />
            </View>
            <Text style={styles.googleButtonTextMinimal}>
              Continue with Google
            </Text>
          </ScaleButton>

          <Pressable onPress={() => {
            setIsSignup(!isSignup);
            setError(null);
            setConfirmPassword('');
          }}>
            <Text style={styles.footerMinimal}>
              {isSignup
                ? <>Already have an account? <Text style={styles.footerAccent}>Sign in</Text></>
                : <>New here? <Text style={styles.footerAccent}>Create account</Text></>
              }
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const createStyles = (theme: typeof themeLight) =>
  StyleSheet.create({
    // ─── Layout ───────────────────────────────────────────────────────────────
    container: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 28,
      paddingVertical: 0,
      backgroundColor: theme.colors.background,
      overflow: 'hidden',
    },

    // ─── Header ───────────────────────────────────────────────────────────────
    headerMinimal: {
      alignItems: 'center',
      marginBottom: 28,
      gap: 0,
      backgroundColor: 'transparent',
    },
    logoRing: {
      width: 156,
      height: 156,
      borderRadius: 28,
      overflow: 'hidden',
      marginBottom: 18,
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    logoImage: {
      width: '100%',
      height: '100%',
    },
    titleMinimal: {
      fontSize: 42,
      fontWeight: '700',
      fontFamily: 'CormorantGaramond_700Bold',
      color: theme.colors.text,
      letterSpacing: 2,
      lineHeight: 48,
      includeFontPadding: false,
    },
    titleAccent: {
      color: theme.colors.accent,
    },
    tagline: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      letterSpacing: 3,
      textTransform: 'uppercase',
      marginTop: 6,
      fontWeight: '500',
      opacity: 0.7,
    },

    // ─── Form ─────────────────────────────────────────────────────────────────
    formMinimal: {
      gap: 14,
      marginBottom: 0,
      backgroundColor: 'transparent',
    },
    // Inner TextInput inside AnimatedInput wrapper — no bg/border here
    inputMinimal: {
      paddingHorizontal: 16,
      paddingVertical: 15,
      color: theme.colors.text,
      fontSize: 15,
      letterSpacing: 0.2,
    },
    // Password row (flex) — sits inside AnimatedInput wrapper
    passwordContainerMinimal: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    passwordInputMinimal: {
      flex: 1,
      paddingVertical: 15,
      color: theme.colors.text,
      fontSize: 15,
      letterSpacing: 0.2,
    },
    eyeButton: {
      paddingLeft: 10,
      paddingVertical: 4,
    },

    errorMinimal: {
      color: theme.colors.error,
      fontSize: 13,
      flex: 1,
      lineHeight: 18,
    },

    // ─── Primary CTA button ──────────────────────────────────────────────────
    buttonMinimal: {
      backgroundColor: theme.colors.accent,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 4,
      shadowColor: theme.colors.accent,
      shadowOpacity: 0.4,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    buttonDisabledMinimal: {
      opacity: 0.45,
    },
    buttonTextMinimal: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 13,
      letterSpacing: 2.5,
    },

    // ─── Divider ─────────────────────────────────────────────────────────────
    dividerMinimal: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 22,
      marginBottom: 16,
      backgroundColor: 'transparent',
    },
    lineMinimal: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      opacity: 0.6,
    },
    dividerTextMinimal: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 2,
      opacity: 0.5,
    },

    // ─── Google button ───────────────────────────────────────────────────────
    googleButtonMinimal: {
      flexDirection: 'row',
      backgroundColor: 'transparent',
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
    },
    googleIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.10)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleButtonTextMinimal: {
      color: theme.colors.text,
      fontWeight: '600',
      fontSize: 14,
      letterSpacing: 0.3,
    },

    // ─── Footer toggle ────────────────────────────────────────────────────────
    footerMinimal: {
      textAlign: 'center',
      color: theme.colors.textSecondary,
      fontSize: 14,
      marginTop: 18,
      fontWeight: '400',
    },
    footerAccent: {
      color: theme.colors.accent,
      fontWeight: '700',
    },

    // ─── Verification screen ─────────────────────────────────────────────────
    verificationIconRow: {
      alignItems: 'center',
      marginBottom: 12,
    },
    verificationTitleMinimal: {
      fontSize: 22,
      fontWeight: '700',
      fontFamily: 'CormorantGaramond_700Bold',
      color: theme.colors.text,
      marginBottom: 10,
      textAlign: 'center',
      letterSpacing: 0.5,
    },
    verificationSubtitleMinimal: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 22,
    },
    verificationEmail: {
      color: theme.colors.edit,
      fontWeight: '600',
    },
    verificationInfoMinimal: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 16,
      lineHeight: 18,
      opacity: 0.65,
    },
  });
