import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

type Profile = {
  full_name: string | null;
  role: string;
  account_status: string;
};

type ServiceItem = {
  id: string;
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
  image: string;
  route?: string;
};

const DARK_COLORS = {
  background: '#061533',
  surface: '#0D234A',
  surfaceElevated: '#132F61',
  surfaceCard: '#17376E',
  border: 'rgba(148, 184, 235, 0.16)',
  borderStrong: 'rgba(148, 184, 235, 0.28)',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#8FA6C9',
  accent: '#FF9B26',
  accentSoft: 'rgba(255, 155, 38, 0.14)',
  accentLight: '#FFB45C',
  success: '#10B981',
  successSoft: 'rgba(16, 185, 129, 0.14)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239, 68, 68, 0.16)',
};

const LIGHT_COLORS = {
  background: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceElevated: '#F8FAFC',
  surfaceCard: '#E2E8F0',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  accent: '#D97706',
  accentSoft: '#FEF3C7',
  accentLight: '#B45309',
  success: '#059669',
  successSoft: '#D1FAE5',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
};

const SERVICES: ServiceItem[] = [
  {
    id: 'journey',
    iconName: 'airplane-outline',
    title: 'Journey Management',
    subtitle: 'Plan, log & monitor active trips',
    color: '#F59E0B',
    image: 'photo-1488646953014-85cb44e25828',
    route: '/journeys',
  },
  {
    id: 'safety',
    iconName: 'shield-checkmark-outline',
    title: 'Travel Safety',
    subtitle: 'Live advisories & risk intelligence',
    color: '#10B981',
    image: 'photo-1516026672322-bc52d61a55d5',
    route: '/safety',
  },
  {
    id: 'tracking',
    iconName: 'locate-outline',
    title: 'GPS Tracking',
    subtitle: 'Real-time route & check-in telemetry',
    color: '#06B6D4',
    image: 'photo-1473448912268-2022ce9509d8',
    route: '/gps-tracking',
  },
  {
    id: 'emergency',
    iconName: 'warning-outline',
    title: 'Emergency Ops',
    subtitle: '24/7 rapid response & SOS dispatch',
    color: '#EF4444',
    image: 'photo-1584515933487-779824d29309',
    route: '/emergency',
  },
  {
    id: 'wallet',
    iconName: 'wallet-outline',
    title: 'My Wallet',
    subtitle: 'Manage balance & instant top-ups',
    color: '#14B8A6',
    image: 'photo-1554224155-6726b3ff858f',
    route: '/wallet',
  },
  {
    id: 'payments',
    iconName: 'card-outline',
    title: 'Payments',
    subtitle: 'Receipts, billing & transaction logs',
    color: '#3B82F6',
    image: 'photo-1556742049-0cfed4f6a45d',
    route: '/payments',
  },
  {
    id: 'claims',
    iconName: 'document-text-outline',
    title: 'Claims & Cover',
    subtitle: 'Submit and track protection claims',
    color: '#8B5CF6',
    image: 'photo-1450101499163-c8848c66ca85',
  },
  {
    id: 'partners',
    iconName: 'globe-outline',
    title: 'Global Partners',
    subtitle: 'Verified transport & medical network',
    color: '#10B981',
    image: 'photo-1521737711867-e3b97375f902',
  },
  {
    id: 'insights',
    iconName: 'analytics-outline',
    title: 'Travel Intelligence',
    subtitle: 'Personal safety score & analytics',
    color: '#6366F1',
    image: 'photo-1516321318423-f06f85e504b3',
  },
];

function serviceImageUrl(photo: string) {
  return `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=900&q=80`;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(true);

  const colors = darkMode ? DARK_COLORS : LIGHT_COLORS;

  const containerMaxWidth = 960;
  const effectiveWidth = Math.min(width, containerMaxWidth);
  const columns = effectiveWidth >= 768 ? 3 : 2;
  const gap = 14;
  const horizontalPadding = 40;
  const cardWidth =
    (effectiveWidth - horizontalPadding - (columns - 1) * gap) / columns;

  const loadProfile = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) setError('');

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

        if (profileError || !data || data.account_status !== 'active') {
          await supabase.auth.signOut();
          router.replace('/login');
          return;
        }

        if (data.role === 'admin' || data.role === 'super_admin') {
          router.replace('/admin/payments');
          return;
        }

        if (data.role !== 'traveller') {
          await supabase.auth.signOut();
          router.replace('/login');
          return;
        }

        setProfile(data as Profile);
        setError('');
      } catch {
        setError('Unable to sync your account. Pull down to retry.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/login');
    });

    return () => subscription.unsubscribe();
  }, [loadProfile, router]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile(true);
  };

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

  const firstName =
    profile?.full_name?.trim().split(' ')[0] || 'Traveller';

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.loadingScreen, { backgroundColor: colors.background }]}
      >
        <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
        <View
          style={[
            styles.logoContainer,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.borderStrong,
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
          style={{ marginTop: 22 }}
        />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Securing your command center...
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
        contentContainerStyle={[
          styles.scrollContent,
          { maxWidth: containerMaxWidth, alignSelf: 'center', width: '100%' },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Top Navigation Bar */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.brand}>
            <View
              style={[
                styles.logoContainer,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.borderStrong,
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
              <View style={styles.brandRow}>
                <Text style={[styles.brandName, { color: colors.textPrimary }]}>
                  TSC
                </Text>
                <View
                  style={[
                    styles.globalPill,
                    { backgroundColor: colors.accentSoft },
                  ]}
                >
                  <Text style={[styles.globalPillText, { color: colors.accent }]}>
                    GLOBAL
                  </Text>
                </View>
              </View>
              <Text style={[styles.brandCaption, { color: colors.textMuted }]}>
                TRAVELLERS SAFETY COVERED
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                darkMode ? 'Switch to light mode' : 'Switch to dark mode'
              }
              onPress={() => setDarkMode((v) => !v)}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderStrong,
                },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={darkMode ? 'sunny-outline' : 'moon-outline'}
                size={18}
                color={colors.textPrimary}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              onPress={handleSignOut}
              disabled={signingOut}
              style={({ pressed }) => [
                styles.signOutButton,
                {
                  borderColor: colors.borderStrong,
                  backgroundColor: colors.surface,
                },
                pressed && styles.pressed,
              ]}
            >
              {signingOut ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <View style={styles.signOutInner}>
                  <Text style={[styles.signOutText, { color: colors.textPrimary }]}>
                    Sign out
                  </Text>
                  <Ionicons
                    name="log-out-outline"
                    size={15}
                    color={colors.accent}
                  />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Hero Command Card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderStrong,
            },
            !darkMode && styles.lightShadow,
          ]}
        >
          <View style={styles.heroTopRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: colors.successSoft },
              ]}
            >
              <View
                style={[styles.onlineDot, { backgroundColor: colors.success }]}
              />
              <Text style={[styles.statusBadgeText, { color: colors.success }]}>
                PROTECTION ACTIVE
              </Text>
            </View>

            <Text style={[styles.roleTag, { color: colors.textMuted }]}>
              ID • VERIFIED TRAVELLER
            </Text>
          </View>

          <View style={styles.heroMain}>
            <View style={styles.welcomeText}>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>
                Welcome back,
              </Text>
              <Text
                style={[styles.userName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {profile?.full_name || firstName}
              </Text>
              <Text
                style={[styles.welcomeSubtext, { color: colors.textMuted }]}
              >
                Real-time journey intelligence, tracking, and rapid emergency
                response in one command center.
              </Text>
            </View>

            <View
              style={[
                styles.radarRingOuter,
                { borderColor: colors.borderStrong },
              ]}
            >
              <View
                style={[
                  styles.radarRingInner,
                  {
                    backgroundColor: colors.accentSoft,
                    borderColor: colors.accent,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="shield-airplane-outline"
                  size={28}
                  color={colors.accent}
                />
              </View>
            </View>
          </View>

          {/* Quick Action Strip inside Hero */}
          <View
            style={[
              styles.heroActionRow,
              { borderTopColor: colors.border },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/journeys')}
              style={({ pressed }) => [
                styles.primaryActionBtn,
                { backgroundColor: colors.accent },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="navigate" size={15} color="#061533" />
              <Text style={styles.primaryActionText}>Active Journeys</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/emergency')}
              style={({ pressed }) => [
                styles.sosActionBtn,
                {
                  backgroundColor: colors.dangerSoft,
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={[styles.sosActionText, { color: colors.danger }]}>
                Emergency SOS
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Overview Card */}
        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Journey Overview
          </Text>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
            LIVE ACTIVITY
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
              borderColor: colors.borderStrong,
            },
            !darkMode && styles.lightShadow,
            pressed && styles.pressedCard,
          ]}
        >
          <View
            style={[
              styles.overviewIcon,
              { backgroundColor: colors.accentSoft },
            ]}
          >
            <Ionicons
              name="airplane"
              size={20}
              color={colors.accent}
            />
          </View>

          <View style={styles.overviewDetails}>
            <Text
              style={[styles.overviewTitle, { color: colors.textPrimary }]}
            >
              My Journeys & Itineraries
            </Text>
            <Text
              style={[
                styles.overviewDescription,
                { color: colors.textSecondary },
              ]}
            >
              View scheduled trips, check-in status, and route safety logs.
            </Text>
          </View>

          <View
            style={[
              styles.overviewArrow,
              { backgroundColor: colors.surfaceElevated },
            ]}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.accent}
            />
          </View>
        </Pressable>

        {/* Core Services Grid */}
        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Safety & Travel Suite
          </Text>
          <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
            {SERVICES.filter((s) => Boolean(s.route)).length} ACTIVE MODULES
          </Text>
        </View>

        <View style={styles.serviceGrid}>
          {SERVICES.map((service) => {
            const isAvailable = Boolean(service.route);

            return (
              <Pressable
                key={service.id}
                accessibilityRole="button"
                accessibilityLabel={`${service.title}. ${
                  isAvailable ? 'Available' : 'Coming soon'
                }`}
                disabled={!isAvailable}
                onPress={() => service.route && router.push(service.route as any)}
                style={({ pressed }) => [
                  styles.serviceCard,
                  {
                    width: cardWidth,
                    borderColor: isAvailable
                      ? `${service.color}70`
                      : 'rgba(148, 163, 184, 0.25)',
                    opacity: isAvailable ? 1 : 0.78,
                  },
                  pressed && isAvailable && styles.pressedCard,
                ]}
              >
                <ImageBackground
                  source={{ uri: serviceImageUrl(service.image) }}
                  style={styles.serviceImage}
                  imageStyle={styles.serviceImageBackground}
                  resizeMode="cover"
                >
                  <View
                    style={[
                      styles.serviceImageOverlay,
                      {
                        backgroundColor: isAvailable
                          ? 'rgba(6, 16, 36, 0.72)'
                          : 'rgba(10, 18, 34, 0.84)',
                      },
                    ]}
                  />

                  <View style={styles.serviceCardContent}>
                    <View style={styles.serviceCardTop}>
                      <View
                        style={[
                          styles.serviceIcon,
                          {
                            backgroundColor: `${service.color}28`,
                            borderColor: `${service.color}88`,
                          },
                        ]}
                      >
                        <Ionicons
                          name={service.iconName}
                          size={19}
                          color="#FFFFFF"
                        />
                      </View>

                      {isAvailable ? (
                        <View style={styles.chevronCircle}>
                          <Ionicons
                            name="arrow-forward"
                            size={13}
                            color="#FFFFFF"
                          />
                        </View>
                      ) : (
                        <View style={styles.soonBadge}>
                          <Text style={styles.soonBadgeText}>SOON</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.serviceTextBlock}>
                      <Text style={styles.serviceTitle} numberOfLines={2}>
                        {service.title}
                      </Text>
                      <Text style={styles.serviceSubtitle} numberOfLines={2}>
                        {service.subtitle}
                      </Text>
                    </View>

                    <View style={styles.serviceFooter}>
                      <View
                        style={[
                          styles.serviceDot,
                          {
                            backgroundColor: isAvailable
                              ? service.color
                              : '#94A3B8',
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.serviceStatus,
                          {
                            color: isAvailable ? '#A7F3D0' : '#94A3B8',
                          },
                        ]}
                      >
                        {isAvailable ? 'Ready' : 'In development'}
                      </Text>
                    </View>
                  </View>
                </ImageBackground>
              </Pressable>
            );
          })}
        </View>

        {/* Travel Advisory Banner */}
        <View
          style={[
            styles.safetyCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderStrong,
            },
            !darkMode && styles.lightShadow,
          ]}
        >
          <View
            style={[
              styles.safetyIcon,
              { backgroundColor: colors.accentSoft },
            ]}
          >
            <Ionicons
              name="information-circle"
              size={22}
              color={colors.accent}
            />
          </View>

          <View style={styles.safetyContent}>
            <Text style={[styles.safetyTitle, { color: colors.textPrimary }]}>
              Smart Travel Protocol
            </Text>
            <Text
              style={[
                styles.safetyDescription,
                { color: colors.textSecondary },
              ]}
            >
              Keep location sharing enabled during transit and log every
              inter-city itinerary for uninterrupted coverage.
            </Text>
          </View>
        </View>

        {!!error && (
          <View style={styles.errorCard}>
            <View style={styles.errorRow}>
              <Ionicons name="cloud-offline-outline" size={18} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => loadProfile()}
              style={styles.retryBtn}
            >
              <Text style={[styles.retryText, { color: colors.accentLight }]}>
                Retry connection
              </Text>
            </Pressable>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerBrand, { color: colors.accent }]}>
            TSC GLOBAL
          </Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            TRAVELLERS SAFETY COVERED
          </Text>
          <Text style={[styles.footerCopyright, { color: colors.textMuted }]}>
            Protected journeys worldwide.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 44 },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  logoImage: { width: '100%', height: '100%' },
  loadingText: { fontSize: 13, marginTop: 14, fontWeight: '500' },

  lightShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  header: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandName: { fontSize: 17, fontWeight: '800', letterSpacing: 1 },
  globalPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  globalPillText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  brandCaption: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.9,
    marginTop: 2,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButton: {
    height: 38,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  signOutText: { fontSize: 12, fontWeight: '600' },
  pressed: { opacity: 0.75 },
  pressedCard: { opacity: 0.92, transform: [{ scale: 0.985 }] },

  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  statusBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  roleTag: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  heroMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  welcomeText: { flex: 1 },
  greeting: { fontSize: 13, fontWeight: '500' },
  userName: { fontSize: 22, fontWeight: '800', marginTop: 2, letterSpacing: -0.3 },
  welcomeSubtext: { fontSize: 12, lineHeight: 17, marginTop: 6 },
  radarRingOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRingInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroActionRow: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  primaryActionText: {
    color: '#061533',
    fontSize: 12,
    fontWeight: '800',
  },
  sosActionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sosActionText: {
    fontSize: 12,
    fontWeight: '800',
  },

  sectionHeading: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  sectionHint: { fontSize: 10, fontWeight: '700', letterSpacing: 0.9 },

  overviewCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  overviewDetails: { flex: 1, paddingRight: 8 },
  overviewTitle: { fontSize: 14, fontWeight: '700' },
  overviewDescription: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  overviewArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  serviceCard: {
    minHeight: 176,
    borderRadius: 18,
    borderWidth: 1.2,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
  },
  serviceImage: { flex: 1, minHeight: 176, justifyContent: 'flex-end' },
  serviceImageBackground: { borderRadius: 17 },
  serviceImageOverlay: {
    ...StyleSheet.absoluteFill,
  },
  serviceCardContent: {
    flex: 1,
    minHeight: 176,
    padding: 14,
    justifyContent: 'space-between',
  },
  serviceCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soonBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  soonBadgeText: {
    color: '#CBD5E1',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  serviceTextBlock: { marginTop: 12 },
  serviceTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
  serviceSubtitle: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  serviceDot: { width: 6, height: 6, borderRadius: 3 },
  serviceStatus: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  safetyCard: {
    marginTop: 22,
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  safetyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  safetyContent: { flex: 1 },
  safetyTitle: { fontSize: 13, fontWeight: '700' },
  safetyDescription: { fontSize: 12, lineHeight: 17, marginTop: 2 },

  errorCard: {
    marginTop: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorText: { color: '#EF4444', fontSize: 12, flex: 1 },
  retryBtn: { marginTop: 8, alignSelf: 'flex-start' },
  retryText: { fontSize: 12, fontWeight: '700' },

  footer: { alignItems: 'center', paddingTop: 36, paddingBottom: 12 },
  footerBrand: { fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  footerText: { fontSize: 9, letterSpacing: 1.4, fontWeight: '700', marginTop: 4 },
  footerCopyright: { fontSize: 11, marginTop: 6 },
});