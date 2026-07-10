import { ReactNode } from "react";
import { SafeAreaView, StyleSheet, View, ViewStyle } from "react-native";
import { colors, spacing } from "@/constants/theme";

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
};

export default function Screen({ children, style, padded = true }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.inner, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1 },
  padded: { paddingHorizontal: spacing.md },
});
