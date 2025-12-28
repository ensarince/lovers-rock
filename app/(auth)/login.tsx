import { Text, View } from '@/components/Themed';
import { useAuth } from '@/src/context/AuthContext';
import { theme } from '@/src/theme'; // Add import for theme
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
// import img_logo from "../../assets/images/logo.png";

export default function LoginScreen() {
  const { login, register, loginWithGoogle, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

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
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setError(null);
      await register(email, password);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
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
      <View style={styles.headerMinimal}>
        <Image
          source={require('../../assets/images/logo.jpg')}
          style={{ width: 128, height: 128 }}
          resizeMode="cover"
        />
        <Text style={styles.titleMinimal}>ClimbMate</Text>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 0,
    backgroundColor: theme.colors.background,
  },
  headerMinimal: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  titleMinimal: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: 1.2,
    marginTop: 8,
  },
  formMinimal: {
    gap: 18,
    marginBottom: 24,
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
    marginTop: 8,
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
    marginVertical: 18,
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
    marginBottom: 12,
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
    marginTop: 18,
    fontWeight: '500',
  },
});
