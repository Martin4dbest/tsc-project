import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
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

type Filter = 'all' | 'upcoming' | 'active' | 'completed';

const NAVY = '#071D49';
const ORANGE = '#F28C28';
const PAGE = '#F4F6F9';
const INK = '#172536';
const MUTED = '#687789';
const BORDER = '#E2E7EE';

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

const statusColors: Record<JourneyStatus, string> = {
  draft: '#64748B',
  scheduled: '#2563EB',
  active: '#059669',
  completed: '#475569',
  cancelled: '#DC2626',
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

function statusLabel(status: JourneyStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function JourneysScreen() {
  const router = useRouter();

  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const [modal, setModal] = useState<'form' | 'details' | null>(null);
  const [selected, setSelected] = useState<Journey | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadJourneys = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    setError('');

    try {
      const { data: { session }, error: sessionError } =
        await supabase.auth.getSession();

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
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void loadJourneys();
    }, [loadJourneys])
  );

  const filteredJourneys = journeys.filter((journey) => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') {
      return journey.status === 'draft' || journey.status === 'scheduled';
    }
    if (filter === 'active') return journey.status === 'active';
    return journey.status === 'completed';
  });

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
      Alert.alert('Missing information', 'Please complete the journey name, origin, destination and departure date/time.');
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
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login');
        return;
      }

      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

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

      const result = editing && selected
        ? await supabase
            .from('journeys')
            .update(payload)
            .eq('id', selected.id)
            .eq('traveller_id', session.user.id)
        : await supabase
            .from('journeys')
            .insert({
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
        editing ? 'Journey updated' : 'Journey saved',
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

    Alert.alert(
      'Confirm action',
      messages[status] || 'Update this journey?',
      [
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

              const { error: updateError } = await supabase
                .from('journeys')
                .update({ status })
                .eq('id', journey.id)
                .eq('traveller_id', session.user.id);

              if (updateError) throw updateError;

              setModal(null);
              setSelected(null);
              await loadJourneys(true);
              Alert.alert('Journey updated', `Journey is now ${statusLabel(status).toLowerCase()}.`);
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
      ]
    );
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
        placeholderTextColor="#98A3B1"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.multilineInput]}
        autoCapitalize={field === 'notes' ? 'sentences' : 'words'}
      />
    </View>
  );

  const renderJourney = (journey: Journey) => (
    <Pressable
      key={journey.id}
      onPress={() => openDetails(journey)}
      style={({ pressed }) => [styles.journeyCard, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <View style={styles.transportIcon}>
          <Ionicons
            name={
              journey.transport_mode === 'air' ? 'airplane-outline' :
              journey.transport_mode === 'rail' ? 'train-outline' :
              journey.transport_mode === 'sea' ? 'boat-outline' :
              'car-outline'
            }
            size={20}
            color={ORANGE}
          />
        </View>
        <View style={styles.cardTitleArea}>
          <Text style={styles.journeyName} numberOfLines={1}>{journey.journey_name}</Text>
          <Text style={styles.cardDate}>{formatDate(journey.departure_at)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColors[journey.status]}15` }]}>
          <Text style={[styles.statusText, { color: statusColors[journey.status] }]}>
            {statusLabel(journey.status)}
          </Text>
        </View>
      </View>

      <View style={styles.route}>
        <View style={styles.routeRail}>
          <View style={styles.originDot} />
          <View style={styles.routeLine} />
          <View style={styles.destinationDot} />
        </View>
        <View style={styles.routeNames}>
          <Text style={styles.routeName} numberOfLines={1}>{journey.origin_name}</Text>
          <Text style={styles.routeName} numberOfLines={1}>{journey.destination_name}</Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.cardMode}>{journey.transport_mode.toUpperCase()} JOURNEY</Text>
        <Text style={styles.viewDetails}>View details  ›</Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={21} color={INK} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>TRAVELLER SERVICES</Text>
            <Text style={styles.heading}>My journeys</Text>
          </View>
          <Pressable onPress={openCreate} style={styles.addButton}>
            <Ionicons name="add" size={23} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons name="navigate-outline" size={25} color={ORANGE} />
          </View>
          <View style={styles.introText}>
            <Text style={styles.introTitle}>Travel with a plan</Text>
            <Text style={styles.introDescription}>
              Organise your trips and keep your journey information in one place.
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{journeys.filter(j => j.status === 'scheduled').length}</Text>
            <Text style={styles.summaryLabel}>Scheduled</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, { color: '#059669' }]}>{journeys.filter(j => j.status === 'active').length}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{journeys.filter(j => j.status === 'completed').length}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your travel activity</Text>
          <Pressable onPress={() => loadJourneys(true)} disabled={refreshing}>
            {refreshing
              ? <ActivityIndicator size="small" color={ORANGE} />
              : <Ionicons name="refresh-outline" size={19} color={MUTED} />}
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {([
            ['all', 'All journeys'],
            ['upcoming', 'Upcoming'],
            ['active', 'Active'],
            ['completed', 'Completed'],
          ] as [Filter, string][]).map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setFilter(value)}
              style={[styles.filterChip, filter === value && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={ORANGE} />
            <Text style={styles.loadingText}>Loading your journeys...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cloud-offline-outline" size={30} color={MUTED} />
            <Text style={styles.emptyTitle}>Unable to load journeys</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => loadJourneys()}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : filteredJourneys.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="airplane-outline" size={27} color={ORANGE} />
            </View>
            <Text style={styles.emptyTitle}>No journeys here yet</Text>
            <Text style={styles.emptyText}>
              {filter === 'all'
                ? 'Create your first journey to begin organising your travel.'
                : 'Journeys matching this category will appear here.'}
            </Text>
            {filter === 'all' && (
              <Pressable style={styles.primaryButton} onPress={openCreate}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Create a journey</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.journeyList}>
            {filteredJourneys.map(renderJourney)}
          </View>
        )}

        <View style={styles.privacyNote}>
          <Ionicons name="shield-checkmark-outline" size={19} color="#0B8B65" />
          <Text style={styles.privacyText}>
            Your journey information is protected by your account permissions. Location sharing is currently off unless you explicitly enable it in a supported feature.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={modal === 'form'}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModal(null)}
      >
        <SafeAreaView style={styles.modalScreen} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setModal(null)} style={styles.modalClose}>
              <Ionicons name="close" size={23} color={INK} />
            </Pressable>
            <Text style={styles.modalTitle}>{editing ? 'Edit journey' : 'Plan a journey'}</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.formSectionTitle}>Journey information</Text>
            {renderInput('Journey name *', 'journey_name', 'e.g. Business trip to Abuja')}
            {renderInput('Departure location *', 'origin_name', 'City or place of departure')}
            {renderInput('Departure address', 'origin_address', 'Street address (optional)')}
            {renderInput('Destination *', 'destination_name', 'City or destination')}
            {renderInput('Destination address', 'destination_address', 'Street address (optional)')}

            <Text style={styles.formSectionTitle}>Travel schedule</Text>
            {renderInput('Departure date and time *', 'departure_at', 'YYYY-MM-DDTHH:mm')}
            {renderInput('Expected arrival', 'expected_arrival_at', 'YYYY-MM-DDTHH:mm (optional)')}

            <Text style={styles.fieldLabel}>Transport mode</Text>
            <View style={styles.modeOptions}>
              {([
                ['road', 'car-outline', 'Road'],
                ['air', 'airplane-outline', 'Air'],
                ['rail', 'train-outline', 'Rail'],
                ['sea', 'boat-outline', 'Sea'],
                ['other', 'ellipsis-horizontal-circle-outline', 'Other'],
              ] as const).map(([value, icon, label]) => (
                <Pressable
                  key={value}
                  onPress={() => updateField('transport_mode', value)}
                  style={[styles.modeOption, form.transport_mode === value && styles.modeOptionActive]}
                >
                  <Ionicons name={icon} size={18} color={form.transport_mode === value ? ORANGE : MUTED} />
                  <Text style={[styles.modeLabel, form.transport_mode === value && styles.modeLabelActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {renderInput('Additional notes', 'notes', 'Travel details or information for your reference', true)}

            <View style={styles.draftNotice}>
              <Ionicons name="information-circle-outline" size={19} color="#8A5A13" />
              <Text style={styles.draftNoticeText}>
                New journeys are saved as drafts. You can schedule them after reviewing the details.
              </Text>
            </View>

            <Pressable
              onPress={saveJourney}
              disabled={saving}
              style={[styles.primaryButton, styles.saveButton, saving && { opacity: 0.65 }]}
            >
              {saving
                ? <ActivityIndicator color="#FFFFFF" />
                : <Ionicons name="checkmark-circle-outline" size={19} color="#FFFFFF" />}
              <Text style={styles.primaryButtonText}>
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Save journey'}
              </Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

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
                  <Ionicons name="close" size={23} color={INK} />
                </Pressable>
                <Text style={styles.modalTitle}>Journey details</Text>
                <View style={{ width: 40 }} />
              </View>

              <ScrollView contentContainerStyle={styles.detailContent}>
                <View style={styles.detailHero}>
                  <View style={styles.detailHeroIcon}>
                    <Ionicons name="navigate-outline" size={27} color={ORANGE} />
                  </View>
                  <Text style={styles.detailName}>{selected.journey_name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColors[selected.status]}18` }]}>
                    <Text style={[styles.statusText, { color: statusColors[selected.status] }]}>
                      {statusLabel(selected.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailCard}>
                  <Text style={styles.detailSectionTitle}>Route</Text>
                  <View style={styles.detailRouteRow}>
                    <View style={styles.originDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>FROM</Text>
                      <Text style={styles.detailValue}>{selected.origin_name}</Text>
                      {!!selected.origin_address && <Text style={styles.detailSubValue}>{selected.origin_address}</Text>}
                    </View>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailRouteRow}>
                    <View style={styles.destinationDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>TO</Text>
                      <Text style={styles.detailValue}>{selected.destination_name}</Text>
                      {!!selected.destination_address && <Text style={styles.detailSubValue}>{selected.destination_address}</Text>}
                    </View>
                  </View>
                </View>

                <View style={styles.detailCard}>
                  <Text style={styles.detailSectionTitle}>Schedule and travel</Text>
                  <DetailRow label="Departure" value={formatDate(selected.departure_at)} />
                  <DetailRow label="Expected arrival" value={formatDate(selected.expected_arrival_at)} />
                  <DetailRow label="Transport" value={selected.transport_mode.toUpperCase()} />
                  <DetailRow label="Timezone" value={selected.departure_timezone} />
                  {!!selected.started_at && <DetailRow label="Started" value={formatDate(selected.started_at)} />}
                  {!!selected.completed_at && <DetailRow label="Completed" value={formatDate(selected.completed_at)} />}
                </View>

                {!!selected.notes && (
                  <View style={styles.detailCard}>
                    <Text style={styles.detailSectionTitle}>Notes</Text>
                    <Text style={styles.notesText}>{selected.notes}</Text>
                  </View>
                )}

                <JourneyGpsControls
                  journey={selected}
                  onUpdated={(enabled) => {
                    const updated = {
                      ...selected,
                      location_sharing_enabled: enabled,
                    };

                    setSelected(updated);
                    setJourneys((current) =>
                      current.map((item) =>
                        item.id === updated.id ? updated : item
                      )
                    );
                  }}
                />

                {selected.status === 'draft' && (
                  <>
                    <Pressable style={styles.primaryButton} onPress={() => changeStatus(selected, 'scheduled')}>
                      <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.primaryButtonText}>Schedule journey</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryAction} onPress={() => openEdit(selected)}>
                      <Ionicons name="create-outline" size={18} color={NAVY} />
                      <Text style={styles.secondaryActionText}>Edit journey</Text>
                    </Pressable>
                    <Pressable style={styles.cancelAction} onPress={() => changeStatus(selected, 'cancelled')}>
                      <Text style={styles.cancelActionText}>Cancel journey</Text>
                    </Pressable>
                  </>
                )}

                {selected.status === 'scheduled' && (
                  <>
                    <Pressable style={styles.primaryButton} onPress={() => changeStatus(selected, 'active')}>
                      <Ionicons name="play-circle-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.primaryButtonText}>Start journey</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryAction} onPress={() => openEdit(selected)}>
                      <Ionicons name="create-outline" size={18} color={NAVY} />
                      <Text style={styles.secondaryActionText}>Edit journey</Text>
                    </Pressable>
                    <Pressable style={styles.cancelAction} onPress={() => changeStatus(selected, 'cancelled')}>
                      <Text style={styles.cancelActionText}>Cancel journey</Text>
                    </Pressable>
                  </>
                )}

                {selected.status === 'active' && (
                  <>
                    <Pressable style={styles.primaryButton} onPress={() => changeStatus(selected, 'completed')}>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.primaryButtonText}>Complete journey</Text>
                    </Pressable>
                    <Pressable style={styles.cancelAction} onPress={() => changeStatus(selected, 'cancelled')}>
                      <Text style={styles.cancelActionText}>Cancel journey</Text>
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
  screen: { flex: 1, backgroundColor: PAGE },
  content: { paddingHorizontal: 19, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  headerText: { flex: 1 },
  eyebrow: { color: ORANGE, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  heading: { color: INK, fontSize: 21, fontWeight: '800', marginTop: 2 },
  addButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  introCard: { backgroundColor: NAVY, borderRadius: 18, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 8 },
  introIcon: { width: 47, height: 47, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  introText: { flex: 1 },
  introTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  introDescription: { color: '#D6DFEB', fontSize: 11, lineHeight: 17, marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  summaryCard: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 13 },
  summaryNumber: { color: NAVY, fontSize: 21, fontWeight: '800' },
  summaryLabel: { color: MUTED, fontSize: 10, marginTop: 3, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, marginBottom: 12 },
  sectionTitle: { color: INK, fontSize: 15, fontWeight: '800' },
  filterScroll: { marginBottom: 15, flexGrow: 0 },
  filterChip: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BORDER, marginRight: 8 },
  filterChipActive: { backgroundColor: NAVY, borderColor: NAVY },
  filterText: { color: MUTED, fontSize: 11, fontWeight: '600' },
  filterTextActive: { color: '#FFFFFF' },
  journeyList: { gap: 11 },
  journeyCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BORDER, borderRadius: 17, padding: 15 },
  pressed: { opacity: 0.85 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  transportIcon: { width: 39, height: 39, borderRadius: 12, backgroundColor: '#FFF3E7', alignItems: 'center', justifyContent: 'center' },
  cardTitleArea: { flex: 1 },
  journeyName: { color: INK, fontSize: 13, fontWeight: '800' },
  cardDate: { color: MUTED, fontSize: 10, marginTop: 4 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 9, fontWeight: '800' },
  route: { flexDirection: 'row', marginTop: 17, marginLeft: 6 },
  routeRail: { width: 16, alignItems: 'center', paddingVertical: 3 },
  originDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 2, borderColor: '#0B9B70', backgroundColor: '#FFFFFF' },
  routeLine: { width: 1, height: 21, backgroundColor: '#C8D0DA', marginVertical: 2 },
  destinationDot: { width: 9, height: 9, borderRadius: 2, backgroundColor: ORANGE },
  routeNames: { flex: 1, justifyContent: 'space-between', minHeight: 47, paddingLeft: 9 },
  routeName: { color: '#344456', fontSize: 11, fontWeight: '600' },
  cardBottom: { borderTopWidth: 1, borderTopColor: '#EEF1F5', marginTop: 14, paddingTop: 11, flexDirection: 'row', justifyContent: 'space-between' },
  cardMode: { color: MUTED, fontSize: 9, fontWeight: '700', letterSpacing: 0.7 },
  viewDetails: { color: ORANGE, fontSize: 10, fontWeight: '800' },
  loadingBox: { paddingVertical: 50, alignItems: 'center' },
  loadingText: { color: MUTED, fontSize: 12, marginTop: 12 },
  emptyCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BORDER, borderRadius: 17, alignItems: 'center', padding: 25, marginTop: 3 },
  emptyIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#FFF3E7', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { color: INK, fontSize: 14, fontWeight: '800', marginTop: 8 },
  emptyText: { color: MUTED, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 6 },
  primaryButton: { minHeight: 47, borderRadius: 13, backgroundColor: NAVY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 16, marginTop: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  retryButton: { marginTop: 13, padding: 10 },
  retryText: { color: ORANGE, fontSize: 12, fontWeight: '800' },
  privacyNote: { backgroundColor: '#EAF6F1', borderRadius: 13, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 22 },
  privacyText: { color: '#41685A', flex: 1, fontSize: 10, lineHeight: 16 },
  modalScreen: { flex: 1, backgroundColor: PAGE },
  modalHeader: { height: 58, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: '#FFFFFF' },
  modalClose: { width: 40, height: 40, borderRadius: 12, backgroundColor: PAGE, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { color: INK, fontSize: 15, fontWeight: '800' },
  formContent: { padding: 19, paddingBottom: 40 },
  formSectionTitle: { color: NAVY, fontSize: 13, fontWeight: '800', marginTop: 12, marginBottom: 13 },
  field: { marginBottom: 14 },
  fieldLabel: { color: '#344456', fontSize: 11, fontWeight: '700', marginBottom: 7 },
  input: { minHeight: 46, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', borderRadius: 11, paddingHorizontal: 13, color: INK, fontSize: 12 },
  multilineInput: { minHeight: 90, paddingTop: 12 },
  modeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 17, marginTop: 2 },
  modeOption: { borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF', borderRadius: 11, paddingHorizontal: 11, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  modeOptionActive: { borderColor: ORANGE, backgroundColor: '#FFF5EB' },
  modeLabel: { color: MUTED, fontSize: 10, fontWeight: '600' },
  modeLabelActive: { color: '#A94E0B' },
  draftNotice: { backgroundColor: '#FFF4DF', borderRadius: 11, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 5 },
  draftNoticeText: { color: '#79531C', flex: 1, fontSize: 10, lineHeight: 16 },
  saveButton: { marginTop: 19, marginBottom: 15 },
  detailContent: { padding: 18, paddingBottom: 40 },
  detailHero: { alignItems: 'center', paddingVertical: 15 },
  detailHeroIcon: { width: 58, height: 58, borderRadius: 19, backgroundColor: '#FFF0E1', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  detailName: { color: INK, fontSize: 18, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  detailCard: { backgroundColor: '#FFFFFF', borderRadius: 15, borderWidth: 1, borderColor: BORDER, padding: 15, marginTop: 12 },
  detailSectionTitle: { color: NAVY, fontSize: 12, fontWeight: '800', marginBottom: 14 },
  detailRouteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 5 },
  detailLabel: { color: MUTED, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  detailValue: { color: INK, fontSize: 13, fontWeight: '700', marginTop: 4 },
  detailSubValue: { color: MUTED, fontSize: 10, marginTop: 3 },
  detailDivider: { height: 1, backgroundColor: '#EDF0F4', marginVertical: 9, marginLeft: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F0F2F5' },
  detailRowLabel: { color: MUTED, fontSize: 10 },
  detailRowValue: { color: INK, fontSize: 10, fontWeight: '700', textAlign: 'right', flex: 1 },
  notesText: { color: '#445366', fontSize: 11, lineHeight: 18 },
  locationNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: '#EDF1F5', padding: 12, borderRadius: 12, marginTop: 13 },
  locationNoticeText: { flex: 1, color: MUTED, fontSize: 10, lineHeight: 16 },
  secondaryAction: { minHeight: 45, borderWidth: 1, borderColor: BORDER, borderRadius: 12, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  secondaryActionText: { color: NAVY, fontSize: 12, fontWeight: '700' },
  cancelAction: { alignItems: 'center', padding: 14, marginTop: 5 },
  cancelActionText: { color: '#C33B3B', fontSize: 11, fontWeight: '700' },
});
