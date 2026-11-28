import Image from "next/image";

const features = [
  {
    number: "01",
    title: "Trip Activation",
    description: "Activate safety coverage and keep trip details ready.",
    accent: "bg-amber-500/10 text-amber-600",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Live Monitoring",
    description: "Route awareness and location-based check-ins on the move.",
    accent: "bg-sky-500/10 text-sky-600",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Emergency SOS",
    description: "Quick access to emergency assistance when needed.",
    accent: "bg-rose-500/10 text-rose-600",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 18v-6a5 5 0 0 1 10 0v6" />
        <path d="M5 21h14" />
        <path d="M12 3v2" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Protection & Claims",
    description: "Clear support steps for eligible protection and claims.",
    accent: "bg-emerald-500/10 text-emerald-600",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    ),
  },
];

const steps = [
  {
    number: "01",
    title: "Create profile",
    description: "Set up your personal TSC account.",
  },
  {
    number: "02",
    title: "Plan your trip",
    description: "Add trip details and pick your safety service.",
  },
  {
    number: "03",
    title: "Activate early",
    description: "Complete activation before heading out.",
  },
  {
    number: "04",
    title: "Travel supported",
    description: "Use safety and support tools throughout your trip.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0B192C] antialiased selection:bg-[#E98012]/20 selection:text-[#071730]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <a
            href="#"
            aria-label="Travelers Safety Covered home"
            className="flex shrink-0 items-center"
          >
            <Image
              src="/brand/tsc-header-logo.png"
              alt="Travelers Safety Covered"
              width={220}
              height={76}
              priority
              className="h-8 w-auto object-contain"
            />
          </a>

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-7 text-[13px] font-semibold text-slate-600 md:flex"
          >
            <a href="#services" className="transition-colors hover:text-[#071730]">
              Services
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-[#071730]">
              How It Works
            </a>
            <a href="#get-started" className="transition-colors hover:text-[#071730]">
              Contact
            </a>
          </nav>

          <div className="hidden items-center gap-2.5 sm:flex">
            <a
              href="/login"
              className="rounded-lg px-3.5 py-2 text-[13px] font-semibold text-[#071730] transition-colors hover:bg-slate-100"
            >
              Sign in
            </a>
            <a
              href="/register"
              className="inline-flex items-center gap-1 rounded-lg bg-[#FBBF24] px-3.5 py-2 text-[13px] font-bold text-[#071730] transition-colors hover:bg-[#F59E0B]"
            >
              <span>Get started</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center gap-2 sm:hidden">
            <a
              href="/login"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#071730]"
            >
              Sign in
            </a>
            <label
              htmlFor="mobile-menu-toggle"
              aria-label="Toggle navigation menu"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-[#071730] text-xs font-bold text-white"
            >
              ☰
            </label>
          </div>
        </div>

        {/* Mobile Drawer */}
        <input
          id="mobile-menu-toggle"
          type="checkbox"
          className="peer sr-only"
          aria-hidden="true"
        />
        <div className="hidden border-t border-slate-200 bg-white px-4 py-3.5 peer-checked:block sm:hidden">
          <nav
            aria-label="Mobile navigation"
            className="flex flex-col space-y-1 text-[13px] font-semibold text-[#1E3A5F]"
          >
            <a
              href="#services"
              className="rounded-lg px-3 py-2 transition-colors hover:bg-slate-50"
            >
              Services
            </a>
            <a
              href="#how-it-works"
              className="rounded-lg px-3 py-2 transition-colors hover:bg-slate-50"
            >
              How It Works
            </a>
            <a
              href="#get-started"
              className="rounded-lg px-3 py-2 transition-colors hover:bg-slate-50"
            >
              Contact
            </a>
            <div className="pt-2">
              <a
                href="/register"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#FBBF24] px-4 py-2.5 text-[13px] font-bold text-[#071730]"
              >
                <span>Get started</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section
          id="about"
          className="relative overflow-hidden bg-[#071730] py-10 text-white sm:py-16 lg:py-20"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-[#E98012]/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-blue-600/15 blur-3xl"
          />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">
              {/* Left Copy */}
              <div className="space-y-4 lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold tracking-wider text-[#FBBF24] uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#E98012]" />
                  <span>Smarter Journeys. Safer Travel.</span>
                </div>

                <h1 className="text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl lg:text-[2.35rem]">
                  Every journey deserves{" "}
                  <span className="bg-gradient-to-r from-[#FBBF24] to-[#E98012] bg-clip-text text-transparent">
                    protection.
                  </span>
                </h1>

                <p className="max-w-lg text-[13px] leading-relaxed text-slate-300 sm:text-[15px]">
                  Accessible trip activation, live journey awareness, and
                  emergency support in one connected experience.
                </p>

                <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:items-center sm:gap-3">
                  <a
                    href="/register"
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#FBBF24] px-5 text-[13px] font-bold text-[#071730] transition-colors hover:bg-[#F59E0B]"
                  >
                    <span>Get started</span>
                    <span aria-hidden="true">→</span>
                  </a>
                  <a
                    href="#how-it-works"
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-5 text-[13px] font-medium text-white transition-colors hover:bg-white/10"
                  >
                    How it works
                  </a>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-emerald-400">✓</span>
                    Daily &amp; intercity travel
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-emerald-400">✓</span>
                    Built for safety first
                  </span>
                </div>
              </div>

              {/* Right Card */}
              <div
                aria-label="Travel safety overview card"
                className="mx-auto w-full max-w-sm lg:col-span-5 lg:max-w-none"
              >
                <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-4 shadow-xl backdrop-blur-md sm:p-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                        Safety Status
                      </p>
                      <p className="text-[13px] font-semibold text-white">
                        Trip Protection Overview
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Ready
                    </span>
                  </div>

                  <div className="mt-3.5 rounded-xl border border-white/10 bg-[#0B2244]/85 p-3.5">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-200">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E98012] text-[10px] font-bold text-white">
                        A
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Active route
                      </span>
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold text-white">
                        B
                      </span>
                    </div>

                    <div className="my-2.5 h-1.5 w-full rounded-full bg-white/10">
                      <div className="h-1.5 w-3/4 rounded-full bg-gradient-to-r from-[#E98012] to-[#FBBF24]" />
                    </div>

                    <p className="text-center text-[10px] font-semibold tracking-wider text-[#FBBF24] uppercase">
                      Travel Smart. Arrive Safe.
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-white/10 bg-[#0B2244]/70 p-2.5">
                      <p className="text-xs font-semibold text-white">
                        Route awareness
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Stay informed
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#0B2244]/70 p-2.5">
                      <p className="text-xs font-semibold text-white">
                        Rapid support
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        SOS ready
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Services Section */}
        <section id="services" className="py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl space-y-1.5">
              <p className="text-[11px] font-bold tracking-wider text-[#E98012] uppercase">
                Our Services
              </p>
              <h2 className="text-xl font-bold tracking-tight text-[#071730] sm:text-2xl">
                One platform for safer travel.
              </h2>
              <p className="text-[13px] text-slate-600 sm:text-sm">
                Connected tools across every stage of your trip.
              </p>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <article
                  key={feature.number}
                  className="group flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-5"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${feature.accent}`}
                      >
                        {feature.icon}
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-slate-400">
                        {feature.number}
                      </span>
                    </div>

                    <h3 className="mt-4 text-[15px] font-bold text-[#071730]">
                      {feature.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-[13px]">
                      {feature.description}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#071730] group-hover:text-[#E98012]">
                    <span>Explore</span>
                    <span aria-hidden="true">↗</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section
          id="how-it-works"
          className="bg-[#071730] py-12 text-white sm:py-16"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl space-y-1.5">
              <p className="text-[11px] font-bold tracking-wider text-[#FBBF24] uppercase">
                How It Works
              </p>
              <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Simple steps before you go.
              </h2>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <article
                  key={step.number}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.07] sm:p-5"
                >
                  <span className="inline-block font-mono text-xs font-bold text-[#FBBF24]">
                    {step.number}
                  </span>
                  <div className="my-3 h-px w-8 bg-[#E98012]/70" />
                  <h3 className="text-[15px] font-bold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300 sm:text-[13px]">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section id="get-started" className="py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-6 rounded-2xl bg-gradient-to-br from-[#071730] via-[#0D2347] to-[#133163] px-6 py-8 text-center text-white shadow-md sm:px-10 sm:py-10 lg:flex-row lg:text-left">
              <div className="max-w-lg space-y-2">
                <p className="text-[11px] font-bold tracking-wider text-[#FBBF24] uppercase">
                  Get Started
                </p>
                <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Make safety part of your travel plans.
                </h2>
                <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
                  Create an account or reach out to connect with our team.
                </p>
                <div className="flex flex-col justify-center gap-2.5 pt-2 sm:flex-row lg:justify-start">
                  <a
                    href="/register"
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#FBBF24] px-5 text-[13px] font-bold text-[#071730] transition-colors hover:bg-[#F59E0B]"
                  >
                    <span>Create account</span>
                    <span aria-hidden="true">→</span>
                  </a>
                  <a
                    href="mailto:core1enterprisesolutions@gmail.com"
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-5 text-[13px] font-medium text-white transition-colors hover:bg-white/10"
                  >
                    <span>Contact team</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>

              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white p-3 shadow-sm sm:h-32 sm:w-32">
                <Image
                  src="/brand/tsc-full-logo.png"
                  alt="Travelers Safety Covered"
                  width={240}
                  height={240}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-8 px-4 py-9 sm:px-6 md:flex-row lg:px-8">
          <div className="space-y-2">
            <Image
              src="/brand/tsc-header-logo.png"
              alt="Travelers Safety Covered"
              width={200}
              height={68}
              className="h-7 w-auto object-contain"
            />
            <p className="text-xs text-slate-500">Travel Smart. Arrive Safe.</p>
          </div>

          <div className="flex gap-10 text-xs sm:gap-14 sm:text-[13px]">
            <div className="flex flex-col space-y-2">
              <span className="text-[11px] font-bold tracking-wider text-[#071730] uppercase">
                Platform
              </span>
              <a href="#services" className="text-slate-600 hover:text-[#071730]">
                Services
              </a>
              <a href="#how-it-works" className="text-slate-600 hover:text-[#071730]">
                How It Works
              </a>
              <a href="/login" className="text-slate-600 hover:text-[#071730]">
                Sign in
              </a>
            </div>

            <div className="flex flex-col space-y-2">
              <span className="text-[11px] font-bold tracking-wider text-[#071730] uppercase">
                Connect
              </span>
              <a
                href="mailto:core1enterprisesolutions@gmail.com"
                className="text-slate-600 hover:text-[#071730]"
              >
                Contact
              </a>
              <a
                href="https://www.core1enterprisesolutions.com/"
                target="_blank"
                rel="noreferrer"
                className="text-slate-600 hover:text-[#071730]"
              >
                Core1 Enterprise
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-[#F8FAFC]">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-[11px] text-slate-500 sm:flex-row sm:px-6 lg:px-8">
            <span>© 2026 Travelers Safety Covered. All rights reserved.</span>
            <span>Built with safety in mind.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}