import React, { useCallback, useState } from "react";
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

type Wallet = {
  id: string;
  balance_minor: number;
  currency_code: string;
  status: string;
};

type Transaction = {
  id: string;
  transaction_type: string;
  amount_minor: number;
  balance_after_minor: number;
  currency_code: string;
  description: string | null;
  created_at: string;
};

const NAVY = "#071D49";
const ORANGE = "#F28C28";
const PAGE = "#F4F6F9";
const INK = "#172536";
const MUTED = "#687789";
const BORDER = "#E2E7EE";

function money(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function WalletScreen() {
  const router = useRouter();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadWallet = useCallback(async (quiet = false) => {
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

      const { data: walletData, error: walletError } = await supabase
        .from("wallet_accounts")
        .select("id, balance_minor, currency_code, status")
        .eq("traveller_id", session.user.id)
        .maybeSingle();

      if (walletError) throw walletError;

      setWallet(walletData as Wallet | null);

      if (!walletData) {
        setTransactions([]);
        return;
      }

      const { data: transactionData, error: transactionError } = await supabase
        .from("wallet_transactions")
        .select("id, transaction_type, amount_minor, balance_after_minor, currency_code, description, created_at")
        .eq("wallet_id", walletData.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (transactionError) throw transactionError;

      setTransactions((transactionData ?? []) as Transaction[]);
    } catch (err) {
      console.error("Wallet loading failed:", err);
      setError("We could not load your wallet. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void loadWallet();
    }, [loadWallet])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={NAVY} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>TRAVELLER FINANCIAL CENTRE</Text>
          <Text style={styles.title}>My Wallet</Text>
        </View>
        <Pressable style={styles.refreshButton} onPress={() => void loadWallet(true)}>
          <Ionicons name="refresh" size={20} color={NAVY} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ORANGE} />
          <Text style={styles.loadingText}>Loading your wallet...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadWallet(true)}
              tintColor={ORANGE}
            />
          }
        >
          {error ? (
            <View style={styles.card}>
              <Ionicons name="alert-circle-outline" size={28} color="#DC2626" />
              <Text style={styles.cardTitle}>Wallet unavailable</Text>
              <Text style={styles.muted}>{error}</Text>
              <Pressable style={styles.primaryButton} onPress={() => void loadWallet()}>
                <Text style={styles.primaryButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : !wallet ? (
            <View style={styles.card}>
              <Ionicons name="wallet-outline" size={32} color={ORANGE} />
              <Text style={styles.cardTitle}>Your wallet is being prepared</Text>
              <Text style={styles.muted}>
                Your wallet account has not been created yet. Please check again shortly.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.balanceCard}>
                <View style={styles.balanceTop}>
                  <View>
                    <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
                    <Text style={styles.balanceAmount}>
                      {money(Number(wallet.balance_minor), wallet.currency_code)}
                    </Text>
                  </View>
                  <View style={styles.walletIcon}>
                    <Ionicons name="wallet" size={27} color="#FFFFFF" />
                  </View>
                </View>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: wallet.status === "active" ? "#34D399" : "#FCA5A5" },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    Wallet {wallet.status === "active" ? "active" : "frozen"}
                  </Text>
                </View>
              </View>

              <View style={styles.sectionHeading}>
                <View>
                  <Text style={styles.eyebrow}>ACCOUNT ACTIVITY</Text>
                  <Text style={styles.sectionTitle}>Transaction history</Text>
                </View>
                <Text style={styles.count}>{transactions.length} records</Text>
              </View>

              {transactions.length === 0 ? (
                <View style={styles.card}>
                  <Ionicons name="receipt-outline" size={30} color={MUTED} />
                  <Text style={styles.cardTitle}>No transactions yet</Text>
                  <Text style={styles.muted}>
                    Your wallet transactions will appear here.
                  </Text>
                </View>
              ) : (
                transactions.map((item) => {
                  const isCredit = item.transaction_type === "credit";

                  return (
                    <View key={item.id} style={styles.transactionCard}>
                      <View style={[styles.transactionIcon, isCredit ? styles.creditIcon : styles.debitIcon]}>
                        <Ionicons
                          name={isCredit ? "arrow-down" : "arrow-up"}
                          size={19}
                          color={isCredit ? "#059669" : "#DC2626"}
                        />
                      </View>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionTitle}>
                          {item.description || (isCredit ? "Wallet credit" : "Wallet debit")}
                        </Text>
                        <Text style={styles.transactionDate}>{dateLabel(item.created_at)}</Text>
                        <Text style={styles.transactionBalance}>
                          Balance: {money(Number(item.balance_after_minor), item.currency_code)}
                        </Text>
                      </View>
                      <Text style={[styles.transactionAmount, { color: isCredit ? "#059669" : "#DC2626" }]}>
                        {isCredit ? "+" : "−"}
                        {money(Number(item.amount_minor), item.currency_code)}
                      </Text>
                    </View>
                  );
                })
              )}
            </>
          )}

          <Text style={styles.footer}>TRAVELLERS SAFETY COVERED</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PAGE },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PAGE,
  },
  headerText: { flex: 1, marginLeft: 13 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    color: ORANGE,
  },
  title: { fontSize: 23, fontWeight: "800", color: NAVY, marginTop: 3 },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PAGE,
  },
  content: { padding: 18, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, color: MUTED, fontSize: 15 },
  balanceCard: {
    backgroundColor: NAVY,
    borderRadius: 22,
    padding: 23,
    marginBottom: 28,
  },
  balanceTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  balanceLabel: { color: "#C7D2E5", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  balanceAmount: { color: "#FFFFFF", fontSize: 30, fontWeight: "900", marginTop: 12 },
  walletIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "#FFFFFF22",
    alignItems: "center",
    justifyContent: "center",
  },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 22 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { color: "#E2E8F0", fontSize: 13, fontWeight: "600" },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 21, fontWeight: "800", color: INK, marginTop: 5 },
  count: { color: MUTED, fontSize: 12, marginBottom: 3 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  cardTitle: { fontSize: 18, fontWeight: "800", color: INK },
  muted: { color: MUTED, fontSize: 14, lineHeight: 21 },
  primaryButton: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    padding: 13,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 10,
  },
  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  creditIcon: { backgroundColor: "#D1FAE5" },
  debitIcon: { backgroundColor: "#FEE2E2" },
  transactionInfo: { flex: 1 },
  transactionTitle: { color: INK, fontWeight: "800", fontSize: 14 },
  transactionDate: { color: MUTED, fontSize: 11, marginTop: 5 },
  transactionBalance: { color: MUTED, fontSize: 11, marginTop: 4 },
  transactionAmount: { fontSize: 13, fontWeight: "900", marginLeft: 6 },
  footer: {
    textAlign: "center",
    color: MUTED,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 30,
  },
});
