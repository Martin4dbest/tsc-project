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
    description: "Provide your trip details and choose the available safety service.",
  },
  {
    number: "03",
    title: "Activate your trip",
    description: "Complete the required activation process before travelling.",
  },
  {
    number: "04",
    title: "Travel with confidence",
    description: "Use the available trip-safety and support features throughout your journey.",
  },
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <div className="container nav-container">
          <a href="#" className="brand" aria-label="Travelers Safety Covered home">
            <Image
              src="/brand/tsc-header-logo.png"
              alt="Travelers Safety Covered"
              width={260}
              height={90}
              priority
              className="brand-logo"
            />
          </a>

          <nav className="desktop-nav" aria-label="Main navigation">
            <a href="#about">About</a>
            <a href="#services">Our Services</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#safety">Safety First</a>
          </nav>

          <div className="nav-actions">
            <a className="login-link" href="/login">
              Sign in
            </a>
            <a className="button button-primary nav-button" href="/register">
              Get started <span>↗</span>
            </a>
          </div>
        </div>
      </header>

      <section className="hero" id="about">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />

        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow eyebrow-light">
              <span className="eyebrow-dot" />
              SMARTER JOURNEYS. SAFER EXPERIENCES.
            </div>

            <h1>
              Every journey
              <br />
              deserves <span>protection.</span>
            </h1>

            <p className="hero-description">
              Travel with greater confidence. Travelers Safety Covered is
              building accessible trip-safety services designed to help
              travellers stay connected to support throughout their journeys.
            </p>

            <div className="hero-actions">
              <a href="/register" className="button button-orange">
                Explore TSC <span>→</span>
              </a>
              <a href="#how-it-works" className="button button-outline">
                Discover how it works
              </a>
            </div>

            <div className="hero-note">
              <span className="note-check">✓</span>
              <span>Designed around safer, smarter travel</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="Travel safety illustration">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />

            <div className="visual-location location-top">
              <span className="location-icon">📍</span>
              <div>
                <strong>Journey awareness</strong>
                <small>Stay informed on the move</small>
              </div>
            </div>

            <div className="visual-shield">
              <div className="shield-ring">
                <div className="shield-inner">
                  <span className="shield-symbol">✓</span>
                </div>
              </div>
              <span className="shield-caption">TRAVEL WITH CONFIDENCE</span>
            </div>

            <div className="visual-route">
              <div className="route-line" />
              <span className="route-pin pin-start">A</span>
              <span className="route-pin pin-end">B</span>
              <div className="route-car">🚘</div>
            </div>

            <div className="visual-location location-bottom">
              <span className="location-icon">🆘</span>
              <div>
                <strong>Support when needed</strong>
                <small>Emergency-ready thinking</small>
              </div>
            </div>

            <div className="visual-floating floating-one">✦</div>
            <div className="visual-floating floating-two">+</div>
          </div>
        </div>

        <div className="container hero-bottom">
          <span>TRAVEL SMART. ARRIVE SAFE.</span>
          <span className="hero-bottom-line" />
          <span>YOUR JOURNEY MATTERS</span>
        </div>
      </section>

      <section className="intro-section section-pad" id="safety">
        <div className="container intro-grid">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              THE TSC APPROACH
            </div>
            <h2>
              Safety should be part of
              <span className="text-orange"> every journey.</span>
            </h2>
          </div>

          <div className="intro-copy">
            <p>
              Whether you are commuting, travelling between cities or exploring
              somewhere new, your safety deserves thoughtful attention.
            </p>
            <p>
              TSC is developing a connected travel-safety platform that brings
              trip activation, journey awareness and access to support into one
              experience.
            </p>
            <a href="#services" className="text-link">
              Discover the TSC experience <span>→</span>
            </a>
          </div>
        </div>
      </section>

      <section className="services-section section-pad" id="services">
        <div className="container">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                WHAT WE ARE BUILDING
              </div>
              <h2>One platform. A safer travel experience.</h2>
            </div>
            <p>
              A connected approach to the different stages of your journey.
            </p>
          </div>

          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.number}>
                <div className="feature-card-top">
                  <span className="feature-icon">{feature.icon}</span>
                  <span className="feature-number">{feature.number}</span>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <span className="feature-arrow">↗</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="process-section section-pad" id="how-it-works">
        <div className="container">
          <div className="process-heading">
            <div className="eyebrow eyebrow-light">
              <span className="eyebrow-dot" />
              A SIMPLE APPROACH
            </div>
            <h2>
              Your journey.
              <br />
              A more thoughtful way to travel.
            </h2>
            <p>
              Our goal is to make access to travel-safety services clear and
              straightforward.
            </p>
          </div>

          <div className="steps-grid">
            {steps.map((step) => (
              <article className="step-card" key={step.number}>
                <span className="step-number">{step.number}</span>
                <div className="step-line" />
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section section-pad" id="get-started">
        <div className="container">
          <div className="cta-card">
            <div className="cta-decoration">TSC</div>
            <div className="cta-content">
              <div className="eyebrow eyebrow-light">
                <span className="eyebrow-dot" />
                THE JOURNEY STARTS HERE
              </div>
              <h2>Make safety part of your travel plans.</h2>
              <p>
                Discover the TSC vision and follow our journey as we build a
                smarter travel-safety experience.
              </p>
              <a href="mailto:core1enterprisesolutions@gmail.com" className="button button-orange">
                Contact our team <span>↗</span>
              </a>
            </div>
            <div className="cta-mark">
              <Image
                src="/brand/tsc-full-logo.png"
                alt="Travelers Safety Covered brand"
                width={360}
                height={360}
                className="cta-logo"
              />
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-main">
          <div className="footer-brand">
            <Image
              src="/brand/tsc-header-logo.png"
              alt="Travelers Safety Covered"
              width={230}
              height={80}
              className="footer-logo"
            />
            <p>Travel Smart. Arrive Safe.</p>
          </div>

          <div className="footer-links">
            <div>
              <strong>Explore</strong>
              <a href="#about">About TSC</a>
              <a href="#services">Our Services</a>
              <a href="#how-it-works">How It Works</a>
            </div>
            <div>
              <strong>Connect</strong>
              <a href="mailto:core1enterprisesolutions@gmail.com">Contact</a>
              <a href="https://www.core1enterprisesolutions.com/" target="_blank" rel="noreferrer">
                Core1 Enterprise Solutions
              </a>
            </div>
          </div>
        </div>

        <div className="container footer-bottom">
          <span>© 2026 Travelers Safety Covered. All rights reserved.</span>
          <span>Built with safety in mind.</span>
        </div>
      </footer>
    </main>
  );
}
