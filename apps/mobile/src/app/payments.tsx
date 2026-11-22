import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

type Payment = {
  id: string;
  amount_minor: number;
  currency_code: string;
  provider: string;
  purpose: string;
  status: string;
  reference: string;
  provider_transaction_id: string | null;
  description: string | null;
  created_at: string;
  verified_at: string | null;
};

const NAVY = "#102D50";
const BLUE = "#174D78";
const TEAL = "#187B83";
const PAGE = "#F4F7FB";
const INK = "#172B42";
const MUTED = "#718096";
const BORDER = "#E6ECF2";
const GREEN = "#059669";
const AMBER = "#D97706";
const RED = "#DC2626";

function money(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });
}

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusColor(status: string) {
  if (status === "succeeded") return GREEN;
  if (status === "pending") return AMBER;
  if (status === "failed") return RED;
  return MUTED;
}

export default function PaymentsScreen() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadPayments = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/login");
        return;
      }

      const { data, error: paymentError } = await supabase
        .from("tsc_payment_records")
        .select(
          "id, amount_minor, currency_code, provider, purpose, status, reference, provider_transaction_id, description, created_at, verified_at"
        )
        .eq("traveller_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (paymentError) throw paymentError;

      setPayments((data ?? []) as Payment[]);
    } catch (err) {
      console.error("Payment history loading failed:", err);
      setError("We could not load your payment history. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void loadPayments();
    }, [loadPayments])
  );

  const successful = useMemo(
    () => payments.filter((item) => item.status === "succeeded"),
    [payments]
  );

  const pending = useMemo(
    () => payments.filter((item) => item.status === "pending"),
    [payments]
  );

  const successfulValue = useMemo(
    () =>
      successful.reduce(
        (total, item) => total + Number(item.amount_minor),
        0
      ),
    [successful]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={21} color={NAVY} />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>TRAVELLER PAYMENT CENTRE</Text>
          <Text style={styles.title}>My Payments</Text>
        </View>

        <Pressable
          style={styles.headerButton}
          onPress={() => void loadPayments(true)}
          accessibilityLabel="Refresh payments"
        >
          <Ionicons name="refresh-outline" size={21} color={NAVY} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={TEAL} />
          <Text style={styles.loadingText}>Loading your payments...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadPayments(true)}
              tintColor={TEAL}
            />
          }
        >
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Ionicons name="receipt-outline" size={27} color="#FFFFFF" />
            </View>
            <View style={styles.introText}>
              <Text style={styles.introTitle}>Your payment activity</Text>
              <Text style={styles.introDescription}>
                Review your TSC payment records, transaction references and
                payment statuses.
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.walletButton}
            onPress={() => router.push("/wallet")}
          >
            <Ionicons name="wallet-outline" size={21} color="#FFFFFF" />
            <Text style={styles.walletButtonText}>Open My Wallet</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total records</Text>
              <Text style={styles.statValue}>{payments.length}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Successful</Text>
              <Text style={[styles.statValue, { color: GREEN }]}>
                {successful.length}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Pending</Text>
              <Text style={[styles.statValue, { color: AMBER }]}>
                {pending.length}
              </Text>
            </View>
          </View>

          <View style={styles.valueCard}>
            <View>
              <Text style={styles.valueLabel}>SUCCESSFUL PAYMENT VALUE</Text>
              <Text style={styles.valueAmount}>
                {money(successfulValue)}
              </Text>
            </View>
            <View style={styles.valueIcon}>
              <Ionicons name="checkmark-done" size={23} color={GREEN} />
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Payment history</Text>
              <Text style={styles.sectionSubtitle}>
                Your latest 100 payment records
              </Text>
            </View>
            <Text style={styles.recordCount}>{payments.length} records</Text>
          </View>

          {error ? (
            <View style={styles.emptyCard}>
              <Ionicons name="alert-circle-outline" size={34} color={RED} />
              <Text style={styles.emptyTitle}>Payment history unavailable</Text>
              <Text style={styles.muted}>{error}</Text>
              <Pressable
                style={styles.retryButton}
                onPress={() => void loadPayments()}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : payments.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons name="receipt-outline" size={30} color={TEAL} />
              </View>
              <Text style={styles.emptyTitle}>No payment records yet</Text>
              <Text style={styles.muted}>
                Payments you make through TSC will appear here with their
                references and transaction statuses.
              </Text>
              <Pressable
                style={styles.retryButton}
                onPress={() => router.push("/wallet")}
              >
                <Text style={styles.retryText}>Go to My Wallet</Text>
              </Pressable>
            </View>
          ) : (
            payments.map((payment) => (
              <View key={payment.id} style={styles.paymentCard}>
                <View style={styles.paymentTop}>
                  <View style={styles.paymentHeading}>
                    <Text
                      style={[
                        styles.status,
                        {
                          color: statusColor(payment.status),
                          backgroundColor: `${statusColor(payment.status)}15`,
                        },
                      ]}
                    >
                      {label(payment.status)}
                    </Text>
                    <Text style={styles.provider}>
                      {label(payment.provider)}
                    </Text>
                  </View>
                  <Text style={styles.paymentDate}>
                    {dateLabel(payment.created_at)}
                  </Text>
                </View>

                <Text style={styles.paymentAmount}>
                  {money(Number(payment.amount_minor), payment.currency_code)}
                </Text>
                <Text style={styles.purpose}>{label(payment.purpose)}</Text>

                {!!payment.description && (
                  <Text style={styles.description}>
                    {payment.description}
                  </Text>
                )}

                <View style={styles.detailDivider} />

                <Text style={styles.detailLabel}>Payment reference</Text>
                <Text selectable style={styles.reference}>
                  {payment.reference}
                </Text>

                {!!payment.provider_transaction_id && (
                  <>
                    <Text style={styles.detailLabel}>
                      Provider transaction ID
                    </Text>
                    <Text selectable style={styles.reference}>
                      {payment.provider_transaction_id}
                    </Text>
                  </>
                )}

                {!!payment.verified_at && (
                  <View style={styles.verifiedRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={15}
                      color={GREEN}
                    />
                    <Text style={styles.verifiedText}>
                      Verified {dateLabel(payment.verified_at)}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}

          <Text style={styles.footer}>
            TRAVELLERS SAFETY COVERED{"\n"}
            Your safety. Our priority.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PAGE },
  header: {
    minHeight: 72,
    paddingHorizontal: 17,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F0F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, marginLeft: 12 },
  eyebrow: {
    color: TEAL,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  title: { color: NAVY, fontSize: 20, fontWeight: "900", marginTop: 3 },
  content: { padding: 17, paddingBottom: 35 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { color: MUTED, fontSize: 13, fontWeight: "600" },
  introCard: {
    backgroundColor: NAVY,
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#FFFFFF22",
    alignItems: "center",
    justifyContent: "center",
  },
  introText: { flex: 1 },
  introTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  introDescription: {
    color: "#DCE8F4",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },
  walletButton: {
    marginTop: 13,
    minHeight: 51,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: BLUE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  walletButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    flex: 1,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 9,
    marginTop: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 15,
    padding: 12,
  },
  statLabel: { color: MUTED, fontSize: 10, fontWeight: "600" },
  statValue: { color: NAVY, fontSize: 23, fontWeight: "900", marginTop: 8 },
  valueCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  valueLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  valueAmount: {
    color: GREEN,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 7,
  },
  valueIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: "#E8F7EF",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    marginTop: 25,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { color: NAVY, fontSize: 18, fontWeight: "900" },
  sectionSubtitle: { color: MUTED, fontSize: 11, marginTop: 4 },
  recordCount: { color: TEAL, fontSize: 10, fontWeight: "800" },
  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 15,
    marginBottom: 12,
  },
  paymentTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  paymentHeading: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
    flex: 1,
  },
  status: {
    overflow: "hidden",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 9,
    fontWeight: "900",
  },
  provider: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  paymentDate: {
    color: MUTED,
    fontSize: 9,
    textAlign: "right",
    flexShrink: 1,
  },
  paymentAmount: {
    color: NAVY,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 14,
  },
  purpose: { color: TEAL, fontSize: 12, fontWeight: "800", marginTop: 4 },
  description: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
  },
  detailDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 13,
  },
  detailLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    marginTop: 7,
  },
  reference: {
    color: INK,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 12,
  },
  verifiedText: { color: GREEN, fontSize: 10, fontWeight: "700" },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 25,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#E6F4F3",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: NAVY,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 13,
    textAlign: "center",
  },
  muted: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 7,
  },
  retryButton: {
    marginTop: 15,
    borderRadius: 12,
    backgroundColor: NAVY,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  footer: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 28,
  },
});
