export const instant = false;

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import GPSTrackingClient from "./GPSTrackingClient";

export const metadata: Metadata = {
  title: "GPS Tracking | TSC",
  description: "View and manage GPS location sharing for your active journeys.",
};

export default async function GPSTrackingPage() {
  await connection();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, role, account_status")
    .eq("user_id", user.id)
    .single();

  if (error || !profile || profile.account_status !== "active") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  if (profile.role !== "traveller") redirect("/admin");

  return (
    <GPSTrackingClient
      travellerId={user.id}
      travellerName={profile.full_name || "Traveller"}
    />
  );
}
