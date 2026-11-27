import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import OSMRouteMap from '../components/OSMRouteMap';
import { supabase } from '../../lib/supabase';

type Journey = {
  id: string;
  traveller_id: string;
  journey_name: string;
  origin_name: string;
  destination_name: string;
  status: string;
  location_sharing_enabled: boolean;
  started_at: string | null;
};

type LocationUpdate = {
  id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  speed_meters_per_second: number | null;
  heading_degrees: number | null;
  recorded_at: string;
};

const COLORS = {
  navy: '#071D49',
  navyMid: '#13386B',
  orange: '#F28C28',
  orangeSoft: '#FFF2E5',
  page: '#F4F6F9',
  white: '#FFFFFF',
  ink: '#172536',
  muted: '#687789',
  border: '#E2E7EE',
  green: '#16845B',
  greenSoft: '#E8F5EE',
  amberSoft: '#FFFBEB',
};

function formatTime(value: string | null) {
  if (!value) return 'Not available';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';

  return date.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDistance(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Not available';
  return `${Math.round(value)} m`;
}

export default function GpsTrackingScreen() {
  const router = useRouter();

  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [updates, setUpdates] = useState<LocationUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [trackingMessage, setTrackingMessage] = useState('');

  const goToLogin = useCallback(() => {
    router.replace('/login' as never);
  }, [router]);

  const loadTrackingData = useCallback(
    async (quiet = false) => {
      if (quiet) setRefreshing(true);
      else setLoading(true);

      setError('');

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          goToLogin();
          return;
        }

        const { data: journeyData, error: journeyError } = await supabase
          .from('journeys')
          .select(
            'id, traveller_id, journey_name, origin_name, destination_name, status, location_sharing_enabled, started_at'
          )
          .eq('traveller_id', session.user.id)
          .order('departure_at', { ascending: false });

        if (journeyError) throw journeyError;

        const availableJourneys = (journeyData ?? []) as Journey[];
        setJourneys(availableJourneys);

        const activeJourneys = availableJourneys.filter(
          (item) => item.status === 'active'
        );

        const chosen =
          availableJourneys.find((item) => item.id === selectedJourneyId) ??
          activeJourneys.find((item) => item.location_sharing_enabled) ??
          activeJourneys[0] ??
          availableJourneys.find((item) => item.location_sharing_enabled) ??
          availableJourneys[0] ??
          null;

        setSelectedJourneyId(chosen?.id ?? null);

        if (!chosen) {
          setUpdates([]);
          return;
        }

        const { data: locationData, error: locationError } = await supabase
          .from('journey_location_updates')
          .select(
            'id, latitude, longitude, accuracy_meters, speed_meters_per_second, heading_degrees, recorded_at'
          )
          .eq('journey_id', chosen.id)
          .eq('traveller_id', session.user.id)
          .order('recorded_at', { ascending: false })
          .limit(100);

        if (locationError) throw locationError;

        setUpdates(((locationData ?? []) as LocationUpdate[]).reverse());
      } catch (err) {
        console.error('GPS tracking data could not be loaded:', err);
        setError(
          'We could not load your GPS tracking information. Please try again.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [goToLogin, selectedJourneyId]
  );

  useFocusEffect(
    useCallback(() => {
      void loadTrackingData();

      const refreshInterval = setInterval(() => {
        void loadTrackingData(true);
      }, 15000);

      return () => clearInterval(refreshInterval);
    }, [loadTrackingData])
  );

  const journey =
    journeys.find((item) => item.id === selectedJourneyId) ?? null;

  const activeJourneys = journeys.filter((item) => item.status === 'active');
  const sharingCount = activeJourneys.filter(
    (item) => item.location_sharing_enabled
  ).length;

  useEffect(() => {
    if (
      !journey ||
      journey.status !== 'active' ||
      !journey.location_sharing_enabled
    ) {
      setTrackingMessage('');
      return;
    }

    let mounted = true;
    let subscription: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();

        if (permission.status !== 'granted') {
          if (mounted) {
            setTrackingMessage(
              'Location permission is unavailable. Open Journey Management to review your location permission.'
            );
          }
          return;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();

        if (!servicesEnabled) {
          if (mounted) {
            setTrackingMessage(
              'Device location services are turned off. Enable them to resume GPS updates.'
            );
          }
          return;
        }

        const nextSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 15000,
            distanceInterval: 25,
          },
          async (position) => {
            if (!mounted) return;

            const {
              data: { session },
              error: sessionError,
            } = await supabase.auth.getSession();

            if (sessionError || !session) return;

            const { error: insertError } = await supabase
              .from('journey_location_updates')
              .insert({
                journey_id: journey.id,
                traveller_id: session.user.id,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy_meters: position.coords.accuracy,
                altitude_meters: position.coords.altitude,
                speed_meters_per_second: position.coords.speed,
                heading_degrees: position.coords.heading,
                recorded_at: new Date(position.timestamp).toISOString(),
              });

            if (insertError) {
              console.warn(
                'GPS location update was not saved:',
                insertError.message
              );
            } else if (mounted) {
              setTrackingMessage(
                'Your consented GPS location is being updated while this screen is open.'
              );
              void loadTrackingData(true);
            }
          }
        );

        if (!mounted) {
          nextSubscription.remove();
          return;
        }

        subscription = nextSubscription;

        if (mounted) {
          setTrackingMessage(
            'GPS monitoring is active while TSC remains open on this screen.'
          );
        }
      } catch (err) {
        console.error('GPS tracking could not resume:', err);

        if (mounted) {
          setTrackingMessage(
            'GPS tracking could not start. Check your device location settings.'
          );
        }
      }
    };

    void startTracking();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [
    journey?.id,
    journey?.status,
    journey?.location_sharing_enabled,
    loadTrackingData,
  ]);

  const latest = updates.length ? updates[updates.length - 1] : null;

  const coordinates = updates.map((item) => ({
    latitude: item.latitude,
    longitude: item.longitude,
    recorded_at: item.recorded_at,
  }));

  const isStale = latest
    ? Date.now() - new Date(latest.recorded_at).getTime() > 60000
    : true;

  const mapRegion = latest
    ? {
        latitude: latest.latitude,
        longitude: latest.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      }
    : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={COLORS.orange} />
        <Text style={styles.loadingText}>Loading GPS tracking...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.headerEyebrow}>📍 TRAVELLER SAFETY MONITORING</Text>
          <Text style={styles.headerTitle}>GPS Tracking</Text>
        </View>

        <Pressable
          onPress={() => void loadTrackingData(true)}
          style={styles.refreshButton}
          disabled={refreshing}
          accessibilityLabel="Refresh GPS tracking"
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={COLORS.orange} />
          ) : (
            <Ionicons name="refresh" size={20} color={COLORS.navy} />
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>🛰️ Live route & GPS status</Text>
          <Text style={styles.heroSubtitle}>
            Manage location sharing and view recorded GPS positions for your active journeys.
          </Text>

          <View style={styles.heroActions}>
            <Pressable
              style={styles.heroLightBtn}
              onPress={() => router.push('/journeys' as never)}
            >
              <Text style={styles.heroLightBtnText}>🗺️ Manage journeys</Text>
            </Pressable>
            <Pressable
              style={styles.heroOrangeBtn}
              onPress={() => void loadTrackingData(true)}
              disabled={refreshing}
            >
              <Text style={styles.heroOrangeBtnText}>
                {refreshing ? 'Refreshing…' : '↻ Refresh'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Summary KPI Strip */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>ACTIVE</Text>
            <Text style={styles.kpiValue}>{activeJourneys.length}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>SHARING ON</Text>
            <Text style={[styles.kpiValue, { color: COLORS.green }]}>
              {sharingCount}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>SHARING OFF</Text>
            <Text style={styles.kpiValue}>
              {Math.max(0, activeJourneys.length - sharingCount)}
            </Text>
          </View>
        </View>

        {!!error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={19} color="#B45309" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void loadTrackingData()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {!journey ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="map-outline" size={34} color={COLORS.orange} />
            </View>
            <Text style={styles.emptyTitle}>No active journeys to display</Text>
            <Text style={styles.emptyDescription}>
              Plan a journey in Journey Management, start it, and enable GPS
              sharing to see your location here.
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push('/journeys' as never)}
            >
              <Ionicons name="navigate-outline" size={18} color={COLORS.white} />
              <Text style={styles.primaryButtonText}>Open journey management</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Journey Switcher when multiple journeys exist */}
            {journeys.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.journeyChips}
              >
                {journeys.map((item) => {
                  const selected = item.id === journey.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setSelectedJourneyId(item.id)}
                      style={[
                        styles.journeyChip,
                        selected && styles.journeyChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.journeyChipText,
                          selected && styles.journeyChipTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {item.status === 'active' ? '🟢 ' : '• '}
                        {item.journey_name || 'Untitled journey'}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {/* Selected Journey Card */}
            <View style={styles.journeyCard}>
              <View style={styles.journeyTopRow}>
                <View style={styles.journeyIcon}>
                  <Ionicons name="airplane-outline" size={21} color={COLORS.orange} />
                </View>
                <View style={styles.journeyTitleWrap}>
                  <Text style={styles.journeyLabel}>SELECTED JOURNEY</Text>
                  <Text style={styles.journeyTitle} numberOfLines={1}>
                    {journey.journey_name || 'Untitled journey'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    journey.status === 'active'
                      ? styles.activeBadge
                      : styles.otherBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      journey.status === 'active'
                        ? styles.activeBadgeText
                        : styles.otherBadgeText,
                    ]}
                  >
                    {journey.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.routeRow}>
                <View style={styles.routePoint}>
                  <Ionicons name="radio-button-on" size={13} color={COLORS.green} />
                  <Text style={styles.routeText} numberOfLines={1}>
                    {journey.origin_name}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={15} color={COLORS.muted} />
                <View style={styles.routePoint}>
                  <Ionicons name="location" size={14} color={COLORS.orange} />
                  <Text style={styles.routeText} numberOfLines={1}>
                    {journey.destination_name}
                  </Text>
                </View>
              </View>

              <View style={styles.sharingRow}>
                <View style={styles.sharingLabel}>
                  <View
                    style={[
                      styles.sharingDot,
                      {
                        backgroundColor: journey.location_sharing_enabled
                          ? COLORS.green
                          : '#9AA5B1',
                      },
                    ]}
                  />
                  <Text style={styles.sharingText}>
                    {journey.location_sharing_enabled
                      ? 'Location sharing is enabled for this journey.'
                      : 'Location sharing is currently turned off.'}
                  </Text>
                </View>

                <Pressable onPress={() => router.push('/journeys' as never)}>
                  <Text style={styles.manageLink}>Manage</Text>
                </Pressable>
              </View>
            </View>

            {/* Location Map */}
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>🗺️ Location map</Text>
              <Text style={styles.sectionHint}>
                {latest ? 'LAST RECORDED POSITION' : 'AWAITING LOCATION'}
              </Text>
            </View>

            <View style={styles.mapCard}><OSMRouteMap coordinates={coordinates} latest={latest ? { latitude: latest.latitude, longitude: latest.longitude } : null} /></View>

            {/* Location Information */}
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>📡 Location information</Text>
              <Text style={styles.sectionHint}>
                {updates.length} RECORDED POINT{updates.length === 1 ? '' : 'S'}
              </Text>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="time-outline" size={19} color={COLORS.orange} />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Last location update</Text>
                  <Text style={styles.infoValue}>
                    {latest ? formatTime(latest.recorded_at) : 'No location recorded'}
                  </Text>
                </View>
                {latest && (
                  <View
                    style={[
                      styles.freshnessBadge,
                      isStale ? styles.staleBadge : styles.freshBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.freshnessText,
                        isStale ? styles.staleText : styles.freshText,
                      ]}
                    >
                      {isStale ? 'STALE' : 'RECENT'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="locate-outline" size={19} color={COLORS.orange} />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>GPS accuracy & coordinates</Text>
                  <Text style={styles.infoValue}>
                    {latest
                      ? `${formatDistance(latest.accuracy_meters)} · ${latest.latitude.toFixed(5)}, ${latest.longitude.toFixed(5)}`
                      : 'Not available'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="trail-sign-outline" size={19} color={COLORS.orange} />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>Recorded route points</Text>
                  <Text style={styles.infoValue}>{updates.length}</Text>
                </View>
              </View>
            </View>

            {!!trackingMessage && (
              <View style={styles.trackingNotice}>
                <Ionicons
                  name="information-circle-outline"
                  size={19}
                  color={COLORS.green}
                />
                <Text style={styles.trackingNoticeText}>{trackingMessage}</Text>
              </View>
            )}

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push('/journeys' as never)}
            >
              <Ionicons name="briefcase-outline" size={18} color={COLORS.navy} />
              <Text style={styles.secondaryButtonText}>
                View journey details and GPS consent
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.page },
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { marginTop: 12, color: COLORS.muted, fontSize: 12 },
  header: {
    minHeight: 68,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F0F3F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, marginLeft: 12 },
  headerEyebrow: {
    color: COLORS.orange,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  headerTitle: { color: COLORS.navy, fontSize: 17, fontWeight: '800', marginTop: 2 },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 16, paddingBottom: 36 },
  heroCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  heroTitle: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  heroSubtitle: { color: '#CBD5E1', fontSize: 12, lineHeight: 18, marginTop: 5 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  heroLightBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  heroLightBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  heroOrangeBtn: {
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  heroOrangeBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  kpiLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  kpiValue: { color: COLORS.navy, fontSize: 20, fontWeight: '900', marginTop: 4 },
  errorCard: {
    backgroundColor: COLORS.amberSoft,
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 13,
  },
  errorText: { flex: 1, color: '#78350F', fontSize: 11 },
  retryText: { color: COLORS.navy, fontSize: 11, fontWeight: '800' },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { color: COLORS.navy, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptyDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },
  primaryButton: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: COLORS.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
  primaryButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  journeyChips: { gap: 8, marginBottom: 12 },
  journeyChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: 220,
  },
  journeyChipSelected: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  journeyChipText: { color: COLORS.ink, fontSize: 11, fontWeight: '700' },
  journeyChipTextSelected: { color: COLORS.white },
  journeyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  journeyTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  journeyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyTitleWrap: { flex: 1 },
  journeyLabel: { color: COLORS.muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
  journeyTitle: { color: COLORS.navy, fontSize: 14, fontWeight: '800', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 },
  activeBadge: { backgroundColor: COLORS.greenSoft },
  otherBadge: { backgroundColor: '#EDF1F5' },
  statusBadgeText: { fontSize: 8, fontWeight: '800' },
  activeBadgeText: { color: COLORS.green },
  otherBadgeText: { color: COLORS.muted },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 15 },
  routePoint: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  routeText: { flex: 1, color: COLORS.ink, fontSize: 11, fontWeight: '600' },
  sharingRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 13,
    paddingTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sharingLabel: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  sharingDot: { width: 8, height: 8, borderRadius: 4 },
  sharingText: { color: COLORS.ink, fontSize: 11, fontWeight: '700', flex: 1 },
  manageLink: { color: COLORS.orange, fontSize: 11, fontWeight: '800' },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 9,
  },
  sectionTitle: { color: COLORS.navy, fontSize: 14, fontWeight: '800' },
  sectionHint: { color: COLORS.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  mapCard: {
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E8EDF2',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  map: { flex: 1 },
  mapEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  mapEmptyTitle: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 11,
  },
  mapEmptyText: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 6,
  },
  mapAction: {
    marginTop: 14,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mapActionText: { color: COLORS.navy, fontSize: 11, fontWeight: '800' },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  infoRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 11 },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: COLORS.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1 },
  infoLabel: { color: COLORS.muted, fontSize: 10 },
  infoValue: { color: COLORS.navy, fontSize: 12, fontWeight: '700', marginTop: 3 },
  infoDivider: { height: 1, backgroundColor: COLORS.border },
  freshnessBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 },
  freshBadge: { backgroundColor: COLORS.greenSoft },
  staleBadge: { backgroundColor: COLORS.orangeSoft },
  freshnessText: { fontSize: 8, fontWeight: '800' },
  freshText: { color: COLORS.green },
  staleText: { color: '#B56A17' },
  trackingNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.greenSoft,
  },
  trackingNoticeText: { flex: 1, color: '#286B4E', fontSize: 11, lineHeight: 16 },
  secondaryButton: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: { color: COLORS.navy, fontSize: 12, fontWeight: '800' },
});