import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Button, Column, Host, Row, ScrollView, Text as UiText, TextInput } from '@expo/ui';
import { router, useTheme } from 'expo-router';
import { useAuth } from '@/context/auth';

export default function SignUp() {
  const { colors } = useTheme();
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
      <Host testID="sign-up-confirmation" style={{ flex: 1, justifyContent: 'center' }}>
        <Column spacing={16} style={{ padding: 24 }}>
          <UiText>Check your email</UiText>
          <UiText textStyle={{ textAlign: 'center' }}>
            We sent a confirmation link to {email}. Click the link to activate your account.
          </UiText>
          <Button
            variant="text"
            label="Back to sign in"
            onPress={() => router.replace('/(auth)/sign-in')}
          />
        </Column>
      </Host>
    );
  }

  return (
    <Host ignoreSafeArea="keyboard" style={{ flex: 1 }}>
      <ScrollView>
        <Column spacing={24} style={{ padding: 24 }}>
          <Column spacing={8}>
            <UiText>Create account</UiText>
            <UiText>Sign up to get started</UiText>
          </Column>

          <Column spacing={12}>
            <Column spacing={6}>
              <UiText>Email</UiText>
              <TextInput
                testID="sign-up-email"
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
                testID="sign-up-password"
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="next"
                placeholder="••••••••"
              />
            </Column>

            <Column spacing={6}>
              <UiText>Confirm password</UiText>
              <TextInput
                testID="sign-up-confirm-password"
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
                placeholder="••••••••"
              />
            </Column>

            {error ? (
              <UiText
                testID="sign-up-error"
                textStyle={{ color: colors.notification as string }}
              >
                {error}
              </UiText>
            ) : null}

            <Button
              testID="sign-up-button"
              variant="filled"
              label={loading ? undefined : 'Create account'}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={colors.text} /> : null}
            </Button>
          </Column>

          <Row spacing={4}>
            <UiText>Already have an account?</UiText>
            <Button
              testID="sign-up-link-to-sign-in"
              variant="text"
              label="Sign in"
              onPress={() => router.replace('/(auth)/sign-in')}
            />
          </Row>
        </Column>
      </ScrollView>
    </Host>
  );
}
