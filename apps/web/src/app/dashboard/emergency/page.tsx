import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import EmergencySupportClient from "./EmergencySupportClient";

export const metadata: Metadata = {
  title: "Emergency Support | TSC",
  description: "Report and review travel-related emergency alerts.",
};

export default async function EmergencySupportPage() {
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
    <EmergencySupportClient
      travellerId={user.id}
      travellerName={profile.full_name || "Traveller"}
    />
  );
}
