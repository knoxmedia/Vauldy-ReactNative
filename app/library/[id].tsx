import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { fetchLibraries, fetchLibraryTracks, fetchMedia } from "@/api/client";
import type { Library, MediaItem, MusicTrackRow } from "@/api/types";
import EmptyState from "@/components/EmptyState";
import MusicTrackList from "@/components/music/MusicTrackList";
import PhotoMasonryList from "@/components/photo/PhotoMasonryList";
import LoadingState from "@/components/LoadingState";
import MediaCard from "@/components/MediaCard";
import Screen from "@/components/Screen";
import { colors, spacing } from "@/constants/theme";
import { isMusicLibraryType, isPhotoLibraryType, libraryFileType } from "@/lib/library";
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

  const isMusicLibrary = isMusicLibraryType(library?.type || "");
  const isPhotoLibrary = isPhotoLibraryType(library?.type || "");

  const load = useCallback(async () => {
    const libs = await fetchLibraries();
    const lib = libs.find((l) => l.id === libraryId) || null;
    setLibrary(lib);
    if (lib) navigation.setOptions({ title: lib.name });

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
    load()
      .catch(() => {
        setItems([]);
        setTracks([]);
      })
      .finally(() => setLoading(false));
  }, [load]);

  if (loading) return <LoadingState />;

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
          {library ? (
            <Text style={styles.subtitle}>{t("library.media_count", { count: headerCount })}</Text>
          ) : null}
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

const styles = StyleSheet.create({
  subtitle: { color: colors.textSecondary, marginBottom: spacing.md },
  list: { paddingBottom: 140 },
  row: { gap: 8, marginBottom: 8 },
  cell: { flex: 1, minWidth: 0, maxWidth: "33.33%" },
});
