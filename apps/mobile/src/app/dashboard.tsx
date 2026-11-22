import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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

type QuickAction = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  tint: string;
  bg: string;
};

type GridModule = {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  softBg: string;
  route: string;
};

type UpcomingModule = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const LIGHT_PALETTE = {
  canvas: '#F3F6FA',
  card: '#FFFFFF',
  cardMuted: '#F8FAFC',
  border: '#E5EAF2',
  textPrimary: '#0B192C',
  textSecondary: '#4A5B73',
  textMuted: '#7C8BA1',
  heroBg: '#091B3A',
  heroSurface: 'rgba(255, 255, 255, 0.08)',
  heroBorder: 'rgba(255, 255, 255, 0.14)',
  accent: '#F59E0B',
  accentDeep: '#D97706',
  success: '#10B981',
  danger: '#EF4444',
};

const DARK_PALETTE = {
  canvas: '#050E21',
  card: '#0C1B38',
  cardMuted: '#102347',
  border: '#192E57',
  textPrimary: '#F8FAFC',
  textSecondary: '#B8C6DC',
  textMuted: '#6E83A6',
  heroBg: '#0E244D',
  heroSurface: 'rgba(255, 255, 255, 0.07)',
  heroBorder: 'rgba(255, 255, 255, 0.12)',
  accent: '#FFB020',
  accentDeep: '#F59E0B',
  success: '#34D399',
  danger: '#F87171',
};

const DOCK_ACTIONS: QuickAction[] = [
  {
    id: 'journey',
    label: 'Journeys',
    icon: 'airplane',
    route: '/journeys',
    tint: '#FBBF24',
    bg: 'rgba(251, 191, 36, 0.16)',
  },
  {
    id: 'wallet',
    label: 'Wallet',
    icon: 'wallet',
    route: '/wallet',
    tint: '#34D399',
    bg: 'rgba(52, 211, 153, 0.16)',
  },
  {
    id: 'tracking',
    label: 'Live GPS',
    icon: 'navigate',
    route: '/gps-tracking',
    tint: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.16)',
  },
  {
    id: 'emergency',
    label: 'SOS Help',
    icon: 'alert-circle',
    route: '/emergency',
    tint: '#FB7185',
    bg: 'rgba(251, 113, 133, 0.18)',
  },
];

const CORE_MODULES: GridModule[] = [
  {
    id: 'journey',
    title: 'Journey Manager',
    subtitle: 'Plan trips & manage active routes',
    tag: 'Trips',
    icon: 'map-outline',
    color: '#D97706',
    softBg: 'rgba(245, 158, 11, 0.12)',
    route: '/journeys',
  },
  {
    id: 'safety',
    title: 'Travel Safety',
    subtitle: 'Live advisories & protection alerts',
    tag: 'Shield',
    icon: 'shield-checkmark-outline',
    color: '#059669',
    softBg: 'rgba(16, 185, 129, 0.12)',
    route: '/safety',
  },
  {
    id: 'payments',
    title: 'Payments',
    subtitle: 'Transaction history & receipts',
    tag: 'Billing',
    icon: 'card-outline',
    color: '#2563EB',
    softBg: 'rgba(59, 130, 246, 0.12)',
    route: '/payments',
  },
  {
    id: 'emergency',
    title: 'Emergency Ops',
    subtitle: '24/7 rapid assistance & dispatch',
    tag: '24/7',
    icon: 'call-outline',
    color: '#E11D48',
    softBg: 'rgba(244, 63, 94, 0.12)',
    route: '/emergency',
  },
];

const UPCOMING_MODULES: UpcomingModule[] = [
  {
    id: 'claims',
    title: 'Claims & Cover',
    subtitle: 'Protection claims & support',
    icon: 'document-text-outline',
    color: '#7C3AED',
  },
  {
    id: 'partners',
    title: 'Travel Partners',
    subtitle: 'Verified transport network',
    icon: 'globe-outline',
    color: '#0D9488',
  },
  {
    id: 'insights',
    title: 'Travel Insights',
    subtitle: 'Analytics & safety score',
    icon: 'analytics-outline',
    color: '#4F46E5',
  },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  const ui = darkMode ? DARK_PALETTE : LIGHT_PALETTE;
  const maxContentWidth = 860;
  const effectiveWidth = Math.min(width, maxContentWidth);
  const cardGap = 12;
  const gridCardWidth = (effectiveWidth - 40 - cardGap) / 2;

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
        setError('Unable to load your account. Pull down to retry.');
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

  const fullName = profile?.full_name?.trim() || 'Traveller';

  if (loading) {
    return (
      <SafeAreaView style={[styles.loaderWrap, { backgroundColor: ui.canvas }]}>
        <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
        <View
          style={[
            styles.brandLogoBox,
            { backgroundColor: ui.card, borderColor: ui.border },
          ]}
        >
          <Image
            source={require('../../assets/tsc-header-logo.png')}
            style={styles.brandLogoImg}
            resizeMode="contain"
          />
        </View>
        <ActivityIndicator
          size="small"
          color={ui.accentDeep}
          style={{ marginTop: 18 }}
        />
        <Text style={[styles.loaderText, { color: ui.textSecondary }]}>
          Preparing your travel workspace...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: ui.canvas }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollBody,
          { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ui.accentDeep}
          />
        }
      >
        {/* Top App Bar */}
        <View style={styles.topBar}>
          <View style={styles.brandCluster}>
            <View
              style={[
                styles.brandLogoBox,
                { backgroundColor: ui.card, borderColor: ui.border },
              ]}
            >
              <Image
                source={require('../../assets/tsc-header-logo.png')}
                style={styles.brandLogoImg}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={[styles.brandName, { color: ui.textPrimary }]}>
                TSC
              </Text>
              <Text style={[styles.brandTag, { color: ui.textMuted }]}>
                TRAVELLERS SAFETY COVERED
              </Text>
            </View>
          </View>

          <View style={styles.topActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                darkMode ? 'Switch to light theme' : 'Switch to dark theme'
              }
              onPress={() => setDarkMode((prev) => !prev)}
              style={({ pressed }) => [
                styles.roundAction,
                { backgroundColor: ui.card, borderColor: ui.border },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={darkMode ? 'sunny' : 'moon'}
                size={16}
                color={darkMode ? '#FBBF24' : ui.textPrimary}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={handleSignOut}
              disabled={signingOut}
              style={({ pressed }) => [
                styles.signOutPill,
                { backgroundColor: ui.card, borderColor: ui.border },
                pressed && styles.pressed,
              ]}
            >
              {signingOut ? (
                <ActivityIndicator size="small" color={ui.accentDeep} />
              ) : (
                <>
                  <Text style={[styles.signOutText, { color: ui.textPrimary }]}>
                    Sign out
                  </Text>
                  <Ionicons
                    name="log-out-outline"
                    size={15}
                    color={ui.textMuted}
                  />
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* Flagship Navy Hero Card + Integrated Action Dock */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: ui.heroBg },
            styles.heroShadow,
          ]}
        >
          {/* Decorative soft circles */}
          <View style={styles.heroGlowTopRight} />
          <View style={styles.heroGlowBottomLeft} />

          <View style={styles.heroHeaderRow}>
            <View style={styles.statusChip}>
              <View style={styles.statusPulse} />
              <Text style={styles.statusChipText}>ACCOUNT ACTIVE</Text>
            </View>

            <View style={styles.shieldPill}>
              <MaterialCommunityIcons
                name="shield-check"
                size={14}
                color="#FBBF24"
              />
              <Text style={styles.shieldPillText}>GLOBAL COVER</Text>
            </View>
          </View>

          <View style={styles.heroUserBlock}>
            <Text style={styles.heroWelcome}>Welcome back,</Text>
            <Text style={styles.heroName} numberOfLines={1}>
              {fullName}
            </Text>
            <Text style={styles.heroSubtitle}>
              Your journeys, real-time tracking, and safety protection in one
              place.
            </Text>
          </View>

          {/* 4-Button Quick Action Dock */}
          <View
            style={[
              styles.actionDock,
              {
                backgroundColor: ui.heroSurface,
                borderColor: ui.heroBorder,
              },
            ]}
          >
            {DOCK_ACTIONS.map((action) => (
              <Pressable
                key={action.id}
                accessibilityRole="button"
                onPress={() => router.push(action.route as any)}
                style={({ pressed }) => [
                  styles.dockItem,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[styles.dockIconWrap, { backgroundColor: action.bg }]}
                >
                  <Ionicons name={action.icon} size={20} color={action.tint} />
                </View>
                <Text style={styles.dockLabel} numberOfLines={1}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Core Services Section (2x2 Clean Bento Grid) */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: ui.textPrimary }]}>
            Travel & Safety Services
          </Text>
          <Text style={[styles.sectionHint, { color: ui.textMuted }]}>
            ESSENTIALS
          </Text>
        </View>

        <View style={styles.bentoGrid}>
          {CORE_MODULES.map((mod) => (
            <Pressable
              key={mod.id}
              accessibilityRole="button"
              onPress={() => router.push(mod.route as any)}
              style={({ pressed }) => [
                styles.bentoCard,
                {
                  width: gridCardWidth,
                  backgroundColor: ui.card,
                  borderColor: ui.border,
                },
                !darkMode && styles.cardElevation,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.bentoTop}>
                <View
                  style={[styles.bentoIcon, { backgroundColor: mod.softBg }]}
                >
                  <Ionicons name={mod.icon} size={21} color={mod.color} />
                </View>
                <View
                  style={[styles.bentoTag, { backgroundColor: ui.cardMuted }]}
                >
                  <Text
                    style={[styles.bentoTagText, { color: ui.textSecondary }]}
                  >
                    {mod.tag}
                  </Text>
                </View>
              </View>

              <Text
                style={[styles.bentoTitle, { color: ui.textPrimary }]}
                numberOfLines={1}
              >
                {mod.title}
              </Text>
              <Text
                style={[styles.bentoSub, { color: ui.textSecondary }]}
                numberOfLines={2}
              >
                {mod.subtitle}
              </Text>

              <View style={styles.bentoFooter}>
                <Text style={[styles.bentoOpen, { color: mod.color }]}>
                  Open
                </Text>
                <Ionicons name="arrow-forward" size={14} color={mod.color} />
              </View>
            </Pressable>
          ))}
        </View>

        {/* Wallet & GPS Highlight Strip */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/wallet')}
          style={({ pressed }) => [
            styles.featureStrip,
            {
              backgroundColor: ui.card,
              borderColor: ui.border,
            },
            !darkMode && styles.cardElevation,
            pressed && styles.cardPressed,
          ]}
        >
          <View
            style={[
              styles.stripIcon,
              { backgroundColor: 'rgba(20, 184, 166, 0.12)' },
            ]}
          >
            <Ionicons name="wallet-outline" size={22} color="#0D9488" />
          </View>
          <View style={styles.stripBody}>
            <Text style={[styles.stripTitle, { color: ui.textPrimary }]}>
              My Wallet & Travel Funds
            </Text>
            <Text style={[styles.stripSub, { color: ui.textSecondary }]}>
              View your balance, fund your wallet, and manage trip expenses
            </Text>
          </View>
          <View style={[styles.stripArrow, { backgroundColor: ui.cardMuted }]}>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={ui.textSecondary}
            />
          </View>
        </Pressable>

        {/* Horizontal Upcoming Suite */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: ui.textPrimary }]}>
            Expanding Suite
          </Text>
          <Text style={[styles.sectionHint, { color: ui.textMuted }]}>
            COMING SOON
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {UPCOMING_MODULES.map((item) => (
            <View
              key={item.id}
              style={[
                styles.upcomingCard,
                {
                  backgroundColor: ui.card,
                  borderColor: ui.border,
                },
                !darkMode && styles.cardElevation,
              ]}
            >
              <View style={styles.upcomingHeader}>
                <View
                  style={[
                    styles.upcomingIcon,
                    { backgroundColor: `${item.color}16` },
                  ]}
                >
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <View
                  style={[styles.soonBadge, { backgroundColor: ui.cardMuted }]}
                >
                  <Text style={[styles.soonText, { color: ui.textMuted }]}>
                    Soon
                  </Text>
                </View>
              </View>
              <Text
                style={[styles.upcomingTitle, { color: ui.textPrimary }]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text
                style={[styles.upcomingSub, { color: ui.textSecondary }]}
                numberOfLines={2}
              >
                {item.subtitle}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Safety Advisory Note */}
        <View
          style={[
            styles.advisoryCard,
            {
              backgroundColor: ui.card,
              borderColor: ui.border,
            },
          ]}
        >
          <View
            style={[
              styles.advisoryIcon,
              { backgroundColor: 'rgba(245, 158, 11, 0.14)' },
            ]}
          >
            <Ionicons name="shield-half" size={18} color={ui.accentDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.advisoryTitle, { color: ui.textPrimary }]}>
              Travel safely
            </Text>
            <Text style={[styles.advisoryBody, { color: ui.textSecondary }]}>
              Stay aware of your surroundings and follow local safety guidance
              during your journey.
            </Text>
          </View>
        </View>

        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => loadProfile()}
            >
              <Text style={[styles.retryText, { color: ui.accentDeep }]}>
                Try again
              </Text>
            </Pressable>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerLogo, { color: ui.textPrimary }]}>
            TSC
          </Text>
          <Text style={[styles.footerSub, { color: ui.textMuted }]}>
            TRAVELLERS SAFETY COVERED
          </Text>
          <Text style={[styles.footerNote, { color: ui.textMuted }]}>
            Travel with greater awareness.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollBody: { paddingHorizontal: 20, paddingBottom: 44 },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    fontSize: 13,
    marginTop: 12,
    fontWeight: '500',
  },

  cardElevation: {
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  heroShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#091B3A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 18,
      },
      android: { elevation: 6 },
    }),
  },

  topBar: {
    height: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  brandCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogoBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  brandLogoImg: { width: '100%', height: '100%' },
  brandName: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  brandTag: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.9,
    marginTop: 1,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roundAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutPill: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pressed: { opacity: 0.72 },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },

  heroCard: {
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlowTopRight: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    top: -60,
    right: -40,
  },
  heroGlowBottomLeft: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    bottom: -50,
    left: -30,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  statusPulse: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  statusChipText: {
    color: '#A7F3D0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  shieldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
  },
  shieldPillText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  heroUserBlock: {
    marginBottom: 18,
  },
  heroWelcome: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  heroName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  actionDock: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dockItem: {
    flex: 1,
    alignItems: 'center',
    gap: 7,
  },
  dockIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockLabel: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
  },

  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionHint: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
  },

  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bentoCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  bentoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  bentoIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bentoTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bentoTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  bentoSub: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  bentoFooter: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bentoOpen: {
    fontSize: 12,
    fontWeight: '700',
  },

  featureStrip: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stripIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripBody: {
    flex: 1,
  },
  stripTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  stripSub: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  stripArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  horizontalList: {
    gap: 12,
    paddingRight: 8,
  },
  upcomingCard: {
    width: 190,
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  upcomingIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  soonText: {
    fontSize: 10,
    fontWeight: '700',
  },
  upcomingTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  upcomingSub: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },

  advisoryCard: {
    marginTop: 22,
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  advisoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advisoryTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  advisoryBody: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },

  errorBanner: {
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
    paddingTop: 34,
    paddingBottom: 8,
  },
  footerLogo: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  footerSub: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.4,
    marginTop: 4,
  },
  footerNote: {
    fontSize: 11,
    marginTop: 5,
  },
});