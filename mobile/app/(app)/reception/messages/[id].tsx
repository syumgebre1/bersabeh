/**
 * Reception: Single message thread — trilingual.
 */

import { ArrowLeft, Send } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";

import { apiFetch } from "@/lib/api";
import { theme } from "@/constants/theme";
import { useAppStore } from "@/store/app";


interface Message {
  id: string;
  sender: { full_name: string; role: string };
  body: string;
  is_system: boolean;
  created_at: string;
}


export default function ReceptionThreadDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const [draft, setDraft] = useState("");

  const { data: messages, isLoading, refetch } = useQuery({
    queryKey: ["thread-messages", id],
    queryFn: () => apiFetch<Message[]>(`/api/v1/threads/${id}/messages`),
    enabled: !!id,
  });

  const handleSend = async () => {
    if (!draft.trim()) return;
    try {
      await apiFetch(`/api/v1/threads/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: draft.trim() }),
      });
      setDraft("");
      await refetch();
    } catch {
      // ignore for now
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={16} color={theme.colors.text} strokeWidth={2.2} />
          <Text style={styles.backText}>{t("reception.messages.title")}</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="small" color={theme.colors.primary} /></View>
      ) : !messages || messages.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.mutedText}>{t("reception.messages.noThreads")}</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.messages}>
          {messages.map((m) => {
            const mine = m.sender?.role === user?.role;
            return (
              <View key={m.id} style={[styles.bubbleWrap, mine ? styles.bubbleWrapMine : styles.bubbleWrapOther]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  <Text style={[styles.sender, mine && styles.senderMine]}>
                    {m.sender?.full_name} · {m.sender?.role}
                  </Text>
                  <Text style={[styles.body, mine && styles.bodyMine]}>{m.body}</Text>
                  <Text style={[styles.timestamp, mine && styles.timestampMine]}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t("reception.messages.typeMessage")}
          placeholderTextColor={theme.colors.mutedLight}
          style={styles.input}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <Pressable onPress={handleSend} style={styles.sendBtn}>
          <Send size={16} color={theme.colors.textInverse} strokeWidth={2.4} />
        </Pressable>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.colors.bg },
  topBar: { paddingHorizontal: theme.spacing.xxl, paddingTop: theme.spacing.xxl, paddingBottom: theme.spacing.md },
  backBtn: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, alignSelf: "flex-start", paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border },
  backText: { fontFamily: theme.fontFamily.bodyMedium, fontSize: 13, color: theme.colors.text },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  mutedText: { fontFamily: theme.fontFamily.body, fontSize: 14, color: theme.colors.muted },
  scroll: { flex: 1 },
  messages: { paddingHorizontal: theme.spacing.xxl, paddingVertical: theme.spacing.lg, gap: theme.spacing.md, maxWidth: 900, width: "100%", alignSelf: "center" },
  bubbleWrap: { flexDirection: "row" },
  bubbleWrapMine: { justifyContent: "flex-end" },
  bubbleWrapOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "70%", padding: theme.spacing.md, borderRadius: theme.radius.md, gap: 4 },
  bubbleMine: { backgroundColor: theme.colors.primary },
  bubbleOther: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  sender: { fontFamily: theme.fontFamily.bodyBold, fontSize: 11, letterSpacing: 0.3, color: theme.colors.muted, textTransform: "uppercase" },
  senderMine: { color: "rgba(255,255,255,0.7)" },
  body: { fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text, lineHeight: 20 },
  bodyMine: { color: theme.colors.textInverse },
  timestamp: { fontFamily: theme.fontFamily.body, fontSize: 10.5, color: theme.colors.mutedLight, marginTop: 2 },
  timestampMine: { color: "rgba(255,255,255,0.55)" },
  composer: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, padding: theme.spacing.lg, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface },
  input: { flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, fontFamily: theme.fontFamily.body, fontSize: 14.5, color: theme.colors.text, backgroundColor: theme.colors.bg },
  sendBtn: { width: 40, height: 40, borderRadius: theme.radius.md, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center", cursor: "pointer" as any },
});
