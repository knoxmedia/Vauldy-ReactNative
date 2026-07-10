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
import { fetchUserInfo, login } from "@/api/client";
import { colors, radius, spacing } from "@/constants/theme";
import { t } from "@/i18n";
import { useAuthStore } from "@/store/auth";
import { useConfigStore } from "@/store/config";

export default function LoginScreen() {
  const router = useRouter();
  const appName = useConfigStore((s) => s.appName);
  const setToken = useAuthStore((s) => s.setToken);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    try {
      const token = await login(username.trim(), password);
      setToken(token);
      const user = await fetchUserInfo();
      setProfile(user.username, user.role, {
        canPlay: user.can_play !== false,
        avatarUrl: user.avatar_url || null,
        uiLocale: user.ui_locale || null,
      });
      Alert.alert(t("login.success"));
      router.replace("/(tabs)");
    } catch {
      Alert.alert(t("login.failure"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={["#0f1419", "#1a2332"]} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.wrap}>
        <View style={styles.card}>
          <Text style={styles.title}>{t("login.title", { appName })}</Text>
          <Text style={styles.subtitle}>{t("login.subtitle")}</Text>
          <Text style={styles.label}>{t("login.username")}</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.label}>{t("login.password")}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <Pressable style={styles.button} onPress={onSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t("login.submit")}</Text>}
          </Pressable>
          <Text style={styles.hint}>{t("login.demo_hint")}</Text>
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
  subtitle: { color: colors.textSecondary, marginTop: 8, marginBottom: 20 },
  label: { color: colors.textSecondary, fontSize: 13, marginBottom: 8, marginTop: 8 },
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
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 16 },
});
