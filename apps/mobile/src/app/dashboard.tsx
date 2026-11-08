import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

type Profile = {
  full_name: string | null;
  role: string | null;
  account_status: string | null;
};

// Clean Neutral Theme Palette (No Blue Backgrounds)
const DARK_COLORS = {
  background: '#111318',
  surface: '#1A1D24',
  surfaceCard: '#222630',
  border: '#2C313C',
  textPrimary: '#F3F4F6',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  accent: '#F97316',
  accentLight: '#FB923C',
  success: '#10B981',
};

const LIGHT_COLORS = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceCard: '#F1F5F9',
  border: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  accent: '#EA580C',
  accentLight: '#F97316',
  success: '#059669',
};

const services = [
  { id: 'journey', icon: '✈', title: 'Journeys', subtitle: 'Plan and manage trips', color: '#F97316', bgDark: '#2C1D14', bgLight: '#FFF7ED' },
  { id: 'wallet', icon: '◈', title: 'Wallet', subtitle: 'Balance & transactions', color: '#14B8A6', bgDark: '#122624', bgLight: '#F0FDFA' },
  { id: 'payments', icon: '⇄', title: 'Payments', subtitle: 'Travel payments', color: '#3B82F6', bgDark: '#172033', bgLight: '#EFF6FF' },
  { id: 'safety', icon: '🛡', title: 'Safety', subtitle: 'Travel protection', color: '#F59E0B', bgDark: '#292114', bgLight: '#FEFCE8' },
  { id: 'tracking', icon: '◎', title: 'GPS Tracking', subtitle: 'Location services', color: '#06B6D4', bgDark: '#13252B', bgLight: '#ECFEFF' },
  { id: 'emergency', icon: '🚨', title: 'Emergency', subtitle: 'Immediate assistance', color: '#EF4444', bgDark: '#2D1717', bgLight: '#FEF2F2' },
  { id: 'claims', icon: '▤', title: 'Claims', subtitle: 'Claims & compensation', color: '#8B5CF6', bgDark: '#231B33', bgLight: '#F5F3FF' },
  { id: 'partners', icon: '♧', title: 'Partners', subtitle: 'Service network', color: '#10B981', bgDark: '#132820', bgLight: '#ECFDF5' },
  { id: 'insights', icon: '▥', title: 'Insights', subtitle: 'Travel analytics', color: '#6366F1', bgDark: '#1B1C33', bgLight: '#EEF2FF' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(true);

  const colors = darkMode ? DARK_COLORS : LIGHT_COLORS;
  const columns = width >= 600 ? 3 : 2;
  const gap = 12;
  const cardWidth = (width - 40 - (columns - 1) * gap) / columns;

  const loadProfile = useCallback(async () => {
    try {
      setError('');
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace('/login');
        return;
      }

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, role, account_status')
        .eq('user_id', session.user.id)
        .single();

      if (profileError || !data || data.role !== 'traveller' || data.account_status !== 'active') {
        await supabase.auth.signOut();
        router.replace('/login');
        return;
      }

      setProfile(data as Profile);
    } catch {
      setError('Unable to load your account. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProfile();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/login');
    });
    return () => subscription.unsubscribe();
  }, [loadProfile, router]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError('Unable to sign out. Please try again.');
      setSigningOut(false);
      return;
    }
    router.replace('/');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingScreen, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
        <View style={[styles.logoContainer, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <Image
            source={require('../../assets/tsc-header-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 20 }} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading your dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* HEADER */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.brand}>
            <View style={[styles.logoContainer, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              <Image
                source={require('../../assets/tsc-header-logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={[styles.brandName, { color: colors.textPrimary }]}>TSC</Text>
              <Text style={[styles.brandCaption, { color: colors.textMuted }]}>TRAVEL SAFETY</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setDarkMode((v) => !v)}
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: colors.surfaceCard, borderColor: colors.border },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.iconButtonText}>{darkMode ? '☀' : '☾'}</Text>
            </Pressable>

            <Pressable
              onPress={handleSignOut}
              disabled={signingOut}
              style={({ pressed }) => [
                styles.signOutButton,
                { borderColor: colors.border, backgroundColor: colors.surfaceCard },
                pressed && styles.pressed,
              ]}
            >
              {signingOut ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text style={[styles.signOutText, { color: colors.accent }]}>Sign out ↗</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* WELCOME BANNER */}
        <View style={[styles.welcomeSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.welcomeText}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>TRAVELLER DASHBOARD</Text>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              Welcome{profile?.full_name ? ',' : ''}
            </Text>
            <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
              {profile?.full_name || 'Traveller'}
            </Text>
            <Text style={[styles.welcomeSubtext, { color: colors.textMuted }]}>
              Your journeys. Your safety. One place.
            </Text>
          </View>

          <View style={[styles.globeCircle, { borderColor: colors.border, backgroundColor: colors.surfaceCard }]}>
            <Text style={[styles.globeIcon, { color: colors.accent }]}>◎</Text>
            <View style={[styles.globeDot, { backgroundColor: colors.success, borderColor: colors.surface }]} />
          </View>
        </View>

        {/* ACCOUNT STATUS */}
        <View style={[styles.statusBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statusLeft}>
            <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.statusLabel, { color: colors.success }]}>ACCOUNT ACTIVE</Text>
          </View>
          <Text style={[styles.statusRight, { color: colors.textMuted }]}>TSC TRAVELLER</Text>
        </View>

        {/* QUICK OVERVIEW */}
        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Overview</Text>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>YOUR TRAVEL SPACE</Text>
        </View>

        <Pressable
          onPress={() => router.push('/journeys')}
          style={({ pressed }) => [
            styles.overviewCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.pressedCard,
          ]}
        >
          <View style={[styles.overviewIcon, { backgroundColor: darkMode ? '#2C1D14' : '#FFF7ED' }]}>
            <Text style={[styles.overviewIconText, { color: colors.accent }]}>✈</Text>
          </View>
          <View style={styles.overviewDetails}>
            <Text style={[styles.overviewTitle, { color: colors.textPrimary }]}>Your journeys</Text>
            <Text style={[styles.overviewDescription, { color: colors.textSecondary }]}>
              Your journey activity will appear here.
            </Text>
          </View>
          <View style={[styles.overviewArrow, { backgroundColor: colors.surfaceCard }]}>
            <Text style={[styles.arrowText, { color: colors.accent }]}>›</Text>
          </View>
        </Pressable>

        {/* SERVICES GRID WITH DISTINCT TILE BACKGROUNDS */}
        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Services</Text>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>EXPLORE TSC</Text>
        </View>

        <View style={styles.serviceGrid}>
          {services.map((service) => {
            const cardBg = darkMode ? service.bgDark : service.bgLight;
            return (
              <Pressable
                key={service.id}
                onPress={() => {
                  if (service.id === 'journey') router.push('/journeys');
                  if (service.id === 'tracking') router.push('/gps-tracking');
                  if (service.id === 'emergency') router.push('/emergency');
                }}
                style={({ pressed }) => [
                  styles.serviceCard,
                  {
                    width: cardWidth,
                    backgroundColor: cardBg,
                    borderColor: `${service.color}44`,
                  },
                  pressed && styles.pressedCard,
                ]}
              >
                <View style={[styles.serviceIcon, { backgroundColor: `${service.color}25` }]}>
                  <Text style={[styles.serviceIconText, { color: service.color }]}>
                    {service.icon}
                  </Text>
                </View>

                <View>
                  <Text style={[styles.serviceTitle, { color: colors.textPrimary }]}>{service.title}</Text>
                  <Text style={[styles.serviceSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                    {service.subtitle}
                  </Text>
                </View>

                <View style={styles.serviceFooter}>
                  <View style={[styles.serviceDot, { backgroundColor: service.color }]} />
                  <Text style={[styles.serviceStatus, { color: service.id === 'journey' || service.id === 'tracking' || service.id === 'emergency' ? colors.success : colors.textMuted }]}>
                    {service.id === 'journey' || service.id === 'tracking' || service.id === 'emergency' ? 'Available' : 'Coming soon'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* SAFETY NOTICE */}
        <View style={[styles.safetyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.safetyIcon, { backgroundColor: darkMode ? '#292114' : '#FEFCE8' }]}>
            <Text style={[styles.safetyIconText, { color: '#F59E0B' }]}>!</Text>
          </View>

          <View style={styles.safetyContent}>
            <Text style={[styles.safetyTitle, { color: '#F59E0B' }]}>Travel safely</Text>
            <Text style={[styles.safetyDescription, { color: colors.textSecondary }]}>
              Stay aware of your surroundings and follow local safety guidance during your journey.
            </Text>
          </View>
        </View>

        {/* ERROR STATE */}
        {!!error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={loadProfile}>
              <Text style={[styles.retryText, { color: colors.accentLight }]}>Try again</Text>
            </Pressable>
          </View>
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={[styles.footerBrand, { color: colors.accent }]}>TSC</Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>TRAVELLERS SAFETY COVERED</Text>
          <Text style={[styles.footerCopyright, { color: colors.textMuted }]}>
            Travel with greater awareness.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  loadingText: {
    fontSize: 13,
    marginTop: 12,
    fontWeight: '500',
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  brandCaption: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    fontSize: 16,
  },
  signOutButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderRadius: 20,
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
  pressedCard: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  welcomeSection: {
    minHeight: 130,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeText: {
    flex: 1,
    paddingRight: 10,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 13,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  welcomeSubtext: {
    fontSize: 12,
    marginTop: 6,
  },
  globeCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  globeIcon: {
    fontSize: 40,
    fontWeight: '300',
  },
  globeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    right: 6,
    top: 8,
    borderWidth: 2,
  },
  statusBar: {
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statusRight: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  sectionHeading: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHint: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  overviewCard: {
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  overviewIconText: {
    fontSize: 20,
  },
  overviewDetails: {
    flex: 1,
  },
  overviewTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  overviewDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  overviewArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '600',
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCard: {
    minHeight: 136,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    justifyContent: 'space-between',
  },
  serviceIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  serviceIconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  serviceTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  serviceSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  serviceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  serviceStatus: {
    fontSize: 9,
    fontWeight: '500',
  },
  safetyCard: {
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  safetyIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  safetyIconText: {
    fontSize: 16,
    fontWeight: '800',
  },
  safetyContent: {
    flex: 1,
  },
  safetyTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  safetyDescription: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  errorCard: {
    marginTop: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 10,
  },
  footerBrand: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  footerText: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '600',
    marginTop: 4,
  },
  footerCopyright: {
    fontSize: 10,
    marginTop: 6,
  },
});