/**
 * Hero — big headline + CTA + booking widget with real date/dept pickers.
 */

import { ArrowRight, Calendar, ChevronDown } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { BookingModal } from "@/components/landing/BookingModal";
import { DatePickerModal } from "@/components/ui/DatePickerModal";
import { DepartmentPicker } from "@/components/ui/DepartmentPicker";
import { theme } from "@/constants/theme";
import { scrollToSection } from "@/lib/scroll";


const DEPARTMENT_LABELS: Record<string, string> = {
  internal_medicine: "Internal Medicine",
  general_surgery: "General Surgery",
  gastroenterology: "Gastroenterology",
  cardiology: "Cardiology",
  nephrology: "Nephrology",
  pulmonology: "Pulmonology",
  post_op_care: "Post-op Care",
  wound_care: "Wound Care",
};


export function Hero() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [date, setDate] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const handleCheck = () => {
    setShowBookingModal(true);
  };

  const displayDate = date
    ? new Date(date).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })
    : t("hero.booking.datePlaceholder");

  const displayDept = department
    ? DEPARTMENT_LABELS[department] ?? department
    : t("hero.booking.departmentPlaceholder");

  return (
    <View style={styles.hero}>
      <View style={[styles.cols, !isWide && styles.colsStack]}>
        <View style={styles.left}>
          <Text style={styles.eyebrow}>{t("hero.eyebrow")}</Text>
          <Text style={[styles.headline, !isWide && styles.headlineNarrow]}>
            {t("hero.headline")}
          </Text>

          <View style={styles.ctaRow}>
            <Pressable
              onPress={() => router.push("/(auth)/register" as any)}
              style={({ hovered }: any) => [styles.cta, styles.ctaPrimary, hovered && styles.ctaHover]}
            >
              <Text style={styles.ctaTextPrimary}>{t("hero.ctaPrimary")}</Text>
              <ArrowRight size={16} color={theme.colors.textInverse} strokeWidth={2.4} />
            </Pressable>
            <Pressable
              onPress={() => scrollToSection("departments")}
              style={({ hovered }: any) => [styles.cta, styles.ctaOutline, hovered && styles.ctaOutlineHover]}
            >
              <Text style={styles.ctaTextOutline}>{t("hero.ctaSecondary")}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.right}>
          <View style={styles.bookingCard}>
            <Text style={styles.bookingTitle}>{t("hero.booking.title")}</Text>

            {/* Date field — opens DatePickerModal */}
            <View style={styles.field}>
              <Text style={styles.label}>{t("hero.booking.date")}</Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={({ hovered }: any) => [styles.input, hovered && styles.inputHover]}
              >
                <Calendar size={14} color={theme.colors.muted} strokeWidth={2} />
                <Text style={[styles.inputText, date ? styles.inputTextActive : null]}>
                  {displayDate}
                </Text>
              </Pressable>
            </View>

            {/* Department field — opens DepartmentPicker */}
            <View style={styles.field}>
              <Text style={styles.label}>{t("hero.booking.department")}</Text>
              <Pressable
                onPress={() => setShowDeptPicker(true)}
                style={({ hovered }: any) => [styles.input, hovered && styles.inputHover]}
              >
                <Text style={[styles.inputText, department ? styles.inputTextActive : null]}>
                  {displayDept}
                </Text>
                <ChevronDown size={14} color={theme.colors.muted} strokeWidth={2} />
              </Pressable>
            </View>

            <Pressable
              onPress={handleCheck}
              style={({ hovered }: any) => [styles.checkBtn, hovered && styles.checkBtnHover]}
            >
              <Text style={styles.checkBtnText}>{t("hero.booking.check")}</Text>
            </Pressable>

            <Text style={styles.bookingNote}>{t("hero.booking.success")}</Text>
          </View>
        </View>
      </View>

      {/* Modals */}
      <DatePickerModal
        visible={showDatePicker}
        initialDate={date ? new Date(date) : undefined}
        onSelect={setDate}
        onClose={() => setShowDatePicker(false)}
      />
      <DepartmentPicker
        visible={showDeptPicker}
        onSelect={setDepartment}
        onClose={() => setShowDeptPicker(false)}
      />
      <BookingModal
        visible={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        defaultDate={date}
        defaultDepartment={department}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  hero: { backgroundColor: theme.colors.bg, paddingVertical: theme.spacing.huge, paddingHorizontal: theme.spacing.lg },
  cols: { flexDirection: "row", gap: theme.spacing.xxl, maxWidth: theme.layout.maxContentWidth, width: "100%", alignSelf: "center", alignItems: "center" },
  colsStack: { flexDirection: "column", alignItems: "stretch" },
  left: { flex: 1, gap: theme.spacing.lg },
  eyebrow: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: theme.colors.secondary },
  headline: { fontFamily: theme.fontFamily.heading, fontSize: 56, lineHeight: 62, letterSpacing: -1.6, color: theme.colors.text },
  headlineNarrow: { fontSize: 36, lineHeight: 42, letterSpacing: -0.8 },
  ctaRow: { flexDirection: "row", gap: theme.spacing.md, flexWrap: "wrap", marginTop: theme.spacing.md },
  cta: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs + 2, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.base, borderRadius: theme.radius.md, cursor: "pointer" as any },
  ctaPrimary: { backgroundColor: theme.colors.primary },
  ctaHover: { opacity: 0.9, transform: [{ translateY: -1 }] },
  ctaOutline: { borderWidth: 1.5, borderColor: theme.colors.primary },
  ctaOutlineHover: { backgroundColor: "rgba(42,42,114,0.05)" },
  ctaTextPrimary: { fontFamily: theme.fontFamily.bodyBold, fontSize: 15, color: theme.colors.textInverse },
  ctaTextOutline: { fontFamily: theme.fontFamily.bodyBold, fontSize: 15, color: theme.colors.primary },
  right: { flex: 1, minWidth: 320 },
  bookingCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.xl, gap: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadow.md },
  bookingTitle: { fontFamily: theme.fontFamily.headingMedium, fontSize: 15, letterSpacing: 1, textTransform: "uppercase", color: theme.colors.primary, marginBottom: theme.spacing.xs },
  field: { gap: theme.spacing.xs },
  label: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: theme.colors.muted },
  input: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.sm, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, cursor: "pointer" as any },
  inputHover: { borderColor: theme.colors.primary },
  inputText: { flex: 1, fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  inputTextActive: { color: theme.colors.text },
  checkBtn: { backgroundColor: theme.colors.secondary, borderRadius: theme.radius.md, paddingVertical: theme.spacing.base, alignItems: "center", marginTop: theme.spacing.sm, cursor: "pointer" as any },
  checkBtnHover: { opacity: 0.9 },
  checkBtnText: { fontFamily: theme.fontFamily.bodyBold, fontSize: 15, color: theme.colors.textInverse },
  bookingNote: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.muted, textAlign: "center" },
});


export default Hero;
