import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import { t } from "@/i18n";

export default function EmptyState({ message }: { message?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{message || t("common.empty")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  text: { color: colors.textSecondary, fontSize: 15, textAlign: "center" },
});
