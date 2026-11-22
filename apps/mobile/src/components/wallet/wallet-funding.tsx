import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../../../lib/supabase";

const API_URL = process.env.EXPO_PUBLIC_TSC_API_URL?.replace(/\/+$/, "");

const NAVY = "#102D50";
const TEAL = "#187B83";
const INK = "#172B42";
const MUTED = "#718096";
const BORDER = "#E6ECF2";
const GREEN = "#059669";
const RED = "#DC2626";

type Props = {
  walletActive: boolean;
  onWalletUpdated: () => void;
};

export default function WalletFunding({ walletActive }: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState("5000");
  const [funding, setFunding] = useState(false);
  const [pendingReference, setPendingReference] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error" | "info">(
    "info"
  );

  const showNotice = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    setNotice(message);
    setNoticeType(type);
  };

  const openVerification = (reference: string) => {
    router.push({
      pathname: "/wallet-payment",
      params: { reference },
    });
  };

  const startFunding = async () => {
    const naira = Number(amount.trim().replace(/,/g, ""));
    const amountMinor = Math.round(naira * 100);

    if (
      !Number.isFinite(naira) ||
      !Number.isSafeInteger(amountMinor) ||
      amountMinor <= 0
    ) {
      showNotice("Enter a valid amount in naira.", "error");
      return;
    }

    if (!walletActive) {
      showNotice("Your wallet is frozen and cannot receive funding.", "error");
      return;
    }

    if (!API_URL) {
      showNotice("Payment service configuration is missing.", "error");
      return;
    }

    setFunding(true);
    setNotice("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        showNotice("Please sign in again before funding your wallet.", "error");
        return;
      }

      const redirectUrl = Linking.createURL("wallet-payment");

      const response = await fetch(
        `${API_URL}/api/payments/paystack/initialize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            amountMinor,
            platform: "mobile",
            returnUrl: redirectUrl,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.authorizationUrl || !result.reference) {
        showNotice(
          result.error || "Unable to start payment. Please try again.",
          "error"
        );
        return;
      }

      setPendingReference(result.reference);
      showNotice("Paystack checkout is opening securely inside TSC.", "info");

      const checkout = await WebBrowser.openAuthSessionAsync(
        result.authorizationUrl,
        redirectUrl
      );

      if (checkout.type === "success" && checkout.url) {
        const returnedUrl = new URL(checkout.url);
        const returnedReference =
          returnedUrl.searchParams.get("reference");

        if (returnedReference) {
          setPendingReference("");
          openVerification(returnedReference);
          return;
        }
      }

      // Expo Router may already have received the deep link on Android.
      // Keep the reference available in case the customer needs to verify manually.
      if (checkout.type === "cancel" || checkout.type === "dismiss") {
        showNotice(
          "Checkout was closed. If you completed payment, check its status below.",
          "info"
        );
      }
    } catch (error) {
      console.error("Mobile wallet funding failed:", error);
      showNotice(
        "Unable to open or complete Paystack checkout. Please try again.",
        "error"
      );
    } finally {
      setFunding(false);
    }
  };

  const formattedAmount = Number(amount.replace(/,/g, ""));

  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <View style={styles.iconBox}>
          <Ionicons name="add-circle-outline" size={24} color={TEAL} />
        </View>
        <View style={styles.headingText}>
          <Text style={styles.title}>Fund your wallet</Text>
          <Text style={styles.subtitle}>
            Add money securely using Paystack
          </Text>
        </View>
        <View style={styles.secureIcon}>
          <Ionicons name="shield-checkmark" size={17} color={GREEN} />
        </View>
      </View>

      <Text style={styles.label}>AMOUNT (NGN)</Text>

      <View style={styles.amountInput}>
        <Text style={styles.currency}>₦</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="Enter amount"
          placeholderTextColor="#A0AEC0"
          editable={!funding}
          style={styles.input}
        />
      </View>

      <Text style={styles.amountHint}>
        {Number.isFinite(formattedAmount) && formattedAmount > 0
          ? `You are funding ${new Intl.NumberFormat("en-NG", {
              style: "currency",
              currency: "NGN",
              minimumFractionDigits: 2,
            }).format(formattedAmount)}`
          : "Enter the amount you want to add"}
      </Text>

      <Pressable
        onPress={() => void startFunding()}
        disabled={funding || !walletActive}
        style={[
          styles.button,
          (!walletActive || funding) && styles.buttonDisabled,
        ]}
      >
        {funding ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="lock-closed-outline" size={17} color="#FFFFFF" />
            <Text style={styles.buttonText}>Continue to Paystack</Text>
            <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
          </>
        )}
      </Pressable>

      {!walletActive && (
        <Text style={styles.disabledText}>
          Wallet funding is unavailable while your wallet is frozen.
        </Text>
      )}

      {notice ? (
        <View
          style={[
            styles.notice,
            noticeType === "success" && styles.successNotice,
            noticeType === "error" && styles.errorNotice,
          ]}
        >
          <Ionicons
            name={
              noticeType === "success"
                ? "checkmark-circle"
                : noticeType === "error"
                  ? "alert-circle"
                  : "information-circle"
            }
            size={19}
            color={
              noticeType === "success"
                ? GREEN
                : noticeType === "error"
                  ? RED
                  : TEAL
            }
          />
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      {pendingReference ? (
        <Pressable
          onPress={() => openVerification(pendingReference)}
          style={styles.checkButton}
        >
          <Ionicons name="refresh-outline" size={17} color={TEAL} />
          <Text style={styles.checkButtonText}>Check payment status</Text>
        </Pressable>
      ) : null}

      <View style={styles.footer}>
        <Ionicons name="lock-closed" size={12} color={MUTED} />
        <Text style={styles.footerText}>
          Payments are verified securely before your wallet is credited.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 17,
    marginBottom: 25,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 21,
  },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: "#E8F5F4",
    alignItems: "center",
    justifyContent: "center",
  },
  headingText: {
    flex: 1,
    marginLeft: 11,
  },
  title: {
    color: NAVY,
    fontSize: 17,
    fontWeight: "900",
  },
  subtitle: {
    color: MUTED,
    fontSize: 11,
    marginTop: 4,
  },
  secureIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
    marginBottom: 8,
  },
  amountInput: {
    height: 55,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  currency: {
    color: NAVY,
    fontSize: 22,
    fontWeight: "900",
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: INK,
    fontSize: 20,
    fontWeight: "800",
    paddingVertical: 0,
  },
  amountHint: {
    color: MUTED,
    fontSize: 11,
    marginTop: 8,
    marginBottom: 15,
  },
  button: {
    minHeight: 51,
    borderRadius: 13,
    backgroundColor: TEAL,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 15,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  disabledText: {
    color: RED,
    fontSize: 11,
    marginTop: 10,
    textAlign: "center",
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 11,
    marginTop: 13,
    borderRadius: 11,
    backgroundColor: "#E8F5F4",
  },
  successNotice: {
    backgroundColor: "#ECFDF5",
  },
  errorNotice: {
    backgroundColor: "#FEF2F2",
  },
  noticeText: {
    flex: 1,
    color: INK,
    fontSize: 11,
    lineHeight: 17,
  },
  checkButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 10,
  },
  checkButtonText: {
    color: TEAL,
    fontSize: 12,
    fontWeight: "900",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 15,
  },
  footerText: {
    flex: 1,
    color: MUTED,
    fontSize: 10,
    lineHeight: 15,
  },
});
