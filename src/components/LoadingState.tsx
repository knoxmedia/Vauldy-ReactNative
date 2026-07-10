import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import { t } from "@/i18n";

export default function LoadingState({ label }: { label?: string }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.brand} size="large" />
      <Text style={styles.text}>{label || t("common.loading")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  text: { color: colors.textSecondary, fontSize: 14 },
});
