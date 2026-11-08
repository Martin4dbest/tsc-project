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
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
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

const NAVY = '#071D49';
const ORANGE = '#F28C28';
const PAGE = '#F4F6F9';
const INK = '#172536';
const MUTED = '#687789';
const BORDER = '#E2E7EE';
const GREEN = '#16845B';

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

  const [journey, setJourney] = useState<Journey | null>(null);
  const [updates, setUpdates] = useState<LocationUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [trackingMessage, setTrackingMessage] = useState('');

  const loadTrackingData = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    setError('');

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace('/login');
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

      const selectedJourney =
        availableJourneys.find(
          (item) => item.status === 'active' && item.location_sharing_enabled
        ) ??
        availableJourneys.find((item) => item.status === 'active') ??
        availableJourneys.find((item) => item.location_sharing_enabled) ??
        availableJourneys[0] ??
        null;

      setJourney(selectedJourney);

      if (!selectedJourney) {
        setUpdates([]);
        return;
      }

      const { data: locationData, error: locationError } = await supabase
        .from('journey_location_updates')
        .select(
          'id, latitude, longitude, accuracy_meters, speed_meters_per_second, heading_degrees, recorded_at'
        )
        .eq('journey_id', selectedJourney.id)
        .eq('traveller_id', session.user.id)
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (locationError) throw locationError;

      setUpdates(
        ((locationData ?? []) as LocationUpdate[]).reverse()
      );
    } catch (err) {
      console.error('GPS tracking data could not be loaded:', err);
      setError('We could not load your GPS tracking information. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void loadTrackingData();

      const refreshInterval = setInterval(() => {
        void loadTrackingData(true);
      }, 15000);

      return () => clearInterval(refreshInterval);
    }, [loadTrackingData])
  );

  // Resume foreground GPS capture on this screen only when the traveller
  // has already consented and the selected journey is active.
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
              console.warn('GPS location update was not saved:', insertError.message);
            } else if (mounted) {
              setTrackingMessage(
                'Your consented GPS location is being updated while this screen is open.'
              );
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
  ]);

  const latest = updates.length ? updates[updates.length - 1] : null;

  const coordinates = updates.map((item) => ({
    latitude: item.latitude,
    longitude: item.longitude,
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
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={styles.loadingText}>Loading GPS tracking...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={21} color={NAVY} />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>GPS Tracking</Text>
          <Text style={styles.headerSubtitle}>
            Your journey location and movement
          </Text>
        </View>

        <Pressable
          onPress={() => void loadTrackingData(true)}
          style={styles.refreshButton}
          disabled={refreshing}
          accessibilityLabel="Refresh GPS tracking"
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={ORANGE} />
          ) : (
            <Ionicons name="refresh" size={20} color={NAVY} />
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {!!error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={19} color="#B52D2D" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void loadTrackingData()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {!journey ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="map-outline" size={34} color={ORANGE} />
            </View>
            <Text style={styles.emptyTitle}>No journey to display</Text>
            <Text style={styles.emptyDescription}>
              Create a journey in Journey Management, start it, and enable GPS
              sharing to see your location here.
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push('/journeys')}
            >
              <Ionicons name="navigate-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Open Journey Management</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.journeyCard}>
              <View style={styles.journeyTopRow}>
                <View style={styles.journeyIcon}>
                  <Ionicons name="airplane-outline" size={21} color={ORANGE} />
                </View>
                <View style={styles.journeyTitleWrap}>
                  <Text style={styles.journeyLabel}>SELECTED JOURNEY</Text>
                  <Text style={styles.journeyTitle} numberOfLines={1}>
                    {journey.journey_name}
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
                  <Ionicons name="radio-button-on" size={13} color={GREEN} />
                  <Text style={styles.routeText} numberOfLines={1}>
                    {journey.origin_name}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={15} color={MUTED} />
                <View style={styles.routePoint}>
                  <Ionicons name="location" size={14} color={ORANGE} />
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
                          ? GREEN
                          : '#9AA5B1',
                      },
                    ]}
                  />
                  <Text style={styles.sharingText}>
                    GPS sharing {journey.location_sharing_enabled ? 'ON' : 'OFF'}
                  </Text>
                </View>

                <Pressable onPress={() => router.push('/journeys')}>
                  <Text style={styles.manageLink}>Manage</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Location map</Text>
              <Text style={styles.sectionHint}>
                {latest ? 'LAST RECORDED POSITION' : 'AWAITING LOCATION'}
              </Text>
            </View>

            <View style={styles.mapCard}>
              {mapRegion && latest ? (
                <MapView
                  style={styles.map}
                  provider={PROVIDER_DEFAULT}
                  initialRegion={mapRegion}
                  region={mapRegion}
                  showsCompass
                  showsScale
                  toolbarEnabled={false}
                  loadingEnabled
                >
                  {coordinates.length > 1 && (
                    <Polyline
                      coordinates={coordinates}
                      strokeColor={ORANGE}
                      strokeWidth={4}
                    />
                  )}

                  <Marker
                    coordinate={{
                      latitude: latest.latitude,
                      longitude: latest.longitude,
                    }}
                    title="Your last recorded location"
                    description={`Updated ${formatTime(latest.recorded_at)}`}
                    pinColor={ORANGE}
                  />
                </MapView>
              ) : (
                <View style={styles.mapEmpty}>
                  <Ionicons name="map-outline" size={42} color="#9AA5B1" />
                  <Text style={styles.mapEmptyTitle}>
                    {journey.location_sharing_enabled
                      ? 'Waiting for your first GPS position'
                      : 'GPS sharing is turned off'}
                  </Text>
                  <Text style={styles.mapEmptyText}>
                    {journey.location_sharing_enabled
                      ? 'Keep TSC open while GPS obtains and records your location.'
                      : 'Enable GPS sharing from your journey details to begin recording your route.'}
                  </Text>
                  <Pressable
                    style={styles.mapAction}
                    onPress={() => router.push('/journeys')}
                  >
                    <Text style={styles.mapActionText}>
                      {journey.location_sharing_enabled
                        ? 'Refresh location'
                        : 'Open Journey Management'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Location information</Text>
              <Text style={styles.sectionHint}>
                {updates.length} RECORDED POINT{updates.length === 1 ? '' : 'S'}
              </Text>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="time-outline" size={19} color={ORANGE} />
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
                  <Ionicons name="locate-outline" size={19} color={ORANGE} />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>GPS accuracy</Text>
                  <Text style={styles.infoValue}>
                    {latest ? formatDistance(latest.accuracy_meters) : 'Not available'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="trail-sign-outline" size={19} color={ORANGE} />
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
                  color={GREEN}
                />
                <Text style={styles.trackingNoticeText}>{trackingMessage}</Text>
              </View>
            )}

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push('/journeys')}
            >
              <Ionicons name="briefcase-outline" size={18} color={NAVY} />
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
  screen: {
    flex: 1,
    backgroundColor: PAGE,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: PAGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: MUTED,
    fontSize: 12,
  },
  header: {
    minHeight: 70,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backButton: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: '#F0F3F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: NAVY,
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: MUTED,
    fontSize: 10,
    marginTop: 3,
  },
  refreshButton: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: '#FFF2E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 35,
  },
  errorCard: {
    backgroundColor: '#FFF3F3',
    borderColor: '#F0D5D5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 13,
  },
  errorText: {
    flex: 1,
    color: '#A12B2B',
    fontSize: 11,
  },
  retryText: {
    color: '#A12B2B',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#FFF2E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  emptyTitle: {
    color: NAVY,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyDescription: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 9,
  },
  primaryButton: {
    minHeight: 45,
    paddingHorizontal: 17,
    borderRadius: 11,
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  journeyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  journeyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  journeyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF2E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyTitleWrap: {
    flex: 1,
  },
  journeyLabel: {
    color: MUTED,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  journeyTitle: {
    color: NAVY,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
  },
  activeBadge: {
    backgroundColor: '#E8F5EE',
  },
  otherBadge: {
    backgroundColor: '#EDF1F5',
  },
  statusBadgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
  activeBadgeText: {
    color: GREEN,
  },
  otherBadgeText: {
    color: MUTED,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 17,
  },
  routePoint: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  routeText: {
    flex: 1,
    color: INK,
    fontSize: 10,
    fontWeight: '600',
  },
  sharingRow: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginTop: 14,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sharingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sharingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sharingText: {
    color: INK,
    fontSize: 10,
    fontWeight: '700',
  },
  manageLink: {
    color: ORANGE,
    fontSize: 10,
    fontWeight: '800',
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 21,
    marginBottom: 10,
  },
  sectionTitle: {
    color: NAVY,
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHint: {
    color: MUTED,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mapCard: {
    height: 310,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#E8EDF2',
    borderWidth: 1,
    borderColor: BORDER,
  },
  map: {
    flex: 1,
  },
  mapEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
  },
  mapEmptyTitle: {
    color: NAVY,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
  },
  mapEmptyText: {
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 7,
  },
  mapAction: {
    marginTop: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
  },
  mapActionText: {
    color: NAVY,
    fontSize: 10,
    fontWeight: '800',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 13,
  },
  infoRow: {
    minHeight: 65,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#FFF2E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    color: MUTED,
    fontSize: 9,
  },
  infoValue: {
    color: NAVY,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  infoDivider: {
    height: 1,
    backgroundColor: BORDER,
  },
  freshnessBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
  },
  freshBadge: {
    backgroundColor: '#E8F5EE',
  },
  staleBadge: {
    backgroundColor: '#FFF2E5',
  },
  freshnessText: {
    fontSize: 8,
    fontWeight: '800',
  },
  freshText: {
    color: GREEN,
  },
  staleText: {
    color: '#B56A17',
  },
  trackingNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
    padding: 12,
    borderRadius: 11,
    backgroundColor: '#EAF5EF',
  },
  trackingNoticeText: {
    flex: 1,
    color: '#286B4E',
    fontSize: 10,
    lineHeight: 16,
  },
  secondaryButton: {
    minHeight: 45,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: NAVY,
    fontSize: 10,
    fontWeight: '800',
  },
});
