import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { signOut } from "@/app/actions";

export const instant = false;

export const metadata: Metadata = {
  title: "Traveller Dashboard | TSC",
  description: "Your personal Travellers Safety Covered dashboard.",
};

const services = [
  {
    number: "01",
    symbol: "↗",
    title: "My Journeys",
    description: "Plan trips, activate travel safety and view your journey history.",
    category: "JOURNEY MANAGEMENT",
    href: "/dashboard/journeys",
  },
  {
    number: "02",
    symbol: "◇",
    title: "Safety Protection",
    description: "Explore trip-based protection and manage your travel coverage.",
    category: "TRAVEL PROTECTION",
  },
  {
    number: "03",
    symbol: "!",
    title: "Emergency Support",
    description: "Get access to emergency assistance and response services.",
    category: "EMERGENCY SERVICES",
    href: "/dashboard/emergency",
  },
  {
    number: "04",
    symbol: "✓",
    title: "Claims & Compensation",
    description: "Submit and follow up on eligible claims and compensation.",
    category: "CLAIMS MANAGEMENT",
  },
  {
    number: "05",
    symbol: "₦",
    title: "My Wallet",
    description: "Manage your wallet, recharge and review payment transactions.",
    category: "WALLET & PAYMENTS",
  },
  {
    number: "06",
    symbol: "◎",
    title: "Travel Partners",
    description: "Find hospitals, emergency responders and verified TSC partners.",
    category: "PARTNER NETWORK",
  },
];

export default async function TravellerDashboard() {
  await connection();

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

  if (profile.role !== "traveller") {
    redirect("/admin");
  }

  const firstName =
    profile.full_name?.trim().split(/\s+/)[0] || "Traveller";

  return (
    <main className="traveller-dashboard">
      <header className="traveller-topbar">
        <a href="/" className="traveller-brand">
          <span className="traveller-brand-symbol">TSC</span>
          <span className="traveller-brand-name">
            <strong>TRAVELLERS SAFETY COVERED</strong>
            <small>YOUR SAFETY. OUR PRIORITY.</small>
          </span>
        </a>

        <nav className="traveller-navigation" aria-label="Main navigation">
          <a href="#overview">Overview</a>
          <a href="#services">Services</a>
          <a href="#account">My Account</a>
        </nav>

        <form action={signOut}>
          <button className="traveller-logout" type="submit">
            Sign out <span>↗</span>
          </button>
        </form>
      </header>

      <div className="traveller-main">
        <section className="traveller-welcome" id="overview">
          <div className="traveller-welcome-content">
            <span className="traveller-overline">YOUR PERSONAL SAFETY CENTRE</span>
            <h1>
              Welcome back, <span>{firstName}</span>
            </h1>
            <p>
              Manage your travel safety services, keep track of your account
              and get ready for safer journeys with TSC.
            </p>
            <div className="traveller-account-indicator">
              <span />
              Your account is active
            </div>
          </div>

          <div className="traveller-welcome-visual" aria-hidden="true">
            <div className="traveller-visual-ring">
              <div className="traveller-visual-shield">✓</div>
            </div>
            <div className="traveller-visual-label">
              <strong>TRAVEL WITH CONFIDENCE</strong>
              <small>Your safety matters every kilometre.</small>
            </div>
          </div>
        </section>

        <section className="traveller-services" id="services">
          <div className="traveller-section-heading">
            <div>
              <span className="traveller-section-label">TSC PLATFORM</span>
              <h2>Your services</h2>
              <p>Access the services available to you on the TSC platform.</p>
            </div>
            <span className="traveller-total-services">06 SERVICES</span>
          </div>

          <div className="traveller-service-grid">
            {services.map((service) => (
              <article className="traveller-service-card" key={service.number}>
                <div className="traveller-service-card-top">
                  <span className="traveller-service-symbol">{service.symbol}</span>
                  <span className="traveller-service-number">{service.number}</span>
                </div>

                <span className="traveller-service-category">
                  {service.category}
                </span>
                <h3>{service.title}</h3>
                <p>{service.description}</p>

                <div className="traveller-service-bottom">
                  {service.href ? <a className="traveller-service-status" href={service.href}>Open service</a> : <span className="traveller-service-status">Coming soon</span>}
                  <span className="traveller-service-arrow">→</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="traveller-account-panel" id="account">
          <div className="traveller-account-icon">◎</div>
          <div className="traveller-account-text">
            <span>ACCOUNT OVERVIEW</span>
            <h2>Your traveller account</h2>
            <p>
              Your TSC account is active. You can access your personal
              dashboard and manage your account securely.
            </p>
          </div>
          <div className="traveller-account-status">
            <small>ACCOUNT STATUS</small>
            <strong><span /> Active</strong>
          </div>
        </section>

        <footer className="traveller-footer">
          <div>
            <strong>TRAVELLERS SAFETY COVERED</strong>
            <span>Your safety. Our priority.</span>
          </div>
          <p>© TSC. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}
