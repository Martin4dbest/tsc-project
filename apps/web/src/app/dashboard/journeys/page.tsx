import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import JourneyManagementClient from "./JourneyManagementClient";

export const metadata: Metadata = {
  title: "My Journeys | TSC",
  description: "Plan and manage your journeys with Travellers Safety Covered.",
};

export default async function MyJourneysPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

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
    <JourneyManagementClient
      travellerId={user.id}
      travellerName={profile.full_name || "Traveller"}
    />
  );
}
