import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../lib/supabase";

type Notification = {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

const NAVY = "#102D50";
const BLUE = "#174D78";
const MUTED = "#718096";
const BORDER = "#E6ECF2";
const TEAL = "#187B83";

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

export default function WalletNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setNotifications([]);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("tsc_notifications")
        .select("id, notification_type, title, message, read_at, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (queryError) throw queryError;

      setNotifications((data ?? []) as Notification[]);
    } catch (err) {
      console.error("Wallet notifications loading failed:", err);
      setError("Unable to load wallet notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications])
  );

  const markAsRead = async (notificationId: string) => {
    setUpdatingId(notificationId);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("Please sign in again.");
      }

      const { error: updateError } = await supabase
        .from("tsc_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", session.user.id)
        .is("read_at", null);

      if (updateError) throw updateError;

      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId
            ? { ...item, read_at: new Date().toISOString() }
            : item
        )
      );
    } catch (err) {
      console.error("Wallet notification update failed:", err);
      setError("Unable to mark this notification as read. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  return (
    <View style={{ marginBottom: 27 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 13,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: TEAL,
              fontSize: 10,
              fontWeight: "900",
              letterSpacing: 1.1,
            }}
          >
            ACCOUNT UPDATES
          </Text>
          <Text
            style={{
              color: NAVY,
              fontSize: 20,
              fontWeight: "900",
              marginTop: 5,
            }}
          >
            Wallet notifications
          </Text>
          <Text style={{ color: MUTED, fontSize: 12, marginTop: 5 }}>
            Updates about credits and debits to your wallet.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "#E8F1FA",
            borderRadius: 20,
            paddingHorizontal: 11,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: BLUE, fontSize: 11, fontWeight: "900" }}>
            {unreadCount} unread
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={TEAL} />
      ) : error && notifications.length === 0 ? (
        <Text style={{ color: "#DC2626", fontSize: 12 }}>{error}</Text>
      ) : notifications.length === 0 ? (
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: BORDER,
            borderRadius: 17,
            padding: 20,
            alignItems: "center",
          }}
        >
          <Ionicons name="notifications-outline" size={27} color={MUTED} />
          <Text
            style={{
              color: NAVY,
              fontSize: 14,
              fontWeight: "800",
              marginTop: 9,
            }}
          >
            No wallet notifications
          </Text>
          <Text
            style={{
              color: MUTED,
              fontSize: 12,
              textAlign: "center",
              marginTop: 5,
            }}
          >
            Wallet adjustment updates will appear here.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {notifications.map((item) => {
            const isCredit = item.notification_type === "wallet_credit";

            return (
              <View
                key={item.id}
                style={{
                  backgroundColor: item.read_at ? "#FFFFFF" : "#EFF6FF",
                  borderWidth: 1,
                  borderColor: item.read_at ? BORDER : "#BFDBFE",
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <View style={{ flexDirection: "row", gap: 11 }}>
                  <View
                    style={{
                      width: 39,
                      height: 39,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isCredit ? "#D1FAE5" : "#FEF3C7",
                    }}
                  >
                    <Ionicons
                      name={isCredit ? "arrow-down" : "arrow-up"}
                      size={20}
                      color={isCredit ? "#059669" : "#B45309"}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 7,
                      }}
                    >
                      <Text
                        style={{
                          color: NAVY,
                          fontSize: 14,
                          fontWeight: "900",
                        }}
                      >
                        {item.title}
                      </Text>
                      {!item.read_at && (
                        <Text
                          style={{
                            color: BLUE,
                            fontSize: 9,
                            fontWeight: "900",
                          }}
                        >
                          NEW
                        </Text>
                      )}
                    </View>

                    <Text
                      style={{
                        color: "#526477",
                        fontSize: 12,
                        lineHeight: 19,
                        marginTop: 5,
                      }}
                    >
                      {item.message}
                    </Text>

                    <Text
                      style={{
                        color: MUTED,
                        fontSize: 10,
                        marginTop: 7,
                      }}
                    >
                      {dateLabel(item.created_at)}
                    </Text>

                    {!item.read_at && (
                      <Pressable
                        disabled={updatingId === item.id}
                        onPress={() => void markAsRead(item.id)}
                        style={{
                          alignSelf: "flex-start",
                          marginTop: 10,
                          backgroundColor: TEAL,
                          borderRadius: 9,
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                          opacity: updatingId === item.id ? 0.6 : 1,
                        }}
                      >
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: 11,
                            fontWeight: "900",
                          }}
                        >
                          {updatingId === item.id
                            ? "Updating..."
                            : "Mark as read"}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {!!error && notifications.length > 0 && (
        <Text style={{ color: "#DC2626", fontSize: 11, marginTop: 8 }}>
          {error}
        </Text>
      )}
    </View>
  );
}
