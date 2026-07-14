import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BackHandler, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { fetchLibraries, fetchLibraryTracks, fetchMedia } from "@/api/client";
import type { Library, MediaItem, MusicTrackRow } from "@/api/types";
import EmptyState from "@/components/EmptyState";
import MusicTrackList from "@/components/music/MusicTrackList";
import PhotoMasonryList from "@/components/photo/PhotoMasonryList";
import LoadingState from "@/components/LoadingState";
import MediaCard from "@/components/MediaCard";
import Screen from "@/components/Screen";
import TvShowDetail from "@/components/TvShowDetail";
import { colors, radius, spacing } from "@/constants/theme";
import { isMusicLibraryType, isPhotoLibraryType, isTVLibraryType, libraryFileType } from "@/lib/library";
import { groupMediaBySeries, type SeriesGroup } from "@/lib/mediaMeta";
import { mediaPosterSrc, withAccessToken } from "@/lib/mediaUrl";
import { t } from "@/i18n";

export default function LibraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const libraryId = Number(id);
  const router = useRouter();
  const navigation = useNavigation();
  const [library, setLibrary] = useState<Library | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [tracks, setTracks] = useState<MusicTrackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeries, setSelectedSeries] = useState<SeriesGroup | null>(null);

  const isMusicLibrary = isMusicLibraryType(library?.type || "");
  const isPhotoLibrary = isPhotoLibraryType(library?.type || "");
  const isTVLibrary = isTVLibraryType(library?.type || "");

  const tvGroups = useMemo(() => {
    if (!isTVLibrary || items.length === 0) return [];
    return groupMediaBySeries(items);
  }, [isTVLibrary, items]);

  const load = useCallback(async () => {
    const libs = await fetchLibraries();
    const lib = libs.find((l) => l.id === libraryId) || null;
    setLibrary(lib);
    if (lib) navigation.setOptions({ title: lib.name });

    if (lib && isTVLibraryType(lib.type)) {
      // Fetch all media for TV series grouping
      const media = await fetchMedia(libraryId, {
        file_type: "video",
        sort: "created_desc",
        limit: 500,
      });
      setItems(media);
      setTracks([]);
      return;
    }

    if (lib && isMusicLibraryType(lib.type)) {
      const rows = await fetchLibraryTracks(libraryId);
      setTracks(rows);
      setItems([]);
      return;
    }

    const fileType = lib ? libraryFileType(lib.type) : undefined;
    const sort = lib && isPhotoLibraryType(lib.type) ? "taken_desc" : "created_desc";
    const media = await fetchMedia(libraryId, {
      file_type: fileType,
      sort,
      limit: isPhotoLibraryType(lib?.type || "") ? 500 : 200,
    });
    setItems(media);
    setTracks([]);
  }, [libraryId, navigation]);

  useEffect(() => {
    setLoading(true);
    setSelectedSeries(null);
    load()
      .catch(() => {
        setItems([]);
        setTracks([]);
      })
      .finally(() => setLoading(false));
  }, [load]);

  // Hardware back button returns from series detail to grid
  useEffect(() => {
    if (!selectedSeries) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setSelectedSeries(null);
      return true;
    });
    return () => sub.remove();
  }, [selectedSeries]);

  if (loading) return <LoadingState />;

  // TV show detail view (when a series is selected)
  if (isTVLibrary && selectedSeries) {
    return (
      <TvShowDetail
        episodes={selectedSeries.episodes}
        showTitle={selectedSeries.name || library?.name || ""}
        heroPosterUrl={selectedSeries.posterUrl}
      />
    );
  }

  // TV show list view (poster grid of all series)
  if (isTVLibrary && library) {
    return <TvShowsGrid library={library} groups={tvGroups} onSelect={setSelectedSeries} />;
  }

  const openItem = (item: MediaItem) => {
    if (item.file_type === "image") {
      router.push(`/photo/${item.id}`);
      return;
    }
    router.push(`/media/${item.id}`);
  };

  const headerCount = isMusicLibrary ? tracks.length : (library?.media_count ?? items.length);
  const listHeader = library ? (
    <Text style={styles.subtitle}>{t("library.media_count", { count: headerCount })}</Text>
  ) : null;

  const cardAspect = (item: MediaItem): "poster" | "landscape" => {
    if (item.file_type === "video") return "landscape";
    if (item.width > 0 && item.height > 0 && item.width >= item.height) return "landscape";
    return "poster";
  };

  return (
    <Screen>
      {isMusicLibrary ? (
        <>
          {listHeader}
          {tracks.length === 0 ? (
            <EmptyState />
          ) : (
            <MusicTrackList tracks={tracks} />
          )}
        </>
      ) : isPhotoLibrary ? (
        <PhotoMasonryList
          items={items}
          onPress={openItem}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={<EmptyState />}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <View style={styles.cell}>
              <MediaCard
                item={item}
                fill
                aspect={cardAspect(item)}
                onPress={() => openItem(item)}
              />
            </View>
          )}
        />
      )}
    </Screen>
  );
}

function resolvePosterUrl(posterUrl: string, firstEpisode?: MediaItem): string {
  if (posterUrl) {
    // External URLs (TMDB etc) don't need auth token
    return posterUrl.startsWith("http") ? posterUrl : withAccessToken(posterUrl);
  }
  if (firstEpisode) return mediaPosterSrc(firstEpisode);
  return "";
}

/** Poster grid showing TV show series groups within a TV library. */
function TvShowsGrid({
  library,
  groups,
  onSelect,
}: {
  library: Library;
  groups: SeriesGroup[];
  onSelect: (group: SeriesGroup) => void;
}) {
  // If only one group (or all items belong to same show), show the detail directly.
  if (groups.length <= 1 && groups.length > 0) {
    return <TvShowDetail library={library} />;
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={groups}
        keyExtractor={(g) => g.key}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item: group }) => {
          const first = group.episodes[0];
          const posterUri = resolvePosterUrl(group.posterUrl, first);
          return (
            <Pressable style={styles.cell} onPress={() => onSelect(group)}>
              <View style={styles.posterWrap}>
                {posterUri ? (
                  <Image
                    source={{ uri: posterUri }}
                    style={styles.posterImg}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={[styles.posterImg, styles.posterPlaceholder]}>
                    <Ionicons name="tv-outline" size={28} color={colors.textMuted} />
                  </View>
                )}
              </View>
              <Text style={styles.posterTitle} numberOfLines={2}>
                {group.name || library.name}
              </Text>
              {group.year ? (
                <Text style={styles.posterMeta}>{group.year}</Text>
              ) : null}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: colors.textSecondary, marginBottom: spacing.md },
  list: { paddingBottom: 140 },
  row: { gap: 8, marginBottom: 8 },
  cell: { flex: 1, minWidth: 0, maxWidth: "33.33%" },
  posterWrap: {
    aspectRatio: 2 / 3,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  posterImg: { width: "100%", height: "100%" },
  posterPlaceholder: { alignItems: "center", justifyContent: "center" },
  posterTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
    lineHeight: 16,
    textAlign: "center",
  },
  posterMeta: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
  },
});
