import React from "react";
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

// High-contrast, crystal-clear vector world map background
const WORLD_IMAGE =
  "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=1600&q=90";

const TRANSPORT = [
  {
    title: "AIR TRAVEL",
    subtitle: "Airplanes & Aviation",
    icon: "✈",
    image:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=700&q=85",
  },
  {
    title: "SEA TRANSPORT",
    subtitle: "Ships & Maritime",
    icon: "⚓",
    image:
      "https://images.unsplash.com/photo-1494412519320-aa613dfb7738?w=700&q=85",
  },
  {
    title: "ROAD TRANSIT",
    subtitle: "Cars & Highways",
    icon: "🚗",
    image:
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=700&q=85",
  },
];

export default function App() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 390;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <Image
              source={require("./assets/tsc-header-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.globalBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.globalBadgeText}>GLOBAL TRAVEL SAFETY</Text>
          </View>
        </View>

        {/* HERO SECTION WITH FULLY VISIBLE MAP */}
        <View style={styles.heroWrapper}>
          <ImageBackground
            source={{ uri: WORLD_IMAGE }}
            style={styles.hero}
            imageStyle={styles.heroImage}
          >
            {/* Soft subtle gradient to maintain crisp map visibility while preserving text readability */}
            <View style={styles.heroOverlay} />

            <View style={styles.heroContent}>
              <View style={styles.eyebrow}>
                <View style={styles.eyebrowLine} />
                <Text style={styles.eyebrowText}>
                  TRAVELLERS SAFETY COVERED
                </Text>
              </View>

              <Text style={[styles.heading, compact && styles.headingCompact]}>
                Travel further.
                {"\n"}
                <Text style={styles.headingAccent}>Travel safer.</Text>
              </Text>

              <Text style={styles.description}>
                One platform for safer journeys, traveller protection and
                emergency support across air, sea, and road worldwide.
              </Text>

              {/* TRANSPORT CHIPS */}
              <View style={styles.transportChipsRow}>
                <View style={styles.transportChip}>
                  <Text style={styles.chipIcon}>✈</Text>
                  <Text style={styles.chipText}>Airplanes</Text>
                </View>
                <View style={styles.transportChip}>
                  <Text style={styles.chipIcon}>⚓</Text>
                  <Text style={styles.chipText}>Ships</Text>
                </View>
                <View style={styles.transportChip}>
                  <Text style={styles.chipIcon}>🚗</Text>
                  <Text style={styles.chipText}>Cars</Text>
                </View>
              </View>

              <View style={styles.heroActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => router.push("/register" as never)}
                >
                  <Text style={styles.primaryButtonText}>Create account</Text>
                  <Text style={styles.buttonArrow}>→</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => router.push("/login" as never)}
                >
                  <Text style={styles.secondaryButtonText}>Log in</Text>
                </Pressable>
              </View>

              <View style={styles.routeIndicator}>
                <View style={styles.routeDot} />
                <View style={styles.routeLine} />
                <View style={styles.routeDotOrange} />
                <Text style={styles.routeLabel}>CONNECTED WORLD JOURNEYS</Text>
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* TRANSPORT SECTION */}
        <View style={styles.transportSection}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionEyebrow}>MULTI-MODAL TRANSIT</Text>
              <Text style={styles.sectionTitle}>Every way you travel.</Text>
            </View>
            <Text style={styles.sectionNumber}>01 / 03</Text>
          </View>

          <View style={styles.transportGrid}>
            {TRANSPORT.map((item) => (
              <View key={item.title} style={styles.transportCard}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.transportImage}
                  resizeMode="cover"
                />
                <View style={styles.transportImageShade} />
                <View style={styles.transportText}>
                  <Text style={styles.transportIconSymbol}>{item.icon}</Text>
                  <Text style={styles.transportTitle}>{item.title}</Text>
                  <Text style={styles.transportSubtitle}>
                    {item.subtitle}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* PROTECTION SECTION */}
        <View style={styles.protectionSection}>
          <Text style={styles.protectionEyebrow}>
            YOUR JOURNEY. YOUR SAFETY.
          </Text>
          <Text style={styles.protectionTitle}>
            More confidence at every stage of your journey.
          </Text>

          <View style={styles.featureRow}>
            <View style={styles.featureItem}>
              <View style={styles.featureMark}>
                <Text style={styles.featureSymbol}>01</Text>
              </View>
              <Text style={styles.featureTitle}>Journey management</Text>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureMark}>
                <Text style={styles.featureSymbol}>02</Text>
              </View>
              <Text style={styles.featureTitle}>Traveller protection</Text>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureMark}>
                <Text style={styles.featureSymbol}>03</Text>
              </View>
              <Text style={styles.featureTitle}>Emergency support</Text>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.footerLogoContainer}>
            <Image
              source={require("./assets/tsc-header-logo.png")}
              style={styles.footerLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.footerText}>
            Travel with greater confidence.
          </Text>
          <Text style={styles.copyright}>
            © {new Date().getFullYear()} TSC. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    minHeight: 76,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  logoWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: {
    width: 28,
    height: 28,
  },
  globalBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 7,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#F97316",
  },
  globalBadgeText: {
    color: "#0F172A",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  heroWrapper: {
    backgroundColor: "#F1F5F9",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  hero: {
    minHeight: 520,
    justifyContent: "center",
    overflow: "hidden",
  },
  heroImage: {
    opacity: 0.95, // Fully crisp map visibility
    resizeMode: "cover",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255, 255, 255, 0.72)", // Ultra-light veil to make continents pop out clearly behind text
  },
  heroContent: {
    paddingHorizontal: 22,
    paddingVertical: 42,
    maxWidth: 580,
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  eyebrowLine: {
    width: 24,
    height: 2,
    backgroundColor: "#EA580C",
  },
  eyebrowText: {
    color: "#C2410C",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  heading: {
    color: "#0F172A",
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  headingCompact: {
    fontSize: 27,
    lineHeight: 34,
  },
  headingAccent: {
    color: "#EA580C",
  },
  description: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 14,
    maxWidth: 380,
    fontWeight: "600",
  },
  transportChipsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },
  transportChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#94A3B8",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  chipIcon: {
    fontSize: 13,
  },
  chipText: {
    color: "#0F172A",
    fontSize: 11,
    fontWeight: "700",
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 26,
  },
  primaryButton: {
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: 24,
    backgroundColor: "#EA580C",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  buttonArrow: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#0F172A",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  routeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 32,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0F172A",
  },
  routeLine: {
    width: 42,
    height: 2,
    backgroundColor: "#64748B",
  },
  routeDotOrange: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EA580C",
  },
  routeLabel: {
    color: "#334155",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginLeft: 10,
  },
  transportSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 32,
    backgroundColor: "#F8FAFC",
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  sectionEyebrow: {
    color: "#C2410C",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "900",
  },
  sectionNumber: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
    paddingBottom: 3,
  },
  transportGrid: {
    flexDirection: "row",
    gap: 10,
  },
  transportCard: {
    flex: 1,
    height: 150,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  transportImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  transportImageShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  transportText: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 12,
  },
  transportIconSymbol: {
    fontSize: 18,
    marginBottom: 4,
  },
  transportTitle: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  transportSubtitle: {
    color: "#E2E8F0",
    fontSize: 9,
    marginTop: 2,
    fontWeight: "600",
  },
  protectionSection: {
    paddingHorizontal: 20,
    paddingVertical: 36,
    backgroundColor: "#FFFFFF",
  },
  protectionEyebrow: {
    color: "#C2410C",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  protectionTitle: {
    color: "#0F172A",
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "900",
    marginTop: 8,
    maxWidth: 400,
  },
  featureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 24,
  },
  featureItem: {
    flex: 1,
    minWidth: 90,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  featureMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(234, 88, 12, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  featureSymbol: {
    color: "#EA580C",
    fontSize: 11,
    fontWeight: "900",
  },
  featureTitle: {
    color: "#1E293B",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 32,
    backgroundColor: "#07172B",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
  },
  footerLogoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0D223B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1D3855",
    marginBottom: 12,
    overflow: "hidden",
  },
  footerLogo: {
    width: 28,
    height: 28,
  },
  footerText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  copyright: {
    color: "#64748B",
    fontSize: 10,
    marginTop: 10,
  },
});