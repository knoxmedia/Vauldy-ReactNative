import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { logout, updateUserProfile } from "@/api/client";
import Screen from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { t, type Locale } from "@/i18n";
import { useAuthStore } from "@/store/auth";
import { useConfigStore } from "@/store/config";

export default function SettingsScreen() {
  const router = useRouter();
  const username = useAuthStore((s) => s.username);
  const uiLocale = useAuthStore((s) => s.uiLocale);
  const clearSession = useAuthStore((s) => s.clearSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const serverUrl = useConfigStore((s) => s.serverUrl);
  const appName = useConfigStore((s) => s.appName);

  async function changeLocale(locale: Locale) {
    try {
      await updateUserProfile({ ui_locale: locale });
      if (username) {
        const role = useAuthStore.getState().role;
        if (role) setProfile(username, role, { uiLocale: locale });
      }
    } catch {
      /* local only */
      if (username) {
        const role = useAuthStore.getState().role;
        if (role) setProfile(username, role, { uiLocale: locale });
      }
    }
  }

  async function onLogout() {
    await logout().catch(() => {});
    clearSession();
    router.replace("/login");
  }

  return (
    <Screen>
      <Text style={styles.title}>{t("settings.title")}</Text>
      <View style={styles.card}>
        <Text style={styles.label}>{appName}</Text>
        <Text style={styles.value}>{username}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t("settings.server")}</Text>
        <Text style={styles.value}>{serverUrl}</Text>
        <Pressable onPress={() => router.push("/setup")}>
          <Text style={styles.link}>{t("setup.title")}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t("settings.language")}</Text>
        <View style={styles.langRow}>
          {(["zh-CN", "en"] as Locale[]).map((locale) => (
            <Pressable
              key={locale}
              style={[styles.langBtn, uiLocale === locale && styles.langBtnActive]}
              onPress={() => changeLocale(locale)}
            >
              <Text style={[styles.langText, uiLocale === locale && styles.langTextActive]}>
                {t(`settings.lang.${locale}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        style={styles.logout}
        onPress={() =>
          Alert.alert(t("settings.logout"), "", [
            { text: t("common.cancel"), style: "cancel" },
            { text: t("settings.logout"), style: "destructive", onPress: onLogout },
          ])
        }
      >
        <Text style={styles.logoutText}>{t("settings.logout")}</Text>
      </Pressable>

      <Text style={styles.version}>{t("settings.version")}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: spacing.md, marginTop: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  label: { color: colors.textSecondary, fontSize: 12 },
  value: { color: colors.text, fontSize: 15 },
  link: { color: colors.brand, fontSize: 14, marginTop: 4 },
  langRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  langBtnActive: { borderColor: colors.brand, backgroundColor: "rgba(0,164,220,0.12)" },
  langText: { color: colors.textSecondary, fontSize: 13 },
  langTextActive: { color: colors.brand, fontWeight: "600" },
  logout: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: { color: colors.error, fontSize: 15, fontWeight: "600" },
  version: { color: colors.textMuted, textAlign: "center", marginTop: spacing.lg, fontSize: 12 },
});
