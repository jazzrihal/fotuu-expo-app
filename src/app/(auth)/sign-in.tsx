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

export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) setError(error);
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
            Welcome back
          </Text>
          <Text style={{ fontSize: 16, color: '#6B7280' }}>
            Sign in to your account
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151' }}>
              Email
            </Text>
            <TextInput
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
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
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
            <Text selectable style={{ fontSize: 14, color: '#DC2626' }}>
              {error}
            </Text>
          )}

          <Pressable
            onPress={handleSignIn}
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
                Sign in
              </Text>
            )}
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          <Text style={{ color: '#6B7280', fontSize: 14 }}>
            Don't have an account?
          </Text>
          <Link replace href="/(auth)/sign-up">
            <Text style={{ color: '#2563EB', fontSize: 14, fontWeight: '500' }}>
              Sign up
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
