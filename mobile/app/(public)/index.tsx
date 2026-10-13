/**
 * Public landing page — complete.
 * All 11 sections composed here.
 */

import { ScrollView, StyleSheet, View } from "react-native";

import { DepartmentsGrid } from "@/components/landing/DepartmentsGrid";
import { DoctorsGrid } from "@/components/landing/DoctorsGrid";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LocationHours } from "@/components/landing/LocationHours";
import { PatientPortalCTA } from "@/components/landing/PatientPortalCTA";
import { ServicesList } from "@/components/landing/ServicesList";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { UtilityBar } from "@/components/landing/UtilityBar";
import { theme } from "@/constants/theme";


export default function LandingPage() {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator
    >
      <View>
        <UtilityBar />
        <Header />
      </View>
      <Hero />
      <TrustStrip />
      <DepartmentsGrid />
      <DoctorsGrid />
      <HowItWorks />
      <ServicesList />
      <LocationHours />
      <PatientPortalCTA />
      <Footer />
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  scrollContent: { flexGrow: 1 },
});
