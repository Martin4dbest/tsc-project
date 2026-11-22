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

const NAVY = "#102D50";
const BLUE = "#174D78";
const TEAL = "#187B83";
const PAGE = "#F4F7FB";
const INK = "#172B42";
const MUTED = "#718096";
const BORDER = "#E6ECF2";
const GREEN = "#059669";
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

      const { data: transactionData, error: transactionError } =
        await supabase
          .from("wallet_transactions")
          .select(
            "id, transaction_type, amount_minor, balance_after_minor, currency_code, description, created_at"
          )
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

  const credits = useMemo(
    () =>
      transactions
        .filter((item) => item.transaction_type === "credit")
        .reduce((sum, item) => sum + Number(item.amount_minor), 0),
    [transactions]
  );

  const debits = useMemo(
    () =>
      transactions
        .filter((item) => item.transaction_type === "debit")
        .reduce((sum, item) => sum + Number(item.amount_minor), 0),
    [transactions]
  );

  const currency = wallet?.currency_code ?? "NGN";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={21} color={NAVY} />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>TRAVELLER FINANCIAL CENTRE</Text>
          <Text style={styles.title}>My Wallet</Text>
        </View>

        <Pressable
          style={styles.headerButton}
          onPress={() => void loadWallet(true)}
        >
          <Ionicons name="refresh-outline" size={21} color={NAVY} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={TEAL} />
          <Text style={styles.loadingText}>Loading your wallet...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadWallet(true)}
              tintColor={TEAL}
            />
          }
        >
          {error ? (
            <View style={styles.messageCard}>
              <View style={styles.messageIcon}>
                <Ionicons name="alert-circle-outline" size={27} color={RED} />
              </View>
              <Text style={styles.cardTitle}>Wallet unavailable</Text>
              <Text style={styles.muted}>{error}</Text>
              <Pressable
                style={styles.primaryButton}
                onPress={() => void loadWallet()}
              >
                <Text style={styles.primaryButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : !wallet ? (
            <View style={styles.messageCard}>
              <View style={styles.messageIcon}>
                <Ionicons name="wallet-outline" size={29} color={TEAL} />
              </View>
              <Text style={styles.cardTitle}>
                Your wallet is being prepared
              </Text>
              <Text style={styles.muted}>
                Your wallet account has not been created yet. Please check
                again shortly.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.balanceCard}>
                <View style={styles.decorCircleOne} />
                <View style={styles.decorCircleTwo} />

                <View style={styles.balanceHeader}>
                  <View>
                    <Text style={styles.balanceLabel}>
                      AVAILABLE WALLET BALANCE
                    </Text>
                    <Text style={styles.balanceAmount}>
                      {money(Number(wallet.balance_minor), currency)}
                    </Text>
                    <Text style={styles.balanceCaption}>
                      Your available TSC wallet funds
                    </Text>
                  </View>

                  <View style={styles.walletIcon}>
                    <Ionicons name="wallet" size={28} color="#FFFFFF" />
                  </View>
                </View>

                <View style={styles.balanceDivider} />

                <View style={styles.balanceFooter}>
                  <View style={styles.statusPill}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            wallet.status === "active" ? "#55E6A5" : "#FFBF69",
                        },
                      ]}
                    />
                    <Text style={styles.statusText}>
                      {wallet.status === "active" ? "Wallet Active" : "Wallet Frozen"}
                    </Text>
                  </View>

                  <Text style={styles.secureText}>
                    <Ionicons name="shield-checkmark" size={12} color="#D5E8F5" />
                    {" "}Secure wallet
                  </Text>
                </View>
              </View>

              <View style={styles.summaryHeading}>
                <Text style={styles.sectionTitle}>Wallet overview</Text>
                <Text style={styles.summarySubtitle}>
                  Latest 50 transactions
                </Text>
              </View>

              <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                  <View style={[styles.summaryIcon, styles.creditBackground]}>
                    <Ionicons name="arrow-down" size={19} color={GREEN} />
                  </View>
                  <Text style={styles.summaryLabel}>TOTAL CREDITS</Text>
                  <Text style={[styles.summaryAmount, { color: GREEN }]}>
                    {money(credits, currency)}
                  </Text>
                </View>

                <View style={styles.summaryCard}>
                  <View style={[styles.summaryIcon, styles.debitBackground]}>
                    <Ionicons name="arrow-up" size={19} color={RED} />
                  </View>
                  <Text style={styles.summaryLabel}>TOTAL DEBITS</Text>
                  <Text style={[styles.summaryAmount, { color: RED }]}>
                    {money(debits, currency)}
                  </Text>
                </View>
              </View>

              <View style={styles.transactionHeading}>
                <View>
                  <Text style={styles.eyebrow}>ACCOUNT ACTIVITY</Text>
                  <Text style={styles.sectionTitle}>Transactions</Text>
                  <Text style={styles.summarySubtitle}>
                    Your recent wallet activity
                  </Text>
                </View>
                <View style={styles.countPill}>
                  <Text style={styles.countText}>
                    {transactions.length} records
                  </Text>
                </View>
              </View>

              {transactions.length === 0 ? (
                <View style={styles.messageCard}>
                  <View style={styles.messageIcon}>
                    <Ionicons
                      name="receipt-outline"
                      size={28}
                      color={MUTED}
                    />
                  </View>
                  <Text style={styles.cardTitle}>No transactions yet</Text>
                  <Text style={styles.muted}>
                    Your wallet transactions will appear here when activity
                    is recorded.
                  </Text>
                </View>
              ) : (
                <View style={styles.transactionList}>
                  {transactions.map((item) => {
                    const isCredit = item.transaction_type === "credit";

                    return (
                      <View key={item.id} style={styles.transactionCard}>
                        <View
                          style={[
                            styles.transactionIcon,
                            isCredit ? styles.creditBackground : styles.debitBackground,
                          ]}
                        >
                          <Ionicons
                            name={isCredit ? "arrow-down" : "arrow-up"}
                            size={20}
                            color={isCredit ? GREEN : RED}
                          />
                        </View>

                        <View style={styles.transactionInfo}>
                          <Text style={styles.transactionTitle} numberOfLines={2}>
                            {item.description ||
                              (isCredit ? "Wallet credit" : "Wallet debit")}
                          </Text>
                          <Text style={styles.transactionDate}>
                            {dateLabel(item.created_at)}
                          </Text>
                          <Text style={styles.transactionBalance}>
                            Balance after:{" "}
                            {money(Number(item.balance_after_minor), item.currency_code)}
                          </Text>
                        </View>

                        <Text
                          style={[
                            styles.transactionAmount,
                            { color: isCredit ? GREEN : RED },
                          ]}
                        >
                          {isCredit ? "+" : "−"}
                          {money(Number(item.amount_minor), item.currency_code)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={15} color={MUTED} />
            <Text style={styles.footerText}>TRAVELLERS SAFETY COVERED</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PAGE,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    marginLeft: 13,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: TEAL,
  },
  title: {
    fontSize: 23,
    fontWeight: "900",
    color: NAVY,
    marginTop: 3,
  },
  content: {
    padding: 18,
    paddingBottom: 35,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 13,
    color: MUTED,
    fontSize: 14,
  },
  balanceCard: {
    backgroundColor: NAVY,
    borderRadius: 23,
    padding: 23,
    marginBottom: 27,
    overflow: "hidden",
  },
  decorCircleOne: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#FFFFFF0B",
    right: -75,
    top: -85,
  },
  decorCircleTwo: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#FFFFFF08",
    right: 30,
    bottom: -85,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  balanceLabel: {
    color: "#C7D8EA",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  balanceAmount: {
    color: "#FFFFFF",
    fontSize: 29,
    fontWeight: "900",
    marginTop: 14,
  },
  balanceCaption: {
    color: "#D0DDEA",
    fontSize: 12,
    marginTop: 7,
  },
  walletIcon: {
    width: 53,
    height: 53,
    borderRadius: 17,
    backgroundColor: "#FFFFFF20",
    alignItems: "center",
    justifyContent: "center",
  },
  balanceDivider: {
    height: 1,
    backgroundColor: "#FFFFFF24",
    marginTop: 23,
    marginBottom: 17,
  },
  balanceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF18",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 25,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  secureText: {
    color: "#D5E8F5",
    fontSize: 11,
    fontWeight: "600",
  },
  summaryHeading: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: INK,
    marginTop: 5,
  },
  summarySubtitle: {
    color: MUTED,
    fontSize: 12,
    marginTop: 5,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 29,
  },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    padding: 14,
  },
  summaryIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },
  creditBackground: {
    backgroundColor: "#D1FAE5",
  },
  debitBackground: {
    backgroundColor: "#FEE2E2",
  },
  summaryLabel: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  summaryAmount: {
    fontSize: 15,
    fontWeight: "900",
    marginTop: 8,
  },
  transactionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  countPill: {
    backgroundColor: "#E8F1FA",
    borderRadius: 25,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  countText: {
    color: BLUE,
    fontSize: 10,
    fontWeight: "800",
  },
  transactionList: {
    gap: 10,
  },
  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 13,
  },
  transactionIcon: {
    width: 41,
    height: 41,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  transactionInfo: {
    flex: 1,
    minWidth: 0,
  },
  transactionTitle: {
    color: INK,
    fontWeight: "800",
    fontSize: 13,
  },
  transactionDate: {
    color: MUTED,
    fontSize: 10,
    marginTop: 5,
  },
  transactionBalance: {
    color: MUTED,
    fontSize: 10,
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 7,
    maxWidth: 115,
    textAlign: "right",
  },
  messageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 23,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    gap: 10,
  },
  messageIcon: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: INK,
    textAlign: "center",
  },
  muted: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 9,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 13,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    marginTop: 30,
  },
  footerText: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
});
