import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  title: {
    default: "Travelers Safety Covered | Travel Smart. Arrive Safe.",
    template: "%s | Travelers Safety Covered",
  },
  description:
    "Travelers Safety Covered is building a connected travel-safety platform focused on trip activation, journey awareness and access to support.",
  applicationName: "Travelers Safety Covered",
  keywords: [
    "Travelers Safety Covered",
    "TSC",
    "travel safety",
    "trip safety",
    "journey support",
    "travel protection",
  ],
  icons: {
    icon: "/brand/tsc-header-logo.png",
  },
  openGraph: {
    title: "Travelers Safety Covered",
    description: "Travel Smart. Arrive Safe.",
    siteName: "Travelers Safety Covered",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
