import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

const API_URL = process.env.EXPO_PUBLIC_TSC_API_URL?.replace(/\/+$/, "");

export default function WalletPaymentReturnScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ reference?: string | string[] }>();

  const reference = Array.isArray(params.reference)
    ? params.reference[0]
    : params.reference;

  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState(
    "Confirming your payment securely..."
  );
  const [success, setSuccess] = useState(false);
  const started = useRef(false);

  const verifyPayment = useCallback(async () => {
    if (!reference) {
      setChecking(false);
      setMessage("Payment reference is missing. Please check your wallet.");
      return;
    }

    if (!API_URL) {
      setChecking(false);
      setMessage("Payment service configuration is missing.");
      return;
    }

    setChecking(true);
    setMessage("Confirming your payment securely...");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setMessage("Please sign in again to verify your payment.");
        setChecking(false);
        return;
      }

      const response = await fetch(
        `${API_URL}/api/payments/paystack/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ reference }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess(true);
        setMessage("Payment confirmed. Your wallet has been funded.");
        setChecking(false);

        setTimeout(() => {
          router.replace("/wallet");
        }, 1200);

        return;
      }

      if (response.status === 409) {
        setMessage(
          "Your payment is not confirmed yet. Please check again shortly."
        );
      } else {
        setMessage(
          result.error || "We could not verify this payment. Please try again."
        );
      }
    } catch (error) {
      console.error("Wallet return verification failed:", error);
      setMessage(
        "Unable to reach the payment service. Check your connection and retry."
      );
    } finally {
      setChecking(false);
    }
  }, [reference, router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void verifyPayment();
  }, [verifyPayment]);

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <View style={[styles.icon, success && styles.successIcon]}>
          {checking ? (
            <ActivityIndicator size="large" color="#187B83" />
          ) : (
            <Ionicons
              name={success ? "checkmark-circle" : "wallet-outline"}
              size={38}
              color={success ? "#059669" : "#187B83"}
            />
          )}
        </View>

        <Text style={styles.title}>
          {success ? "Payment successful" : "Verifying payment"}
        </Text>

        <Text style={styles.message}>{message}</Text>

        {!checking && !success && (
          <Pressable
            style={styles.button}
            onPress={() => void verifyPayment()}
          >
            <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
            <Text style={styles.buttonText}>Check payment again</Text>
          </Pressable>
        )}

        {!checking && (
          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.replace("/wallet")}
          >
            <Text style={styles.secondaryButtonText}>Return to wallet</Text>
          </Pressable>
        )}

        <Text style={styles.footer}>
          TSC verifies every payment securely before updating your wallet.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F4F7FB",
    justifyContent: "center",
    padding: 22,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E6ECF2",
  },
  icon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: "#E8F5F4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successIcon: {
    backgroundColor: "#ECFDF5",
  },
  title: {
    color: "#102D50",
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
  },
  message: {
    color: "#718096",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 12,
  },
  button: {
    minHeight: 49,
    width: "100%",
    marginTop: 20,
    borderRadius: 13,
    backgroundColor: "#187B83",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 15,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: "#E8F5F4",
  },
  secondaryButtonText: {
    color: "#187B83",
    fontSize: 13,
    fontWeight: "800",
  },
  footer: {
    color: "#718096",
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 22,
  },
});
