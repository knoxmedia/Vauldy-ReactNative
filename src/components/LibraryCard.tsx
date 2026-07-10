import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { colors, libGradient, radius, spacing } from "@/constants/theme";
import { libraryTypeLabel } from "@/lib/library";
import { absoluteUrl } from "@/lib/mediaUrl";
import { t } from "@/i18n";
import type { Library } from "@/api/types";

type Props = {
  library: Library;
  onPress: () => void;
};

export default function LibraryCard({ library, onPress }: Props) {
  const [c1, c2, c3] = libGradient(library.type, library.id);
  const preview = library.preview_url ? absoluteUrl(library.preview_url) : null;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <LinearGradient colors={[c1, c2, c3]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover}>
        {preview ? (
          <Image source={{ uri: preview }} style={styles.preview} contentFit="cover" />
        ) : null}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{libraryTypeLabel(library.type, t)}</Text>
        </View>
      </LinearGradient>
      <View style={styles.meta}>
        <Text style={styles.name} numberOfLines={1}>
          {library.name}
        </Text>
        <Text style={styles.count}>{t("library.media_count", { count: library.media_count ?? 0 })}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  cover: { height: 120, justifyContent: "flex-end" },
  preview: { ...StyleSheet.absoluteFillObject, opacity: 0.55 },
  badge: {
    alignSelf: "flex-start",
    margin: spacing.sm,
    backgroundColor: colors.overlay,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  badgeText: { color: colors.text, fontSize: 11, fontWeight: "600" },
  meta: { padding: spacing.md, gap: 4 },
  name: { color: colors.text, fontSize: 16, fontWeight: "600" },
  count: { color: colors.textSecondary, fontSize: 12 },
});
