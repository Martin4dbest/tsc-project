import Image from "next/image";

const features = [
  {
    number: "01",
    title: "Trip Activation",
    description: "Activate coverage and keep trip details ready.",
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
    description: "Route awareness and location check-ins on the move.",
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
    description: "Quick access to emergency help when needed.",
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
    description: "Clear support steps for eligible claims.",
    accent: "bg-emerald-500/10 text-emerald-600",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    ),
  },
];

const transportModes = [
  {
    tag: "Fleet & Coaches",
    title: "GUO Transport & Coaches",
    caption: "Interstate highway buses and major fleet routes.",
    image:
      "https://img.magnific.com/free-photo/black-tourist-bus-driving-road-modern-passenger-coach-moving-through-city_169016-72488.jpg",
    alt: "Executive passenger coach bus travelling on the highway",
  },
  {
    tag: "Air Travel",
    title: "Flights & Aviation",
    caption: "Itinerary tracking from takeoff to landing.",
    image:
      "https://media.istockphoto.com/id/955952680/photo/passengers-commercial-airplane-flying-above-clouds.jpg?s=612x612&w=0&k=20&c=9bZsGq8-uZaPXR1lCztXur4JRlI1gNksYOOSZzfXPAA=",
    alt: "Commercial passenger airplane flying above clouds",
  },
  {
    tag: "Private & SUV",
    title: "Executive Cars & SUVs",
    caption: "Coverage for private road trips and car hires.",
    image:
      "https://performanceautoprod-com.cdn-convertus.com/uploads/sites/24/2026/07/Hyundai-road-trip-vehicles.jpg",
    alt: "Modern executive SUV parked along a scenic highway route",
  },
  {
    tag: "Rail & Transit",
    title: "Trains & Express Rail",
    caption: "Live support across intercity rail networks.",
    image: "https://miro.medium.com/1*XfVb7Bs5PTC_9m6cObzSIg.jpeg",
    alt: "Passenger locomotive waiting beside a station platform",
  },
  {
    tag: "Sea & Marine",
    title: "Ships & Ferries",
    caption: "Protection for coastal crossings and ferries.",
    image:
      "https://media.istockphoto.com/id/472105141/photo/p-o-cruises-cruise-ship-and-calm-sea.jpg?s=612x612&w=0&k=20&c=YAMXfoFchJ_LUxJ6quo73qtdkGoNpk_bIRa5D9l0qqg=",
    alt: "Passenger vessel sailing across open water",
  },
  {
    tag: "Urban Mobility",
    title: "Ride-Hail & Dispatch Bikes",
    caption: "Safety check-ins for urban two-wheel transit.",
    image:
      "https://images.pexels.com/photos/28779638/pexels-photo-28779638.jpeg?cs=srgb&dl=pexels-andromeda99-28779638.jpg&fm=jpg",
    alt: "Urban scooter and motorcycle riders on a city road",
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
    description: "Add route details and pick coverage.",
  },
  {
    number: "03",
    title: "Activate early",
    description: "Confirm activation before departure.",
  },
  {
    number: "04",
    title: "Travel supported",
    description: "Stay backed throughout your journey.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0B192C] antialiased selection:bg-[#E98012]/20 selection:text-[#071730]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
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
              className="h-7 w-auto object-contain sm:h-8"
            />
          </a>

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-7 text-[13px] font-semibold text-slate-600 md:flex"
          >
            <a href="#journeys" className="transition-colors hover:text-[#071730]">
              Journeys
            </a>
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
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#071730]"
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
        <div className="hidden border-t border-slate-200 bg-white px-4 py-3 peer-checked:block sm:hidden">
          <nav
            aria-label="Mobile navigation"
            className="flex flex-col space-y-1 text-[13px] font-semibold text-[#1E3A5F]"
          >
            <a href="#journeys" className="rounded-lg px-3 py-1.5 hover:bg-slate-50">
              Journeys
            </a>
            <a href="#services" className="rounded-lg px-3 py-1.5 hover:bg-slate-50">
              Services
            </a>
            <a href="#how-it-works" className="rounded-lg px-3 py-1.5 hover:bg-slate-50">
              How It Works
            </a>
            <a href="#get-started" className="rounded-lg px-3 py-1.5 hover:bg-slate-50">
              Contact
            </a>
            <div className="pt-1.5">
              <a
                href="/register"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#FBBF24] px-4 py-2 text-[13px] font-bold text-[#071730]"
              >
                <span>Get started</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section (Compact on Mobile) */}
        <section
          id="about"
          className="relative overflow-hidden bg-[#071730] py-7 text-white sm:py-14 lg:py-18"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-[#E98012]/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-blue-600/15 blur-3xl"
          />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12 lg:gap-10">
              {/* Left Copy */}
              <div className="space-y-3 sm:space-y-4 lg:col-span-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-[#FBBF24] uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#E98012]" />
                  <span>Smarter Journeys. Safer Travel.</span>
                </div>

                <h1 className="text-xl font-bold leading-snug tracking-tight text-white sm:text-3xl lg:text-[2.25rem]">
                  Every journey deserves{" "}
                  <span className="bg-gradient-to-r from-[#FBBF24] to-[#E98012] bg-clip-text text-transparent">
                    protection.
                  </span>
                </h1>

                <p className="max-w-md text-xs leading-relaxed text-slate-300 sm:text-[15px]">
                  Trip activation, live journey awareness, and fast emergency
                  support across GUO Transport coaches, airlines, SUVs, rail, and ferries.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-0.5 sm:flex sm:items-center sm:gap-3">
                  <a
                    href="/register"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#FBBF24] px-4 text-xs font-bold text-[#071730] transition-colors hover:bg-[#F59E0B] sm:h-10 sm:px-5 sm:text-[13px]"
                  >
                    <span>Get started</span>
                    <span aria-hidden="true">→</span>
                  </a>
                  <a
                    href="#journeys"
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-4 text-xs font-medium text-white transition-colors hover:bg-white/10 sm:h-10 sm:px-5 sm:text-[13px]"
                  >
                    Explore transit
                  </a>
                </div>
              </div>

              {/* Right Hero Photo */}
              <div className="mx-auto w-full max-w-md lg:col-span-6 lg:max-w-none">
                <div className="group relative overflow-hidden rounded-xl border border-white/15 bg-[#0B2244] shadow-xl sm:rounded-2xl">
                  <div className="relative h-40 w-full sm:h-60">
                    <Image
                      src="https://img.magnific.com/free-photo/black-tourist-bus-driving-road-modern-passenger-coach-moving-through-city_169016-72488.jpg"
                      alt="GUO Transport and executive passenger coach on the highway"
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#071730] via-[#071730]/35 to-transparent" />
                  </div>

                  <div className="relative z-10 -mt-10 px-3 pb-3 sm:-mt-12 sm:px-5 sm:pb-5">
                    <div className="rounded-lg border border-white/15 bg-[#071730]/90 p-2.5 backdrop-blur-md sm:rounded-xl sm:p-3.5">
                      <div className="flex items-center justify-between text-[11px] sm:text-xs">
                        <span className="font-semibold text-white">
                          Global Multi-Mode Shield
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300 sm:text-[11px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Active
                        </span>
                      </div>
                      <div className="my-2 h-1.5 w-full rounded-full bg-white/10">
                        <div className="h-1.5 w-4/5 rounded-full bg-gradient-to-r from-[#E98012] to-[#FBBF24]" />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-300 sm:text-[11px]">
                        <span>GUO Coaches · Air · SUV · Rail</span>
                        <span className="font-semibold text-[#FBBF24]">
                          Travel Smart.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Transport Modes Grid (2 Columns on Mobile) */}
        <section id="journeys" className="border-b border-slate-200/80 bg-white py-8 sm:py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="space-y-1">
              <p className="text-[10px] font-bold tracking-wider text-[#E98012] uppercase sm:text-[11px]">
                Global Multi-Mode Transit
              </p>
              <h2 className="text-lg font-bold tracking-tight text-[#071730] sm:text-2xl">
                Protection across every journey.
              </h2>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-4 lg:grid-cols-3">
              {transportModes.map((mode) => (
                <article
                  key={mode.title}
                  className="group overflow-hidden rounded-xl border border-slate-200/90 bg-[#F8FAFC] shadow-xs transition-all hover:border-slate-300 hover:shadow-md"
                >
                  <div className="relative h-24 w-full overflow-hidden sm:h-40">
                    <Image
                      src={mode.image}
                      alt={mode.alt}
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute top-1.5 left-1.5 rounded bg-[#071730]/85 px-1.5 py-0.5 text-[8px] font-semibold tracking-wider text-[#FBBF24] uppercase sm:top-2.5 sm:left-2.5 sm:rounded-md sm:px-2.5 sm:text-[10px]">
                      {mode.tag}
                    </span>
                  </div>
                  <div className="p-2.5 sm:p-4">
                    <h3 className="text-xs font-bold text-[#071730] sm:text-[14px]">
                      {mode.title}
                    </h3>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-600 sm:mt-1 sm:line-clamp-none sm:text-xs">
                      {mode.caption}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Core Services Section (2 Columns on Mobile) */}
        <section id="services" className="py-8 sm:py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="space-y-1">
              <p className="text-[10px] font-bold tracking-wider text-[#E98012] uppercase sm:text-[11px]">
                Our Services
              </p>
              <h2 className="text-lg font-bold tracking-tight text-[#071730] sm:text-2xl">
                One platform for safer travel.
              </h2>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-4 lg:grid-cols-4">
              {features.map((feature) => (
                <article
                  key={feature.number}
                  className="group flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs transition-all hover:border-slate-300 hover:shadow-md sm:p-5"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${feature.accent}`}
                      >
                        {feature.icon}
                      </span>
                      <span className="font-mono text-[10px] font-semibold text-slate-400 sm:text-[11px]">
                        {feature.number}
                      </span>
                    </div>

                    <h3 className="mt-2.5 text-xs font-bold text-[#071730] sm:mt-4 sm:text-[15px]">
                      {feature.title}
                    </h3>
                    <p className="mt-1 text-[11px] leading-snug text-slate-600 sm:mt-1.5 sm:text-[13px] sm:leading-relaxed">
                      {feature.description}
                    </p>
                  </div>

                  <div className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-[#071730] group-hover:text-[#E98012] sm:mt-4 sm:text-xs">
                    <span>Explore</span>
                    <span aria-hidden="true">↗</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section (2 Columns on Mobile) */}
        <section
          id="how-it-works"
          className="bg-[#071730] py-8 text-white sm:py-14"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="space-y-1">
              <p className="text-[10px] font-bold tracking-wider text-[#FBBF24] uppercase sm:text-[11px]">
                How It Works
              </p>
              <h2 className="text-lg font-bold tracking-tight text-white sm:text-2xl">
                Simple steps before you go.
              </h2>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-4 lg:grid-cols-4">
              {steps.map((step) => (
                <article
                  key={step.number}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-3 transition-colors hover:border-white/20 hover:bg-white/[0.07] sm:p-5"
                >
                  <span className="inline-block font-mono text-[11px] font-bold text-[#FBBF24] sm:text-xs">
                    {step.number}
                  </span>
                  <div className="my-2 h-px w-6 bg-[#E98012]/70 sm:my-3 sm:w-8" />
                  <h3 className="text-xs font-bold text-white sm:text-[15px]">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-[11px] leading-snug text-slate-300 sm:text-[13px] sm:leading-relaxed">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Compact CTA Banner */}
        <section id="get-started" className="py-8 sm:py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-[#071730] via-[#0D2347] to-[#133163] px-5 py-6 text-center text-white shadow-md sm:flex-row sm:px-10 sm:py-9 sm:text-left">
              <div className="max-w-lg space-y-1.5">
                <p className="text-[10px] font-bold tracking-wider text-[#FBBF24] uppercase sm:text-[11px]">
                  Get Started
                </p>
                <h2 className="text-lg font-bold tracking-tight text-white sm:text-2xl">
                  Make safety part of your travel plans.
                </h2>
                <p className="text-xs text-slate-300 sm:text-sm">
                  Create an account or connect with our team.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 sm:flex sm:gap-2.5">
                  <a
                    href="/register"
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-[#FBBF24] px-3.5 text-xs font-bold text-[#071730] transition-colors hover:bg-[#F59E0B] sm:h-10 sm:px-5 sm:text-[13px]"
                  >
                    <span>Create account</span>
                    <span aria-hidden="true">→</span>
                  </a>
                  <a
                    href="mailto:core1enterprisesolutions@gmail.com"
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3.5 text-xs font-medium text-white transition-colors hover:bg-white/10 sm:h-10 sm:px-5 sm:text-[13px]"
                  >
                    <span>Contact team</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>

              <div className="hidden h-28 w-28 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white p-3 shadow-sm sm:flex">
                <Image
                  src="/brand/tsc-full-logo.png"
                  alt="Travelers Safety Covered"
                  width={220}
                  height={220}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Compact Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 px-4 py-7 sm:flex-row sm:px-6 lg:px-8">
          <div className="space-y-1.5">
            <Image
              src="/brand/tsc-header-logo.png"
              alt="Travelers Safety Covered"
              width={190}
              height={64}
              className="h-6 w-auto object-contain sm:h-7"
            />
            <p className="text-xs text-slate-500">Travel Smart. Arrive Safe.</p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-xs sm:flex sm:gap-14 sm:text-[13px]">
            <div className="flex flex-col space-y-1.5">
              <span className="text-[10px] font-bold tracking-wider text-[#071730] uppercase">
                Platform
              </span>
              <a href="#journeys" className="text-slate-600 hover:text-[#071730]">
                Journeys
              </a>
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

            <div className="flex flex-col space-y-1.5">
              <span className="text-[10px] font-bold tracking-wider text-[#071730] uppercase">
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
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-1.5 px-4 py-3.5 text-[11px] text-slate-500 sm:flex-row sm:px-6 lg:px-8">
            <span>© 2026 Travelers Safety Covered. All rights reserved.</span>
            <span>Built with safety in mind.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}