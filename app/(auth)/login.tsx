import { Text, View } from '@/components/Themed';
import { useAuth } from '@/src/context/AuthContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';

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
        <Ionicons name="person" size={44} color="#fff" style={{ backgroundColor: '#ec4899', borderRadius: 16, padding: 8 }} />
        <Text style={styles.titleMinimal}>Lovers Rock</Text>
      </View>

      <View style={styles.formMinimal}>
        {error && <Text style={styles.errorMinimal}>{error}</Text>}

        <TextInput
          style={styles.inputMinimal}
          placeholder="Email"
          placeholderTextColor="#a1a1aa"
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
            placeholderTextColor="#a1a1aa"
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
            secureTextEntry={!showPassword}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? 'eye' : 'eye-off'}
              size={20}
              color="#a1a1aa"
            />
          </Pressable>
        </View>

        {isSignup && (
          <View style={styles.passwordContainerMinimal}>
            <TextInput
              style={styles.passwordInputMinimal}
              placeholder="Confirm Password"
              placeholderTextColor="#a1a1aa"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isLoading}
              secureTextEntry={!showConfirmPassword}
            />
            <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons
                name={showConfirmPassword ? 'eye' : 'eye-off'}
                size={20}
                color="#a1a1aa"
              />
            </Pressable>
          </View>
        )}

        <Pressable
          style={[styles.buttonMinimal, isLoading && styles.buttonDisabledMinimal]}
          onPress={isSignup ? handleSignup : handleLogin}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
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
        <Ionicons name="logo-google" size={20} color="#fff" />
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
  },
  headerMinimal: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  titleMinimal: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1.2,
    marginTop: 8,
  },
  formMinimal: {
    gap: 18,
    marginBottom: 24,
  },
  errorMinimal: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  inputMinimal: {
    backgroundColor: '#18181b',
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
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
    backgroundColor: '#18181b',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  passwordInputMinimal: {
    flex: 1,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
  },
  buttonMinimal: {
    backgroundColor: '#ec4899',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#ec4899',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonDisabledMinimal: {
    opacity: 0.5,
  },
  buttonTextMinimal: {
    color: '#fff',
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
    backgroundColor: '#23232a',
  },
  dividerTextMinimal: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '500',
  },
  googleButtonMinimal: {
    flexDirection: 'row',
    backgroundColor: '#18181b',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#23232a',
    marginBottom: 12,
  },
  googleButtonTextMinimal: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  footerMinimal: {
    textAlign: 'center',
    color: '#a1a1aa',
    fontSize: 14,
    marginTop: 18,
    fontWeight: '500',
  },
});
