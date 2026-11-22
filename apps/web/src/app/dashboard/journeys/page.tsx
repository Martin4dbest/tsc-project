export const instant = false;

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import JourneyManagementClient from "./JourneyManagementClient";

export const metadata: Metadata = {
  title: "My Journeys | TSC",
  description: "Plan and manage your journeys with Travellers Safety Covered.",
};

export default async function MyJourneysPage() {
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

  const travellerName = profile.full_name?.trim() || "Traveller";
  const firstName = travellerName.split(/\s+/)[0] || "Traveller";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF3FA] via-[#F5F8FC] to-[#EEF3FA] text-[#0F2952] selection:bg-[#F5A623] selection:text-[#0F2952]">
      {/* Vibrant TSC Navy & Gold Top Accent Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0F2952] via-[#1D4ED8] to-[#F5A623]" />

      {/* Sticky Glass Header */}
      <header className="sticky top-0 z-30 border-b border-[#1D4ED8]/15 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-[#1D4ED8]/20 bg-[#EEF4FF] px-3.5 py-2 text-sm font-bold text-[#1D4ED8] transition-all hover:bg-[#0F2952] hover:text-[#F5A623]"
            >
              <span aria-hidden="true">⬅️</span>
              <span>Dashboard</span>
            </Link>

            <span className="hidden text-sm text-[#94A3B8] sm:inline">/</span>

            <span className="hidden items-center gap-1.5 rounded-full bg-amber-100/80 px-3 py-1 text-xs font-bold text-[#B45309] sm:inline-flex">
              <span aria-hidden="true">🧭</span>
              <span>My Journeys</span>
            </span>
          </div>

          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F2952] to-[#1D4ED8] text-sm font-extrabold tracking-wider text-[#F5A623] shadow-xs">
              TSC
            </span>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-extrabold tracking-wide text-[#0F2952]">
                🛡️ TRAVELLERS SAFETY
              </p>
              <p className="text-xs font-bold tracking-widest text-[#D97706]">
                COVERED
              </p>
            </div>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Vibrant Royal Navy & Gold Hero Card */}
        <section className="relative mb-7 overflow-hidden rounded-2xl border border-[#F5A623]/35 bg-gradient-to-br from-[#0F2952] via-[#13356B] to-[#1E40AF] p-6 text-white shadow-md sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-[#F5A623]/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 left-1/4 h-52 w-52 rounded-full bg-emerald-400/15 blur-3xl"
          />

          <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div className="max-w-xl space-y-2.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#F5A623]/40 bg-[#F5A623]/15 px-3.5 py-1 text-xs font-bold tracking-wider text-[#FCD34D] uppercase">
                <span aria-hidden="true">🧳</span>
                <span>Journey Management Centre</span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                <span aria-hidden="true" className="mr-2">
                  ✈️
                </span>
                Ready for your next trip,{" "}
                <span className="text-[#FBBF24]">{firstName}</span>?
              </h1>

              <p className="text-sm leading-relaxed text-blue-100 sm:text-base">
                Create new travel itineraries, activate live safety cover before
                departure, and track every completed journey in one place.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-start md:flex-col md:items-end md:self-center">
              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-200 backdrop-blur-xs">
                <span aria-hidden="true">✅</span>
                <span>Safety Cover Active</span>
              </div>

              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FCD34D] sm:text-sm">
                <span aria-hidden="true">👤</span>
                <span>Traveller: {travellerName}</span>
              </span>
            </div>
          </div>
        </section>

        {/* Colorful 3-Pillar Highlight Strip */}
        <section
          aria-label="Journey protection highlights"
          className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <div className="flex items-center gap-3.5 rounded-2xl border border-blue-200/80 bg-white p-4 shadow-2xs">
            <div
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-lg"
            >
              🗺️
            </div>
            <div>
              <p className="text-sm font-extrabold text-[#1D4ED8]">
                Smart Trip Planning
              </p>
              <p className="text-xs text-slate-600 sm:text-sm">
                Log routes, dates & travel details
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-2xs">
            <div
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-lg"
            >
              🛫
            </div>
            <div>
              <p className="text-sm font-extrabold text-emerald-700">
                Departure & Active Cover
              </p>
              <p className="text-xs text-emerald-700/85 sm:text-sm">
                Green-verified departure tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-amber-200/80 bg-white p-4 shadow-2xs">
            <div
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg"
            >
              ⚡
            </div>
            <div>
              <p className="text-sm font-extrabold text-[#B45309]">
                Live Status Tracking
              </p>
              <p className="text-xs text-slate-600 sm:text-sm">
                Real-time updates & trip history
              </p>
            </div>
          </div>
        </section>

        {/* Main Interactive Journey Client */}
        <JourneyManagementClient
          travellerId={user.id}
          travellerName={travellerName}
        />

        {/* Vibrant Footer */}
        <footer className="mt-8 flex flex-col items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-white px-5 py-4 text-center text-sm sm:flex-row sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span aria-hidden="true" className="text-base">
              🌐
            </span>
            <strong className="font-extrabold text-[#0F2952]">
              TRAVELLERS SAFETY COVERED
            </strong>
            <span className="text-blue-200">|</span>
            <span className="font-medium text-[#1D4ED8]">
              Your safety. Our priority.
            </span>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 font-bold text-[#B45309] transition-colors hover:text-[#0F2952]"
          >
            <span aria-hidden="true">↩️</span>
            <span>Return to Dashboard</span>
          </Link>
        </footer>
      </main>
    </div>
  );
}