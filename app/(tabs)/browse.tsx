import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { fetchLibraries } from "@/api/client";
import type { Library } from "@/api/types";
import EmptyState from "@/components/EmptyState";
import LibraryCard from "@/components/LibraryCard";
import LoadingState from "@/components/LoadingState";
import Screen from "@/components/Screen";
import { colors, spacing } from "@/constants/theme";
import { t } from "@/i18n";

export default function BrowseScreen() {
  const router = useRouter();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchLibraries()
        .then((items) => setLibraries(items.filter((l) => l.enabled !== 0)))
        .catch(() => setLibraries([]))
        .finally(() => setLoading(false));
    }, []),
  );

  if (loading) return <LoadingState />;

  return (
    <Screen>
      <Text style={styles.title}>{t("browse.title")}</Text>
      <FlatList
        data={libraries}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <LibraryCard library={item} onPress={() => router.push(`/library/${item.id}`)} />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: spacing.md, marginTop: spacing.sm },
  list: { paddingBottom: 140 },
});
