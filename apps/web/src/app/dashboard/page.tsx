import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { signOut } from "@/app/actions";

export const instant = false;

export const metadata: Metadata = {
  title: "Traveller Dashboard | TSC",
  description: "Your personal Travellers Safety Covered dashboard.",
};

interface ServiceItem {
  number: string;
  category: string;
  emoji: string;
  title: string;
  description: string;
  image: string;
  titleColorClass: string;
  accentDotClass: string;
  href?: string;
  featured?: boolean;
}

const services: ServiceItem[] = [
  {
    number: "01",
    category: "JOURNEY MANAGEMENT",
    emoji: "🧭",
    title: "My Journeys",
    description:
      "Plan trips, activate travel safety, and view your journey history.",
    image: "photo-1436491865332-7a61a109cc05",
    titleColorClass: "text-blue-700 group-hover:text-blue-800",
    accentDotClass: "bg-blue-600",
    href: "/dashboard/journeys",
    featured: true,
  },
  {
    number: "06",
    category: "EMERGENCY OPERATIONS",
    emoji: "🚨",
    title: "Emergency Support",
    description:
      "Request rapid assistance and follow up on live emergency alerts.",
    image: "photo-1584515933487-779824d29309",
    titleColorClass: "text-amber-700 group-hover:text-amber-800",
    accentDotClass: "bg-amber-500",
    href: "/dashboard/emergency",
    featured: true,
  },
  {
    number: "02",
    category: "WALLET MANAGEMENT",
    emoji: "👛",
    title: "My Wallet",
    description: "View your wallet balance, fund safely, and track transactions.",
    href: "/dashboard/wallet",
    image: "photo-1554224155-6726b3ff858f",
    titleColorClass: "text-emerald-700 group-hover:text-emerald-800",
    accentDotClass: "bg-emerald-600",
  },
  {
    number: "03",
    category: "PAYMENTS",
    emoji: "💳",
    title: "Payments",
    description: "Manage travel payments, references, and payment activity.",
    href: "/dashboard/payments",
    image: "photo-1556742049-0cfed4f6a45d",
    titleColorClass: "text-indigo-700 group-hover:text-indigo-800",
    accentDotClass: "bg-indigo-600",
  },
  {
    number: "04",
    category: "SAFETY PROTECTION",
    emoji: "🛡️",
    title: "Travel Protection",
    description:
      "Explore trip-based protection and manage your active travel coverage.",
    image: "photo-1519681393784-d120267933ba",
    titleColorClass: "text-[#187B83] group-hover:text-[#136268]",
    accentDotClass: "bg-[#187B83]",
    href: "/dashboard/safety",
  },
  {
    number: "05",
    category: "GPS TRACKING",
    emoji: "📍",
    title: "Live Location",
    description: "Control location sharing and real-time journey tracking.",
    image: "photo-1473448912268-2022ce9509d8",
    titleColorClass: "text-cyan-700 group-hover:text-cyan-800",
    accentDotClass: "bg-cyan-600",
    href: "/dashboard/gps-tracking",
  },
  {
    number: "07",
    category: "CLAIMS & COMPENSATION",
    emoji: "📄",
    title: "Claims Centre",
    description:
      "Submit and follow up on eligible travel claims and compensation.",
    image: "photo-1450101499163-c8848c66ca85",
    titleColorClass: "text-violet-700",
    accentDotClass: "bg-violet-600",
  },
  {
    number: "08",
    category: "TRAVEL PARTNERS",
    emoji: "🏥",
    title: "Partner Network",
    description:
      "Discover verified hospitals, emergency responders, and travel partners.",
    image: "photo-1521737711867-e3b97375f902",
    titleColorClass: "text-green-700",
    accentDotClass: "bg-green-600",
  },
  {
    number: "09",
    category: "ANALYTICS & INTELLIGENCE",
    emoji: "📊",
    title: "Travel Insights",
    description:
      "View journey activity, safety advisories, and account insights.",
    image: "photo-1516321318423-f06f85e504b3",
    titleColorClass: "text-sky-700",
    accentDotClass: "bg-sky-600",
  },
];

function imageUrl(photo: string) {
  return `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=1000&q=85`;
}

const navItems = [
  { href: "/dashboard/journeys", emoji: "🧭", label: "My Journeys" },
  { href: "/dashboard/wallet", emoji: "👛", label: "My Wallet" },
  { href: "/dashboard/payments", emoji: "💳", label: "Payments" },
  { href: "/dashboard/safety", emoji: "🛡️", label: "Travel Protection" },
  { href: "/dashboard/gps-tracking", emoji: "📍", label: "Live Location" },
];

function SidebarContent({
  fullName,
  initials,
}: {
  fullName: string;
  initials: string;
}) {
  return (
    <div className="flex h-full flex-col justify-between bg-gradient-to-b from-[#0A1F44] via-[#091B3B] to-[#06132A] p-5 text-white">
      <div className="space-y-5">
        {/* Brand Header */}
        <Link
          href="/"
          className="group flex items-center gap-3 rounded-2xl border border-[#F5A623]/25 bg-white/[0.05] p-3 transition hover:border-[#F5A623]/50 hover:bg-white/[0.08]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FBBF24] to-[#E98012] text-xs font-black tracking-wider text-[#0A1F44] shadow-xs transition-transform group-hover:scale-105">
            TSC
          </div>
          <div className="leading-tight">
            <p className="text-xs font-extrabold tracking-wide text-white">
              TRAVELLERS SAFETY
            </p>
            <p className="mt-0.5 text-[10px] font-bold tracking-[0.18em] text-[#F5A623]">
              COVERED
            </p>
          </div>
        </Link>

        {/* Traveller Profile Card */}
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300/40 bg-[#187B83] text-xs font-black text-white shadow-2xs">
              {initials || "JJ"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-extrabold text-white">
                {fullName}
              </p>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                <span>Active Protection</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label="Quick Access" className="space-y-1.5">
          <div className="flex items-center justify-between px-2 pb-1">
            <p className="text-[10px] font-extrabold tracking-[0.14em] text-[#F5A623]/85 uppercase">
              Quick Access
            </p>
            <span className="ml-2.5 h-px flex-1 bg-[#F5A623]/20" />
          </div>

          <a
            href="#overview"
            className="flex items-center justify-between rounded-xl bg-[#F5A623] px-3.5 py-2.5 text-xs font-extrabold text-[#0A1F44] shadow-2xs"
          >
            <span className="flex items-center gap-2.5">
              <span aria-hidden="true" className="text-sm">
                🏠
              </span>
              <span>Dashboard Home</span>
            </span>
            <span aria-hidden="true" className="text-xs font-black">
              •
            </span>
          </a>

          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center justify-between rounded-xl border border-transparent px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-[#F5A623]/30 hover:bg-white/[0.08] hover:text-white"
            >
              <span className="flex items-center gap-2.5">
                <span aria-hidden="true" className="text-sm">
                  {item.emoji}
                </span>
                <span>{item.label}</span>
              </span>
              <span
                aria-hidden="true"
                className="text-xs text-[#F5A623] transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>
          ))}

          <Link
            href="/dashboard/emergency"
            className="group mt-2 flex items-center justify-between rounded-xl border border-[#F5A623]/45 bg-[#F5A623]/15 px-3.5 py-2.5 text-xs font-bold text-[#FBBF24] transition hover:border-[#F5A623] hover:bg-[#F5A623]/25"
          >
            <span className="flex items-center gap-2.5">
              <span aria-hidden="true" className="text-sm">
                🚨
              </span>
              <span>Emergency Support</span>
            </span>
            <span
              aria-hidden="true"
              className="text-xs text-[#F5A623] transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="space-y-3 border-t border-white/10 pt-4">
        <p className="px-1 text-[10px] font-medium text-slate-400">
          Your safety. Our priority.
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-[#F5A623]/30 bg-white/[0.06] px-3.5 py-2.5 text-xs font-bold text-white transition hover:border-[#F5A623] hover:bg-[#F5A623] hover:text-[#0A1F44]"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="text-sm">
                🚪
              </span>
              <span>Sign out</span>
            </span>
            <span aria-hidden="true">↗</span>
          </button>
        </form>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 p-4">
      <div className="h-24 animate-pulse rounded-2xl border border-[#E6ECF2] bg-white p-4" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
        {[0, 1].map((item) => (
          <div
            key={item}
            className="h-40 animate-pulse rounded-2xl border border-[#E6ECF2] bg-white p-3"
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div
            key={item}
            className="h-48 animate-pulse rounded-2xl border border-[#E6ECF2] bg-white p-3"
          />
        ))}
      </div>
    </div>
  );
}

async function TravellerDashboardContent() {
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

  if (error || !profile) {
    await supabase.auth.signOut();
    redirect("/login?reason=profile");
  }

  if (profile.account_status !== "active") {
    await supabase.auth.signOut();
    redirect("/login?reason=suspended");
  }

  if (profile.role !== "traveller") redirect("/admin");

  const fullName = profile.full_name?.trim() || "John Joe";
  const firstName = fullName.split(/\s+/)[0] || "Traveller";
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((n: string) => n[0]?.toUpperCase() ?? "")
    .join("");

  const featuredServices = services.filter((s) => s.featured);
  const standardServices = services.filter((s) => !s.featured);

  return (
    <div className="min-h-screen bg-[#F4F7FB] pb-20 text-[#0A1F44] lg:flex lg:pb-0">
      {/* DESKTOP FIXED SIDEBAR */}
      <aside
        aria-label="Desktop navigation sidebar"
        className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-64 lg:border-r lg:border-[#F5A623]/25 lg:shadow-lg"
      >
        <SidebarContent fullName={fullName} initials={initials} />
      </aside>

      {/* MOBILE SLIDE-OVER SIDEBAR DRAWER */}
      <div className="lg:hidden">
        <input
          id="mobile-sidebar-toggle"
          type="checkbox"
          className="peer sr-only"
          aria-hidden="true"
        />

        {/* Backdrop */}
        <label
          htmlFor="mobile-sidebar-toggle"
          aria-label="Close sidebar"
          className="pointer-events-none fixed inset-0 z-40 bg-[#06132A]/60 opacity-0 backdrop-blur-2xs transition-opacity duration-200 peer-checked:pointer-events-auto peer-checked:opacity-100"
        />

        {/* Slide-over Sidebar Panel */}
        <aside
          aria-label="Mobile navigation sidebar"
          className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] -translate-x-full border-r border-[#F5A623]/30 shadow-2xl transition-transform duration-200 ease-out peer-checked:translate-x-0"
        >
          <div className="relative h-full">
            <label
              htmlFor="mobile-sidebar-toggle"
              aria-label="Close sidebar menu"
              className="absolute top-3.5 right-3.5 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[#F5A623]/30 bg-[#0A1F44] text-xs font-bold text-[#F5A623] hover:bg-[#F5A623] hover:text-[#0A1F44]"
            >
              ✕
            </label>
            <SidebarContent fullName={fullName} initials={initials} />
          </div>
        </aside>

        {/* MOBILE TOP HEADER */}
        <header className="sticky top-0 z-30 border-b border-[#E6ECF2] bg-white/95 px-3.5 py-2.5 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <label
                htmlFor="mobile-sidebar-toggle"
                className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg bg-[#0A1F44] px-2.5 py-1 text-[11px] font-bold text-[#F5A623] shadow-2xs active:scale-95"
              >
                <span aria-hidden="true">☰</span>
                <span>Menu</span>
              </label>

              <Link href="/" className="flex min-w-0 items-center gap-1.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#F5A623] text-[10px] font-black text-[#0A1F44]">
                  TSC
                </span>
                <span className="truncate text-[11px] font-extrabold tracking-tight text-[#0A1F44]">
                  TRAVELLERS SAFETY
                </span>
              </Link>
            </div>

            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border border-[#E6ECF2] bg-[#F4F7FB] px-2.5 py-1 text-[11px] font-bold text-[#0A1F44] transition hover:border-[#0A1F44]/30 hover:bg-[#0A1F44] hover:text-[#F5A623]"
              >
                <span>🚪</span>
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </header>
      </div>

      {/* MAIN WORKSPACE CONTENT */}
      <main id="overview" className="flex-1 lg:pl-64">
        <div className="mx-auto max-w-6xl px-3.5 py-4 sm:px-6 sm:py-7">
          {/* Welcome & Quick Actions Card */}
          <section className="mb-5 rounded-2xl bg-[#102D50] p-4 text-white shadow-sm sm:mb-6 sm:rounded-3xl sm:p-6">
            <div className="flex flex-col justify-between gap-3.5 md:flex-row md:items-center">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[9px] font-extrabold tracking-[0.14em] text-[#FBBF24] uppercase sm:text-[10px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#E98012]" />
                    <span>Personal Safety Centre</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200 md:hidden">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Active</span>
                  </span>
                </div>

                <h1 className="text-lg font-black tracking-tight text-white sm:text-2xl">
                  Welcome back, {firstName} 👋
                </h1>
                <p className="max-w-2xl text-[11px] leading-4 text-[#DCE8F4] sm:text-sm sm:leading-5">
                  Manage your journeys, wallet, payments, and live protection in
                  one place.
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 sm:justify-start sm:gap-2.5">
                <div className="hidden min-h-10 items-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-200 md:inline-flex">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Account Active</span>
                </div>
                <Link
                  href="/dashboard/journeys"
                  className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-[#187B83] px-3.5 py-1.5 text-xs font-extrabold text-white shadow-2xs transition hover:bg-[#14686F] sm:min-h-10 sm:w-auto sm:px-4 sm:py-2 sm:text-sm"
                >
                  <span>🧭</span>
                  <span>+ New Journey</span>
                </Link>
              </div>
            </div>
          </section>

          {/* PRIORITY OPERATIONS (2 Columns on Mobile) */}
          <section aria-label="Priority services" className="mb-6 sm:mb-7">
            <div className="mb-2.5 flex items-center justify-between gap-2 sm:mb-3.5">
              <div>
                <h2 className="text-xs font-black tracking-tight text-[#0A1F44] sm:text-base">
                  Priority Operations ⚡
                </h2>
                <p className="hidden text-xs text-[#718096] sm:block">
                  Fast access to trip safety and emergency response
                </p>
              </div>
              <span className="rounded-full border border-[#F5A623]/40 bg-[#F5A623]/15 px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-[#9A6208] uppercase sm:px-2.5 sm:py-1 sm:text-[10px]">
                Instant Access
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-2">
              {featuredServices.map((service) => (
                <Link
                  key={service.number}
                  href={service.href!}
                  className="group flex flex-col overflow-hidden rounded-xl border border-[#E6ECF2] bg-white shadow-2xs transition-all hover:-translate-y-0.5 hover:border-[#187B83]/50 hover:shadow-md sm:flex-row sm:rounded-2xl"
                >
                  <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-slate-100 sm:aspect-auto sm:w-44">
                    <img
                      src={imageUrl(service.image)}
                      alt={service.title}
                      className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                    />
                    <span className="absolute top-1.5 right-1.5 rounded bg-[#102D50]/90 px-1.5 py-0.5 text-[9px] font-extrabold text-[#FBBF24] sm:hidden">
                      {service.number}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-2.5 sm:p-4">
                    <div>
                      <div className="mb-1 hidden items-center justify-between gap-2 sm:flex">
                        <span className="text-[10px] font-extrabold tracking-wider text-[#187B83] uppercase">
                          {service.category}
                        </span>
                        <span className="rounded-md bg-[#102D50] px-2 py-0.5 text-[10px] font-extrabold text-[#FBBF24]">
                          {service.number}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span aria-hidden="true" className="text-sm sm:text-base">
                          {service.emoji}
                        </span>
                        <h3
                          className={`text-xs font-black tracking-tight transition-colors sm:text-base ${service.titleColorClass}`}
                        >
                          {service.title}
                        </h3>
                      </div>

                      <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-[#718096] sm:mt-1.5 sm:line-clamp-none sm:text-xs sm:leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between border-t border-[#E6ECF2] pt-2 sm:mt-3.5 sm:pt-2.5">
                      <span className="truncate text-[10px] font-extrabold text-[#102D50] group-hover:text-[#187B83] sm:text-xs">
                        Open
                      </span>
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#F5A623] text-[11px] font-black text-[#0A1F44] transition-transform group-hover:translate-x-0.5 sm:h-7 sm:w-7 sm:rounded-lg sm:text-xs">
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ALL OTHER TRAVEL SERVICES (2 Columns on Mobile) */}
          <section id="services" className="mb-6 sm:mb-8">
            <div className="mb-2.5 flex items-center justify-between gap-2 sm:mb-4">
              <div>
                <h2 className="text-sm font-black tracking-tight text-[#0A1F44] sm:text-lg">
                  All Travel Services 🧳
                </h2>
                <p className="hidden text-xs text-[#718096] sm:block">
                  Full suite of wallet, payments, protection, and tracking tools
                </p>
              </div>
              <span className="rounded-full border border-[#E6ECF2] bg-white px-2.5 py-0.5 text-[9px] font-extrabold tracking-wider text-[#102D50] uppercase shadow-2xs sm:px-3 sm:py-1 sm:text-[10px]">
                09 Modules
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-3">
              {standardServices.map((service) => {
                const isAvailable = Boolean(service.href);

                const cardInner = (
                  <article
                    className={`group flex h-full flex-col overflow-hidden rounded-xl border bg-white p-2.5 transition-all sm:rounded-2xl sm:p-3.5 ${
                      isAvailable
                        ? "border-[#E6ECF2] shadow-2xs hover:-translate-y-0.5 hover:border-[#187B83]/50 hover:shadow-md"
                        : "border-[#E6ECF2]/80 opacity-80"
                    }`}
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-[#E6ECF2] bg-slate-100 sm:rounded-xl">
                      <img
                        src={imageUrl(service.image)}
                        alt={service.title}
                        className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>

                    <div className="flex flex-1 flex-col justify-between pt-2.5 sm:pt-3.5">
                      <div>
                        <div className="mb-1 flex items-center justify-between gap-1.5 sm:mb-1.5">
                          <span className="truncate text-[9px] font-extrabold tracking-wider text-[#718096] uppercase sm:text-[10px]">
                            {service.number} • {service.category}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold sm:px-2.5 sm:text-[10px] ${
                              isAvailable
                                ? "bg-[#E6F4F3] text-[#187B83]"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {isAvailable ? "Active" : "Soon"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span aria-hidden="true" className="text-sm sm:text-base">
                            {service.emoji}
                          </span>
                          <h3
                            className={`truncate text-xs font-black tracking-tight transition-colors sm:text-base ${service.titleColorClass}`}
                          >
                            {service.title}
                          </h3>
                        </div>

                        <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-[#718096] sm:mt-1.5 sm:line-clamp-none sm:text-xs sm:leading-relaxed">
                          {service.description}
                        </p>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between border-t border-[#E6ECF2] pt-2 sm:mt-3.5 sm:pt-2.5">
                        {isAvailable ? (
                          <>
                            <span className="text-[10px] font-bold text-[#102D50] group-hover:text-[#187B83] sm:text-xs">
                              Launch
                            </span>
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F0F5F9] text-[11px] font-black text-[#102D50] transition-colors group-hover:bg-[#F5A623] sm:h-7 sm:w-7 sm:text-xs">
                              →
                            </span>
                          </>
                        ) : (
                          <span className="truncate text-[10px] font-semibold text-slate-400 sm:text-[11px]">
                            Coming soon
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );

                return service.href ? (
                  <Link
                    key={service.number}
                    href={service.href}
                    className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#187B83] sm:rounded-2xl"
                  >
                    {cardInner}
                  </Link>
                ) : (
                  <div key={service.number}>{cardInner}</div>
                );
              })}
            </div>
          </section>

          {/* Footer */}
          <footer className="flex flex-col items-center justify-between gap-2 rounded-xl border border-[#E6ECF2] bg-white px-4 py-3 text-center text-[11px] text-[#718096] shadow-2xs sm:flex-row sm:rounded-2xl sm:py-3.5 sm:text-left sm:text-xs">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="h-2 w-2 rounded-full bg-[#E98012]" />
              <strong className="font-black text-[#102D50]">
                🛡️ TRAVELLERS SAFETY COVERED
              </strong>
              <span className="hidden text-slate-300 sm:inline">|</span>
              <span>Your safety. Our priority.</span>
            </div>
            <p className="text-[10px] text-[#718096] sm:text-[11px]">
              © {new Date().getFullYear()} TSC. All rights reserved.
            </p>
          </footer>
        </div>
      </main>

      {/* MOBILE BOTTOM APP DOCK */}
      <nav
        aria-label="Mobile quick actions"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[#F5A623]/25 bg-[#0A1F44]/98 py-1.5 text-center text-[10px] font-bold text-white backdrop-blur-md lg:hidden"
      >
        <a
          href="#overview"
          className="flex flex-col items-center gap-0.5 text-[#F5A623]"
        >
          <span aria-hidden="true" className="text-sm">
            🏠
          </span>
          <span>Home</span>
        </a>
        <Link
          href="/dashboard/journeys"
          className="flex flex-col items-center gap-0.5 text-slate-200 transition hover:text-[#F5A623]"
        >
          <span aria-hidden="true" className="text-sm">
            🧭
          </span>
          <span>Journeys</span>
        </Link>
        <Link
          href="/dashboard/wallet"
          className="flex flex-col items-center gap-0.5 text-slate-200 transition hover:text-[#F5A623]"
        >
          <span aria-hidden="true" className="text-sm">
            👛
          </span>
          <span>Wallet</span>
        </Link>
        <Link
          href="/dashboard/emergency"
          className="flex flex-col items-center gap-0.5 text-[#FBBF24] transition hover:text-white"
        >
          <span aria-hidden="true" className="text-sm">
            🚨
          </span>
          <span>Emergency</span>
        </Link>
      </nav>
    </div>
  );
}

export default function TravellerDashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <TravellerDashboardContent />
    </Suspense>
  );
}
