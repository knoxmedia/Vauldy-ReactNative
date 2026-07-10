import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "@/constants/theme";
import { formatDuration, mediaPosterSrc, mediaReleaseYear } from "@/lib/mediaUrl";
import type { MediaItem } from "@/api/types";

type Props = {
  item: MediaItem;
  onPress: () => void;
  aspect?: "poster" | "landscape";
  progress?: number;
};

export default function MediaCard({ item, onPress, aspect = "poster", progress }: Props) {
  const poster = mediaPosterSrc(item);
  const year = mediaReleaseYear(item);
  const isLandscape = aspect === "landscape";

  return (
    <Pressable style={[styles.card, isLandscape && styles.cardLandscape]} onPress={onPress}>
      <View style={[styles.posterWrap, isLandscape && styles.posterLandscape]}>
        {poster ? (
          <Image source={{ uri: poster }} style={styles.poster} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.poster, styles.placeholder]}>
            <Ionicons name="film-outline" size={28} color={colors.textMuted} />
          </View>
        )}
        {item.file_type === "video" && item.duration > 0 ? (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
          </View>
        ) : null}
        {typeof progress === "number" && progress > 0 ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${Math.min(progress, 100)}%` }]} />
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {item.title || item.file_path}
      </Text>
      {year ? <Text style={styles.meta}>{year}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 120, marginRight: 12 },
  cardLandscape: { width: 180 },
  posterWrap: {
    width: "100%",
    aspectRatio: 2 / 3,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  posterLandscape: { aspectRatio: 16 / 9 },
  poster: { width: "100%", height: "100%" },
  placeholder: { alignItems: "center", justifyContent: "center" },
  durationBadge: {
    position: "absolute",
    right: 6,
    bottom: 6,
    backgroundColor: colors.overlay,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: { color: colors.text, fontSize: 10, fontWeight: "600" },
  progressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  progressBar: { height: "100%", backgroundColor: colors.accent },
  title: { color: colors.text, fontSize: 13, marginTop: 8, lineHeight: 18 },
  meta: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
});
