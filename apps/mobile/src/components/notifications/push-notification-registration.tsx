import { useEffect } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { supabase } from "../../../lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function PushNotificationRegistration() {
  const router = useRouter();
  const isAndroidExpoGo = Platform.OS === "android" && (Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient");

  useEffect(() => {
    if (isAndroidExpoGo) {
      console.log("TSC: Push registration disabled in Android development/Expo Go.");
      return;
    }

    let mounted = true;
    const registeringUsers = new Set<string>();
    const registeredUsers = new Set<string>();


    const projectId =
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.eas?.projectId;

    async function savePushToken(userId: string, expoPushToken: string) {
      const { error } = await supabase.from("tsc_push_tokens").upsert(
        {
          user_id: userId,
          expo_push_token: expoPushToken,
          device_platform: Platform.OS,
          device_name: Device.modelName ?? "TSC device",
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          disabled_at: null,
        },
        { onConflict: "expo_push_token" }
      );

      if (error) {
        console.error(
          "TSC push-token database save failed:",
          error.message,
          error.code
        );
        throw error;
      }

      console.log("TSC Expo push token registered successfully.");
    }

    async function registerPushToken(userId: string) {
      if (
        isAndroidExpoGo ||
        !mounted ||
        registeringUsers.has(userId) ||
        registeredUsers.has(userId)
      ) {
        return;
      }

      if (!Device.isDevice || Platform.OS === "web") {
        console.log("TSC push registration requires a physical mobile device.");
        return;
      }

      if (!projectId) {
        console.error("TSC Expo project ID is missing from the app configuration.");
        return;
      }

      registeringUsers.add(userId);

      try {
        let permission = await Notifications.getPermissionsAsync();

        if (permission.status !== "granted") {
          permission = await Notifications.requestPermissionsAsync();
        }

        if (permission.status !== "granted") {
          console.warn("TSC notification permission was not granted.");
          return;
        }

        if (!mounted) return;

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("wallet-updates", {
            name: "Wallet updates",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#F28C28",
            sound: "default",
          });
        }

        let lastError: unknown;

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            console.log(`TSC push registration attempt ${attempt}/3.`);

            const token = await Notifications.getExpoPushTokenAsync({
              projectId,
            });

            if (!mounted) return;

            if (!token.data) {
              throw new Error("Expo returned an empty push token.");
            }

            await savePushToken(userId, token.data);
            registeredUsers.add(userId);
            return;
          } catch (error) {
            lastError = error;
            console.error(
              `TSC push registration attempt ${attempt} failed:`,
              error
            );

            if (attempt < 3) {
              await new Promise((resolve) =>
                setTimeout(resolve, 2000 * attempt)
              );
            }
          }
        }

        console.error("TSC push registration failed after 3 attempts:", lastError);
      } catch (error) {
        console.error("TSC push registration setup failed:", error);
      } finally {
        registeringUsers.delete(userId);
      }
    }

    function handleNotificationResponse(
      response: Notifications.NotificationResponse | null
    ) {
      if (!response || !mounted) return;

      const data = response.notification.request.content.data;

      if (data?.type === "wallet_notification") {
        router.push("/wallet");
        void Notifications.clearLastNotificationResponseAsync();
      }
    }

    // Handle a notification tap that launched the app from a closed state.
    void Notifications.getLastNotificationResponseAsync()
      .then(handleNotificationResponse)
      .catch((error) => {
        console.error("TSC last notification response error:", error);
      });

    // Register the existing session.
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("TSC session lookup for push registration failed:", error);
        return;
      }

      if (data.session && mounted && !isAndroidExpoGo) {
        void registerPushToken(data.session.user.id);
      }
    });

    // Also handle sessions created or restored after the component mounts.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session &&
        mounted &&
        !isAndroidExpoGo &&
        ["INITIAL_SESSION", "SIGNED_IN", "TOKEN_REFRESHED"].includes(event)
      ) {
        void registerPushToken(session.user.id);
      }
    });

    // Local notification listeners remain available in Expo Go.
    const receivedListener =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log(
          "TSC push notification received:",
          notification.request.identifier
        );
      });

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        handleNotificationResponse(response);
      });

    // Remote push-token listener is not supported in Android Expo Go.
    const tokenRefreshListener = isAndroidExpoGo
      ? null
      : Notifications.addPushTokenListener(() => {
          void supabase.auth.getSession().then(({ data, error }) => {
            if (error) {
              console.error(
                "TSC session lookup after token refresh failed:",
                error
              );
              return;
            }

            if (data.session && mounted) {
              registeredUsers.delete(data.session.user.id);
              void registerPushToken(data.session.user.id);
            }
          });
        });

    if (isAndroidExpoGo) {
      console.log(
        "TSC: Remote push registration skipped in Expo Go. Use a development build for push notifications."
      );
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
      receivedListener.remove();
      responseListener.remove();
      tokenRefreshListener?.remove();
    };
  }, [router]);

  return null;
}
