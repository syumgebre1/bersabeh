/**
 * Patient self-registration screen.
 *
 * Submitting a valid form creates a user in pending_admin status.
 * The user CANNOT log in until an admin approves — this screen shows a
 * confirmation card explaining the wait.
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { useRegisterPatient } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { theme } from "@/constants/theme";


const RegisterSchema = z
  .object({
    full_name: z.string().min(2, "Please enter your full name"),
    email: z.string().email("Enter a valid email"),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Za-z]/, "Must contain a letter")
      .regex(/\d/, "Must contain a digit"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type RegisterForm = z.infer<typeof RegisterSchema>;


export default function RegisterScreen() {
  const router = useRouter();
  const register = useRegisterPatient();
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { full_name: "", email: "", phone: "", password: "", confirm: "" },
  });

  const onSubmit = async (values: RegisterForm) => {
    setServerError(null);
    try {
      await register.mutateAsync({
        email: values.email,
        password: values.password,
        full_name: values.full_name,
        phone: values.phone || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.detail : "Could not register. Try again.";
      setServerError(message);
    }
  };

  // ---------- Success state ----------
  if (submitted) {
    return (
      <View style={styles.wrap}>
        <View style={styles.card}>
          <View style={styles.brandRow}>
            <View style={styles.dot} />
            <Text style={styles.brand}>Bersabeh Clinic</Text>
          </View>

          <Text style={styles.title}>Registration received.</Text>
          <Text style={styles.subtitle}>
            Your account is now pending admin approval. Our team will verify
            your details within one working day. You'll be able to sign in as
            soon as it's approved.
          </Text>

          <Button
            label="Back to sign in"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.replace("/(auth)/login" as any)}
          />
        </View>
      </View>
    );
  }

  // ---------- Form state ----------
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.brandRow}>
          <View style={styles.dot} />
          <Text style={styles.brand}>Bersabeh Clinic</Text>
        </View>

        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          For patients. Staff accounts are created by the clinic admin.
        </Text>

        {/* Full name */}
        <View style={styles.field}>
          <Text style={styles.label}>Full name</Text>
          <Controller
            control={form.control}
            name="full_name"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Selam Tesfaye"
                style={styles.input}
                placeholderTextColor={theme.colors.mutedLight}
              />
            )}
          />
          {form.formState.errors.full_name ? (
            <Text style={styles.error}>{form.formState.errors.full_name.message}</Text>
          ) : null}
        </View>

        {/* Email */}
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
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
          {form.formState.errors.email ? (
            <Text style={styles.error}>{form.formState.errors.email.message}</Text>
          ) : null}
        </View>

        {/* Phone */}
        <View style={styles.field}>
          <Text style={styles.label}>Phone (optional)</Text>
          <Controller
            control={form.control}
            name="phone"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value ?? ""}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="+251 9xx xxx xxx"
                keyboardType="phone-pad"
                style={styles.input}
                placeholderTextColor={theme.colors.mutedLight}
              />
            )}
          />
        </View>

        {/* Password */}
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <Controller
            control={form.control}
            name="password"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="At least 8 characters"
                secureTextEntry
                style={styles.input}
                placeholderTextColor={theme.colors.mutedLight}
              />
            )}
          />
          {form.formState.errors.password ? (
            <Text style={styles.error}>{form.formState.errors.password.message}</Text>
          ) : null}
        </View>

        {/* Confirm */}
        <View style={styles.field}>
          <Text style={styles.label}>Confirm password</Text>
          <Controller
            control={form.control}
            name="confirm"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Repeat password"
                secureTextEntry
                style={styles.input}
                placeholderTextColor={theme.colors.mutedLight}
              />
            )}
          />
          {form.formState.errors.confirm ? (
            <Text style={styles.error}>{form.formState.errors.confirm.message}</Text>
          ) : null}
        </View>

        {serverError ? (
          <View style={styles.serverErrorBox}>
            <Text style={styles.serverErrorText}>{serverError}</Text>
          </View>
        ) : null}

        <Button
          label="Create account"
          variant="primary"
          size="lg"
          fullWidth
          loading={register.isPending}
          onPress={form.handleSubmit(onSubmit)}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Pressable onPress={() => router.replace("/(auth)/login" as any)}>
            <Text style={styles.footerLink}>Sign in</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
    minHeight: "100vh" as unknown as number,
  },
  card: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.xxl,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs + 2,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.secondary },
  brand: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 18,
    color: theme.colors.primary,
    letterSpacing: -0.3,
  },
  title: {
    fontFamily: theme.fontFamily.heading,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  subtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  field: { gap: theme.spacing.xs },
  label: {
    fontFamily: theme.fontFamily.bodyMedium,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: theme.colors.muted,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    fontFamily: theme.fontFamily.body,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: theme.colors.bg,
  },
  error: {
    fontFamily: theme.fontFamily.body,
    fontSize: 12.5,
    color: theme.colors.danger,
  },
  serverErrorBox: {
    backgroundColor: theme.colors.dangerBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing.base,
  },
  serverErrorText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 13.5,
    color: theme.colors.danger,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.spacing.xs,
    alignItems: "center",
    marginTop: theme.spacing.xs,
  },
  footerText: {
    fontFamily: theme.fontFamily.body,
    fontSize: 14,
    color: theme.colors.muted,
  },
  footerLink: {
    fontFamily: theme.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.primary,
  },
});
