import { useCallback, useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItemInfo } from "react-native";
import type { MusicTrackRow } from "@/api/types";
import NowPlayingIndicator from "@/components/music/NowPlayingIndicator";
import { colors, radius, spacing } from "@/constants/theme";
import { t } from "@/i18n";
import { formatDuration } from "@/lib/mediaUrl";
import { trackRowsToMusicTracks } from "@/lib/musicQueue";
import { useMusicPlayerStore } from "@/store/musicPlayer";

type Props = {
  tracks: MusicTrackRow[];
};

export default function MusicTrackList({ tracks }: Props) {
  const currentMediaId = useMusicPlayerStore((s) => s.mediaId);
  const playing = useMusicPlayerStore((s) => s.playing);
  const playTrack = useMusicPlayerStore((s) => s.playTrack);

  const sortedTracks = useMemo(
    () => [...tracks].sort((a, b) => (a.title || "").localeCompare(b.title || "", "zh-CN")),
    [tracks],
  );
  const queue = useMemo(() => trackRowsToMusicTracks(sortedTracks), [sortedTracks]);

  const playAt = useCallback(
    (mediaId: number) => {
      const index = queue.findIndex((track) => track.mediaId === mediaId);
      if (index < 0) return;
      playTrack(queue[index]!, queue, index);
    },
    [playTrack, queue],
  );

  const header = (
    <View style={styles.headerRow}>
      <Text style={[styles.headerText, styles.colIndex]}>#</Text>
      <Text style={[styles.headerText, styles.colTitle]}>{t("music.col_title")}</Text>
      <Text style={[styles.headerText, styles.colArtist]}>{t("music.col_artist")}</Text>
      <Text style={[styles.headerText, styles.colDuration]}>{t("music.col_duration")}</Text>
    </View>
  );

  const renderRow = ({ item, index }: ListRenderItemInfo<MusicTrackRow>) => {
    const isCurrent = currentMediaId === item.media_id;
    const artist = item.artist || item.album_artist || "Various Artists";
    const duration = item.duration ? formatDuration(item.duration) : "—";

    return (
      <Pressable
        onPress={() => playAt(item.media_id)}
        style={[styles.row, isCurrent && styles.rowActive]}
      >
        <View style={styles.colIndex}>
          {isCurrent ? (
            <NowPlayingIndicator playing={playing} />
          ) : (
            <Text style={styles.indexText}>{item.track_number || index + 1}</Text>
          )}
        </View>
        <Text style={[styles.cell, styles.colTitle, isCurrent && styles.cellActive]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.cell, styles.colArtist]} numberOfLines={1}>
          {artist}
        </Text>
        <Text style={[styles.cell, styles.colDuration, styles.durationText]} numberOfLines={1}>
          {duration}
        </Text>
      </Pressable>
    );
  };

  return (
    <FlatList
      data={sortedTracks}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={header}
      contentContainerStyle={styles.list}
      removeClippedSubviews={false}
      renderItem={renderRow}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 140,
    paddingHorizontal: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    marginBottom: 2,
    borderRadius: radius.sm,
  },
  rowActive: {
    backgroundColor: colors.accentBg,
  },
  colIndex: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  colTitle: { flex: 2, minWidth: 0, marginRight: 8 },
  colArtist: { flex: 1.5, minWidth: 0, marginRight: 8 },
  colDuration: { width: 56, minWidth: 56 },
  cell: {
    color: colors.text,
    fontSize: 15,
  },
  cellActive: {
    color: colors.accent,
    fontWeight: "600",
  },
  indexText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
  durationText: {
    color: colors.textSecondary,
    textAlign: "right",
    fontSize: 13,
  },
});
