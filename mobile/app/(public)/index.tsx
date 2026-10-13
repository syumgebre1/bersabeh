/**
 * Public landing page — composed section by section.
 */

import { StyleSheet, View } from "react-native";

import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { UtilityBar } from "@/components/landing/UtilityBar";
import { theme } from "@/constants/theme";


export default function LandingPage() {
  return (
    <View style={styles.root}>
      <UtilityBar />
      <Header />
      <Hero />
      <TrustStrip />
      {/* More sections will be added below */}
    </View>
  );
}


const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
});
