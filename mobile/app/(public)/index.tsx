/**
 * Public landing page — composed section by section.
 */

import { ScrollView, StyleSheet, View } from "react-native";

import { DepartmentsGrid } from "@/components/landing/DepartmentsGrid";
import { DoctorsGrid } from "@/components/landing/DoctorsGrid";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
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
      {/* More sections will be added below */}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.colors.bg },
  scrollContent: { flexGrow: 1 },
});
