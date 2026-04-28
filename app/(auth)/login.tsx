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
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
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
      if (process.env.EXPO_DEV_MODE) console.log('❌ Missing fields:', { email: !!email, password: !!password, confirmPassword: !!confirmPassword });
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      if (process.env.EXPO_DEV_MODE) console.log('❌ Passwords do not match');
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      if (process.env.EXPO_DEV_MODE) console.log('❌ Password too short');
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      if (process.env.EXPO_DEV_MODE) console.log('📝 Starting signup for:', email);
      setError(null);
      await register(email, password);
      
      try {
        await authService.requestVerification(email);
      } catch (verifyErr: any) {
        if (process.env.EXPO_DEV_MODE) console.warn('⚠️ Verification email failed:', verifyErr.message);
      }
      
      setVerificationStep(true);
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      if (process.env.EXPO_DEV_MODE) console.error('❌ Signup error:', err.message);
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
      <View style={styles.headerMinimal}>
        <Image
          source={require('../../assets/images/logo.jpg')}
          style={{ width: 128, height: 128 }}
          resizeMode="cover"
        />
        <Text style={styles.titleMinimal}>Take!</Text>
      </View>

      {verificationStep ? (
        // Email Verification Screen
        <View style={styles.formMinimal}>
          <Text style={styles.verificationTitleMinimal}>Check Your Email</Text>
          <Text style={styles.verificationSubtitleMinimal}>
            We've sent a verification link to {email}. Click the link in the email to verify your account.
          </Text>

          {error && <Text style={styles.errorMinimal}>{error}</Text>}

          <Pressable
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
          </Pressable>

          <Text style={styles.verificationInfoMinimal}>
            Once you've verified your email, return here and log in with your credentials.
          </Text>
        </View>
      ) : (
        // Login/Signup Screen
        <View style={styles.formMinimal}>
        {error && <Text style={styles.errorMinimal}>{error}</Text>}

        <TextInput
          style={styles.inputMinimal}
          placeholder="Email"
          placeholderTextColor={theme.colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          editable={!isLoading}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={styles.passwordContainerMinimal}>
          <TextInput
            style={styles.passwordInputMinimal}
            placeholder="Password"
            placeholderTextColor={theme.colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
            secureTextEntry={!showPassword}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? 'eye' : 'eye-off'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        </View>

        {isSignup && (
          <View style={styles.passwordContainerMinimal}>
            <TextInput
              style={styles.passwordInputMinimal}
              placeholder="Confirm Password"
              placeholderTextColor={theme.colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isLoading}
              secureTextEntry={!showConfirmPassword}
            />
            <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons
                name={showConfirmPassword ? 'eye' : 'eye-off'}
                size={20}
                color={theme.colors.textSecondary}
              />
            </Pressable>
          </View>
        )}

        <Pressable
          style={[styles.buttonMinimal, isLoading && styles.buttonDisabledMinimal]}
          onPress={isSignup ? handleSignup : handleLogin}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color={theme.colors.text} />
          ) : (
            <Text style={styles.buttonTextMinimal}>{isSignup ? 'Sign Up' : 'Login'}</Text>
          )}
        </Pressable>
        </View>
      )}

      {!verificationStep && (
        <>
          <View style={styles.dividerMinimal}>
            <View style={styles.lineMinimal} />
            <Text style={styles.dividerTextMinimal}>or</Text>
            <View style={styles.lineMinimal} />
          </View>

          <Pressable
            style={[styles.googleButtonMinimal, isLoading && styles.buttonDisabledMinimal]}
            onPress={handleGoogleAuth}
            disabled={isLoading}>
            <Ionicons name="logo-google" size={20} color={theme.colors.text} />
            <Text style={styles.googleButtonTextMinimal}>
              {isSignup ? 'Sign Up' : 'Login'} with Google
            </Text>
          </Pressable>

          <Pressable onPress={() => {
            setIsSignup(!isSignup);
            setError(null);
            setConfirmPassword('');
          }}>
            <Text style={styles.footerMinimal}>
              {isSignup ? 'Already have an account? Login' : "Don't have an account? Sign up"}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const createStyles = (theme: typeof themeLight) =>
  StyleSheet.create({
    verificationTitleMinimal: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    verificationSubtitleMinimal: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 20,
    },
    verificationInfoMinimal: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
      fontStyle: 'italic',
      opacity: 0.8,
    },
    container: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 0,
      backgroundColor: theme.colors.background,
      overflow: 'hidden',
    },
    headerMinimal: {
      alignItems: 'center',
      marginBottom: 32,
      gap: 8,
      backgroundColor: "transparent"
    },
    titleMinimal: {
      fontSize: 34,
      fontWeight: '700',
      fontFamily: 'CormorantGaramond_700Bold',
      color: theme.colors.text,
      letterSpacing: 1.5,
      marginTop: 8,
    },
    formMinimal: {
      gap: 18,
      marginBottom: 0,
      backgroundColor: "transparent"
    },
    errorMinimal: {
      color: theme.colors.error,
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 8,
    },
    inputMinimal: {
      backgroundColor: theme.colors.surface,
      borderWidth: 0,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: theme.colors.text,
      fontSize: 15,
      marginBottom: 4,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    passwordContainerMinimal: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      marginBottom: 4,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    passwordInputMinimal: {
      flex: 1,
      paddingVertical: 14,
      color: theme.colors.text,
      fontSize: 15,
    },
    buttonMinimal: {
      backgroundColor: theme.colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 0,
      shadowColor: theme.colors.accent,
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 2,
    },
    buttonDisabledMinimal: {
      opacity: 0.5,
    },
    buttonTextMinimal: {
      color: theme.colors.text,
      fontWeight: '700',
      fontSize: 16,
      letterSpacing: 1.1,
    },
    dividerMinimal: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 18,
      marginBottom: 18,
      backgroundColor: "transparent"
    },
    lineMinimal: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
    },
    dividerTextMinimal: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '500',
    },
    googleButtonMinimal: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 0,
    },
    googleButtonTextMinimal: {
      color: theme.colors.text,
      fontWeight: '600',
      fontSize: 15,
      marginLeft: 8,
    },
    footerMinimal: {
      textAlign: 'center',
      color: theme.colors.textSecondary,
      fontSize: 14,
      marginTop: 14,
      fontWeight: '500',
    },
  });
