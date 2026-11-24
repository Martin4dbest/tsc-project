import Image from "next/image";

const features = [
  {
    number: "01",
    title: "Trip Safety Activation",
    description:
      "Activate safety coverage for your journey and keep important trip details in one place.",
    icon: "🛡️",
  },
  {
    number: "02",
    title: "Live Trip Monitoring",
    description:
      "Support safer journeys with trip monitoring and location-aware safety services.",
    icon: "📍",
  },
  {
    number: "03",
    title: "Emergency SOS Support",
    description:
      "Make emergency assistance easier to access when an unexpected situation occurs.",
    icon: "🆘",
  },
  {
    number: "04",
    title: "Protection & Claims",
    description:
      "Access a structured support process for eligible protection and claims services.",
    icon: "🤝",
  },
];

const steps = [
  {
    number: "01",
    title: "Create your account",
    description: "Register and set up your personal TSC profile.",
  },
  {
    number: "02",
    title: "Plan your journey",
    description:
      "Provide your trip details and choose the available safety service.",
  },
  {
    number: "03",
    title: "Activate your trip",
    description: "Complete the required activation process before travelling.",
  },
  {
    number: "04",
    title: "Travel with confidence",
    description:
      "Use the available trip-safety and support features throughout your journey.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#0B192C] selection:bg-[#E98012]/20 selection:text-[#071730]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-[#E5ECF4] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6 lg:px-8">
          <a
            href="#"
            aria-label="Travelers Safety Covered home"
            className="flex shrink-0 items-center"
          >
            <Image
              src="/brand/tsc-header-logo.png"
              alt="Travelers Safety Covered"
              width={260}
              height={90}
              priority
              className="h-9 w-auto object-contain sm:h-11"
            />
          </a>

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-8 text-sm font-semibold text-[#334E68] md:flex"
          >
            <a href="#about" className="transition-colors hover:text-[#071730]">
              About
            </a>
            <a
              href="#services"
              className="transition-colors hover:text-[#071730]"
            >
              Our Services
            </a>
            <a
              href="#how-it-works"
              className="transition-colors hover:text-[#071730]"
            >
              How It Works
            </a>
            <a
              href="#safety"
              className="transition-colors hover:text-[#071730]"
            >
              Safety First
            </a>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <a
              href="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#071730] transition-colors hover:bg-[#EEF2F7]"
            >
              Sign in
            </a>
            <a
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#FBBF24] px-4 py-2.5 text-sm font-bold text-[#071730] shadow-xs transition-all hover:bg-[#F59E0B]"
            >
              <span>Get started</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center gap-2 sm:hidden">
            <a
              href="/login"
              className="rounded-lg border border-[#DCE4EE] bg-white px-3 py-1.5 text-xs font-semibold text-[#071730]"
            >
              Sign in
            </a>
            <label
              htmlFor="mobile-menu-toggle"
              aria-label="Toggle navigation menu"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-[#071730] text-sm font-bold text-white"
            >
              ☰
            </label>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        <input
          id="mobile-menu-toggle"
          type="checkbox"
          className="peer sr-only"
          aria-hidden="true"
        />
        <div className="hidden border-t border-[#E5ECF4] bg-white px-4 py-4 peer-checked:block sm:hidden">
          <nav
            aria-label="Mobile navigation"
            className="flex flex-col space-y-1 text-sm font-semibold text-[#1E3A5F]"
          >
            <a
              href="#about"
              className="rounded-lg px-3 py-2.5 transition-colors hover:bg-[#F4F7FB]"
            >
              About
            </a>
            <a
              href="#services"
              className="rounded-lg px-3 py-2.5 transition-colors hover:bg-[#F4F7FB]"
            >
              Our Services
            </a>
            <a
              href="#how-it-works"
              className="rounded-lg px-3 py-2.5 transition-colors hover:bg-[#F4F7FB]"
            >
              How It Works
            </a>
            <a
              href="#safety"
              className="rounded-lg px-3 py-2.5 transition-colors hover:bg-[#F4F7FB]"
            >
              Safety First
            </a>
            <div className="pt-2">
              <a
                href="/register"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FBBF24] px-4 py-3 text-sm font-bold text-[#071730] shadow-xs transition-colors hover:bg-[#F59E0B]"
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
          className="relative overflow-hidden bg-[#071730] pt-12 pb-14 text-white sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[#E98012]/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-[#1D4ED8]/20 blur-3xl"
          />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
              {/* Left Copy */}
              <div className="space-y-5 lg:col-span-7">
                <div className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-[#FBBF24] uppercase">
                  <span className="h-2 w-2 rounded-full bg-[#E98012]" />
                  <span>Smarter Journeys. Safer Experiences.</span>
                </div>

                <h1 className="text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl lg:text-4xl">
                  Every journey
                  <br />
                  deserves{" "}
                  <span className="bg-gradient-to-r from-[#FBBF24] to-[#E98012] bg-clip-text text-transparent">
                    protection.
                  </span>
                </h1>

                <p className="max-w-xl text-sm leading-relaxed text-[#CBD5E1] sm:text-base">
                  Travel with greater confidence. Travelers Safety Covered is
                  building accessible trip-safety services designed to help
                  travellers stay connected to support throughout their journeys.
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <a
                    href="/register"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#FBBF24] px-6 py-3.5 text-sm font-bold text-[#071730] shadow-sm transition-all hover:bg-[#F59E0B]"
                  >
                    <span>Explore TSC</span>
                    <span aria-hidden="true">→</span>
                  </a>
                  <a
                    href="#how-it-works"
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Discover how it works
                  </a>
                </div>

                <div className="flex items-center gap-2.5 pt-1 text-xs font-medium text-[#94A3B8] sm:text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                    ✓
                  </span>
                  <span>Designed around safer, smarter travel</span>
                </div>
              </div>

              {/* Right Visual Card */}
              <div
                aria-label="Travel safety overview card"
                className="lg:col-span-5"
              >
                <div className="rounded-3xl border border-white/15 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-md sm:p-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <p className="text-[11px] font-semibold tracking-widest text-[#94A3B8] uppercase">
                        Safety Status
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-white">
                        Trip Protection Architecture
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Ready
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-[#0B2244]/80 p-3.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg">
                        📍
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Journey awareness
                        </p>
                        <p className="text-xs text-[#94A3B8]">
                          Stay informed on the move
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0B2244]/80 p-4">
                      <div className="flex items-center justify-between text-xs font-semibold text-[#CBD5E1]">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E98012] text-[11px] font-bold text-white">
                          A
                        </span>
                        <span className="text-base" aria-hidden="true">
                          🚘
                        </span>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-[11px] font-bold text-white">
                          B
                        </span>
                      </div>
                      <div className="relative my-3 h-1.5 w-full rounded-full bg-white/10">
                        <div className="h-1.5 w-3/4 rounded-full bg-gradient-to-r from-[#E98012] to-[#FBBF24]" />
                      </div>
                      <p className="text-center text-[11px] font-semibold tracking-[0.14em] text-[#FBBF24] uppercase">
                        Travel with confidence
                      </p>
                    </div>

                    <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-[#0B2244]/80 p-3.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg">
                        🆘
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Support when needed
                        </p>
                        <p className="text-xs text-[#94A3B8]">
                          Emergency-ready thinking
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Strip */}
            <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-[11px] font-semibold tracking-[0.16em] text-[#94A3B8] uppercase sm:flex-row">
              <span>Travel Smart. Arrive Safe.</span>
              <span className="hidden h-px flex-1 bg-white/10 sm:mx-6 sm:block" />
              <span>Your Journey Matters</span>
            </div>
          </div>
        </section>

        {/* Approach / Safety First Section */}
        <section
          id="safety"
          className="border-b border-[#E5ECF4] bg-white py-14 sm:py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start lg:gap-12">
              <div className="space-y-3 lg:col-span-5">
                <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[#071730] uppercase">
                  <span className="h-2 w-2 rounded-full bg-[#E98012]" />
                  <span>The TSC Approach</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-[#071730] sm:text-4xl">
                  Safety should be part of{" "}
                  <span className="text-[#E98012]">every journey.</span>
                </h2>
              </div>

              <div className="space-y-4 text-base leading-relaxed text-[#486581] lg:col-span-7">
                <p>
                  Whether you are commuting, travelling between cities or
                  exploring somewhere new, your safety deserves thoughtful
                  attention.
                </p>
                <p>
                  TSC is developing a connected travel-safety platform that
                  brings trip activation, journey awareness and access to support
                  into one experience.
                </p>
                <div className="pt-2">
                  <a
                    href="#services"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#071730] transition-colors hover:text-[#E98012]"
                  >
                    <span>Discover the TSC experience</span>
                    <span aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="py-14 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[#071730] uppercase">
                  <span className="h-2 w-2 rounded-full bg-[#E98012]" />
                  <span>What We Are Building</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-[#071730] sm:text-4xl">
                  One platform. A safer travel experience.
                </h2>
              </div>
              <p className="max-w-md text-sm text-[#486581] sm:text-base">
                A connected approach to the different stages of your journey.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {features.map((feature) => (
                <article
                  key={feature.number}
                  className="group flex flex-col justify-between rounded-2xl border border-[#E5ECF4] bg-white p-6 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-[#CBD5E1] hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4F7FB] text-2xl">
                        {feature.icon}
                      </span>
                      <span className="text-xs font-bold tracking-wider text-[#829AB1]">
                        {feature.number}
                      </span>
                    </div>

                    <h3 className="mt-5 text-lg font-bold text-[#071730]">
                      {feature.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-[#486581]">
                      {feature.description}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-[#F1F5F9] pt-4 text-xs font-semibold text-[#071730]">
                    <span className="group-hover:text-[#E98012]">
                      Explore capability
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-sm text-[#829AB1] transition-transform group-hover:translate-x-0.5 group-hover:text-[#E98012]"
                    >
                      ↗
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section
          id="how-it-works"
          className="bg-[#071730] py-14 text-white sm:py-20 lg:py-24"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[#FBBF24] uppercase">
                <span className="h-2 w-2 rounded-full bg-[#E98012]" />
                <span>A Simple Approach</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Your journey.
                <br />A more thoughtful way to travel.
              </h2>
              <p className="text-sm leading-relaxed text-[#CBD5E1] sm:text-base">
                Our goal is to make access to travel-safety services clear and
                straightforward.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {steps.map((step) => (
                <article
                  key={step.number}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:border-white/20 hover:bg-white/[0.07]"
                >
                  <span className="inline-block text-xs font-bold tracking-widest text-[#FBBF24]">
                    {step.number}
                  </span>
                  <div className="my-4 h-px w-10 bg-[#E98012]/70" />
                  <h3 className="text-lg font-bold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#CBD5E1]">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section id="get-started" className="py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071730] via-[#0D2347] to-[#133163] px-6 py-10 text-white shadow-lg sm:px-10 sm:py-12 lg:px-14">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-4 right-8 select-none text-7xl font-black tracking-tighter text-white/[0.04] sm:text-9xl"
              >
                TSC
              </div>

              <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
                <div className="space-y-4 lg:col-span-8">
                  <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-[#FBBF24] uppercase">
                    <span className="h-2 w-2 rounded-full bg-[#E98012]" />
                    <span>The Journey Starts Here</span>
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    Make safety part of your travel plans.
                  </h2>
                  <p className="max-w-xl text-sm leading-relaxed text-[#CBD5E1] sm:text-base">
                    Discover the TSC vision and follow our journey as we build a
                    smarter travel-safety experience.
                  </p>
                  <div className="pt-2">
                    <a
                      href="mailto:core1enterprisesolutions@gmail.com"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#FBBF24] px-6 py-3.5 text-sm font-bold text-[#071730] shadow-sm transition-colors hover:bg-[#F59E0B]"
                    >
                      <span>Contact our team</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                </div>

                <div className="flex justify-center lg:col-span-4 lg:justify-end">
                  <div className="flex h-40 w-40 items-center justify-center rounded-3xl border border-white/15 bg-white/95 p-4 shadow-md sm:h-48 sm:w-48">
                    <Image
                      src="/brand/tsc-full-logo.png"
                      alt="Travelers Safety Covered brand"
                      width={360}
                      height={360}
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5ECF4] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-10 px-4 py-12 sm:px-6 md:flex-row lg:px-8">
          <div className="space-y-3">
            <Image
              src="/brand/tsc-header-logo.png"
              alt="Travelers Safety Covered"
              width={230}
              height={80}
              className="h-9 w-auto object-contain"
            />
            <p className="text-sm font-medium text-[#486581]">
              Travel Smart. Arrive Safe.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 text-sm sm:gap-16">
            <div className="flex flex-col space-y-2.5">
              <strong className="text-xs font-bold tracking-wider text-[#071730] uppercase">
                Explore
              </strong>
              <a
                href="#about"
                className="text-[#486581] transition-colors hover:text-[#071730]"
              >
                About TSC
              </a>
              <a
                href="#services"
                className="text-[#486581] transition-colors hover:text-[#071730]"
              >
                Our Services
              </a>
              <a
                href="#how-it-works"
                className="text-[#486581] transition-colors hover:text-[#071730]"
              >
                How It Works
              </a>
            </div>

            <div className="flex flex-col space-y-2.5">
              <strong className="text-xs font-bold tracking-wider text-[#071730] uppercase">
                Connect
              </strong>
              <a
                href="mailto:core1enterprisesolutions@gmail.com"
                className="text-[#486581] transition-colors hover:text-[#071730]"
              >
                Contact
              </a>
              <a
                href="https://www.core1enterprisesolutions.com/"
                target="_blank"
                rel="noreferrer"
                className="text-[#486581] transition-colors hover:text-[#071730]"
              >
                Core1 Enterprise Solutions
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-[#E5ECF4] bg-[#F7F9FC]">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-[#627D98] sm:flex-row sm:px-6 lg:px-8">
            <span>© 2026 Travelers Safety Covered. All rights reserved.</span>
            <span>Built with safety in mind.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}