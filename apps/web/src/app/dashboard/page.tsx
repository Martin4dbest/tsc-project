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
    title: "My Journeys",
    description: "Plan trips, activate travel safety and view your journey history.",
    image: "photo-1436491865332-7a61a109cc05",
    titleColorClass: "text-blue-700 group-hover:text-blue-800",
    accentDotClass: "bg-blue-600",
    href: "/dashboard/journeys",
    featured: true,
  },
  {
    number: "06",
    category: "EMERGENCY OPERATIONS",
    title: "Emergency Support",
    description: "Request assistance and follow up on emergency alerts.",
    image: "photo-1584515933487-779824d29309",
    titleColorClass: "text-amber-700 group-hover:text-amber-800",
    accentDotClass: "bg-amber-500",
    href: "/dashboard/emergency",
    featured: true,
  },
  {
    number: "02",
    category: "WALLET MANAGEMENT",
    title: "My Wallet",
    description: "View your wallet, balances and transaction history.",
    href: "/dashboard/wallet",
    image: "photo-1554224155-6726b3ff858f",
    titleColorClass: "text-emerald-700 group-hover:text-emerald-800",
    accentDotClass: "bg-emerald-600",
  },
  {
    number: "03",
    category: "PAYMENTS",
    title: "Payments",
    description: "Manage travel payments and review payment activity.",
    href: "/dashboard/payments",
    image: "photo-1556742049-0cfed4f6a45d",
    titleColorClass: "text-indigo-700 group-hover:text-indigo-800",
    accentDotClass: "bg-indigo-600",
  },
  {
    number: "04",
    category: "SAFETY PROTECTION",
    title: "Travel Protection",
    description: "Explore trip-based protection and manage your travel coverage.",
    image: "photo-1519681393784-d120267933ba",
    titleColorClass: "text-teal-700 group-hover:text-teal-800",
    accentDotClass: "bg-teal-600",
    href: "/dashboard/safety",
  },
  {
    number: "05",
    category: "GPS TRACKING",
    title: "Live Location",
    description: "Manage location sharing and journey tracking.",
    image: "photo-1473448912268-2022ce9509d8",
    titleColorClass: "text-cyan-700 group-hover:text-cyan-800",
    accentDotClass: "bg-cyan-600",
    href: "/dashboard/gps-tracking",
  },
  {
    number: "07",
    category: "CLAIMS & COMPENSATION",
    title: "Claims Centre",
    description: "Submit and follow up on eligible claims and compensation.",
    image: "photo-1450101499163-c8848c66ca85",
    titleColorClass: "text-violet-700",
    accentDotClass: "bg-violet-600",
  },
  {
    number: "08",
    category: "TRAVEL PARTNERS",
    title: "Partner Network",
    description: "Discover hospitals, responders and verified travel partners.",
    image: "photo-1521737711867-e3b97375f902",
    titleColorClass: "text-green-700",
    accentDotClass: "bg-green-600",
  },
  {
    number: "09",
    category: "ANALYTICS & INTELLIGENCE",
    title: "Travel Insights",
    description: "View journey activity, safety information and account insights.",
    image: "photo-1516321318423-f06f85e504b3",
    titleColorClass: "text-sky-700",
    accentDotClass: "bg-sky-600",
  },
];

function imageUrl(photo: string) {
  return `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=1000&q=85`;
}

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
          className="group flex items-center gap-3 rounded-xl border border-[#F5A623]/20 bg-white/[0.04] p-2.5 transition-colors hover:border-[#F5A623]/45 hover:bg-white/[0.07]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FBBF24] to-[#F5A623] text-xs font-black tracking-wider text-[#0A1F44] shadow-sm transition-transform group-hover:scale-105">
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

        {/* Traveller Profile Card (Green Accent Theme) */}
        <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-3.5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300/40 bg-emerald-500 text-xs font-black text-white shadow-xs">
              {initials || "JJ"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">
                {fullName}
              </p>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                <span>Active Protection</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access Navigation */}
        <nav aria-label="Quick Access" className="space-y-1.5">
          <div className="flex items-center justify-between px-2.5 pb-1">
            <p className="text-[10px] font-bold tracking-[0.14em] text-[#F5A623]/80 uppercase">
              Quick Access
            </p>
            <span className="ml-2.5 h-px flex-1 bg-[#F5A623]/20" />
          </div>

          <a
            href="#overview"
            className="flex items-center justify-between rounded-xl bg-[#F5A623] px-3.5 py-2.5 text-xs font-extrabold text-[#0A1F44] shadow-sm transition-all"
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

          <Link
            href="/dashboard/journeys"
            className="group flex items-center justify-between rounded-xl border border-transparent px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition-all hover:border-[#F5A623]/30 hover:bg-white/[0.08] hover:text-white"
          >
            <span className="flex items-center gap-2.5">
              <span aria-hidden="true" className="text-sm">
                🧭
              </span>
              <span>My Journeys</span>
            </span>
            <span
              aria-hidden="true"
              className="text-xs text-[#F5A623] transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>

          <Link
            href="/dashboard/wallet"
            className="group flex items-center justify-between rounded-xl border border-transparent px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition-all hover:border-[#F5A623]/30 hover:bg-white/[0.08] hover:text-white"
          >
            <span className="flex items-center gap-2.5">
              <span aria-hidden="true" className="text-sm">
                💳
              </span>
              <span>My Wallet</span>
            </span>
            <span
              aria-hidden="true"
              className="text-xs text-[#F5A623] transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>

          <Link
            href="/dashboard/safety"
            className="group flex items-center justify-between rounded-xl border border-transparent px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition-all hover:border-[#F5A623]/30 hover:bg-white/[0.08] hover:text-white"
          >
            <span className="flex items-center gap-2.5">
              <span aria-hidden="true" className="text-sm">
                🛡️
              </span>
              <span>Travel Protection</span>
            </span>
            <span
              aria-hidden="true"
              className="text-xs text-[#F5A623] transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>

          <Link
            href="/dashboard/gps-tracking"
            className="group flex items-center justify-between rounded-xl border border-transparent px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition-all hover:border-[#F5A623]/30 hover:bg-white/[0.08] hover:text-white"
          >
            <span className="flex items-center gap-2.5">
              <span aria-hidden="true" className="text-sm">
                📍
              </span>
              <span>Live Location</span>
            </span>
            <span
              aria-hidden="true"
              className="text-xs text-[#F5A623] transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>

          <Link
            href="/dashboard/emergency"
            className="group mt-2 flex items-center justify-between rounded-xl border border-[#F5A623]/45 bg-[#F5A623]/15 px-3.5 py-2.5 text-xs font-bold text-[#FBBF24] transition-all hover:border-[#F5A623] hover:bg-[#F5A623]/25"
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
            className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-[#F5A623]/30 bg-white/[0.06] px-3.5 py-2.5 text-xs font-bold text-white transition-all hover:border-[#F5A623] hover:bg-[#F5A623] hover:text-[#0A1F44]"
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

export default async function TravellerDashboard() {
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
    <div className="min-h-screen bg-[#F5F7FB] pb-20 text-[#0A1F44] lg:flex lg:pb-0">
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
          className="pointer-events-none fixed inset-0 z-40 bg-[#06132A]/60 opacity-0 backdrop-blur-xs transition-opacity duration-200 peer-checked:pointer-events-auto peer-checked:opacity-100"
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

        {/* MOBILE TOP HEADER WITH SIDEBAR TRIGGER */}
        <header className="sticky top-0 z-30 border-b border-[#0A1F44]/10 bg-white/95 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <label
                htmlFor="mobile-sidebar-toggle"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#0A1F44] px-2.5 py-1.5 text-xs font-bold text-[#F5A623] shadow-xs active:scale-95"
              >
                <span aria-hidden="true">☰</span>
                <span>Menu</span>
              </label>

              <Link href="/" className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5A623] text-[11px] font-black text-[#0A1F44]">
                  TSC
                </span>
                <span className="text-xs font-extrabold tracking-tight text-[#0A1F44]">
                  TRAVELLERS SAFETY
                </span>
              </Link>
            </div>

            <form action={signOut}>
              <button
                type="submit"
                className="cursor-pointer rounded-lg border border-[#0A1F44]/20 bg-[#F5F7FB] px-2.5 py-1.5 text-[11px] font-bold text-[#0A1F44] hover:bg-[#0A1F44] hover:text-[#F5A623]"
              >
                Sign out ↗
              </button>
            </form>
          </div>
        </header>
      </div>

      {/* MAIN WORKSPACE CONTENT */}
      <main id="overview" className="flex-1 lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
          {/* Clean Top Greeting Strip */}
          <section className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-[#0A1F44]/10 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:p-5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-[#0A1F44] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#F5A623] uppercase">
                <span>YOUR PERSONAL SAFETY CENTRE</span>
              </div>
              <h1 className="text-base font-bold tracking-tight text-[#0A1F44] sm:text-lg">
                Welcome back, {firstName}
              </h1>
              <p className="text-xs text-slate-600">
                Your safety matters every kilometre. Manage your trips, wallet,
                and protection below.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Account Active</span>
              </div>
              <Link
                href="/dashboard/journeys"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#F5A623] px-3.5 py-2 text-xs font-bold text-[#0A1F44] shadow-sm transition-colors hover:bg-[#FBBF24]"
              >
                <span>+ New Journey</span>
              </Link>
            </div>
          </section>

          {/* PRIORITY SPOTLIGHT: Horizontal Split Cards */}
          <section aria-label="Priority services" className="mb-7">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold tracking-wider text-[#0A1F44] uppercase">
                Priority Operations
              </h2>
              <span className="text-[11px] font-semibold text-[#B47812]">
                Instant Access
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {featuredServices.map((service) => (
                <Link
                  key={service.number}
                  href={service.href!}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[#0A1F44]/12 bg-white shadow-xs transition-all hover:-translate-y-0.5 hover:border-[#F5A623] hover:shadow-md sm:flex-row"
                >
                  <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-slate-100 sm:aspect-auto sm:w-44">
                    <img
                      src={imageUrl(service.image)}
                      alt={service.title}
                      className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold tracking-wider text-[#B47812] uppercase">
                          {service.category}
                        </span>
                        <span className="rounded bg-[#0A1F44] px-1.5 py-0.5 text-[10px] font-bold text-[#F5A623]">
                          {service.number}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={`h-2 w-2 shrink-0 rounded-full ${service.accentDotClass}`}
                        />
                        <h3
                          className={`text-sm font-extrabold tracking-tight transition-colors ${service.titleColorClass}`}
                        >
                          {service.title}
                        </h3>
                      </div>

                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                        {service.description}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                      <span className="text-xs font-bold text-[#0A1F44] group-hover:text-[#B47812]">
                        Open {service.title}
                      </span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F5A623] text-xs font-bold text-[#0A1F44] transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ALL OTHER SERVICES */}
          <section id="services" className="mb-8">
            <div className="mb-3.5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#0A1F44]">
                  All Travel Services
                </h2>
                <p className="text-xs text-slate-500">
                  Full suite of protection, wallet, and intelligence modules.
                </p>
              </div>
              <span className="rounded-full border border-[#0A1F44]/15 bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#0A1F44]">
                09 MODULES
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {standardServices.map((service) => {
                const isAvailable = Boolean(service.href);

                const cardInner = (
                  <article
                    className={`group flex h-full flex-col overflow-hidden rounded-2xl border bg-white p-3 transition-all ${
                      isAvailable
                        ? "border-[#0A1F44]/12 shadow-xs hover:-translate-y-0.5 hover:border-[#F5A623] hover:shadow-md"
                        : "border-slate-200/80 opacity-85"
                    }`}
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-100">
                      <img
                        src={imageUrl(service.image)}
                        alt={service.title}
                        className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>

                    <div className="flex flex-1 flex-col justify-between pt-3.5">
                      <div>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                            {service.number} • {service.category}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isAvailable
                                ? "bg-[#0A1F44] text-[#F5A623]"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {isAvailable ? "Active" : "Soon"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={`h-2 w-2 shrink-0 rounded-full ${service.accentDotClass}`}
                          />
                          <h3
                            className={`text-sm font-extrabold tracking-tight transition-colors ${service.titleColorClass}`}
                          >
                            {service.title}
                          </h3>
                        </div>

                        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                          {service.description}
                        </p>
                      </div>

                      <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5">
                        {isAvailable ? (
                          <>
                            <span className="text-xs font-semibold text-[#0A1F44] group-hover:text-[#B47812]">
                              Launch module
                            </span>
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0A1F44]/8 text-xs font-bold text-[#0A1F44] transition-colors group-hover:bg-[#F5A623]">
                              →
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400">
                            Coming soon to your account
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
                    className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]"
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
          <footer className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-[#0A1F44]/10 bg-white px-4 py-3.5 text-xs text-slate-600 sm:flex-row">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#F5A623]" />
              <strong className="font-bold text-[#0A1F44]">
                TRAVELLERS SAFETY COVERED
              </strong>
              <span className="text-slate-300">|</span>
              <span>Your safety. Our priority.</span>
            </div>
            <p className="text-[11px] text-slate-500">
              © {new Date().getFullYear()} TSC. All rights reserved.
            </p>
          </footer>
        </div>
      </main>

      {/* MOBILE BOTTOM APP DOCK */}
      <nav
        aria-label="Mobile quick actions"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[#F5A623]/25 bg-[#0A1F44] py-2 text-center text-[10px] font-semibold text-white lg:hidden"
      >
        <a
          href="#overview"
          className="flex flex-col items-center gap-0.5 text-[#F5A623]"
        >
          <span aria-hidden="true" className="text-xs">
            🏠
          </span>
          <span>Home</span>
        </a>
        <Link
          href="/dashboard/journeys"
          className="flex flex-col items-center gap-0.5 text-slate-200 hover:text-[#F5A623]"
        >
          <span aria-hidden="true" className="text-xs">
            🧭
          </span>
          <span>Journeys</span>
        </Link>
        <Link
          href="/dashboard/wallet"
          className="flex flex-col items-center gap-0.5 text-slate-200 hover:text-[#F5A623]"
        >
          <span aria-hidden="true" className="text-xs">
            💳
          </span>
          <span>Wallet</span>
        </Link>
        <Link
          href="/dashboard/emergency"
          className="flex flex-col items-center gap-0.5 text-[#FBBF24]"
        >
          <span aria-hidden="true" className="text-xs">
            🚨
          </span>
          <span>Emergency</span>
        </Link>
      </nav>
    </div>
  );
}