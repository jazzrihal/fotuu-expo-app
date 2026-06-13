import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Button, Column, Host, Row, ScrollView, Text as UiText, TextInput } from '@expo/ui';
import { router } from 'expo-router';
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
    <Host ignoreSafeArea="keyboard" style={{ flex: 1 }}>
      <ScrollView>
        <Column spacing={24} style={{ padding: 24 }}>
          <Column spacing={8}>
            <UiText>Welcome back</UiText>
            <UiText>Sign in to your account</UiText>
          </Column>

          <Column spacing={12}>
            <Column spacing={6}>
              <UiText>Email</UiText>
              <TextInput
                testID="sign-in-email"
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
                placeholder="you@example.com"
              />
            </Column>

            <Column spacing={6}>
              <UiText>Password</UiText>
              <TextInput
                testID="sign-in-password"
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
                placeholder="••••••••"
              />
            </Column>

            {error ? (
              <UiText testID="sign-in-error" textStyle={{ color: '#DC2626' }}>
                {error}
              </UiText>
            ) : null}

            <Button
              testID="sign-in-button"
              variant="filled"
              label={loading ? undefined : 'Sign in'}
              onPress={handleSignIn}
              disabled={loading}
            >
              {loading ? <ActivityIndicator /> : null}
            </Button>
          </Column>

          <Row spacing={4}>
            <UiText>Don't have an account?</UiText>
            <Button
              testID="sign-in-link-to-sign-up"
              variant="text"
              label="Sign up"
              onPress={() => router.replace('/(auth)/sign-up')}
            />
          </Row>
        </Column>
      </ScrollView>
    </Host>
  );
}
