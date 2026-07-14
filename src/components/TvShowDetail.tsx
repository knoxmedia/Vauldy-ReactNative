import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { fetchMedia, fetchUserHistory } from "@/api/client";
import type { Library, MediaItem } from "@/api/types";
import { colors, radius, spacing } from "@/constants/theme";
import { t } from "@/i18n";
import { extractSeasonEpisode, parseMediaMeta } from "@/lib/mediaMeta";
import { formatDuration, mediaPosterSrc, mediaReleaseYear, withAccessToken } from "@/lib/mediaUrl";

type EpisodeItem = MediaItem & {
  season: number;
  episode: number;
  watched: boolean;
  progress: number;
};

type EpisodeSection = {
  title: string;
  season: number;
  data: EpisodeItem[];
};

type Props = {
  library?: Library;
  episodes?: MediaItem[];
  showTitle?: string;
  heroPosterUrl?: string;
};

export default function TvShowDetail({ library, episodes: preEpisodes, showTitle, heroPosterUrl }: Props) {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [loading, setLoading] = useState(true);

  const hasPreEpisodes = preEpisodes !== undefined;

  const load = useCallback(async () => {
    let media: MediaItem[];
    let history: Awaited<ReturnType<typeof fetchUserHistory>>;

    if (hasPreEpisodes) {
      media = preEpisodes;
      history = await fetchUserHistory(500);
    } else {
      if (!library) return;
      [media, history] = await Promise.all([
        fetchMedia(library.id, { sort: "created_desc", limit: 500 }),
        fetchUserHistory(500),
      ]);
    }

    const watchedSet = new Set<number>();
    const progressMap = new Map<number, number>();
    for (const h of history) {
      if (h.completed) watchedSet.add(h.media_id);
      if (h.duration > 0) {
        const pct = Math.round((h.position / h.duration) * 100);
        if (pct > 0) progressMap.set(h.media_id, pct);
      }
    }

    const items: EpisodeItem[] = [];
    for (const item of media) {
      const se = extractSeasonEpisode(item);
      items.push({
        ...item,
        season: se?.season ?? 1,
        episode: se?.episode ?? 0,
        watched: watchedSet.has(item.id) || item.completed === 1,
        progress: progressMap.get(item.id) ?? 0,
      });
    }

    // Normalize title: strip quality/resolution/codec tags for dedup
    const normalizeTitle = (t: string) =>
      t
        .replace(/\[.*?\]/g, "")          // [Group] [1080p] etc
        .replace(/\(.*?\)/g, "")          // (BluRay) etc
        .replace(/\b(1080p|720p|2160p|4[Kk]|480p|360p)\b/g, "")
        .replace(/\b(BluRay|Blu-ray|WEB-?DL|WEBRip|HDTV|HDRip|DVDRip|BDRip|AMZN)\b/gi, "")
        .replace(/\b(x264|x265|HEVC|AVC|H\.?264|H\.?265)\b/gi, "")
        .replace(/\b(AAC|AC3|DTS|FLAC|EAC3|MP3|AAC2?\.0|DD5?\.1|TrueHD|Atmos)\b/gi, "")
        .replace(/\b(10bit|8bit|HDR|DV|SDR|HLG|DoVi)\b/gi, "")
        .replace(/\b(REPACK|PROPER|INTERNAL|EXTENDED|UNCUT|REMUX)\b/gi, "")
        .replace(/[.\-_\s]+/g, " ")
        .trim()
        .toLowerCase();

    // Dedup: by (season, episode) when known, by normalized title as fallback, or id as final fallback
    const seenKeys = new Set<string>();
    const deduped: EpisodeItem[] = [];
    for (const item of items) {
      const seKey = item.episode > 0 ? `${item.season}-${item.episode}` : "";
      const titleKey = normalizeTitle(item.title || item.file_path || "");
      const dedupKey = seKey || titleKey || String(item.id);
      if (seenKeys.has(dedupKey)) continue;
      seenKeys.add(dedupKey);
      deduped.push(item);
    }

    // Sort ascending: season then episode, numeric fallback from title
    const sortNum = (t?: string) => {
      const s = t || "";
      let m = s.match(/\b[Ee][Pp]?\s*(\d{1,3})\b/);
      if (m) return Number(m[1]);
      const nums = s.match(/\d+/g);
      if (nums && nums.length > 0) {
        const filtered = nums.map(Number).filter((n) => n < 1000);
        if (filtered.length > 0) return filtered[filtered.length - 1];
      }
      return 0;
    };
    deduped.sort((a, b) =>
      a.season - b.season ||
      a.episode - b.episode ||
      sortNum(a.title) - sortNum(b.title) ||
      (a.title || "").localeCompare(b.title || ""),
    );
    setEpisodes(deduped);
  }, [library?.id, hasPreEpisodes, preEpisodes]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setEpisodes([]))
      .finally(() => setLoading(false));
  }, [load]);

  const sections = useMemo<EpisodeSection[]>(() => {
    const map = new Map<number, EpisodeItem[]>();
    for (const ep of episodes) {
      const list = map.get(ep.season) || [];
      list.push(ep);
      map.set(ep.season, list);
    }
    const result: EpisodeSection[] = [];
    const keys = [...map.keys()].sort((a, b) => a - b);
    for (const season of keys) {
      result.push({
        title: t("series.season", { n: season }),
        season,
        data: map.get(season) || [],
      });
    }
    return result;
  }, [episodes]);

  const heroPoster = useMemo(() => {
    if (heroPosterUrl) {
      return heroPosterUrl.startsWith("http") ? heroPosterUrl : withAccessToken(heroPosterUrl);
    }
    if (library?.preview_url) return library.preview_url;
    if (episodes.length > 0) return mediaPosterSrc(episodes[0]);
    return "";
  }, [heroPosterUrl, library, episodes]);

  const displayName = showTitle || library?.name || "";

  const showMeta = useMemo(() => {
    if (episodes.length === 0) return null;
    const first = episodes[0];
    const meta = parseMediaMeta(first.meta_json);
    const year = mediaReleaseYear(first);
    return {
      overview: first.overview || meta.overview || "",
      year,
      rating: meta.rating,
      genres: meta.genres,
    };
  }, [episodes]);

  const totalWatched = episodes.filter((e) => e.watched).length;
  const hasUnwatched = episodes.some((e) => !e.watched);

  const POSTER_WIDTH = width * 0.32;
  const POSTER_HEIGHT = POSTER_WIDTH * 1.5;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  const playEpisode = (item: MediaItem) => {
    router.push(`/player/${item.id}`);
  };

  const playFirstUnwatched = () => {
    const next = episodes.find((e) => !e.watched);
    if (next) {
      router.push(`/player/${next.id}`);
    } else if (episodes.length > 0) {
      router.push(`/player/${episodes[0].id}`);
    }
  };

  const playFromStart = () => {
    if (episodes.length > 0) {
      router.push(`/player/${episodes[0].id}`);
    }
  };

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        stickySectionHeadersEnabled
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Top section: poster left + info right */}
            <View style={styles.topSection}>
              <View style={[styles.posterWrap, { width: POSTER_WIDTH, height: POSTER_HEIGHT }]}>
                {heroPoster ? (
                  <Image
                    source={{ uri: heroPoster }}
                    style={styles.posterImg}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={[styles.posterImg, styles.posterPlaceholder]}>
                    <Ionicons name="tv-outline" size={32} color={colors.textMuted} />
                  </View>
                )}
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.showName} numberOfLines={2}>
                  {displayName}
                </Text>

                {showMeta && (
                  <>
                    <View style={styles.metaRow}>
                      {showMeta.year ? (
                        <Text style={styles.metaText}>{showMeta.year}</Text>
                      ) : null}
                      {showMeta.genres.length > 0 ? (
                        <>
                          {showMeta.year ? <Text style={styles.metaDot}>·</Text> : null}
                          <Text style={styles.metaText} numberOfLines={1}>
                            {showMeta.genres.slice(0, 3).join(" / ")}
                          </Text>
                        </>
                      ) : null}
                    </View>

                    <Text style={styles.episodeCount}>
                      {t("series.total_episodes", { count: episodes.length })}
                      {totalWatched > 0
                        ? `  ${t("series.watched_count", { watched: totalWatched, total: episodes.length })}`
                        : ""}
                    </Text>

                    <View style={styles.actionBtns}>
                      {hasUnwatched && (
                        <Pressable style={styles.primaryBtn} onPress={playFirstUnwatched}>
                          <Ionicons name="play" size={16} color="#fff" />
                          <Text style={styles.primaryBtnText}>{t("series.continue_watch")}</Text>
                        </Pressable>
                      )}
                      <Pressable
                        style={[styles.secondaryBtn, !hasUnwatched && styles.secondaryBtnFull]}
                        onPress={playFromStart}
                      >
                        <Ionicons name="refresh" size={16} color={colors.text} />
                        <Text style={styles.secondaryBtnText}>{t("series.start_from_beginning")}</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            </View>

            {showMeta?.overview ? (
              <View style={styles.overviewSection}>
                <Text style={styles.overviewText} numberOfLines={3}>
                  {showMeta.overview}
                </Text>
              </View>
            ) : null}

            {sections.length > 0 && (
              <View style={styles.episodesHeader}>
                <Text style={styles.episodesHeaderText}>{t("series.episode_list")}</Text>
              </View>
            )}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.seasonHeader}>
            <Text style={styles.seasonTitle}>{section.title}</Text>
            <Text style={styles.seasonCount}>
              {section.data.length} {t("series.episodes_unit")}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable style={styles.episodeRow} onPress={() => playEpisode(item)}>
            <View style={styles.episodeThumb}>
              <Image
                source={{ uri: mediaPosterSrc(item) }}
                style={styles.episodeThumbImg}
                contentFit="cover"
                transition={100}
              />
              <View style={styles.episodePlayOverlay}>
                <Ionicons name="play" size={16} color="#fff" />
              </View>
            </View>

            <View style={styles.episodeInfo}>
              <Text style={styles.episodeTitle} numberOfLines={2}>
                {item.episode > 0 ? (
                  <Text style={styles.episodeNumber}>
                    {item.season > 1
                      ? `S${String(item.season).padStart(2, "0")}E${String(item.episode).padStart(2, "0")}  `
                      : `E${String(item.episode).padStart(2, "0")}  `}
                  </Text>
                ) : null}
                {item.title || item.file_path}
              </Text>
              <View style={styles.episodeMeta}>
                {item.duration > 0 ? (
                  <Text style={styles.episodeDuration}>{formatDuration(item.duration)}</Text>
                ) : null}
                {item.watched ? (
                  <View style={styles.watchedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={styles.watchedText}>{t("series.watched")}</Text>
                  </View>
                ) : item.progress > 0 ? (
                  <Text style={styles.progressText}>{t("series.progress", { pct: item.progress })}</Text>
                ) : null}
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t("common.empty")}</Text>
          </View>
        }
        ListFooterComponent={<View style={styles.footer} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  loadingText: { color: colors.textSecondary },
  listContent: { paddingBottom: 140 },

  // Top section: poster + info
  topSection: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingTop: 50,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  posterWrap: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  posterImg: { width: "100%", height: "100%" },
  posterPlaceholder: { alignItems: "center", justifyContent: "center" },

  // Info
  infoSection: { flex: 1, justifyContent: "center", gap: 6 },
  showName: { color: colors.text, fontSize: 20, fontWeight: "700", lineHeight: 26 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  metaText: { color: colors.textSecondary, fontSize: 13 },
  metaDot: { color: colors.textMuted, fontSize: 13 },
  episodeCount: { color: colors.textMuted, fontSize: 13, marginTop: 2 },

  // Action buttons
  actionBtns: { gap: 8, marginTop: 8 },
  primaryBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.sm,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  secondaryBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnFull: { flex: 1 },
  secondaryBtnText: { color: colors.text, fontSize: 14, fontWeight: "500" },

  // Overview
  overviewSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  overviewText: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },

  // Episodes header
  episodesHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  episodesHeaderText: { color: colors.text, fontSize: 17, fontWeight: "700" },

  // Season header
  seasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  seasonTitle: { color: colors.text, fontSize: 15, fontWeight: "600" },
  seasonCount: { color: colors.textMuted, fontSize: 13 },

  // Episode row
  episodeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  episodeThumb: {
    width: 110,
    height: 62,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: colors.surface,
    marginRight: 12,
  },
  episodeThumbImg: { width: "100%", height: "100%" },
  episodePlayOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  episodeInfo: { flex: 1 },
  episodeTitle: { color: colors.text, fontSize: 14, lineHeight: 19 },
  episodeNumber: { color: colors.brand, fontWeight: "700" },
  episodeMeta: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" },
  episodeDuration: { color: colors.textMuted, fontSize: 12 },
  watchedBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  watchedText: { color: colors.success, fontSize: 12, fontWeight: "500" },
  progressText: { color: colors.brand, fontSize: 12 },

  // Empty
  emptyContainer: { alignItems: "center", paddingVertical: spacing.xl },
  emptyText: { color: colors.textMuted },

  // Footer
  footer: { height: 120 },
});
