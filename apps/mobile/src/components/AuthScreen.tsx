import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

type AuthMode = 'login' | 'register';

interface AuthScreenProps {
  mode: AuthMode;
}

export default function AuthScreen({ mode }: AuthScreenProps) {
  const router = useRouter();
  const isRegister = mode === 'register';

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit() {
    setError('');
    setMessage('');

    if (isRegister && (!fullName.trim() || !phone.trim())) {
      setError('Please provide your full name and phone number.');
      return;
    }

    if (!email.trim() || !password) {
      setError('Please enter your email address and password.');
      return;
    }

    if (password.length < 6) {
      setError('Your password must contain at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (isRegister) {
        const { data, error: signUpError } =
          await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              data: {
                full_name: fullName.trim(),
                phone: phone.trim(),
              },
            },
          });

        if (signUpError) throw signUpError;

        if (data.session && data.user) {
          const { data: profile, error: profileError } =
            await supabase
              .from('profiles')
              .select('role, account_status')
              .eq('user_id', data.user.id)
              .single();

          if (profileError || !profile) {
            await supabase.auth.signOut();
            throw new Error(
              'Your account profile could not be verified. Please contact support.'
            );
          }

          if (
            profile.role !== 'traveller' ||
            profile.account_status !== 'active'
          ) {
            await supabase.auth.signOut();
            throw new Error(
              'This registration is not available for this account.'
            );
          }

          router.replace('/dashboard');
          return;
        }

        setMessage(
          'Your registration was received. Please check your email for a confirmation link before signing in.'
        );
        return;
      }

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (signInError) throw signInError;

      if (!data.user) {
        throw new Error(
          'Unable to verify your account. Please try again.'
        );
      }

      const { data: profile, error: profileError } =
        await supabase
          .from('profiles')
          .select('role, account_status')
          .eq('user_id', data.user.id)
          .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error(
          'Your account profile could not be verified.'
        );
      }

      if (profile.account_status !== 'active') {
        await supabase.auth.signOut();
        throw new Error(
          'Your account is currently suspended. Please contact support.'
        );
      }

      if (profile.role === 'admin' || profile.role === 'super_admin') {
        await supabase.auth.signOut();
        throw new Error(
          'This is an administrator account. Please use the TSC web administration portal.'
        );
      }

      if (profile.role !== 'traveller') {
        await supabase.auth.signOut();
        throw new Error(
          'Your account does not have permission to access the traveller application.'
        );
      }

      router.replace('/dashboard');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>TSC</Text>
            </View>

            <View>
              <Text style={styles.brandName}>
                TRAVELERS SAFETY COVERED
              </Text>
              <Text style={styles.brandSubtitle}>
                GLOBAL TRAVEL SAFETY
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.eyebrow}>
              {isRegister ? 'JOIN TSC' : 'TRAVELLER ACCESS'}
            </Text>

            <Text style={styles.heading}>
              {isRegister ? 'Create your account' : 'Welcome back'}
            </Text>

            <Text style={styles.description}>
              {isRegister
                ? 'Register to manage your journeys and access travel safety services.'
                : 'Sign in to manage your journeys and travel safety.'}
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {message ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{message}</Text>
              </View>
            ) : null}

            {isRegister ? (
              <>
                <Text style={styles.label}>Full name</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor="#8997AA"
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  editable={!loading}
                  accessibilityLabel="Full name"
                />

                <Text style={styles.label}>Phone number</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#8997AA"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  editable={!loading}
                  accessibilityLabel="Phone number"
                />
              </>
            ) : null}

            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email address"
              placeholderTextColor="#8997AA"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              editable={!loading}
              accessibilityLabel="Email address"
            />

            <Text style={styles.label}>Password</Text>

            <View style={styles.passwordField}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder={
                  isRegister ? 'Create a password' : 'Enter your password'
                }
                placeholderTextColor="#8997AA"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete={
                  isRegister ? 'new-password' : 'current-password'
                }
                textContentType={
                  isRegister ? 'newPassword' : 'password'
                }
                editable={!loading}
                accessibilityLabel="Password"
              />

              <Pressable
                style={styles.passwordToggle}
                onPress={() => setShowPassword((current) => !current)}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? 'Hide password' : 'Show password'
                }
              >
                <Text style={styles.passwordToggleIcon}>
                  {showPassword ? '🙈' : '👁️'}
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={[
                styles.submitButton,
                loading && styles.submitDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#071D49" />
              ) : (
                <Text style={styles.submitText}>
                  {isRegister ? 'CREATE ACCOUNT' : 'SIGN IN'}
                </Text>
              )}
            </Pressable>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>
                {isRegister
                  ? 'Already registered?'
                  : 'New to TSC?'}
              </Text>

              <Pressable
                onPress={() =>
                  router.replace(isRegister ? '/login' : '/register')
                }
                disabled={loading}
                accessibilityRole="link"
              >
                <Text style={styles.switchLink}>
                  {isRegister ? 'Sign in' : 'Create an account'}
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={() => router.replace('/')}
            style={styles.homeLink}
            accessibilityRole="link"
          >
            <Text style={styles.homeLinkText}>
              Back to welcome screen
            </Text>
          </Pressable>

          <Text style={styles.footer}>
            TRAVEL SMART. ARRIVE SAFE.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#071D49',
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 26,
  },
  brandMark: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: '#FF8A00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: '#071D49',
    fontSize: 17,
    fontWeight: '900',
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  brandSubtitle: {
    color: '#AFC1DD',
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 1.2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    padding: 23,
  },
  eyebrow: {
    color: '#D87500',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  heading: {
    color: '#071D49',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 10,
  },
  description: {
    color: '#65748B',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 9,
    marginBottom: 21,
  },
  label: {
    color: '#19345D',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 7,
    marginTop: 14,
  },
  input: {
    minHeight: 49,
    borderWidth: 1,
    borderColor: '#D7DFEA',
    borderRadius: 10,
    paddingHorizontal: 13,
    color: '#071D49',
    fontSize: 16,
    backgroundColor: '#FAFBFD',
  },
  passwordField: {
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7DFEA',
    borderRadius: 10,
    backgroundColor: '#FAFBFD',
  },
  passwordInput: {
    flex: 1,
    minHeight: 47,
    paddingHorizontal: 13,
    color: '#071D49',
    fontSize: 16,
  },
  passwordToggle: {
    minWidth: 48,
    minHeight: 47,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordToggleIcon: {
    fontSize: 19,
  },
  submitButton: {
    minHeight: 51,
    backgroundColor: '#FF8A00',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
  },
  submitDisabled: {
    opacity: 0.65,
  },
  submitText: {
    color: '#071D49',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  errorBox: {
    backgroundColor: '#FFF0F0',
    borderColor: '#F0C3C3',
    borderWidth: 1,
    borderRadius: 9,
    padding: 12,
    marginBottom: 8,
  },
  errorText: {
    color: '#A52B2B',
    fontSize: 13,
    lineHeight: 18,
  },
  successBox: {
    backgroundColor: '#EFF8F1',
    borderColor: '#C7E5CE',
    borderWidth: 1,
    borderRadius: 9,
    padding: 12,
    marginBottom: 8,
  },
  successText: {
    color: '#24633A',
    fontSize: 13,
    lineHeight: 18,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 21,
  },
  switchText: {
    color: '#65748B',
    fontSize: 13,
  },
  switchLink: {
    color: '#D87500',
    fontSize: 13,
    fontWeight: '800',
  },
  homeLink: {
    alignSelf: 'center',
    padding: 13,
    marginTop: 12,
  },
  homeLinkText: {
    color: '#D0DAEC',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    color: '#FF9B26',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 16,
  },
});
