import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { fetchLibraries, fetchMedia, fetchUserHistory } from "@/api/client";
import type { HistoryItem, Library, MediaItem } from "@/api/types";
import LibraryCard from "@/components/LibraryCard";
import LoadingState from "@/components/LoadingState";
import MediaCard from "@/components/MediaCard";
import Screen from "@/components/Screen";
import { colors, spacing } from "@/constants/theme";
import { t } from "@/i18n";
import { useConfigStore } from "@/store/config";
import { useFocusEffect } from "@react-navigation/native";

export default function HomeScreen() {
  const router = useRouter();
  const appName = useConfigStore((s) => s.appName);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [recent, setRecent] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const libs = await fetchLibraries();
    setLibraries(libs.filter((l) => l.enabled !== 0));
    const hist = await fetchUserHistory(12);
    setHistory(hist);
    const recentItems: MediaItem[] = [];
    for (const lib of libs.slice(0, 3)) {
      const items = await fetchMedia(lib.id, { sort: "created_desc", limit: 8 });
      recentItems.push(...items);
    }
    setRecent(recentItems.slice(0, 12));
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load()
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [load]),
  );

  if (loading) return <LoadingState />;

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.brand}
            onRefresh={async () => {
              setRefreshing(true);
              await load().catch(() => {});
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.brand}>{appName}</Text>
        </View>

        {history.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("home.continue")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {history.map((h) => (
                <MediaCard
                  key={h.media_id}
                  item={{
                    id: h.media_id,
                    library_id: h.library_id,
                    file_id: "",
                    title: h.title,
                    file_path: "",
                    file_type: h.file_type,
                    duration: h.duration,
                    width: 0,
                    height: 0,
                    format: "",
                    status: "",
                    poster_url: h.poster_url,
                    backdrop_url: h.backdrop_url,
                    encrypted_asset: h.encrypted_asset,
                  }}
                  aspect="landscape"
                  progress={h.duration > 0 ? (h.position / h.duration) * 100 : 0}
                  onPress={() => router.push(`/media/${h.media_id}`)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("home.libraries")}</Text>
          <View style={styles.listPad}>
            {libraries.map((lib) => (
              <LibraryCard key={lib.id} library={lib} onPress={() => router.push(`/library/${lib.id}`)} />
            ))}
          </View>
        </View>

        {recent.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("home.recent")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {recent.map((item) => (
                <MediaCard key={item.id} item={item} onPress={() => router.push(`/media/${item.id}`)} />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 140 },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  brand: { color: colors.text, fontSize: 28, fontWeight: "700" },
  section: { marginTop: spacing.lg },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  row: { paddingHorizontal: spacing.md },
  listPad: { paddingHorizontal: spacing.md },
});
