import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';

type EmergencyCategory =
  | 'medical'
  | 'accident'
  | 'security'
  | 'natural_disaster'
  | 'transport'
  | 'other';

type EmergencySeverity = 'low' | 'moderate' | 'high' | 'critical';

type EmergencyStatus =
  | 'reported'
  | 'acknowledged'
  | 'assigned'
  | 'responding'
  | 'resolved'
  | 'cancelled';

type Journey = {
  id: string;
  journey_name: string;
  status: string;
};

type EmergencyAlert = {
  id: string;
  category: EmergencyCategory;
  severity: EmergencySeverity;
  status: EmergencyStatus;
  title: string;
  description: string | null;
  reported_at: string;
  location_address: string | null;
  latitude: number | null;
  longitude: number | null;
  journey_id: string | null;
};

type CapturedLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

const COLORS = {
  navy: '#071D49',
  navyMid: '#13386B',
  orange: '#F28C28',
  orangeSoft: '#FFF4E8',
  page: '#F4F6F9',
  white: '#FFFFFF',
  ink: '#172536',
  muted: '#64748B',
  border: '#E2E8F0',
  red: '#DC2626',
  redSoft: '#FEF2F2',
  redBorder: '#FECACA',
  emerald: '#059669',
  emeraldSoft: '#ECFDF5',
  amberSoft: '#FFFBEB',
};

const categories: {
  value: EmergencyCategory;
  label: string;
  emoji: string;
}[] = [
  { value: 'medical', label: 'Medical', emoji: '🩺' },
  { value: 'accident', label: 'Accident', emoji: '🚗' },
  { value: 'security', label: 'Security', emoji: '🛡️' },
  { value: 'natural_disaster', label: 'Natural disaster', emoji: '⚠️' },
  { value: 'transport', label: 'Transport', emoji: '🚌' },
  { value: 'other', label: 'Other', emoji: '🧭' },
];

const severities: {
  value: EmergencySeverity;
  label: string;
  emoji: string;
  color: string;
  bg: string;
}[] = [
  { value: 'low', label: 'Low', emoji: '🟢', color: '#0F766E', bg: '#F0FDFA' },
  { value: 'moderate', label: 'Moderate', emoji: '🟡', color: '#B45309', bg: '#FFFBEB' },
  { value: 'high', label: 'High', emoji: '🟠', color: '#C2410C', bg: '#FFF7ED' },
  { value: 'critical', label: 'Critical', emoji: '🔴', color: '#B91C1C', bg: '#FEF2F2' },
];

const statusMeta: Record<
  EmergencyStatus,
  { label: string; color: string; bg: string }
> = {
  reported: { label: 'Reported', color: '#B45309', bg: '#FFFBEB' },
  acknowledged: { label: 'Acknowledged', color: '#1D4ED8', bg: '#EFF6FF' },
  assigned: { label: 'Responder assigned', color: '#6D28D9', bg: '#F5F3FF' },
  responding: { label: 'Response in progress', color: '#C2410C', bg: '#FFF7ED' },
  resolved: { label: 'Resolved', color: '#047857', bg: '#ECFDF5' },
  cancelled: { label: 'Cancelled', color: '#475569', bg: '#F1F5F9' },
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function reference(id: string) {
  return `TSC-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export default function EmergencyScreen() {
  const router = useRouter();

  const [category, setCategory] = useState<EmergencyCategory>('other');
  const [severity, setSeverity] = useState<EmergencySeverity>('high');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>('');
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitted, setSubmitted] = useState<EmergencyAlert | null>(null);

  const goToLogin = useCallback(() => {
    router.replace('/login' as never);
  }, [router]);

  const loadData = useCallback(
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

        const [journeyResult, alertResult] = await Promise.all([
          supabase
            .from('journeys')
            .select('id, journey_name, status')
            .eq('traveller_id', session.user.id)
            .eq('status', 'active')
            .order('departure_at', { ascending: true }),

          supabase
            .from('emergency_alerts')
            .select('*')
            .eq('traveller_id', session.user.id)
            .order('reported_at', { ascending: false })
            .limit(30),
        ]);

        if (journeyResult.error) throw journeyResult.error;
        if (alertResult.error) throw alertResult.error;

        const availableJourneys = (journeyResult.data ?? []) as Journey[];
        setJourneys(availableJourneys);
        setAlerts((alertResult.data ?? []) as EmergencyAlert[]);

        if (
          selectedJourneyId &&
          !availableJourneys.some((journey) => journey.id === selectedJourneyId)
        ) {
          setSelectedJourneyId('');
        }
      } catch (err) {
        console.error('Emergency data loading failed:', err);
        setError(
          'We could not load all your emergency information. Please refresh and try again.'
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
      void loadData();
    }, [loadData])
  );

  const captureLocation = async () => {
    if (locating) return;

    setError('');
    setNotice('');
    setLocating(true);

    try {
      let permission = await Location.getForegroundPermissionsAsync();

      if (!permission.granted) {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (!permission.granted) {
        setLocation(null);
        setError(
          'Location permission was denied. You can still submit an emergency without GPS coordinates.'
        );
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        setError(
          'Your location could not be obtained. You can still submit without GPS coordinates.'
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: Number.isFinite(position.coords.accuracy)
          ? position.coords.accuracy
          : null,
      });
      setNotice('Your current location has been captured for this report.');
    } catch (err) {
      console.warn('Emergency location capture failed:', err);
      setLocation(null);
      setError(
        'Your location could not be obtained. You can still submit without GPS coordinates.'
      );
    } finally {
      setLocating(false);
    }
  };

  const submitEmergency = () => {
    if (saving) return;

    setError('');
    setNotice('');

    const cleanTitle = title.trim();
    if (!cleanTitle || cleanTitle.length > 160) {
      setError('Enter an emergency title between 1 and 160 characters.');
      return;
    }

    if (
      selectedJourneyId &&
      !journeys.some((journey) => journey.id === selectedJourneyId)
    ) {
      setError('Please select one of your currently active journeys.');
      return;
    }

    Alert.alert(
      '🚨 Submit emergency report?',
      'Submit this emergency report to TSC? If you are in immediate danger, contact local emergency services now as well.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit report',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const {
                data: { session },
                error: sessionError,
              } = await supabase.auth.getSession();

              if (sessionError || !session) {
                goToLogin();
                return;
              }

              const { data, error: insertError } = await supabase
                .from('emergency_alerts')
                .insert({
                  traveller_id: session.user.id,
                  journey_id: selectedJourneyId || null,
                  category,
                  severity,
                  title: cleanTitle,
                  description: description.trim() || null,
                  latitude: location?.latitude ?? null,
                  longitude: location?.longitude ?? null,
                  location_accuracy_meters: location?.accuracy ?? null,
                  status: 'reported',
                })
                .select('*')
                .single();

              if (insertError) throw insertError;

              const newAlert = data as EmergencyAlert;
              setSubmitted(newAlert);
              setTitle('');
              setDescription('');
              setCategory('other');
              setSeverity('high');
              setSelectedJourneyId('');
              setLocation(null);

              await loadData(true);
            } catch (err: unknown) {
              const msg =
                err instanceof Error
                  ? err.message
                  : 'Your emergency report could not be submitted. Please try again.';
              console.error('Emergency submission failed:', err);
              setError(msg);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.loadingEmoji}>🚨</Text>
        <ActivityIndicator size="large" color={COLORS.orange} />
        <Text style={styles.loadingText}>Loading emergency operations…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />

      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back to dashboard"
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </Pressable>
        <View style={styles.topBarText}>
          <Text style={styles.topBarEyebrow}>🚨 EMERGENCY OPERATIONS</Text>
          <Text style={styles.topBarTitle}>Emergency Support</Text>
        </View>
        <View style={styles.sosBadge}>
          <Text style={styles.sosBadgeText}>SOS</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadData(true)}
            tintColor={COLORS.orange}
          />
        }
      >
        {/* Hero Header */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Emergency support 🆘</Text>
          <Text style={styles.heroSubtitle}>
            Report a travel-related emergency and keep track of live updates to your report.
          </Text>

          <View style={styles.warningBox}>
            <Text style={styles.warningEmoji}>⚠️</Text>
            <View style={styles.flexOne}>
              <Text style={styles.warningTitle}>Need immediate help?</Text>
              <Text style={styles.warningBody}>
                TSC is not a replacement for police, ambulance, fire or other local emergency services. Contact the appropriate local emergency service immediately if anyone is in danger.
              </Text>
            </View>
          </View>
        </View>

        {/* Submission Success Banner */}
        {submitted && (
          <View style={styles.successCard}>
            <View style={styles.successTop}>
              <View style={styles.successCheck}>
                <Text style={styles.successCheckText}>✓</Text>
              </View>
              <View style={styles.flexOne}>
                <Text style={styles.successEyebrow}>REPORT SUBMITTED</Text>
                <Text style={styles.successHeading}>Your report has been received</Text>
                <Text style={styles.successLine}>
                  Reference: <Text style={styles.boldText}>{reference(submitted.id)}</Text>
                </Text>
                <Text style={styles.successLine}>
                  Status: <Text style={styles.boldText}>Reported</Text>. Keep this reference for your records.
                </Text>
              </View>
              <Pressable
                onPress={() => setSubmitted(null)}
                style={styles.dismissButton}
                accessibilityLabel="Dismiss confirmation"
              >
                <Ionicons name="close" size={18} color="#065F46" />
              </Pressable>
            </View>
          </View>
        )}

        {!!notice && (
          <View style={styles.noticeBanner}>
            <Text style={styles.noticeBannerText}>✅ {notice}</Text>
          </View>
        )}

        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Section 01: New Emergency Report */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelEyebrow}>NEW EMERGENCY REPORT · 01</Text>
              <Text style={styles.panelTitle}>📝 Tell us what happened</Text>
            </View>
            <View style={styles.alertSymbol}>
              <Text style={styles.alertSymbolText}>!</Text>
            </View>
          </View>

          {/* Category */}
          <Text style={styles.label}>Emergency category *</Text>
          <View style={styles.categoryGrid}>
            {categories.map((item) => {
              const selected = category === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setCategory(item.value)}
                  style={[
                    styles.categoryTile,
                    selected && styles.categoryTileSelected,
                  ]}
                >
                  <Text style={styles.categoryEmoji}>{item.emoji}</Text>
                  <Text
                    style={[
                      styles.categoryLabel,
                      selected && styles.categoryLabelSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Severity */}
          <Text style={styles.label}>Severity level *</Text>
          <View style={styles.severityGrid}>
            {severities.map((item) => {
              const selected = severity === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setSeverity(item.value)}
                  style={[
                    styles.severityTile,
                    selected && {
                      borderColor: item.color,
                      backgroundColor: item.bg,
                    },
                  ]}
                >
                  <Text style={styles.severityEmoji}>{item.emoji}</Text>
                  <Text
                    style={[
                      styles.severityLabel,
                      selected && { color: item.color, fontWeight: '800' },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Title */}
          <Text style={styles.label}>Emergency title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Briefly describe the emergency"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            maxLength={160}
            returnKeyType="next"
          />
          <Text style={styles.charCount}>{title.length}/160</Text>

          {/* Additional Details */}
          <Text style={styles.label}>Additional details (optional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe what happened and any assistance required"
            placeholderTextColor="#94A3B8"
            style={[styles.input, styles.textArea]}
            multiline
            textAlignVertical="top"
            maxLength={2000}
          />

          {/* Link Active Journey */}
          <Text style={styles.label}>🧭 Link to an active journey (optional)</Text>
          {journeys.length === 0 ? (
            <View style={styles.emptyJourneyBox}>
              <Text style={styles.emptyJourneyText}>
                No active journeys found. You can still submit an emergency report.
              </Text>
            </View>
          ) : (
            <View style={styles.journeyList}>
              <Pressable
                onPress={() => setSelectedJourneyId('')}
                style={[
                  styles.journeyOption,
                  selectedJourneyId === '' && styles.journeyOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.journeyOptionText,
                    selectedJourneyId === '' && styles.journeyOptionTextSelected,
                  ]}
                >
                  No journey selected
                </Text>
              </Pressable>

              {journeys.map((journey) => {
                const active = selectedJourneyId === journey.id;
                return (
                  <Pressable
                    key={journey.id}
                    onPress={() => setSelectedJourneyId(journey.id)}
                    style={[
                      styles.journeyOption,
                      active && styles.journeyOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.journeyOptionText,
                        active && styles.journeyOptionTextSelected,
                      ]}
                    >
                      🗺️ {journey.journey_name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Location Attachment Box */}
          <View style={styles.locationBox}>
            <View style={styles.flexOne}>
              <Text style={styles.locationTitle}>📍 Attach your current location</Text>
              <Text style={styles.locationDesc}>
                {location
                  ? `Coordinates captured (accuracy approx. ${Math.round(location.accuracy ?? 0)} m).`
                  : 'Optional. Your device will ask permission before sharing your location.'}
              </Text>
              {location && (
                <Text style={styles.coordsText}>
                  {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                </Text>
              )}
            </View>

            <View style={styles.locationActions}>
              <Pressable
                onPress={() => void captureLocation()}
                disabled={locating}
                style={styles.locationButton}
              >
                {locating ? (
                  <ActivityIndicator size="small" color={COLORS.navy} />
                ) : (
                  <Text style={styles.locationButtonText}>
                    {location ? '↻ Refresh' : '📡 Use my location'}
                  </Text>
                )}
              </Pressable>
              {location && (
                <Pressable onPress={() => setLocation(null)}>
                  <Text style={styles.clearLocationText}>Remove location</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Submit CTA */}
          <Pressable
            onPress={submitEmergency}
            disabled={saving}
            style={[styles.submitButton, saving && styles.disabledButton]}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>🚨 Submit emergency report</Text>
            )}
          </Pressable>

          <Text style={styles.formFootnote}>
            Submitting this form creates an emergency record for TSC response monitoring. Do not delay contacting local emergency services.
          </Text>
        </View>

        {/* Section 02: Emergency Report History */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelEyebrow}>YOUR RECORDS · 02</Text>
              <Text style={styles.panelTitle}>📋 Emergency report history</Text>
            </View>
            <Pressable
              onPress={() => void loadData(true)}
              style={styles.refreshChip}
            >
              <Text style={styles.refreshChipText}>Refresh ↻</Text>
            </Pressable>
          </View>

          {alerts.length === 0 ? (
            <View style={styles.emptyHistory}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIconText}>✓</Text>
              </View>
              <Text style={styles.emptyHistoryTitle}>No emergency reports</Text>
              <Text style={styles.emptyHistoryBody}>
                Your submitted emergency reports and their response status will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {alerts.map((alert) => {
                const st = statusMeta[alert.status];
                const cat = categories.find((c) => c.value === alert.category);
                return (
                  <View key={alert.id} style={styles.historyCard}>
                    <View style={styles.historyTopRow}>
                      <Text style={styles.historyMetaTag}>
                        {cat?.emoji ?? '🚨'} {alert.category.replace('_', ' ').toUpperCase()} ·{' '}
                        {alert.severity.toUpperCase()}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: st.color }]}>
                          {st.label}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.historyTitle}>{alert.title}</Text>
                    <Text style={styles.historyRef}>
                      {reference(alert.id)} · {formatDate(alert.reported_at)}
                    </Text>

                    {!!alert.description && (
                      <Text style={styles.historyNotes}>{alert.description}</Text>
                    )}

                    {!!alert.location_address && (
                      <Text style={styles.historyLocation}>
                        📍 Location: {alert.location_address}
                      </Text>
                    )}

                    {alert.latitude !== null && alert.longitude !== null && (
                      <Text style={styles.historyLocation}>
                        🛰️ GPS: {alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <Text style={styles.safetyNote}>
          TSC helps record and coordinate reported incidents. Response availability and timing may vary. Always use local emergency channels for urgent assistance.
        </Text>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>🛡️ TRAVELLERS SAFETY COVERED</Text>
          <Pressable onPress={() => router.replace('/dashboard' as never)}>
            <Text style={styles.footerLink}>Return to dashboard →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.page },
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingEmoji: { fontSize: 34, marginBottom: 12 },
  loadingText: { color: COLORS.white, fontSize: 13, marginTop: 12, fontWeight: '600' },
  flexOne: { flex: 1 },
  topBar: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarText: { flex: 1 },
  topBarEyebrow: { color: '#FDBA74', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  topBarTitle: { color: COLORS.white, fontSize: 18, fontWeight: '800', marginTop: 2 },
  sosBadge: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.red,
  },
  sosBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  content: { padding: 16, paddingBottom: 42 },
  heroCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  heroTitle: { color: COLORS.white, fontSize: 22, fontWeight: '800' },
  heroSubtitle: { color: '#CBD5E1', fontSize: 13, lineHeight: 19, marginTop: 6 },
  warningBox: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(220, 38, 38, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(254, 202, 202, 0.35)',
    borderRadius: 14,
    padding: 13,
  },
  warningEmoji: { fontSize: 18 },
  warningTitle: { color: '#FECACA', fontSize: 13, fontWeight: '800' },
  warningBody: { color: '#FEE2E2', fontSize: 11, lineHeight: 17, marginTop: 3 },
  successCard: {
    backgroundColor: COLORS.emeraldSoft,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  successTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  successCheck: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCheckText: { color: COLORS.white, fontSize: 18, fontWeight: '900' },
  successEyebrow: { color: '#047857', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  successHeading: { color: '#064E3B', fontSize: 16, fontWeight: '800', marginTop: 2 },
  successLine: { color: '#065F46', fontSize: 12, marginTop: 4 },
  boldText: { fontWeight: '800' },
  dismissButton: { padding: 4 },
  noticeBanner: {
    backgroundColor: COLORS.emeraldSoft,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  noticeBannerText: { color: '#065F46', fontSize: 12, fontWeight: '600' },
  errorBanner: {
    backgroundColor: COLORS.redSoft,
    borderWidth: 1,
    borderColor: COLORS.redBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: { color: '#991B1B', fontSize: 12, fontWeight: '600' },
  panel: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  panelEyebrow: { color: COLORS.orange, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  panelTitle: { color: COLORS.navy, fontSize: 17, fontWeight: '800', marginTop: 2 },
  alertSymbol: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.redSoft,
    borderWidth: 1,
    borderColor: COLORS.redBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertSymbolText: { color: COLORS.red, fontSize: 16, fontWeight: '900' },
  label: { color: COLORS.ink, fontSize: 12, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryTile: {
    width: '31.5%',
    minHeight: 76,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  categoryTileSelected: {
    borderColor: COLORS.orange,
    backgroundColor: COLORS.orangeSoft,
  },
  categoryEmoji: { fontSize: 20, marginBottom: 4 },
  categoryLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  categoryLabelSelected: { color: '#9A3412', fontWeight: '800' },
  severityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  severityTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    backgroundColor: '#F8FAFC',
  },
  severityEmoji: { fontSize: 12 },
  severityLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    color: COLORS.ink,
    fontSize: 13,
    backgroundColor: '#F8FAFC',
  },
  textArea: { minHeight: 96 },
  charCount: { color: COLORS.muted, fontSize: 10, textAlign: 'right', marginTop: 4 },
  emptyJourneyBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
  },
  emptyJourneyText: { color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  journeyList: { gap: 8 },
  journeyOption: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    backgroundColor: '#F8FAFC',
  },
  journeyOptionSelected: { borderColor: COLORS.orange, backgroundColor: COLORS.orangeSoft },
  journeyOptionText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  journeyOptionTextSelected: { color: '#9A3412', fontWeight: '800' },
  locationBox: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationTitle: { color: COLORS.ink, fontSize: 13, fontWeight: '800' },
  locationDesc: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  coordsText: { color: COLORS.emerald, fontSize: 10, fontWeight: '700', marginTop: 4 },
  locationActions: { alignItems: 'flex-end', gap: 6 },
  locationButton: {
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  locationButtonText: { color: COLORS.navy, fontSize: 11, fontWeight: '800' },
  clearLocationText: { color: COLORS.red, fontSize: 10, fontWeight: '700' },
  submitButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  disabledButton: { opacity: 0.65 },
  submitButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  formFootnote: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  refreshChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
  },
  refreshChipText: { color: COLORS.navy, fontSize: 11, fontWeight: '800' },
  emptyHistory: { alignItems: 'center', paddingVertical: 22 },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.emeraldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyIconText: { color: COLORS.emerald, fontSize: 20, fontWeight: '900' },
  emptyHistoryTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  emptyHistoryBody: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  historyList: { gap: 10, marginTop: 6 },
  historyCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  historyMetaTag: { color: COLORS.orange, fontSize: 10, fontWeight: '800', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  historyTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '800', marginTop: 8 },
  historyRef: { color: COLORS.muted, fontSize: 11, fontWeight: '600', marginTop: 4 },
  historyNotes: { color: '#334155', fontSize: 12, lineHeight: 18, marginTop: 6 },
  historyLocation: { color: COLORS.muted, fontSize: 11, marginTop: 5 },
  safetyNote: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginTop: 4,
  },
  footer: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerBrand: { color: COLORS.navy, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  footerLink: { color: COLORS.orange, fontSize: 12, fontWeight: '800' },
});