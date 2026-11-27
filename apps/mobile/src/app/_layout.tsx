import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import PushNotificationRegistration from "../components/notifications/push-notification-registration";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <PushNotificationRegistration />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: { backgroundColor: "#071D49" },
        }}
      />
    </>
  );
}
