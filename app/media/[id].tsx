import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  addFavorite,
  fetchFavoriteStatus,
  fetchLibraryTracks,
  fetchMediaDetail,
  removeFavorite,
} from "@/api/client";
import type { MediaDetail } from "@/api/types";
import LoadingState from "@/components/LoadingState";
import Screen from "@/components/Screen";
import { colors, radius, spacing } from "@/constants/theme";
import { t } from "@/i18n";
import { formatBitrate, formatMetaRating, parseMediaMeta } from "@/lib/mediaMeta";
import { mediaItemToMusicTrack, trackRowsToMusicTracks } from "@/lib/musicQueue";
import { formatDuration, mediaDetailPosterSrc, mediaReleaseYear } from "@/lib/mediaUrl";
import { useMusicPlayerStore } from "@/store/musicPlayer";

type MetaItem = { label: string; value: string };

export default function MediaDetailScreen() {
  const { width, height } = useWindowDimensions();
  const isPortrait = height >= width;
  const { id } = useLocalSearchParams<{ id: string }>();
  const mediaId = Number(id);
  const router = useRouter();
  const navigation = useNavigation();
  const [item, setItem] = useState<MediaDetail | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [techExpanded, setTechExpanded] = useState(false);

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

  const meta = useMemo(() => parseMediaMeta(item?.meta_json), [item?.meta_json]);
  const isVideo = item?.file_type === "video";

  if (loading || !item) return <LoadingState />;

  const poster = mediaDetailPosterSrc(item, meta.poster);
  const year = mediaReleaseYear(item) || (meta.releaseDate ? meta.releaseDate.slice(0, 4) : "");
  const overview = (item.overview || meta.overview || "").trim();
  const ratingText = formatMetaRating(meta.rating);
  const resolution =
    item.width > 0 && item.height > 0 ? `${item.width}×${item.height}` : "";
  const bitrateText = formatBitrate(item.bitrate || meta.bitrate);

  const techItems: MetaItem[] = [
    year ? { label: t("media.year"), value: year } : null,
    item.duration > 0 ? { label: t("media.duration"), value: formatDuration(item.duration) } : null,
    ratingText ? { label: t("media.rating"), value: ratingText } : null,
    resolution ? { label: t("media.resolution"), value: resolution } : null,
    meta.videoCodec ? { label: t("media.video_codec"), value: meta.videoCodec.toUpperCase() } : null,
    meta.audioCodec ? { label: t("media.audio_codec"), value: meta.audioCodec.toUpperCase() } : null,
    bitrateText ? { label: t("media.bitrate"), value: bitrateText } : null,
    meta.container ? { label: t("media.container"), value: meta.container } : null,
  ].filter((x): x is MetaItem => x !== null);

  const summaryParts = [
    year || null,
    item.duration > 0 ? formatDuration(item.duration) : null,
    ratingText || null,
  ].filter(Boolean) as string[];

  const useCompactTech = isVideo && isPortrait && techItems.length > 0;

  const primaryAction = async () => {
    if (item.file_type === "video") return router.push(`/player/${item.id}`);
    if (item.file_type === "audio") {
      const track = mediaItemToMusicTrack(item);
      const playTrack = useMusicPlayerStore.getState().playTrack;
      if (item.library_id) {
        try {
          const rows = await fetchLibraryTracks(item.library_id);
          const queue = trackRowsToMusicTracks(rows);
          const idx = queue.findIndex((q) => q.mediaId === item.id);
          if (idx >= 0) {
            playTrack(queue[idx]!, queue, idx);
            return;
          }
        } catch {
          /* fall through */
        }
      }
      playTrack(track);
      return;
    }
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
            <Image
              source={{ uri: poster }}
              style={[styles.poster, isVideo && styles.posterVideo]}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.poster, isVideo && styles.posterVideo, styles.placeholder]}>
              <Ionicons name="film-outline" size={48} color={colors.textMuted} />
            </View>
          )}
        </View>

        <Text style={styles.title}>{item.title || item.file_path}</Text>

        {meta.genres.length > 0 ? (
          <View style={styles.tagRow}>
            {meta.genres.map((g) => (
              <View key={g} style={styles.tag}>
                <Text style={styles.tagText}>{g}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {useCompactTech ? (
          <View style={styles.techCompact}>
            {summaryParts.length > 0 ? (
              <Text style={styles.summaryLine}>{summaryParts.join(" · ")}</Text>
            ) : null}
            <Pressable style={styles.techToggle} onPress={() => setTechExpanded((v) => !v)}>
              <Text style={styles.techToggleText}>
                {techExpanded ? t("media.collapse_tech") : t("media.expand_tech")}
              </Text>
              <Ionicons
                name={techExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.brand}
              />
            </Pressable>
            {techExpanded ? (
              <View style={styles.metaGridCompact}>
                {techItems.map((chip) => (
                  <MetaChip key={chip.label} label={chip.label} value={chip.value} compact />
                ))}
              </View>
            ) : null}
          </View>
        ) : techItems.length > 0 ? (
          <View style={styles.metaGrid}>
            {techItems.map((chip) => (
              <MetaChip key={chip.label} label={chip.label} value={chip.value} />
            ))}
          </View>
        ) : null}

        {meta.director.length > 0 ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>{t("media.director")}</Text>
            <Text style={styles.blockBody}>{meta.director.join(" / ")}</Text>
          </View>
        ) : null}

        {overview ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>{t("media.overview")}</Text>
            <Text style={styles.overview}>{overview}</Text>
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

function MetaChip({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.chip, compact && styles.chipCompact]}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={[styles.chipValue, compact && styles.chipValueCompact]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 140 },
  hero: { alignItems: "center", marginBottom: spacing.md },
  poster: {
    width: "72%",
    aspectRatio: 2 / 3,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  posterVideo: {
    width: "92%",
    aspectRatio: 16 / 9,
  },
  placeholder: { alignItems: "center", justifyContent: "center" },
  title: { color: colors.text, fontSize: 24, fontWeight: "700", marginBottom: 8, paddingHorizontal: spacing.md },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  tag: {
    backgroundColor: colors.accentBg,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(237,109,0,0.2)",
  },
  tagText: { color: colors.accent, fontSize: 12, fontWeight: "600" },
  techCompact: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: 8,
  },
  summaryLine: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  techToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  techToggleText: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: "600",
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  metaGridCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  chip: {
    minWidth: "47%",
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipCompact: {
    minWidth: "31%",
    flexGrow: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  chipLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 2 },
  chipValue: { color: colors.text, fontSize: 14, fontWeight: "600" },
  chipValueCompact: { fontSize: 13 },
  block: { marginBottom: spacing.lg, paddingHorizontal: spacing.md },
  blockTitle: { color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 8 },
  blockBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  overview: { color: colors.textSecondary, lineHeight: 22, fontSize: 14 },
  actions: { gap: 12, paddingHorizontal: spacing.md },
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
