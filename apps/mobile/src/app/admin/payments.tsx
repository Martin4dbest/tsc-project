import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';

type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
type PaymentPurpose =
  | 'wallet_funding'
  | 'service_payment'
  | 'booking_payment'
  | 'refund';

type Payment = {
  id: string;
  traveller_id: string;
  wallet_id: string | null;
  wallet_transaction_id: string | null;
  provider: string;
  purpose: PaymentPurpose;
  status: PaymentStatus;
  amount_minor: number;
  currency_code: string;
  reference: string;
  provider_transaction_id: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
  traveller_name: string;
  traveller_phone: string;
};

const NAVY = '#102D50';
const BLUE = '#174D78';
const TEAL = '#187B83';
const PAGE = '#F4F7FB';
const INK = '#172B45';
const MUTED = '#718096';
const BORDER = '#E1E8F0';
const GREEN = '#15803D';
const RED = '#DC2626';
const ORANGE = '#D97706';

const statuses = ['all', 'succeeded', 'pending', 'failed', 'refunded'];
const purposes = [
  'all',
  'wallet_funding',
  'service_payment',
  'booking_payment',
  'refund',
];
const providers = ['all', 'paystack', 'wallet', 'admin', 'manual'];

function money(amount: number, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0) / 100);
}

function dateLabel(value?: string | null) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';

  return date.toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  });
}

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === 'succeeded'
      ? GREEN
      : status === 'failed'
        ? RED
        : status === 'refunded'
          ? BLUE
          : ORANGE;

  return (
    <View style={[styles.statusPill, { backgroundColor: `${color}15` }]}>
      <Text style={[styles.statusText, { color }]}>{titleCase(status)}</Text>
    </View>
  );
}

function FilterChips({
  title,
  values,
  selected,
  onSelect,
}: {
  title: string;
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {values.map((value) => {
            const active = selected === value;
            return (
              <Pressable
                key={value}
                onPress={() => onSelect(value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {value === 'all' ? 'All' : titleCase(value)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export default function AdminPaymentsScreen() {
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [purposeFilter, setPurposeFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const loadPayments = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError('');
    setAccessDenied(false);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace('/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, account_status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (
        profileError ||
        !profile ||
        profile.account_status !== 'active' ||
        (profile.role !== 'admin' && profile.role !== 'super_admin')
      ) {
        setAccessDenied(true);
        return;
      }

      const { data: permitted, error: permissionError } =
        await supabase.rpc('tsc_has_permission', {
          p_permission_key: 'payments.view',
        });

      if (permissionError || permitted !== true) {
        setAccessDenied(true);
        return;
      }

      const [paymentResult, profileResult] = await Promise.all([
        supabase
          .from('tsc_payment_records')
          .select(
            'id, traveller_id, wallet_id, wallet_transaction_id, provider, purpose, status, amount_minor, currency_code, reference, provider_transaction_id, description, metadata, created_at, updated_at, verified_at'
          )
          .order('created_at', { ascending: false })
          .limit(500),

        supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .eq('role', 'traveller'),
      ]);

      if (paymentResult.error) throw paymentResult.error;
      if (profileResult.error) throw profileResult.error;

      const travellerProfiles = profileResult.data ?? [];

      const records: Payment[] = (paymentResult.data ?? []).map((payment) => {
        const traveller = travellerProfiles.find(
          (item) => item.user_id === payment.traveller_id
        );

        return {
          ...payment,
          traveller_name: traveller?.full_name ?? 'Unknown traveller',
          traveller_phone: traveller?.phone ?? '',
        } as Payment;
      });

      setPayments(records);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load payment records. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const filteredPayments = useMemo(() => {
    const term = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const matchesSearch =
        !term ||
        payment.traveller_name.toLowerCase().includes(term) ||
        payment.traveller_phone.toLowerCase().includes(term) ||
        payment.reference.toLowerCase().includes(term) ||
        (payment.provider_transaction_id ?? '').toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === 'all' || payment.status === statusFilter;
      const matchesPurpose =
        purposeFilter === 'all' || payment.purpose === purposeFilter;
      const matchesProvider =
        providerFilter === 'all' || payment.provider === providerFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPurpose &&
        matchesProvider
      );
    });
  }, [payments, search, statusFilter, purposeFilter, providerFilter]);

  const stats = useMemo(() => {
    const successful = payments.filter((item) => item.status === 'succeeded');

    return {
      total: payments.length,
      succeeded: successful.length,
      pending: payments.filter((item) => item.status === 'pending').length,
      failed: payments.filter((item) => item.status === 'failed').length,
      refunded: payments.filter((item) => item.status === 'refunded').length,
      value: successful.reduce(
        (total, item) => total + Number(item.amount_minor || 0),
        0
      ),
    };
  }, [payments]);

  const exportCsv = async () => {
    if (!filteredPayments.length) {
      setError('There are no payment records to export.');
      return;
    }

    const headers = [
      'Payment ID',
      'Traveller',
      'Phone',
      'Provider',
      'Purpose',
      'Status',
      'Amount Minor',
      'Currency',
      'Reference',
      'Provider Transaction ID',
      'Wallet ID',
      'Wallet Transaction ID',
      'Description',
      'Created At',
      'Updated At',
      'Verified At',
    ];

    const rows = filteredPayments.map((item) =>
      [
        item.id,
        item.traveller_name,
        item.traveller_phone,
        item.provider,
        item.purpose,
        item.status,
        item.amount_minor,
        item.currency_code,
        item.reference,
        item.provider_transaction_id,
        item.wallet_id,
        item.wallet_transaction_id,
        item.description,
        item.created_at,
        item.updated_at,
        item.verified_at,
      ]
        .map(csvCell)
        .join(',')
    );

    const csv = [headers.map(csvCell).join(','), ...rows].join('\n');

    try {
      await Share.share({
        title: 'TSC Payment Operations CSV',
        message: csv,
      });
    } catch {
      setError('Unable to open the share menu for this export.');
    }
  };

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);

    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError('Unable to sign out. Please try again.');
      setSigningOut(false);
      return;
    }

    router.replace('/login');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={styles.loadingText}>Loading Payment Operations...</Text>
      </SafeAreaView>
    );
  }

  if (accessDenied) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.deniedIcon}>🔒</Text>
        <Text style={styles.deniedTitle}>Access restricted</Text>
        <Text style={styles.deniedText}>
          This area is available only to active administrators with the
          payments.view permission.
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.primaryButtonText}>Return to sign in</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadPayments(true)}
            tintColor={TEAL}
            colors={[TEAL]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>TSC</Text>
            </View>
            <Pressable onPress={signOut} disabled={signingOut}>
              <Text style={styles.signOutText}>
                {signingOut ? 'Signing out...' : 'Sign out ↗'}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.eyebrow}>ADMINISTRATION / FINANCE</Text>
          <Text style={styles.heading}>Payment Operations</Text>
          <Text style={styles.headerDescription}>
            Monitor Paystack transactions, wallet funding and payment
            verification records.
          </Text>
          <View style={styles.headerFooter}>
            <View style={styles.liveDot} />
            <Text style={styles.headerFooterText}>
              READ-ONLY OPERATIONS VIEW
            </Text>
            <Text style={styles.recordCount}>
              {payments.length} records
            </Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void loadPayments(true)}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Payment overview</Text>
          <Text style={styles.sectionCaption}>ALL RECORDS</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total payments</Text>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statHint}>Recorded transactions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Successful</Text>
            <Text style={[styles.statValue, { color: GREEN }]}>
              {stats.succeeded}
            </Text>
            <Text style={styles.statHint}>Verified payments</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={[styles.statValue, { color: ORANGE }]}>
              {stats.pending}
            </Text>
            <Text style={styles.statHint}>Awaiting confirmation</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Failed</Text>
            <Text style={[styles.statValue, { color: RED }]}>
              {stats.failed}
            </Text>
            <Text style={styles.statHint}>Unsuccessful payments</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Refunded</Text>
            <Text style={[styles.statValue, { color: BLUE }]}>
              {stats.refunded}
            </Text>
            <Text style={styles.statHint}>Refund records</Text>
          </View>
          <View style={[styles.statCard, styles.valueCard]}>
            <Text style={styles.statLabel}>Successful value</Text>
            <Text style={styles.valueText}>{money(stats.value)}</Text>
            <Text style={styles.statHint}>Successful transactions only</Text>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Transaction records</Text>
          <Pressable style={styles.exportButton} onPress={exportCsv}>
            <Text style={styles.exportButtonText}>Export CSV ↗</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Search traveller, phone or reference..."
          placeholderTextColor="#91A0B3"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <FilterChips
          title="Payment status"
          values={statuses}
          selected={statusFilter}
          onSelect={setStatusFilter}
        />
        <FilterChips
          title="Payment purpose"
          values={purposes}
          selected={purposeFilter}
          onSelect={setPurposeFilter}
        />
        <FilterChips
          title="Provider"
          values={providers}
          selected={providerFilter}
          onSelect={setProviderFilter}
        />

        <View style={styles.resultsRow}>
          <Text style={styles.resultsText}>
            Showing {filteredPayments.length} of {payments.length} records
          </Text>
          <Pressable
            onPress={() => {
              setSearch('');
              setStatusFilter('all');
              setPurposeFilter('all');
              setProviderFilter('all');
            }}
          >
            <Text style={styles.clearFilters}>Clear filters</Text>
          </Pressable>
        </View>

        {filteredPayments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No matching payments</Text>
            <Text style={styles.emptyDescription}>
              Try changing your search or filters.
            </Text>
          </View>
        ) : (
          filteredPayments.map((payment) => (
            <Pressable
              key={payment.id}
              style={({ pressed }) => [
                styles.paymentCard,
                pressed && styles.pressed,
              ]}
              onPress={() => setSelectedPayment(payment)}
            >
              <View style={styles.paymentTop}>
                <View style={styles.travellerAvatar}>
                  <Text style={styles.avatarText}>
                    {(payment.traveller_name || 'T').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.paymentIdentity}>
                  <Text style={styles.travellerName} numberOfLines={1}>
                    {payment.traveller_name}
                  </Text>
                  <Text style={styles.paymentPhone}>
                    {payment.traveller_phone || 'No phone number'}
                  </Text>
                </View>
                <StatusPill status={payment.status} />
              </View>

              <View style={styles.paymentAmountRow}>
                <Text style={styles.paymentAmount}>
                  {money(payment.amount_minor, payment.currency_code)}
                </Text>
                <Text style={styles.paymentProvider}>
                  {titleCase(payment.provider)}
                </Text>
              </View>

              <Text style={styles.referenceText} numberOfLines={1}>
                Ref: {payment.reference}
              </Text>

              <View style={styles.paymentBottom}>
                <Text style={styles.paymentPurpose}>
                  {titleCase(payment.purpose)}
                </Text>
                <Text style={styles.paymentDate}>
                  {dateLabel(payment.created_at)}
                </Text>
              </View>

              <Text style={styles.viewDetails}>View transaction details →</Text>
            </Pressable>
          ))
        )}

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>TSC</Text>
          <Text style={styles.footerText}>
            TRAVELLERS SAFETY COVERED
          </Text>
          <Text style={styles.footerNote}>
            Payment records are displayed using your assigned permissions.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={!!selectedPayment}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPayment(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>PAYMENT RECORD</Text>
                <Text style={styles.modalTitle}>Transaction details</Text>
              </View>
              <Pressable
                style={styles.closeButton}
                onPress={() => setSelectedPayment(null)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            {selectedPayment ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalAmount}>
                  {money(
                    selectedPayment.amount_minor,
                    selectedPayment.currency_code
                  )}
                </Text>
                <StatusPill status={selectedPayment.status} />

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Traveller</Text>
                  <Detail label="Full name" value={selectedPayment.traveller_name} />
                  <Detail label="Phone" value={selectedPayment.traveller_phone} />
                  <Detail label="Traveller ID" value={selectedPayment.traveller_id} />
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Payment information</Text>
                  <Detail label="Provider" value={titleCase(selectedPayment.provider)} />
                  <Detail label="Purpose" value={titleCase(selectedPayment.purpose)} />
                  <Detail label="Currency" value={selectedPayment.currency_code} />
                  <Detail label="Reference" value={selectedPayment.reference} />
                  <Detail
                    label="Provider transaction ID"
                    value={selectedPayment.provider_transaction_id}
                  />
                  <Detail label="Description" value={selectedPayment.description} />
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Wallet records</Text>
                  <Detail label="Wallet ID" value={selectedPayment.wallet_id} />
                  <Detail
                    label="Wallet transaction ID"
                    value={selectedPayment.wallet_transaction_id}
                  />
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Timestamps</Text>
                  <Detail label="Created" value={dateLabel(selectedPayment.created_at)} />
                  <Detail label="Updated" value={dateLabel(selectedPayment.updated_at)} />
                  <Detail label="Verified" value={dateLabel(selectedPayment.verified_at)} />
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Record ID</Text>
                  <Text style={styles.recordId}>{selectedPayment.id}</Text>
                </View>
              </ScrollView>
            ) : null}

            <Pressable
              style={styles.modalDoneButton}
              onPress={() => setSelectedPayment(null)}
            >
              <Text style={styles.modalDoneText}>Close details</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text selectable style={styles.detailValue}>
        {value || 'Not available'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAGE },
  centerScreen: {
    flex: 1,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  loadingText: { color: '#D8E4F2', fontSize: 14, marginTop: 16 },
  deniedIcon: { fontSize: 38, marginBottom: 14 },
  deniedTitle: { color: '#FFFFFF', fontSize: 23, fontWeight: '800' },
  deniedText: {
    color: '#C5D2E4',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 22,
  },
  primaryButton: {
    backgroundColor: '#FF8A00',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: { color: NAVY, fontWeight: '800' },
  content: { paddingBottom: 35 },
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 21,
    paddingTop: 13,
    paddingBottom: 24,
    borderBottomLeftRadius: 23,
    borderBottomRightRadius: 23,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FF8A00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: { color: NAVY, fontSize: 16, fontWeight: '900' },
  signOutText: { color: '#FFD29B', fontWeight: '700', fontSize: 13 },
  eyebrow: {
    color: '#80D6D1',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '900',
    marginTop: 8,
  },
  headerDescription: {
    color: '#D0DCEB',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 340,
  },
  headerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 19,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#42D392',
    marginRight: 8,
  },
  headerFooterText: {
    color: '#B8C9DD',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  recordCount: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 'auto',
  },
  sectionHeading: {
    marginTop: 23,
    marginBottom: 12,
    paddingHorizontal: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: INK, fontSize: 17, fontWeight: '800' },
  sectionCaption: {
    color: MUTED,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    gap: 10,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    minHeight: 102,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 15,
    padding: 13,
  },
  valueCard: { backgroundColor: '#EAF4F5', borderColor: '#C6E2E3' },
  statLabel: { color: MUTED, fontSize: 11, fontWeight: '700' },
  statValue: { color: INK, fontSize: 25, fontWeight: '900', marginTop: 7 },
  valueText: { color: TEAL, fontSize: 19, fontWeight: '900', marginTop: 10 },
  statHint: { color: MUTED, fontSize: 10, marginTop: 4 },
  exportButton: {
    backgroundColor: NAVY,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 9,
  },
  exportButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  searchInput: {
    marginHorizontal: 18,
    minHeight: 48,
    backgroundColor: '#FFFFFF',
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: INK,
    fontSize: 13,
  },
  filterGroup: { marginTop: 15 },
  filterTitle: {
    color: INK,
    fontSize: 11,
    fontWeight: '800',
    marginHorizontal: 19,
    marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 18 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { color: MUTED, fontSize: 10, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF' },
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 19,
    marginTop: 21,
    marginBottom: 10,
  },
  resultsText: { color: MUTED, fontSize: 11 },
  clearFilters: { color: BLUE, fontSize: 11, fontWeight: '800' },
  paymentCard: {
    marginHorizontal: 16,
    marginBottom: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 14,
  },
  pressed: { opacity: 0.82 },
  paymentTop: { flexDirection: 'row', alignItems: 'center' },
  travellerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E7F0F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: BLUE, fontWeight: '900', fontSize: 16 },
  paymentIdentity: { flex: 1, marginLeft: 10, marginRight: 6 },
  travellerName: { color: INK, fontSize: 13, fontWeight: '800' },
  paymentPhone: { color: MUTED, fontSize: 10, marginTop: 3 },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: { fontSize: 9, fontWeight: '900' },
  paymentAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  paymentAmount: { color: NAVY, fontSize: 20, fontWeight: '900' },
  paymentProvider: { color: TEAL, fontSize: 11, fontWeight: '800' },
  referenceText: { color: MUTED, fontSize: 10, marginTop: 7 },
  paymentBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDF1F5',
  },
  paymentPurpose: { color: BLUE, fontSize: 10, fontWeight: '700' },
  paymentDate: { color: MUTED, fontSize: 9 },
  viewDetails: {
    color: TEAL,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyCard: {
    marginHorizontal: 18,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    alignItems: 'center',
  },
  emptyTitle: { color: INK, fontSize: 15, fontWeight: '800' },
  emptyDescription: { color: MUTED, fontSize: 12, marginTop: 6 },
  errorBox: {
    margin: 16,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    padding: 13,
    borderRadius: 12,
  },
  errorText: { color: RED, fontSize: 12, lineHeight: 18 },
  retryText: { color: BLUE, fontSize: 12, fontWeight: '800', marginTop: 7 },
  footer: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 24 },
  footerBrand: { color: TEAL, fontSize: 17, fontWeight: '900', letterSpacing: 2 },
  footerText: { color: MUTED, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginTop: 5 },
  footerNote: { color: MUTED, fontSize: 10, textAlign: 'center', marginTop: 7 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 18, 38, 0.68)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '90%',
    backgroundColor: PAGE,
    borderTopLeftRadius: 23,
    borderTopRightRadius: 23,
    paddingHorizontal: 19,
    paddingTop: 20,
    paddingBottom: 25,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 17,
  },
  modalEyebrow: { color: TEAL, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  modalTitle: { color: INK, fontSize: 20, fontWeight: '900', marginTop: 4 },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E7EDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: { color: NAVY, fontSize: 24, lineHeight: 26 },
  modalAmount: { color: NAVY, fontSize: 27, fontWeight: '900', marginBottom: 10 },
  detailSection: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 13,
    padding: 13,
    marginTop: 13,
  },
  detailSectionTitle: {
    color: BLUE,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 10,
  },
  detailRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#EFF2F6',
  },
  detailLabel: { color: MUTED, fontSize: 10, fontWeight: '700' },
  detailValue: { color: INK, fontSize: 12, marginTop: 4 },
  recordId: { color: MUTED, fontSize: 10 },
  modalDoneButton: {
    backgroundColor: NAVY,
    minHeight: 47,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  modalDoneText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
});
