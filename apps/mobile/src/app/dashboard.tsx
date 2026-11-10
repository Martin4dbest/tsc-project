import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
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
  {
    id: 'journey',
    icon: '✈',
    title: 'Journey Management',
    subtitle: 'Plan and manage your trips',
    color: '#F97316',
    image: 'photo-1436491865332-7a61a109cc05',
  },
  {
    id: 'wallet',
    icon: '◈',
    title: 'Wallet Management',
    subtitle: 'Balance and transactions',
    color: '#14B8A6',
    image: 'photo-1554224155-6726b3ff858f',
  },
  {
    id: 'payments',
    icon: '⇄',
    title: 'Payments',
    subtitle: 'Secure travel payments',
    color: '#3B82F6',
    image: 'photo-1556742049-0cfed4f6a45d',
  },
  {
    id: 'safety',
    icon: '🛡',
    title: 'Safety Protection',
    subtitle: 'Protection throughout your trip',
    color: '#F59E0B',
    image: 'photo-1519681393784-d120267933ba',
  },
  {
    id: 'tracking',
    icon: '◎',
    title: 'GPS Tracking',
    subtitle: 'Journey location services',
    color: '#06B6D4',
    image: 'photo-1473448912268-2022ce9509d8',
  },
  {
    id: 'emergency',
    icon: '🚨',
    title: 'Emergency Operations',
    subtitle: 'Get assistance when needed',
    color: '#EF4444',
    image: 'photo-1584515933487-779824d29309',
  },
  {
    id: 'claims',
    icon: '▤',
    title: 'Claims & Compensation',
    subtitle: 'Manage claims and support',
    color: '#8B5CF6',
    image: 'photo-1450101499163-c8848c66ca85',
  },
  {
    id: 'partners',
    icon: '♧',
    title: 'Travel Partners',
    subtitle: 'Explore our service network',
    color: '#10B981',
    image: 'photo-1521737711867-e3b97375f902',
  },
  {
    id: 'insights',
    icon: '▥',
    title: 'Analytics & Intelligence',
    subtitle: 'Your travel insights',
    color: '#6366F1',
    image: 'photo-1516321318423-f06f85e504b3',
  },
];

const availableServices = ['journey', 'tracking', 'emergency'];

function serviceImageUrl(photo: string) {
  return `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=1000&q=85`;
}

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
  const horizontalPadding = 40;
  const cardWidth = (width - horizontalPadding - (columns - 1) * gap) / columns;

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

      if (
        profileError ||
        !data ||
        data.role !== 'traveller' ||
        data.account_status !== 'active'
      ) {
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
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

  const openService = (serviceId: string) => {
    if (serviceId === 'journey') router.push('/journeys');
    if (serviceId === 'tracking') router.push('/gps-tracking');
    if (serviceId === 'emergency') router.push('/emergency');
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.loadingScreen,
          { backgroundColor: colors.background },
        ]}
      >
        <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />

        <View
          style={[
            styles.logoContainer,
            {
              backgroundColor: colors.surfaceCard,
              borderColor: colors.border,
            },
          ]}
        >
          <Image
            source={require('../../assets/tsc-header-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <ActivityIndicator
          size="small"
          color={colors.accent}
          style={{ marginTop: 20 }}
        />

        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading your dashboard...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.brand}>
            <View
              style={[
                styles.logoContainer,
                {
                  backgroundColor: colors.surfaceCard,
                  borderColor: colors.border,
                },
              ]}
            >
              <Image
                source={require('../../assets/tsc-header-logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <View>
              <Text style={[styles.brandName, { color: colors.textPrimary }]}>
                TSC
              </Text>
              <Text style={[styles.brandCaption, { color: colors.textMuted }]}>
                TRAVEL SAFETY
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                darkMode ? 'Switch to light mode' : 'Switch to dark mode'
              }
              onPress={() => setDarkMode((value) => !value)}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  backgroundColor: colors.surfaceCard,
                  borderColor: colors.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.iconButtonText}>
                {darkMode ? '☀' : '☾'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={handleSignOut}
              disabled={signingOut}
              style={({ pressed }) => [
                styles.signOutButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceCard,
                },
                pressed && styles.pressed,
              ]}
            >
              {signingOut ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text style={[styles.signOutText, { color: colors.accent }]}>
                  Sign out ↗
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* WELCOME BANNER */}
        <View
          style={[
            styles.welcomeSection,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.welcomeText}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>
              TRAVELLER DASHBOARD
            </Text>

            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              Welcome{profile?.full_name ? ',' : ''}
            </Text>

            <Text
              style={[styles.userName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {profile?.full_name || 'Traveller'}
            </Text>

            <Text
              style={[styles.welcomeSubtext, { color: colors.textMuted }]}
            >
              Your journeys. Your safety. One place.
            </Text>
          </View>

          <View
            style={[
              styles.globeCircle,
              {
                borderColor: colors.border,
                backgroundColor: colors.surfaceCard,
              },
            ]}
          >
            <Text style={[styles.globeIcon, { color: colors.accent }]}>
              ◎
            </Text>

            <View
              style={[
                styles.globeDot,
                {
                  backgroundColor: colors.success,
                  borderColor: colors.surface,
                },
              ]}
            />
          </View>
        </View>

        {/* ACCOUNT STATUS */}
        <View
          style={[
            styles.statusBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.statusLeft}>
            <View
              style={[styles.onlineDot, { backgroundColor: colors.success }]}
            />
            <Text style={[styles.statusLabel, { color: colors.success }]}>
              ACCOUNT ACTIVE
            </Text>
          </View>

          <Text style={[styles.statusRight, { color: colors.textMuted }]}>
            TSC TRAVELLER
          </Text>
        </View>

        {/* QUICK OVERVIEW */}
        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Overview
          </Text>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
            YOUR TRAVEL SPACE
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open your journeys"
          onPress={() => router.push('/journeys')}
          style={({ pressed }) => [
            styles.overviewCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
            pressed && styles.pressedCard,
          ]}
        >
          <View
            style={[
              styles.overviewIcon,
              { backgroundColor: darkMode ? '#2C1D14' : '#FFF7ED' },
            ]}
          >
            <Text style={[styles.overviewIconText, { color: colors.accent }]}>
              ✈
            </Text>
          </View>

          <View style={styles.overviewDetails}>
            <Text
              style={[styles.overviewTitle, { color: colors.textPrimary }]}
            >
              Your journeys
            </Text>
            <Text
              style={[
                styles.overviewDescription,
                { color: colors.textSecondary },
              ]}
            >
              Your journey activity will appear here.
            </Text>
          </View>

          <View
            style={[
              styles.overviewArrow,
              { backgroundColor: colors.surfaceCard },
            ]}
          >
            <Text style={[styles.arrowText, { color: colors.accent }]}>
              ›
            </Text>
          </View>
        </Pressable>

        {/* SERVICES */}
        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Services
          </Text>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
            EXPLORE TSC
          </Text>
        </View>

        <View style={styles.serviceGrid}>
          {services.map((service) => {
            const isAvailable = availableServices.includes(service.id);

            return (
              <Pressable
                key={service.id}
                accessibilityRole="button"
                accessibilityLabel={`${service.title}. ${
                  isAvailable ? 'Available' : 'Coming soon'
                }`}
                disabled={!isAvailable}
                onPress={() => openService(service.id)}
                style={({ pressed }) => [
                  styles.serviceCard,
                  {
                    width: cardWidth,
                    borderColor: `${service.color}99`,
                  },
                  pressed && styles.pressedCard,
                ]}
              >
                <ImageBackground
                  source={{ uri: serviceImageUrl(service.image) }}
                  style={styles.serviceImage}
                  imageStyle={styles.serviceImageBackground}
                  resizeMode="cover"
                >
                  <View style={styles.serviceImageOverlay} />

                  <View style={styles.serviceCardContent}>
                    <View
                      style={[
                        styles.serviceIcon,
                        {
                          backgroundColor: `${service.color}35`,
                          borderColor: `${service.color}99`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.serviceIconText,
                          { color: '#FFFFFF' },
                        ]}
                      >
                        {service.icon}
                      </Text>
                    </View>

                    <View style={styles.serviceTextBlock}>
                      <Text
                        style={styles.serviceTitle}
                        numberOfLines={2}
                      >
                        {service.title}
                      </Text>

                      <Text
                        style={styles.serviceSubtitle}
                        numberOfLines={2}
                      >
                        {service.subtitle}
                      </Text>
                    </View>

                    <View style={styles.serviceFooter}>
                      <View
                        style={[
                          styles.serviceDot,
                          { backgroundColor: service.color },
                        ]}
                      />

                      <Text
                        style={[
                          styles.serviceStatus,
                          {
                            color: isAvailable ? '#A7F3D0' : '#E5E7EB',
                          },
                        ]}
                      >
                        {isAvailable ? 'Available' : 'Coming soon'}
                      </Text>

                      {isAvailable && (
                        <Text style={styles.serviceArrow}>›</Text>
                      )}
                    </View>
                  </View>
                </ImageBackground>
              </Pressable>
            );
          })}
        </View>

        {/* SAFETY NOTICE */}
        <View
          style={[
            styles.safetyCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.safetyIcon,
              { backgroundColor: darkMode ? '#292114' : '#FEFCE8' },
            ]}
          >
            <Text style={[styles.safetyIconText, { color: '#F59E0B' }]}>
              !
            </Text>
          </View>

          <View style={styles.safetyContent}>
            <Text style={[styles.safetyTitle, { color: '#F59E0B' }]}>
              Travel safely
            </Text>
            <Text
              style={[
                styles.safetyDescription,
                { color: colors.textSecondary },
              ]}
            >
              Stay aware of your surroundings and follow local safety guidance
              during your journey.
            </Text>
          </View>
        </View>

        {/* ERROR STATE */}
        {!!error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={loadProfile}
            >
              <Text style={[styles.retryText, { color: colors.accentLight }]}>
                Try again
              </Text>
            </Pressable>
          </View>
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={[styles.footerBrand, { color: colors.accent }]}>
            TSC
          </Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            TRAVELLERS SAFETY COVERED
          </Text>
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
    minHeight: 174,
    borderRadius: 17,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: '#202631',
  },
  serviceImage: {
    flex: 1,
    minHeight: 174,
    justifyContent: 'flex-end',
  },
  serviceImageBackground: {
    borderRadius: 15,
  },
  serviceImageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 15, 28, 0.68)',
  },
  serviceCardContent: {
    flex: 1,
    minHeight: 174,
    padding: 13,
    justifyContent: 'space-between',
  },
  serviceIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  serviceIconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  serviceTextBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  serviceTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  serviceSubtitle: {
    color: '#E5E7EB',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  serviceDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  serviceStatus: {
    fontSize: 10,
    fontWeight: '700',
  },
  serviceArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 18,
    marginLeft: 'auto',
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
