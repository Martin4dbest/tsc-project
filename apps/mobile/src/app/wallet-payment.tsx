import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

const API_URL = process.env.EXPO_PUBLIC_TSC_API_URL?.replace(/\/+$/, "");

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function WalletPaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    reference?: string | string[];
    checkoutUrl?: string | string[];
    callbackUrl?: string | string[];
  }>();

  const reference = Array.isArray(params.reference)
    ? params.reference[0]
    : params.reference;

  const checkoutUrl = Array.isArray(params.checkoutUrl)
    ? params.checkoutUrl[0]
    : params.checkoutUrl;

  const callbackUrl = Array.isArray(params.callbackUrl)
    ? params.callbackUrl[0]
    : params.callbackUrl;

  const [checkoutReturned, setCheckoutReturned] = useState(false);
  const [checking, setChecking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState(
    "Complete your payment securely inside TSC."
  );
  const [canRetry, setCanRetry] = useState(false);

  const callbackHandled = useRef(false);
  const verificationRunning = useRef(false);

  const verifyPayment = useCallback(async () => {
    if (!reference || !API_URL || verificationRunning.current) return;

    verificationRunning.current = true;
    setChecking(true);
    setCanRetry(false);
    setMessage("Confirming your payment securely...");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setMessage("Your session has expired. Please sign in again.");
        setCanRetry(true);
        return;
      }

      for (let attempt = 0; attempt < 30; attempt += 1) {
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
          await wait(1400);
          router.replace("/wallet");
          return;
        }

        if (response.status !== 409) {
          setMessage(
            result.error || "We could not verify this payment. Please retry."
          );
          setCanRetry(true);
          return;
        }

        setMessage(
          attempt < 29
            ? "Payment received. Waiting for secure confirmation..."
            : "Confirmation is taking longer than expected. Please check again."
        );

        if (attempt < 29) {
          await wait(3000);
        }
      }

      setCanRetry(true);
    } catch (error) {
      console.error("Mobile wallet payment verification failed:", error);
      setMessage(
        "Unable to reach the payment service. Check your connection and retry."
      );
      setCanRetry(true);
    } finally {
      setChecking(false);
      verificationRunning.current = false;
    }
  }, [reference, router]);

  useEffect(() => {
    if (checkoutReturned && !verificationRunning.current) {
      void verifyPayment();
    }
  }, [checkoutReturned, verifyPayment]);

  const handleNavigation = (request: { url: string }) => {
    if (!callbackUrl || !reference) return true;

    try {
      const requested = new URL(request.url);
      const expected = new URL(callbackUrl);

      if (
        requested.origin === expected.origin &&
        requested.pathname === expected.pathname &&
        requested.searchParams.get("reference") === reference
      ) {
        if (!callbackHandled.current) {
          callbackHandled.current = true;
          setCheckoutReturned(true);
          setMessage("Payment received. Confirming with Paystack...");
        }

        return false;
      }
    } catch {
      // Allow normal checkout navigation for URLs that cannot be parsed.
    }

    return true;
  };

  if (!reference || !checkoutUrl || !callbackUrl) {
    return (
      <View style={styles.page}>
        <View style={styles.card}>
          <Ionicons name="alert-circle-outline" size={42} color="#DC2626" />
          <Text style={styles.title}>Payment session unavailable</Text>
          <Text style={styles.message}>
            The payment details are incomplete. Return to your wallet and try
            again.
          </Text>
          <Pressable
            style={styles.button}
            onPress={() => router.replace("/wallet")}
          >
            <Text style={styles.buttonText}>Return to wallet</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!checkoutReturned) {
    return (
      <View style={styles.checkoutPage}>
        <View style={styles.checkoutHeader}>
          <Pressable
            onPress={() => router.replace("/wallet")}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={23} color="#102D50" />
          </Pressable>
          <View style={styles.checkoutHeaderText}>
            <Text style={styles.checkoutTitle}>Secure Paystack checkout</Text>
            <Text style={styles.checkoutSubtitle}>Your payment stays inside TSC</Text>
          </View>
          <Ionicons name="shield-checkmark" size={22} color="#059669" />
        </View>

        <WebView
          source={{ uri: checkoutUrl }}
          onShouldStartLoadWithRequest={handleNavigation}
          onNavigationStateChange={(navigation) => {
            handleNavigation({ url: navigation.url });
          }}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.webLoading}>
              <ActivityIndicator size="large" color="#187B83" />
              <Text style={styles.message}>Opening secure checkout...</Text>
            </View>
          )}
          onError={() => {
            setMessage("Checkout could not load. Please check your connection.");
          }}
          style={styles.webView}
        />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <View style={[styles.icon, success && styles.successIcon]}>
          {checking ? (
            <ActivityIndicator size="large" color="#187B83" />
          ) : (
            <Ionicons
              name={success ? "checkmark-circle" : "wallet-outline"}
              size={40}
              color={success ? "#059669" : "#187B83"}
            />
          )}
        </View>

        <Text style={styles.title}>
          {success ? "Payment successful" : "Confirming payment"}
        </Text>

        <Text style={styles.message}>{message}</Text>

        {checking && (
          <Text style={styles.waitingText}>
            Please keep TSC open while we confirm your transaction.
          </Text>
        )}

        {!checking && canRetry && (
          <Pressable style={styles.button} onPress={() => void verifyPayment()}>
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
  checkoutPage: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
  checkoutHeader: {
    minHeight: 65,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E6ECF2",
    gap: 12,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutHeaderText: {
    flex: 1,
  },
  checkoutTitle: {
    color: "#102D50",
    fontSize: 14,
    fontWeight: "900",
  },
  checkoutSubtitle: {
    color: "#718096",
    fontSize: 11,
    marginTop: 3,
  },
  webView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  webLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
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
  waitingText: {
    color: "#187B83",
    fontSize: 12,
    textAlign: "center",
    marginTop: 14,
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
