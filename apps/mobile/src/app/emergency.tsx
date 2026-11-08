import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
};

type CapturedLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

const NAVY = '#071D49';
const ORANGE = '#F28C28';
const PAGE = '#F4F6F9';
const INK = '#172536';
const MUTED = '#687789';
const BORDER = '#E2E7EE';
const RED = '#DC2626';

const categories: {
  value: EmergencyCategory;
  label: string;
  icon: string;
}[] = [
  { value: 'medical', label: 'Medical', icon: '✚' },
  { value: 'accident', label: 'Accident', icon: '🚗' },
  { value: 'security', label: 'Security', icon: '🛡' },
  { value: 'natural_disaster', label: 'Natural disaster', icon: '⚠' },
  { value: 'transport', label: 'Transport', icon: '🚌' },
  { value: 'other', label: 'Other', icon: '•••' },
];

const severities: {
  value: EmergencySeverity;
  label: string;
  color: string;
}[] = [
  { value: 'low', label: 'Low', color: '#0D9488' },
  { value: 'moderate', label: 'Moderate', color: '#D97706' },
  { value: 'high', label: 'High', color: '#EA580C' },
  { value: 'critical', label: 'Critical', color: '#DC2626' },
];

const statusColors: Record<EmergencyStatus, string> = {
  reported: '#D97706',
  acknowledged: '#2563EB',
  assigned: '#7C3AED',
  responding: '#EA580C',
  resolved: '#059669',
  cancelled: '#64748B',
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

function formatStatus(status: EmergencyStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
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
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [locationMessage, setLocationMessage] = useState(
    'Location has not been added. You can still submit your report.',
  );
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<EmergencyAlert | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
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

      const [journeyResult, alertResult] = await Promise.all([
        supabase
          .from('journeys')
          .select('id, journey_name, status')
          .eq('traveller_id', session.user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false }),

        supabase
          .from('emergency_alerts')
          .select('*')
          .eq('traveller_id', session.user.id)
          .order('reported_at', { ascending: false })
          .limit(20),
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
        setSelectedJourneyId(null);
      }
    } catch (err) {
      console.error('Emergency data loading failed:', err);
      setError('We could not load your emergency information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router, selectedJourneyId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const captureLocation = async () => {
    if (capturingLocation) return;

    setCapturingLocation(true);
    setLocationMessage('Checking location permission...');

    try {
      let permission = await Location.getForegroundPermissionsAsync();

      if (!permission.granted) {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (!permission.granted) {
        setLocation(null);
        setLocationMessage(
          'Location permission was not granted. You can still submit your emergency report.',
        );
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();

      if (!servicesEnabled) {
        setLocationMessage(
          'Device location services are turned off. You can still submit without GPS.',
        );
        return;
      }

      setLocationMessage('Getting your current location...');

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const captured: CapturedLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? null,
      };

      setLocation(captured);
      setLocationMessage('Current location added to your emergency report.');
    } catch (err) {
      console.warn('Emergency location capture failed:', err);
      setLocation(null);
      setLocationMessage(
        'We could not get your location. You can still submit your emergency report.',
      );
    } finally {
      setCapturingLocation(false);
    }
  };

  const submitEmergency = async () => {
    if (saving) return;

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (!cleanTitle) {
      Alert.alert('Emergency title required', 'Please briefly describe the emergency.');
      return;
    }

    if (cleanTitle.length > 160) {
      Alert.alert('Title too long', 'Please keep the title within 160 characters.');
      return;
    }

    setSaving(true);
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

      const payload = {
        traveller_id: session.user.id,
        journey_id: selectedJourneyId,
        category,
        severity,
        title: cleanTitle,
        description: cleanDescription || null,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        location_accuracy_meters: location?.accuracy ?? null,
      };

      const { data, error: insertError } = await supabase
        .from('emergency_alerts')
        .insert(payload)
        .select('*')
        .single();

      if (insertError) throw insertError;

      const newAlert = data as EmergencyAlert;

      setSubmitted(newAlert);
      setTitle('');
      setDescription('');
      setCategory('other');
      setSeverity('high');
      setSelectedJourneyId(null);
      setLocation(null);
      setLocationMessage('Location has not been added.');

      await loadData();
    } catch (err) {
      console.error('Emergency submission failed:', err);
      setError(
        'Your emergency report could not be submitted. Please check your connection and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={styles.loadingText}>Loading emergency services...</Text>
      </SafeAreaView>
    );
  }

  if (submitted) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.successContent}>
          <View style={styles.successIcon}>
            <Text style={styles.successIconText}>✓</Text>
          </View>

          <Text style={styles.successEyebrow}>TSC EMERGENCY OPERATIONS</Text>
          <Text style={styles.successTitle}>Report submitted</Text>
          <Text style={styles.successDescription}>
            Your emergency report has been recorded. TSC emergency operations can now
            review the report according to the response process.
          </Text>

          <View style={styles.referenceCard}>
            <Text style={styles.referenceLabel}>YOUR EMERGENCY REFERENCE</Text>
            <Text style={styles.referenceValue}>{reference(submitted.id)}</Text>
            <View style={styles.referenceDivider} />
            <View style={styles.referenceRow}>
              <Text style={styles.referenceMeta}>Status</Text>
              <Text style={[styles.referenceStatus, { color: statusColors[submitted.status] }]}>
                {formatStatus(submitted.status)}
              </Text>
            </View>
            <View style={styles.referenceRow}>
              <Text style={styles.referenceMeta}>Reported</Text>
              <Text style={styles.referenceValueSmall}>
                {formatDate(submitted.reported_at)}
              </Text>
            </View>
          </View>

          <View style={styles.importantNotice}>
            <Text style={styles.noticeTitle}>Important safety notice</Text>
            <Text style={styles.noticeText}>
              If you are in immediate danger or need urgent medical or police assistance,
              contact the relevant local emergency services directly. Submitting a TSC
              report does not replace contacting emergency services.
            </Text>
          </View>

          <Pressable style={styles.primaryButton} onPress={() => setSubmitted(null)}>
            <Text style={styles.primaryButtonText}>Return to emergency services</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={() => router.replace('/dashboard')}>
            <Text style={styles.secondaryButtonText}>Back to dashboard</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.headerEyebrow}>TRAVELLER SAFETY</Text>
            <Text style={styles.headerTitle}>Emergency services</Text>
          </View>
          <View style={styles.headerMark}>
            <Text style={styles.headerMarkText}>TSC</Text>
          </View>
        </View>

        <View style={styles.emergencyBanner}>
          <View style={styles.bannerIcon}>
            <Text style={styles.bannerIconText}>SOS</Text>
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Need emergency assistance?</Text>
            <Text style={styles.bannerDescription}>
              Submit an emergency report to TSC operations. Provide your location and
              details when it is safe to do so.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Report an emergency</Text>
          <Text style={styles.requiredHint}>* Required</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Emergency category *</Text>
          <View style={styles.categoryGrid}>
            {categories.map((item) => {
              const selected = category === item.value;

              return (
                <Pressable
                  key={item.value}
                  onPress={() => setCategory(item.value)}
                  style={[
                    styles.categoryOption,
                    selected && styles.categoryOptionSelected,
                  ]}
                >
                  <Text style={styles.categoryIcon}>{item.icon}</Text>
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

          <Text style={styles.label}>Severity *</Text>
          <View style={styles.severityRow}>
            {severities.map((item) => {
              const selected = severity === item.value;

              return (
                <Pressable
                  key={item.value}
                  onPress={() => setSeverity(item.value)}
                  style={[
                    styles.severityOption,
                    selected && {
                      borderColor: item.color,
                      backgroundColor: `${item.color}12`,
                    },
                  ]}
                >
                  <View style={[styles.severityDot, { backgroundColor: item.color }]} />
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

          <Text style={styles.label}>Emergency title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Briefly describe what happened"
            placeholderTextColor="#94A3B8"
            style={styles.input}
            maxLength={160}
            returnKeyType="next"
          />
          <Text style={styles.characterCount}>{title.length}/160</Text>

          <Text style={styles.label}>Additional details</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the situation, people involved or assistance needed..."
            placeholderTextColor="#94A3B8"
            style={[styles.input, styles.textArea]}
            multiline
            textAlignVertical="top"
            maxLength={2000}
          />

          <Text style={styles.label}>Link an active journey</Text>
          {journeys.length === 0 ? (
            <View style={styles.emptyJourney}>
              <Text style={styles.emptyJourneyText}>
                No active journey found. You can still submit your emergency report.
              </Text>
            </View>
          ) : (
            <View style={styles.journeyOptions}>
              <Pressable
                onPress={() => setSelectedJourneyId(null)}
                style={[
                  styles.journeyOption,
                  selectedJourneyId === null && styles.journeyOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.journeyOptionText,
                    selectedJourneyId === null && styles.journeyOptionTextSelected,
                  ]}
                >
                  No journey linked
                </Text>
              </Pressable>

              {journeys.map((journey) => (
                <Pressable
                  key={journey.id}
                  onPress={() => setSelectedJourneyId(journey.id)}
                  style={[
                    styles.journeyOption,
                    selectedJourneyId === journey.id && styles.journeyOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.journeyOptionText,
                      selectedJourneyId === journey.id &&
                        styles.journeyOptionTextSelected,
                    ]}
                  >
                    {journey.journey_name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={styles.label}>Your current location</Text>
          <View style={styles.locationCard}>
            <View style={styles.locationTextBlock}>
              <Text style={styles.locationTitle}>
                {location ? 'Location captured' : 'Location is optional'}
              </Text>
              <Text style={styles.locationDescription}>{locationMessage}</Text>
              {location && (
                <Text style={styles.coordinates}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  {location.accuracy !== null
                    ? ` · ±${Math.round(location.accuracy)} m`
                    : ''}
                </Text>
              )}
            </View>
            <Pressable
              onPress={captureLocation}
              disabled={capturingLocation}
              style={styles.locationButton}
            >
              {capturingLocation ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.locationButtonText}>
                  {location ? 'Refresh' : 'Add GPS'}
                </Text>
              )}
            </Pressable>
          </View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            onPress={submitEmergency}
            disabled={saving}
            style={[styles.submitButton, saving && styles.disabledButton]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitButtonIcon}>!</Text>
                <Text style={styles.submitButtonText}>SUBMIT EMERGENCY REPORT</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.submitFootnote}>
            Your report will be recorded securely and made available to authorised TSC
            emergency operations personnel.
          </Text>
        </View>

        <View style={styles.importantNotice}>
          <Text style={styles.noticeTitle}>In immediate danger?</Text>
          <Text style={styles.noticeText}>
            Contact the relevant local emergency services directly. Do not wait for a
            response through this app. TSC emergency reporting is an additional safety
            channel, not a replacement for emergency services.
          </Text>
        </View>

        <View style={styles.historyHeader}>
          <View>
            <Text style={styles.sectionTitle}>Your emergency reports</Text>
            <Text style={styles.historySubtitle}>Recent reports and response status</Text>
          </View>
          <Pressable onPress={loadData} style={styles.refreshButton}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        {alerts.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Text style={styles.emptyHistoryTitle}>No emergency reports</Text>
            <Text style={styles.emptyHistoryText}>
              Reports you submit will appear here with their latest status.
            </Text>
          </View>
        ) : (
          alerts.map((alert) => (
            <View key={alert.id} style={styles.historyCard}>
              <View style={styles.historyTop}>
                <Text style={styles.historyCategory}>
                  {categories.find((item) => item.value === alert.category)?.label ??
                    'Emergency'}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: `${statusColors[alert.status]}15` },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: statusColors[alert.status] },
                    ]}
                  >
                    {formatStatus(alert.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.historyTitle}>{alert.title}</Text>
              <Text style={styles.historyReference}>{reference(alert.id)}</Text>
              <Text style={styles.historyDate}>{formatDate(alert.reported_at)}</Text>
            </View>
          ))
        )}

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>TSC</Text>
          <Text style={styles.footerText}>TRAVELLERS SAFETY COVERED</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAGE },
  loadingScreen: {
    flex: 1,
    backgroundColor: PAGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: MUTED, fontSize: 13, marginTop: 12 },
  content: { paddingHorizontal: 18, paddingBottom: 42 },
  header: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 18,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: { color: NAVY, fontSize: 30, lineHeight: 32, marginTop: -3 },
  headerText: { flex: 1, marginLeft: 12 },
  headerEyebrow: {
    color: ORANGE,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  headerTitle: { color: NAVY, fontSize: 18, fontWeight: '800', marginTop: 2 },
  headerMark: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMarkText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F0',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 17,
    padding: 15,
    marginBottom: 22,
  },
  bannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bannerIconText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  bannerText: { flex: 1 },
  bannerTitle: { color: '#991B1B', fontSize: 14, fontWeight: '800' },
  bannerDescription: { color: '#7F1D1D', fontSize: 11, lineHeight: 16, marginTop: 4 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: { color: NAVY, fontSize: 16, fontWeight: '800' },
  requiredHint: { color: MUTED, fontSize: 10 },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 15,
  },
  label: { color: INK, fontSize: 12, fontWeight: '800', marginTop: 17, marginBottom: 9 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryOption: {
    width: '31.5%',
    minHeight: 78,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 7,
  },
  categoryOptionSelected: {
    borderColor: ORANGE,
    backgroundColor: '#FFF7ED',
  },
  categoryIcon: { fontSize: 20, marginBottom: 5 },
  categoryLabel: { color: MUTED, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  categoryLabelSelected: { color: '#C2410C', fontWeight: '800' },
  severityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  severityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  severityDot: { width: 7, height: 7, borderRadius: 4 },
  severityLabel: { color: MUTED, fontSize: 10, fontWeight: '600' },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: INK,
    fontSize: 12,
    backgroundColor: '#FFFFFF',
  },
  textArea: { minHeight: 105 },
  characterCount: { color: MUTED, fontSize: 9, textAlign: 'right', marginTop: 5 },
  emptyJourney: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 12,
  },
  emptyJourneyText: { color: MUTED, fontSize: 11, lineHeight: 16 },
  journeyOptions: { gap: 7 },
  journeyOption: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
  },
  journeyOptionSelected: { borderColor: ORANGE, backgroundColor: '#FFF7ED' },
  journeyOptionText: { color: MUTED, fontSize: 11, fontWeight: '600' },
  journeyOptionTextSelected: { color: '#C2410C', fontWeight: '800' },
  locationCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationTextBlock: { flex: 1 },
  locationTitle: { color: INK, fontSize: 11, fontWeight: '800' },
  locationDescription: { color: MUTED, fontSize: 10, lineHeight: 15, marginTop: 3 },
  coordinates: { color: '#0D9488', fontSize: 9, marginTop: 5 },
  locationButton: {
    minWidth: 76,
    minHeight: 36,
    borderRadius: 9,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  locationButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  errorText: { color: RED, fontSize: 11, lineHeight: 16, marginTop: 12 },
  submitButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: RED,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    gap: 9,
  },
  disabledButton: { opacity: 0.65 },
  submitButtonIcon: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' },
  submitButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.4 },
  submitFootnote: {
    color: MUTED,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 10,
  },
  importantNotice: {
    marginTop: 17,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
    padding: 14,
  },
  noticeTitle: { color: '#92400E', fontSize: 12, fontWeight: '800', marginBottom: 5 },
  noticeText: { color: '#78350F', fontSize: 10, lineHeight: 16 },
  historyHeader: {
    marginTop: 26,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historySubtitle: { color: MUTED, fontSize: 10, marginTop: 3 },
  refreshButton: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
  },
  refreshText: { color: NAVY, fontSize: 10, fontWeight: '800' },
  emptyHistory: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 13,
    padding: 18,
    alignItems: 'center',
  },
  emptyHistoryTitle: { color: INK, fontSize: 12, fontWeight: '800' },
  emptyHistoryText: {
    color: MUTED,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 5,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 13,
    padding: 14,
    marginBottom: 9,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyCategory: { color: NAVY, fontSize: 11, fontWeight: '800' },
  statusPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 9, fontWeight: '800' },
  historyTitle: { color: INK, fontSize: 13, fontWeight: '700', marginTop: 9 },
  historyReference: { color: ORANGE, fontSize: 9, fontWeight: '800', marginTop: 5 },
  historyDate: { color: MUTED, fontSize: 9, marginTop: 5 },
  footer: { alignItems: 'center', paddingTop: 30 },
  footerBrand: { color: ORANGE, fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  footerText: { color: MUTED, fontSize: 8, fontWeight: '700', letterSpacing: 1.2, marginTop: 4 },
  successContent: { flexGrow: 1, padding: 22, justifyContent: 'center' },
  successIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 18,
  },
  successIconText: { color: '#15803D', fontSize: 34, fontWeight: '900' },
  successEyebrow: {
    color: ORANGE,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
    textAlign: 'center',
  },
  successTitle: {
    color: NAVY,
    fontSize: 23,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 7,
  },
  successDescription: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 10,
  },
  referenceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 17,
    marginTop: 24,
  },
  referenceLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  referenceValue: {
    color: NAVY,
    fontSize: 23,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 1,
  },
  referenceDivider: { height: 1, backgroundColor: BORDER, marginVertical: 15 },
  referenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  referenceMeta: { color: MUTED, fontSize: 11 },
  referenceStatus: { fontSize: 11, fontWeight: '800' },
  referenceValueSmall: { color: INK, fontSize: 10, fontWeight: '600' },
  primaryButton: {
    backgroundColor: NAVY,
    borderRadius: 12,
    minHeight: 49,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  secondaryButton: {
    minHeight: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  secondaryButtonText: { color: NAVY, fontSize: 11, fontWeight: '700' },
});
