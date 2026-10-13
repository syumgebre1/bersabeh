/**
 * Login screen — trilingual (EN / አማ / ትግ).
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { getDashboardRoute, useLogin } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { theme } from "@/constants/theme";


const LoginSchema = z.object({
  email: z.string().email("invalid_email"),
  password: z.string().min(1, "required"),
});

type LoginForm = z.infer<typeof LoginSchema>;


export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const login = useLogin();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginForm) => {
    setServerError(null);
    try {
      const user = await login.mutateAsync(values);
      setTimeout(() => router.replace(getDashboardRoute(user.role) as any), 50);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.detail : t("auth.unableToSignIn");
      setServerError(message);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.brandRow}>
          <View style={styles.dot} />
          <Text style={styles.brand}>Bersabeh Clinic</Text>
        </View>

        <Text style={styles.title}>{t("auth.welcomeBack")}</Text>
        <Text style={styles.subtitle}>{t("auth.signInSubtitle")}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>{t("auth.email")}</Text>
          <Controller
            control={form.control}
            name="email"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={styles.input}
                placeholderTextColor={theme.colors.mutedLight}
              />
            )}
          />
          {form.formState.errors.email?.message === "invalid_email" ? (
            <Text style={styles.error}>{t("auth.invalidEmail")}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t("auth.password")}</Text>
          <Controller
            control={form.control}
            name="password"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="••••••••"
                secureTextEntry
                style={styles.input}
                placeholderTextColor={theme.colors.mutedLight}
              />
            )}
          />
          {form.formState.errors.password ? (
            <Text style={styles.error}>{t("auth.passwordRequired")}</Text>
          ) : null}
        </View>

        {serverError ? (
          <View style={styles.serverErrorBox}>
            <Text style={styles.serverErrorText}>{serverError}</Text>
          </View>
        ) : null}

        <Button
          label={t("auth.signIn")}
          variant="primary"
          size="lg"
          fullWidth
          loading={login.isPending}
          onPress={form.handleSubmit(onSubmit)}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t("auth.newPatient")}</Text>
          <Pressable onPress={() => router.push("/(auth)/register" as any)}>
            <Text style={styles.footerLink}>{t("auth.createAccount")}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.colors.bg, alignItems: "center", justifyContent: "center", padding: theme.spacing.lg, minHeight: "100vh" as unknown as number },
  card: { width: "100%", maxWidth: 420, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.xxl, gap: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadow.md },
  brandRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs + 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.secondary },
  brand: { fontFamily: theme.fontFamily.heading, fontSize: 18, color: theme.colors.primary, letterSpacing: -0.3 },
  title: { fontFamily: theme.fontFamily.heading, fontSize: 28, lineHeight: 34, letterSpacing: -0.5, color: theme.colors.text, marginTop: theme.spacing.sm },
  subtitle: { fontFamily: theme.fontFamily.body, fontSize: 15, color: theme.colors.muted, marginTop: -theme.spacing.sm },
  field: { gap: theme.spacing.xs },
  label: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: theme.colors.muted },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.base, paddingVertical: theme.spacing.md, fontFamily: theme.fontFamily.body, fontSize: 15, color: theme.colors.text, backgroundColor: theme.colors.bg },
  error: { fontFamily: theme.fontFamily.body, fontSize: 12.5, color: theme.colors.danger },
  serverErrorBox: { backgroundColor: theme.colors.dangerBg, borderRadius: theme.radius.md, padding: theme.spacing.base },
  serverErrorText: { fontFamily: theme.fontFamily.body, fontSize: 13.5, color: theme.colors.danger },
  footer: { flexDirection: "row", justifyContent: "center", gap: theme.spacing.xs, alignItems: "center", marginTop: theme.spacing.xs },
  footerText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  footerLink: { fontFamily: theme.fontFamily.bodyBold, fontSize: 14, color: theme.colors.primary },
});
