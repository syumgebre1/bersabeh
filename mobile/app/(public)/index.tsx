/**
 * Public landing page — composed section by section.
 *
 * Note: wrapped in a ScrollView so the page scrolls on web AND native.
 * A plain <View flex:1> clips overflow on web, which is why scrolling
 * was impossible before.
 */

import { ScrollView, StyleSheet, View } from "react-native";

import { DepartmentsGrid } from "@/components/landing/DepartmentsGrid";
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
      <View style={styles.sticky}>
        <UtilityBar />
        <Header />
      </View>
      <Hero />
      <TrustStrip />
      <DepartmentsGrid />
      {/* More sections will be added below */}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  sticky: {
    // UtilityBar + Header stay at top of the scroll container.
    // For a truly sticky header we'd use position:sticky on web;
    // that's a polish step for later.
  },
});
