export const instant = false;

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import SafetyProfileClient from "./SafetyProfileClient";

export const metadata: Metadata = {
  title: "Safety Protection | TSC",
  description:
    "Manage your traveller safety profile and emergency contacts.",
};

export default async function SafetyProtectionPage() {
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
    <SafetyProfileClient
      travellerName={profile.full_name || "Traveller"}
    />
  );
}
