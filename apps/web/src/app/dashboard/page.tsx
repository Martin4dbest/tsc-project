import type { CSSProperties } from "react";
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
    category: "JOURNEY MANAGEMENT",
    title: "My Journeys",
    description: "Plan trips, activate travel safety and view your journey history.",
    image: "photo-1436491865332-7a61a109cc05",
    accent: "#F59A32",
    href: "/dashboard/journeys",
  },
  {
    number: "02",
    category: "WALLET MANAGEMENT",
    title: "My Wallet",
    description: "View your wallet, balances and transaction history.",
    image: "photo-1554224155-6726b3ff858f",
    accent: "#14B8A6",
  },
  {
    number: "03",
    category: "PAYMENTS",
    title: "Payments",
    description: "Manage travel payments and review payment activity.",
    image: "photo-1556742049-0cfed4f6a45d",
    accent: "#60A5FA",
  },
  {
    number: "04",
    category: "SAFETY PROTECTION",
    title: "Travel Protection",
    description: "Explore trip-based protection and manage your travel coverage.",
    image: "photo-1519681393784-d120267933ba",
    accent: "#FBBF24",
  },
  {
    number: "05",
    category: "GPS TRACKING",
    title: "Live Location",
    description: "Manage location sharing and journey tracking.",
    image: "photo-1473448912268-2022ce9509d8",
    accent: "#22D3EE",
  },
  {
    number: "06",
    category: "EMERGENCY OPERATIONS",
    title: "Emergency Support",
    description: "Request assistance and follow up on emergency alerts.",
    image: "photo-1584515933487-779824d29309",
    accent: "#FB7185",
    href: "/dashboard/emergency",
  },
  {
    number: "07",
    category: "CLAIMS & COMPENSATION",
    title: "Claims Centre",
    description: "Submit and follow up on eligible claims and compensation.",
    image: "photo-1450101499163-c8848c66ca85",
    accent: "#C4A1FF",
  },
  {
    number: "08",
    category: "TRAVEL PARTNERS",
    title: "Partner Network",
    description: "Discover hospitals, responders and verified travel partners.",
    image: "photo-1521737711867-e3b97375f902",
    accent: "#4ADE80",
  },
  {
    number: "09",
    category: "ANALYTICS & INTELLIGENCE",
    title: "Travel Insights",
    description: "View journey activity, safety information and account insights.",
    image: "photo-1516321318423-f06f85e504b3",
    accent: "#A5B4FC",
  },
];

function imageUrl(photo: string) {
  return `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=1000&q=85`;
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
            <h1>Welcome back, <span>{firstName}</span></h1>
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
              <span className="traveller-section-label">THE TSC PLATFORM</span>
              <h2>Your travel services</h2>
              <p>
                Everything you need to plan, protect and manage your journeys.
              </p>
            </div>
            <span className="traveller-total-services">09 SERVICES</span>
          </div>

          <div className="traveller-service-grid">
            {services.map((service) => (
              <article
                className="traveller-service-card"
                key={service.number}
                style={{ "--service-accent": service.accent } as CSSProperties}
              >
                <div
                  className="traveller-service-image"
                  role="img"
                  aria-label={`${service.title} service`}
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(8,18,35,.04) 10%, rgba(8,18,35,.88) 100%), url("${imageUrl(service.image)}")`,
                  }}
                >
                  <span className="traveller-service-number">{service.number}</span>
                  <span className="traveller-service-image-label">
                    TSC SERVICE
                  </span>
                </div>

                <div className="traveller-service-content">
                  <span className="traveller-service-category">
                    {service.category}
                  </span>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>

                  <div className="traveller-service-bottom">
                    {service.href ? (
                      <a className="traveller-service-status" href={service.href}>
                        Open service <span aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <span className="traveller-service-coming">
                        Coming soon
                      </span>
                    )}
                    <span className="traveller-service-arrow" aria-hidden="true">
                      →
                    </span>
                  </div>
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
