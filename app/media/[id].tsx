import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  addFavorite,
  fetchFavoriteStatus,
  fetchMediaDetail,
  removeFavorite,
} from "@/api/client";
import type { MediaItem } from "@/api/types";
import LoadingState from "@/components/LoadingState";
import Screen from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { t } from "@/i18n";
import { formatDuration, mediaPosterSrc, mediaReleaseYear } from "@/lib/mediaUrl";

export default function MediaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mediaId = Number(id);
  const router = useRouter();
  const navigation = useNavigation();
  const [item, setItem] = useState<MediaItem | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMediaDetail(mediaId), fetchFavoriteStatus(mediaId)])
      .then(([detail, fav]) => {
        setItem(detail);
        setFavorited(fav);
        navigation.setOptions({ title: detail.title || detail.file_path });
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [mediaId, navigation]);

  if (loading || !item) return <LoadingState />;

  const poster = mediaPosterSrc(item);
  const year = mediaReleaseYear(item);

  const primaryAction = () => {
    if (item.file_type === "video") return router.push(`/player/${item.id}`);
    if (item.file_type === "audio") return router.push(`/player/${item.id}`);
    if (item.file_type === "image") return router.push(`/photo/${item.id}`);
    if (item.file_type === "document") return router.push(`/reader/${item.id}`);
  };

  const actionLabel =
    item.file_type === "video"
      ? t("media.play_video")
      : item.file_type === "audio"
        ? t("media.play_audio")
        : item.file_type === "image"
          ? t("media.view_photo")
          : t("media.read_document");

  async function toggleFavorite() {
    if (!item) return;
    try {
      if (favorited) {
        await removeFavorite(item.id);
        setFavorited(false);
      } else {
        await addFavorite(item.id);
        setFavorited(true);
      }
    } catch {
      Alert.alert(t("common.error"));
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          {poster ? (
            <Image source={{ uri: poster }} style={styles.poster} contentFit="cover" />
          ) : (
            <View style={[styles.poster, styles.placeholder]}>
              <Ionicons name="film-outline" size={48} color={colors.textMuted} />
            </View>
          )}
        </View>

        <Text style={styles.title}>{item.title || item.file_path}</Text>
        <View style={styles.metaRow}>
          {year ? <Text style={styles.meta}>{t("media.year")}: {year}</Text> : null}
          {item.duration > 0 ? <Text style={styles.meta}>{formatDuration(item.duration)}</Text> : null}
        </View>

        {item.overview ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>{t("media.overview")}</Text>
            <Text style={styles.overview}>{item.overview}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable style={styles.primaryBtn} onPress={primaryAction}>
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={styles.primaryText}>{actionLabel}</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={toggleFavorite}>
            <Ionicons name={favorited ? "heart" : "heart-outline"} size={18} color={colors.accent} />
            <Text style={styles.secondaryText}>{favorited ? t("common.unfavorite") : t("common.favorite")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
  hero: { alignItems: "center", marginBottom: spacing.md },
  poster: {
    width: "72%",
    aspectRatio: 2 / 3,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeholder: { alignItems: "center", justifyContent: "center" },
  title: { color: colors.text, fontSize: 24, fontWeight: "700", marginBottom: 8 },
  metaRow: { flexDirection: "row", gap: 12, marginBottom: spacing.md },
  meta: { color: colors.textSecondary, fontSize: 13 },
  block: { marginBottom: spacing.lg },
  blockTitle: { color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 8 },
  overview: { color: colors.textSecondary, lineHeight: 22, fontSize: 14 },
  actions: { gap: 12 },
  primaryBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryBtn: {
    backgroundColor: colors.accentBg,
    borderRadius: radius.md,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(237,109,0,0.25)",
  },
  secondaryText: { color: colors.accent, fontSize: 15, fontWeight: "600" },
});
