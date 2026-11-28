import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { supabase } from '../../lib/supabase';
import JourneyGpsControls from '../components/JourneyGpsControls';

type JourneyStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';
type Filter = 'all' | 'upcoming' | 'active' | 'completed';

type Journey = {
  id: string;
  traveller_id: string;
  journey_name: string;
  origin_name: string;
  origin_address: string | null;
  destination_name: string;
  destination_address: string | null;
  departure_at: string;
  departure_timezone: string;
  expected_arrival_at: string | null;
  arrival_timezone: string | null;
  transport_mode: string;
  status: JourneyStatus;
  notes: string | null;
  location_sharing_enabled: boolean;
  started_at: string | null;
  completed_at: string | null;
};

const COLORS = {
  navy: '#071D49',
  navyLight: '#102E6B',
  orange: '#F28C28',
  orangeSoft: '#FFF4E8',
  page: '#F4F6F9',
  card: '#FFFFFF',
  ink: '#172536',
  muted: '#64748B',
  border: '#E2E8F0',
  emerald: '#059669',
  emeraldSoft: '#ECFDF5',
};

const emptyForm = {
  journey_name: '',
  origin_name: '',
  origin_address: '',
  destination_name: '',
  destination_address: '',
  departure_at: '',
  expected_arrival_at: '',
  transport_mode: 'road',
  notes: '',
};

const MODES = [
  { value: 'road', label: 'Road', emoji: '🚘' },
  { value: 'air', label: 'Air', emoji: '✈️' },
  { value: 'rail', label: 'Rail', emoji: '🚆' },
  { value: 'sea', label: 'Sea', emoji: '🚢' },
  { value: 'other', label: 'Other', emoji: '🧭' },
] as const;

const STATUS_META: Record<
  JourneyStatus,
  { label: string; emoji: string; color: string; bg: string }
> = {
  draft: { label: 'Draft', emoji: '📝', color: '#475569', bg: '#F1F5F9' },
  scheduled: { label: 'Scheduled', emoji: '📅', color: '#1D4ED8', bg: '#EFF6FF' },
  active: { label: 'Active Now', emoji: '🟢', color: '#047857', bg: '#ECFDF5' },
  completed: { label: 'Completed', emoji: '🏁', color: '#334155', bg: '#F1F5F9' },
  cancelled: { label: 'Cancelled', emoji: '🚫', color: '#B91C1C', bg: '#FEF2F2' },
};

function formatDate(value: string | null) {
  if (!value) return 'Not specified';
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

function localDateTimeValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getModeEmoji(mode: string) {
  return MODES.find((m) => m.value === mode)?.emoji ?? '🚘';
}

export default function JourneysScreen() {
  const router = useRouter();

  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const [modal, setModal] = useState<'form' | 'details' | null>(null);
  const [selected, setSelected] = useState<Journey | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadJourneys = useCallback(
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
          router.replace('/login');
          return;
        }

        const { data, error: queryError } = await supabase
          .from('journeys')
          .select('*')
          .eq('traveller_id', session.user.id)
          .order('departure_at', { ascending: true });

        if (queryError) throw queryError;

        setJourneys((data ?? []) as Journey[]);
      } catch (err) {
        console.error('Journey loading failed:', err);
        setError('We could not load your journeys. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useFocusEffect(
    useCallback(() => {
      void loadJourneys();
    }, [loadJourneys])
  );

  const counts = useMemo(
    () => ({
      all: journeys.length,
      upcoming: journeys.filter((j) => j.status === 'draft' || j.status === 'scheduled').length,
      scheduled: journeys.filter((j) => j.status === 'scheduled').length,
      active: journeys.filter((j) => j.status === 'active').length,
      completed: journeys.filter((j) => j.status === 'completed').length,
    }),
    [journeys]
  );

  const filteredJourneys = useMemo(() => {
    const q = search.trim().toLowerCase();
    return journeys.filter((journey) => {
      const matchesTab =
        filter === 'all'
          ? true
          : filter === 'upcoming'
          ? journey.status === 'draft' || journey.status === 'scheduled'
          : journey.status === filter;

      if (!matchesTab) return false;
      if (!q) return true;

      return (
        journey.journey_name.toLowerCase().includes(q) ||
        journey.origin_name.toLowerCase().includes(q) ||
        journey.destination_name.toLowerCase().includes(q)
      );
    });
  }, [journeys, filter, search]);

  const openCreate = () => {
    setSelected(null);
    setEditing(false);
    setForm({
      ...emptyForm,
      departure_at: localDateTimeValue(new Date(Date.now() + 86400000)),
    });
    setModal('form');
  };

  const openEdit = (journey: Journey) => {
    setSelected(journey);
    setEditing(true);
    setForm({
      journey_name: journey.journey_name,
      origin_name: journey.origin_name,
      origin_address: journey.origin_address ?? '',
      destination_name: journey.destination_name,
      destination_address: journey.destination_address ?? '',
      departure_at: localDateTimeValue(new Date(journey.departure_at)),
      expected_arrival_at: journey.expected_arrival_at
        ? localDateTimeValue(new Date(journey.expected_arrival_at))
        : '',
      transport_mode: journey.transport_mode,
      notes: journey.notes ?? '',
    });
    setModal('form');
  };

  const saveJourney = async () => {
    if (
      !form.journey_name.trim() ||
      !form.origin_name.trim() ||
      !form.destination_name.trim() ||
      !form.departure_at.trim()
    ) {
      Alert.alert(
        'Missing information',
        'Please complete the journey name, origin, destination and departure date/time.'
      );
      return;
    }

    const departure = new Date(form.departure_at);
    const arrival = form.expected_arrival_at.trim()
      ? new Date(form.expected_arrival_at)
      : null;

    if (Number.isNaN(departure.getTime())) {
      Alert.alert('Invalid departure', 'Enter a valid departure date and time.');
      return;
    }

    if (departure.getTime() <= Date.now()) {
      Alert.alert('Invalid departure', 'Departure must be in the future.');
      return;
    }

    if (arrival && (Number.isNaN(arrival.getTime()) || arrival <= departure)) {
      Alert.alert('Invalid arrival', 'Expected arrival must be later than departure.');
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login');
        return;
      }

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      const payload = {
        journey_name: form.journey_name.trim(),
        origin_name: form.origin_name.trim(),
        origin_address: form.origin_address.trim() || null,
        destination_name: form.destination_name.trim(),
        destination_address: form.destination_address.trim() || null,
        departure_at: departure.toISOString(),
        departure_timezone: timezone,
        expected_arrival_at: arrival ? arrival.toISOString() : null,
        arrival_timezone: arrival ? timezone : null,
        transport_mode: form.transport_mode,
        notes: form.notes.trim() || null,
      };

      const result =
        editing && selected
          ? await supabase
              .from('journeys')
              .update(payload)
              .eq('id', selected.id)
              .eq('traveller_id', session.user.id)
          : await supabase.from('journeys').insert({
              ...payload,
              traveller_id: session.user.id,
              status: 'draft',
              location_sharing_enabled: false,
            });

      if (result.error) throw result.error;

      setModal(null);
      setSelected(null);
      await loadJourneys(true);

      Alert.alert(
        editing ? '✅ Journey updated' : '✨ Journey saved',
        editing
          ? 'Your journey details have been updated.'
          : 'Your journey has been saved as a draft. You can schedule it from its details.'
      );
    } catch (err: any) {
      console.error('Journey save failed:', err);
      Alert.alert(
        'Unable to save journey',
        err?.message || 'Please check your connection and try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (journey: Journey, status: JourneyStatus) => {
    const messages: Record<string, string> = {
      scheduled: 'Schedule this journey?',
      active: 'Start this journey now?',
      completed: 'Mark this journey as completed?',
      cancelled: 'Cancel this journey?',
    };

    const API_BASE = 'https://www.tscglobalmobility.com';

    Alert.alert('Confirm action', messages[status] || 'Update this journey?', [
      { text: 'Go back', style: 'cancel' },
      {
        text: 'Confirm',
        style: status === 'cancelled' ? 'destructive' : 'default',
        onPress: async () => {
          setSaving(true);
          try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
              router.replace('/login');
              return;
            }

            if (status === 'scheduled') {
              const origin = journey.origin_address?.trim() || journey.origin_name.trim();
              const destination =
                journey.destination_address?.trim() || journey.destination_name.trim();

              const quoteResponse = await fetch(`${API_BASE}/api/journeys/route-quote`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ origin, destination }),
              });

              const quote = await quoteResponse.json();

              if (!quoteResponse.ok || !quote.verified || !quote.quoteId) {
                throw new Error(quote.error || 'Unable to verify this journey route.');
              }

              const fee =
                quote.fee_ngn ??
                quote.feeNgn ??
                quote.amount_ngn ??
                quote.amount ??
                0;

              const distance =
                quote.distance_km ??
                quote.distanceKm ??
                quote.distance ??
                null;

              const routeDescription = quote.routeDescription || `${origin} → ${destination}`;

              const confirmed = await new Promise<boolean>((resolve) => {
                Alert.alert(
                  'Confirm journey schedule',
                  [
                    routeDescription,
                    '',
                    distance !== null ? `Distance: ${distance} km` : null,
                    `Scheduling fee: ₦${Number(fee).toLocaleString()}`,
                    '',
                    'Proceed with scheduling this journey?',
                  ]
                    .filter(Boolean)
                    .join('\n'),
                  [
                    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                    { text: 'Schedule', onPress: () => resolve(true) },
                  ],
                  { cancelable: true, onDismiss: () => resolve(false) }
                );
              });

              if (!confirmed) return;

              const scheduleResponse = await fetch(`${API_BASE}/api/journeys/schedule`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  journeyId: journey.id,
                  quoteId: quote.quoteId,
                }),
              });

              const scheduleResult = await scheduleResponse.json();

              if (!scheduleResponse.ok || !scheduleResult.success) {
                throw new Error(
                  scheduleResult.error || 'Unable to schedule this journey.'
                );
              }

              setModal(null);
              setSelected(null);
              await loadJourneys(true);

              Alert.alert(
                'Journey scheduled!',
                `Your journey has been scheduled.\n\n${origin} → ${destination}\nFee: ₦${Number(fee).toLocaleString()}`
              );
              return;
            }

            const { error: updateError } = await supabase
              .from('journeys')
              .update({ status })
              .eq('id', journey.id)
              .eq('traveller_id', session.user.id);

            if (updateError) throw updateError;

            setModal(null);
            setSelected(null);
            await loadJourneys(true);

            Alert.alert(
              'Journey updated',
              `Journey is now ${STATUS_META[status].label.toLowerCase()}.`
            );
          } catch (err: any) {
            console.error('Journey status update failed:', err);
            Alert.alert(
              'Action unsuccessful',
              err?.message || 'This status change could not be completed.'
            );
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };
  const openDetails = (journey: Journey) => {
    setSelected(journey);
    setModal('details');
  };

  const updateField = (field: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const renderInput = (
    label: string,
    field: keyof typeof emptyForm,
    placeholder: string,
    multiline = false
  ) => (
    <View style={styles.field} key={field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={form[field]}
        onChangeText={(value) => updateField(field, value)}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.multilineInput]}
        autoCapitalize={field === 'notes' ? 'sentences' : 'words'}
      />
    </View>
  );

  const renderJourney = (journey: Journey) => {
    const meta = STATUS_META[journey.status];
    return (
      <Pressable
        key={journey.id}
        onPress={() => openDetails(journey)}
        style={({ pressed }) => [styles.journeyCard, pressed && styles.pressed]}
      >
        <View style={styles.cardTop}>
          <View style={styles.transportEmojiBox}>
            <Text style={styles.transportEmoji}>{getModeEmoji(journey.transport_mode)}</Text>
          </View>
          <View style={styles.cardTitleArea}>
            <Text style={styles.journeyName} numberOfLines={1}>
              {journey.journey_name}
            </Text>
            <Text style={styles.cardDate}>🕒 {formatDate(journey.departure_at)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusText, { color: meta.color }]}>
              {meta.emoji} {meta.label}
            </Text>
          </View>
        </View>

        <View style={styles.routeBox}>
          <View style={styles.routeRail}>
            <View style={styles.originDot} />
            <View style={styles.routeLine} />
            <View style={styles.destinationDot} />
          </View>
          <View style={styles.routeNames}>
            <View>
              <Text style={styles.routeMicroLabel}>FROM</Text>
              <Text style={styles.routeName} numberOfLines={1}>
                {journey.origin_name}
              </Text>
            </View>
            <View style={{ marginTop: 10 }}>
              <Text style={styles.routeMicroLabel}>TO</Text>
              <Text style={styles.routeName} numberOfLines={1}>
                {journey.destination_name}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardBottom}>
          <View style={styles.cardMetaRow}>
            <Text style={styles.cardMode}>{journey.transport_mode.toUpperCase()} TRIP</Text>
            {journey.location_sharing_enabled && (
              <View style={styles.gpsPill}>
                <Text style={styles.gpsPillText}>📡 GPS Live</Text>
              </View>
            )}
          </View>
          <Text style={styles.viewDetails}>Manage trip ›</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadJourneys(true)}
            tintColor={COLORS.orange}
          />
        }
      >
        {/* Top Bar */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={COLORS.ink} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>🧭 TRAVELLER SERVICES</Text>
            <Text style={styles.heading}>My Journeys</Text>
          </View>
          <Pressable onPress={openCreate} style={styles.addButton}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>New</Text>
          </Pressable>
        </View>

        {/* Hero Banner */}
        <View style={styles.heroCard}>
          <View style={styles.heroEmojiBox}>
            <Text style={{ fontSize: 24 }}>🗺️</Text>
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Travel with a clear plan ✨</Text>
            <Text style={styles.heroDescription}>
              Organise routes, track schedules, and manage live GPS sharing in one secure hub.
            </Text>
          </View>
        </View>

        {/* KPI Summary Row */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEmoji}>📅</Text>
            <Text style={styles.summaryNumber}>{counts.scheduled}</Text>
            <Text style={styles.summaryLabel}>Scheduled</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardHighlight]}>
            <Text style={styles.summaryEmoji}>🟢</Text>
            <Text style={[styles.summaryNumber, { color: COLORS.emerald }]}>
              {counts.active}
            </Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEmoji}>🏁</Text>
            <Text style={styles.summaryNumber}>{counts.completed}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
        </View>

        {/* Search & Activity Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📋 Your travel activity</Text>
          <Pressable onPress={() => loadJourneys(true)} disabled={refreshing}>
            {refreshing ? (
              <ActivityIndicator size="small" color={COLORS.orange} />
            ) : (
              <Text style={styles.refreshLabel}>↻ Sync</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={17} color={COLORS.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by trip name, origin, or destination..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />
          {!!search && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color={COLORS.muted} />
            </Pressable>
          )}
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          {(
            [
              ['all', '🌍 All', counts.all],
              ['upcoming', '⏳ Upcoming', counts.upcoming],
              ['active', '🟢 Active', counts.active],
              ['completed', '🏁 Completed', counts.completed],
            ] as [Filter, string, number][]
          ).map(([value, label, count]) => {
            const isActive = filter === value;
            return (
              <Pressable
                key={value}
                onPress={() => setFilter(value)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {label}
                </Text>
                <View style={[styles.countPill, isActive && styles.countPillActive]}>
                  <Text style={[styles.countPillText, isActive && styles.countPillTextActive]}>
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Journey Feed */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.orange} />
            <Text style={styles.loadingText}>Loading your journeys...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 32 }}>⚠️</Text>
            <Text style={styles.emptyTitle}>Unable to load journeys</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <Pressable style={styles.primaryButton} onPress={() => loadJourneys()}>
              <Text style={styles.primaryButtonText}>↻ Try again</Text>
            </Pressable>
          </View>
        ) : filteredJourneys.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyEmojiBox}>
              <Text style={{ fontSize: 28 }}>✈️</Text>
            </View>
            <Text style={styles.emptyTitle}>
              {search ? 'No matching trips found' : 'No journeys here yet'}
            </Text>
            <Text style={styles.emptyText}>
              {search
                ? 'Try adjusting your search keywords or clearing your filter.'
                : filter === 'all'
                ? 'Create your first journey to begin organising your travel.'
                : 'Journeys matching this category will appear here.'}
            </Text>
            {filter === 'all' && !search && (
              <Pressable style={styles.primaryButton} onPress={openCreate}>
                <Text style={styles.primaryButtonText}>➕ Plan a journey</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.journeyList}>{filteredJourneys.map(renderJourney)}</View>
        )}

        {/* Privacy Footer */}
        <View style={styles.privacyNote}>
          <Text style={{ fontSize: 18 }}>🛡️</Text>
          <Text style={styles.privacyText}>
            Your journey data is protected by your account permissions. Live location sharing stays off until you explicitly enable it inside a journey.
          </Text>
        </View>
      </ScrollView>

      {/* Create / Edit Modal */}
      <Modal
        visible={modal === 'form'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModal(null)}
      >
        <SafeAreaView style={styles.modalScreen} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setModal(null)} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={COLORS.ink} />
            </Pressable>
            <Text style={styles.modalTitle}>
              {editing ? '✏️ Edit Journey' : '🧭 Plan a Journey'}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            <View style={styles.formCard}>
              <Text style={styles.formSectionTitle}>📍 Route & Trip Info</Text>
              {renderInput('Journey name *', 'journey_name', 'e.g. Business trip to Abuja')}
              {renderInput('Departure location *', 'origin_name', 'City or terminal of departure')}
              {renderInput('Departure address', 'origin_address', 'Street address (optional)')}
              {renderInput('Destination *', 'destination_name', 'City or destination')}
              {renderInput('Destination address', 'destination_address', 'Street address (optional)')}
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formSectionTitle}>🕒 Travel Schedule & Mode</Text>
              {renderInput('Departure date and time *', 'departure_at', 'YYYY-MM-DDTHH:mm')}
              {renderInput('Expected arrival', 'expected_arrival_at', 'YYYY-MM-DDTHH:mm (optional)')}

              <Text style={styles.fieldLabel}>Transport mode</Text>
              <View style={styles.modeOptions}>
                {MODES.map(({ value, emoji, label }) => {
                  const active = form.transport_mode === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => updateField('transport_mode', value)}
                      style={[styles.modeOption, active && styles.modeOptionActive]}
                    >
                      <Text style={{ fontSize: 16 }}>{emoji}</Text>
                      <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {renderInput(
                '📝 Additional notes',
                'notes',
                'Flight number, hotel check-in, or emergency notes...',
                true
              )}
            </View>

            <View style={styles.draftNotice}>
              <Text style={{ fontSize: 16 }}>💡</Text>
              <Text style={styles.draftNoticeText}>
                New journeys are saved as drafts first so you can review everything before scheduling.
              </Text>
            </View>

            <Pressable
              onPress={saveJourney}
              disabled={saving}
              style={[styles.primaryButton, styles.saveButton, saving && { opacity: 0.65 }]}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {editing ? '✅ Save Changes' : '✨ Save Journey'}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Details Modal */}
      <Modal
        visible={modal === 'details' && !!selected}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModal(null)}
      >
        <SafeAreaView style={styles.modalScreen} edges={['top', 'bottom']}>
          {selected && (
            <>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setModal(null)} style={styles.modalClose}>
                  <Ionicons name="close" size={22} color={COLORS.ink} />
                </Pressable>
                <Text style={styles.modalTitle}>🧭 Journey Details</Text>
                <View style={{ width: 40 }} />
              </View>

              <ScrollView contentContainerStyle={styles.detailContent}>
                <View style={styles.detailHero}>
                  <View style={styles.detailHeroIcon}>
                    <Text style={{ fontSize: 28 }}>{getModeEmoji(selected.transport_mode)}</Text>
                  </View>
                  <Text style={styles.detailName}>{selected.journey_name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: STATUS_META[selected.status].bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: STATUS_META[selected.status].color },
                      ]}
                    >
                      {STATUS_META[selected.status].emoji} {STATUS_META[selected.status].label}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailCard}>
                  <Text style={styles.detailSectionTitle}>📍 Route Overview</Text>
                  <View style={styles.detailRouteRow}>
                    <View style={styles.originDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>FROM</Text>
                      <Text style={styles.detailValue}>{selected.origin_name}</Text>
                      {!!selected.origin_address && (
                        <Text style={styles.detailSubValue}>{selected.origin_address}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailRouteRow}>
                    <View style={styles.destinationDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>TO</Text>
                      <Text style={styles.detailValue}>{selected.destination_name}</Text>
                      {!!selected.destination_address && (
                        <Text style={styles.detailSubValue}>{selected.destination_address}</Text>
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.detailCard}>
                  <Text style={styles.detailSectionTitle}>🕒 Schedule & Logistics</Text>
                  <DetailRow label="Departure" value={formatDate(selected.departure_at)} />
                  <DetailRow
                    label="Expected arrival"
                    value={formatDate(selected.expected_arrival_at)}
                  />
                  <DetailRow
                    label="Transport"
                    value={`${getModeEmoji(selected.transport_mode)} ${selected.transport_mode.toUpperCase()}`}
                  />
                  <DetailRow label="Timezone" value={selected.departure_timezone} />
                  {!!selected.started_at && (
                    <DetailRow label="Started" value={formatDate(selected.started_at)} />
                  )}
                  {!!selected.completed_at && (
                    <DetailRow label="Completed" value={formatDate(selected.completed_at)} />
                  )}
                </View>

                {!!selected.notes && (
                  <View style={styles.detailCard}>
                    <Text style={styles.detailSectionTitle}>📝 Traveller Notes</Text>
                    <Text style={styles.notesText}>{selected.notes}</Text>
                  </View>
                )}

                <View style={{ marginTop: 12 }}>
                  <JourneyGpsControls
                    journey={selected}
                    onUpdated={(enabled) => {
                      const updated = {
                        ...selected,
                        location_sharing_enabled: enabled,
                      };
                      setSelected(updated);
                      setJourneys((current) =>
                        current.map((item) => (item.id === updated.id ? updated : item))
                      );
                    }}
                  />
                </View>

                {selected.status === 'draft' && (
                  <>
                    <Pressable
                      style={styles.primaryButton}
                      onPress={() => changeStatus(selected, 'scheduled')}
                    >
                      <Text style={styles.primaryButtonText}>📅 Schedule Journey</Text>
                    </Pressable>
                    <Pressable
                      style={styles.secondaryAction}
                      onPress={() => openEdit(selected)}
                    >
                      <Text style={styles.secondaryActionText}>✏️ Edit Details</Text>
                    </Pressable>
                    <Pressable
                      style={styles.cancelAction}
                      onPress={() => changeStatus(selected, 'cancelled')}
                    >
                      <Text style={styles.cancelActionText}>🚫 Cancel Journey</Text>
                    </Pressable>
                  </>
                )}

                {selected.status === 'scheduled' && (
                  <>
                    <Pressable
                      style={[styles.primaryButton, { backgroundColor: COLORS.emerald }]}
                      onPress={() => changeStatus(selected, 'active')}
                    >
                      <Text style={styles.primaryButtonText}>🟢 Start Journey Now</Text>
                    </Pressable>
                    <Pressable
                      style={styles.secondaryAction}
                      onPress={() => openEdit(selected)}
                    >
                      <Text style={styles.secondaryActionText}>✏️ Edit Details</Text>
                    </Pressable>
                    <Pressable
                      style={styles.cancelAction}
                      onPress={() => changeStatus(selected, 'cancelled')}
                    >
                      <Text style={styles.cancelActionText}>🚫 Cancel Journey</Text>
                    </Pressable>
                  </>
                )}

                {selected.status === 'active' && (
                  <>
                    <Pressable
                      style={styles.primaryButton}
                      onPress={() => changeStatus(selected, 'completed')}
                    >
                      <Text style={styles.primaryButtonText}>🏁 Complete Journey</Text>
                    </Pressable>
                    <Pressable
                      style={styles.cancelAction}
                      onPress={() => changeStatus(selected, 'cancelled')}
                    >
                      <Text style={styles.cancelActionText}>🚫 Cancel Journey</Text>
                    </Pressable>
                  </>
                )}
              </ScrollView>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailRowLabel}>{label}</Text>
      <Text style={styles.detailRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.page },
  content: { paddingHorizontal: 18, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerText: { flex: 1 },
  eyebrow: { color: COLORS.orange, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  heading: { color: COLORS.ink, fontSize: 22, fontWeight: '800', marginTop: 2 },
  addButton: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  heroCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
  },
  heroEmojiBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  heroTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  heroDescription: { color: '#CBD5E1', fontSize: 12, lineHeight: 18, marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 13,
  },
  summaryCardHighlight: { borderColor: '#A7F3D0', backgroundColor: '#F8FAFC' },
  summaryEmoji: { fontSize: 15, marginBottom: 4 },
  summaryNumber: { color: COLORS.navy, fontSize: 22, fontWeight: '800' },
  summaryLabel: { color: COLORS.muted, fontSize: 11, marginTop: 2, fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  refreshLabel: { color: COLORS.orange, fontSize: 12, fontWeight: '800' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 13,
    height: 44,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: COLORS.ink, fontSize: 13 },
  filterScroll: { marginBottom: 16, flexGrow: 0 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  filterText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },
  countPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countPillActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  countPillText: { color: COLORS.muted, fontSize: 10, fontWeight: '800' },
  countPillTextActive: { color: '#FFFFFF' },
  journeyList: { gap: 12 },
  journeyCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  transportEmojiBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transportEmoji: { fontSize: 20 },
  cardTitleArea: { flex: 1 },
  journeyName: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  cardDate: { color: COLORS.muted, fontSize: 11, marginTop: 4, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: '800' },
  routeBox: {
    flexDirection: 'row',
    marginTop: 15,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  routeRail: { width: 16, alignItems: 'center', paddingVertical: 5 },
  originDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2.5,
    borderColor: COLORS.emerald,
    backgroundColor: '#FFFFFF',
  },
  routeLine: { width: 1.5, height: 28, backgroundColor: '#CBD5E1', marginVertical: 3 },
  destinationDot: { width: 10, height: 10, borderRadius: 3, backgroundColor: COLORS.orange },
  routeNames: { flex: 1, paddingLeft: 10 },
  routeMicroLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  routeName: { color: '#1E293B', fontSize: 12, fontWeight: '700', marginTop: 1 },
  cardBottom: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 13,
    paddingTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardMode: { color: COLORS.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  gpsPill: {
    backgroundColor: COLORS.emeraldSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  gpsPillText: { color: COLORS.emerald, fontSize: 10, fontWeight: '800' },
  viewDetails: { color: COLORS.orange, fontSize: 12, fontWeight: '800' },
  loadingBox: { paddingVertical: 50, alignItems: 'center' },
  loadingText: { color: COLORS.muted, fontSize: 12, marginTop: 12 },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    alignItems: 'center',
    padding: 28,
    marginTop: 4,
  },
  emptyEmojiBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: COLORS.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { color: COLORS.ink, fontSize: 15, fontWeight: '800', marginTop: 6 },
  emptyText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    marginTop: 16,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  privacyNote: {
    backgroundColor: COLORS.emeraldSoft,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 22,
  },
  privacyText: { color: '#065F46', flex: 1, fontSize: 11, lineHeight: 17, fontWeight: '500' },
  modalScreen: { flex: 1, backgroundColor: COLORS.page },
  modalHeader: {
    height: 60,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  formContent: { padding: 18, paddingBottom: 42 },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
  },
  formSectionTitle: { color: COLORS.navy, fontSize: 14, fontWeight: '800', marginBottom: 14 },
  field: { marginBottom: 14 },
  fieldLabel: { color: '#334155', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 13,
    color: COLORS.ink,
    fontSize: 13,
  },
  multilineInput: { minHeight: 92, paddingTop: 12 },
  modeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, marginTop: 2 },
  modeOption: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeOptionActive: { borderColor: COLORS.orange, backgroundColor: COLORS.orangeSoft },
  modeLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  modeLabelActive: { color: '#9A3412' },
  draftNotice: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  draftNoticeText: { color: '#92400E', flex: 1, fontSize: 11, lineHeight: 16 },
  saveButton: { marginTop: 16, marginBottom: 15 },
  detailContent: { padding: 18, paddingBottom: 42 },
  detailHero: { alignItems: 'center', paddingVertical: 14 },
  detailHeroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  detailName: {
    color: COLORS.ink,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  detailCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginTop: 12,
  },
  detailSectionTitle: { color: COLORS.navy, fontSize: 13, fontWeight: '800', marginBottom: 14 },
  detailRouteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  detailLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  detailValue: { color: COLORS.ink, fontSize: 14, fontWeight: '700', marginTop: 3 },
  detailSubValue: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  detailDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10, marginLeft: 22 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailRowLabel: { color: COLORS.muted, fontSize: 12 },
  detailRowValue: { color: COLORS.ink, fontSize: 12, fontWeight: '700', textAlign: 'right', flex: 1 },
  notesText: { color: '#334155', fontSize: 13, lineHeight: 20 },
  secondaryAction: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  secondaryActionText: { color: COLORS.navy, fontSize: 13, fontWeight: '700' },
  cancelAction: { alignItems: 'center', padding: 14, marginTop: 6 },
  cancelActionText: { color: '#DC2626', fontSize: 12, fontWeight: '700' },
});
