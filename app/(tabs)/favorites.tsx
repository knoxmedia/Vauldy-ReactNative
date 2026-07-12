import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { fetchFavorites } from "@/api/client";
import type { MediaItem } from "@/api/types";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import MediaCard from "@/components/MediaCard";
import Screen from "@/components/Screen";
import { colors, spacing } from "@/constants/theme";
import { t } from "@/i18n";

export default function FavoritesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchFavorites()
        .then(setItems)
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, []),
  );

  if (loading) return <LoadingState />;

  return (
    <Screen>
      <Text style={styles.title}>{t("favorites.title")}</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <MediaCard fill item={item} onPress={() => router.push(`/media/${item.id}`)} />
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: spacing.md, marginTop: spacing.sm },
  list: { paddingBottom: 140 },
  row: { gap: 8, marginBottom: 8 },
  cell: { flex: 1, minWidth: 0, maxWidth: "33.33%" },
});
