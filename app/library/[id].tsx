import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { fetchLibraries, fetchMedia } from "@/api/client";
import type { Library, MediaItem } from "@/api/types";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import MediaCard from "@/components/MediaCard";
import Screen from "@/components/Screen";
import { colors, spacing } from "@/constants/theme";
import { isPhotoLibraryType, libraryFileType } from "@/lib/library";
import { t } from "@/i18n";

export default function LibraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const libraryId = Number(id);
  const router = useRouter();
  const navigation = useNavigation();
  const [library, setLibrary] = useState<Library | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const libs = await fetchLibraries();
    const lib = libs.find((l) => l.id === libraryId) || null;
    setLibrary(lib);
    if (lib) navigation.setOptions({ title: lib.name });
    const fileType = lib ? libraryFileType(lib.type) : undefined;
    const sort = lib && isPhotoLibraryType(lib.type) ? "taken_desc" : "created_desc";
    const media = await fetchMedia(libraryId, {
      file_type: fileType,
      sort,
      limit: isPhotoLibraryType(lib?.type || "") ? 500 : 200,
    });
    setItems(media);
  }, [libraryId, navigation]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setItems([]))
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

  return (
    <Screen>
      {library ? (
        <Text style={styles.subtitle}>{t("library.media_count", { count: library.media_count ?? items.length })}</Text>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <MediaCard
              item={item}
              aspect={item.file_type === "video" ? "landscape" : "poster"}
              onPress={() => openItem(item)}
            />
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: colors.textSecondary, marginBottom: spacing.md },
  list: { paddingBottom: 24 },
  row: { gap: 8, marginBottom: 8 },
  cell: { flex: 1, maxWidth: "33.33%" },
});
