import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { checkHealth, fetchBranding } from "@/api/client";
import { colors, radius, spacing } from "@/constants/theme";
import { t } from "@/i18n";
import { normalizeServerUrl, useConfigStore } from "@/store/config";

export default function SetupScreen() {
  const router = useRouter();
  const serverUrl = useConfigStore((s) => s.serverUrl);
  const setServerUrl = useConfigStore((s) => s.setServerUrl);
  const setAppName = useConfigStore((s) => s.setAppName);
  const [url, setUrl] = useState(serverUrl || "http://127.0.0.1:8200");
  const [loading, setLoading] = useState(false);

  async function connect() {
    const normalized = normalizeServerUrl(url);
    if (!normalized) return;
    setLoading(true);
    try {
      setServerUrl(normalized);
      const ok = await checkHealth();
      if (!ok) throw new Error("health");
      try {
        const branding = await fetchBranding();
        if (branding.app_name) setAppName(branding.app_name);
      } catch {
        /* optional */
      }
      router.replace("/login");
    } catch {
      setServerUrl(null);
      Alert.alert(t("setup.failure"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={["#0f1419", "#1a2332"]} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.wrap}>
        <View style={styles.card}>
          <Text style={styles.title}>{t("setup.title")}</Text>
          <Text style={styles.subtitle}>{t("setup.subtitle")}</Text>
          <Text style={styles.label}>{t("setup.url")}</Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t("setup.url_placeholder")}
            placeholderTextColor={colors.textMuted}
          />
          <Pressable style={styles.button} onPress={connect} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("setup.continue")}</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  wrap: { flex: 1, justifyContent: "center", padding: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: "700" },
  subtitle: { color: colors.textSecondary, marginTop: 8, marginBottom: 20, lineHeight: 20 },
  label: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  button: {
    marginTop: 20,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
