import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/context/auth';

export default function SignUp() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSignUp() {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error, needsConfirmation } = await signUp(email.trim(), password);
    setLoading(false);
    if (error) {
      setError(error);
    } else if (needsConfirmation) {
      setNeedsConfirmation(true);
    }
  }

  if (needsConfirmation) {
    return (
      <View testID="sign-up-confirmation" style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 48 }}>📬</Text>
        <Text style={{ fontSize: 24, fontWeight: '700', textAlign: 'center' }}>
          Check your email
        </Text>
        <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24 }}>
          We sent a confirmation link to{' '}
          <Text style={{ color: '#111827', fontWeight: '500' }} selectable>
            {email}
          </Text>
          . Click the link to activate your account.
        </Text>
        <Link replace href="/(auth)/sign-in">
          <Text style={{ color: '#2563EB', fontSize: 16, fontWeight: '500' }}>
            Back to sign in
          </Text>
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 24, padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 32, fontWeight: '700', letterSpacing: -0.5 }}>
            Create account
          </Text>
          <Text style={{ fontSize: 16, color: '#6B7280' }}>
            Sign up to get started
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151' }}>
              Email
            </Text>
            <TextInput
              testID="sign-up-email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              style={{
                borderWidth: 1,
                borderColor: '#D1D5DB',
                borderRadius: 10,
                borderCurve: 'continuous',
                padding: 14,
                fontSize: 16,
                backgroundColor: '#F9FAFB',
              }}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151' }}>
              Password
            </Text>
            <TextInput
              testID="sign-up-password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="newPassword"
              returnKeyType="next"
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              style={{
                borderWidth: 1,
                borderColor: '#D1D5DB',
                borderRadius: 10,
                borderCurve: 'continuous',
                padding: 14,
                fontSize: 16,
                backgroundColor: '#F9FAFB',
              }}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151' }}>
              Confirm password
            </Text>
            <TextInput
              testID="sign-up-confirm-password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              style={{
                borderWidth: 1,
                borderColor: '#D1D5DB',
                borderRadius: 10,
                borderCurve: 'continuous',
                padding: 14,
                fontSize: 16,
                backgroundColor: '#F9FAFB',
              }}
            />
          </View>

          {error && (
            <Text testID="sign-up-error" selectable style={{ fontSize: 14, color: '#DC2626' }}>
              {error}
            </Text>
          )}

          <Pressable
            testID="sign-up-button"
            onPress={handleSignUp}
            disabled={loading}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#1D4ED8' : '#2563EB',
              borderRadius: 10,
              borderCurve: 'continuous',
              padding: 15,
              alignItems: 'center',
              opacity: loading ? 0.7 : 1,
              marginTop: 4,
            })}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                Create account
              </Text>
            )}
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          <Text style={{ color: '#6B7280', fontSize: 14 }}>
            Already have an account?
          </Text>
          <Link testID="sign-up-link-to-sign-in" replace href="/(auth)/sign-in">
            <Text style={{ color: '#2563EB', fontSize: 14, fontWeight: '500' }}>
              Sign in
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
