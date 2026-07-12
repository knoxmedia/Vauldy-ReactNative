import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchMedia, fetchMediaDetail } from "@/api/client";
import type { MediaDetail, MediaItem } from "@/api/types";
import LoadingState from "@/components/LoadingState";
import { colors } from "@/constants/theme";
import { useMusicPreviewBar } from "@/hooks/useMusicPreviewBar";
import { photoMediumSrc } from "@/lib/mediaUrl";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function PhotoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mediaId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useMusicPreviewBar();

  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList<MediaItem>>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const detail = await fetchMediaDetail(mediaId);
        let items: MediaItem[] = [];
        if (detail.library_id) {
          items = await fetchMedia(detail.library_id, {
            file_type: "image",
            sort: "taken_desc",
            limit: 500,
          });
        }
        if (cancelled) return;

        const list = items.length > 0 ? items : [detail as MediaDetail];
        const idx = list.findIndex((p) => p.id === mediaId);
        const safeIdx = idx >= 0 ? idx : 0;
        setPhotos(list);
        setIndex(safeIdx);
        requestAnimationFrame(() => {
          if (safeIdx > 0) listRef.current?.scrollToIndex({ index: safeIdx, animated: false });
        });
      } catch {
        if (!cancelled) {
          setPhotos([]);
          setIndex(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mediaId]);

  const onMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setIndex(next);
  }, []);

  const renderPhoto = useCallback(({ item }: ListRenderItemInfo<MediaItem>) => {
    const uri = photoMediumSrc(item.id);
    return (
      <View style={styles.page}>
        {uri ? <Image source={{ uri }} style={styles.image} contentFit="contain" transition={200} /> : null}
      </View>
    );
  }, []);

  if (loading) return <LoadingState />;

  return (
    <View style={styles.container}>
      <Pressable style={[styles.close, { top: insets.top + 8 }]} onPress={() => router.back()}>
        <Ionicons name="close" size={28} color="#fff" />
      </Pressable>
      <FlatList
        ref={listRef}
        data={photos}
        keyExtractor={(item) => String(item.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={renderPhoto}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, i) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * i, index: i })}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({ offset: SCREEN_WIDTH * info.index, animated: false });
        }}
      />
      {photos.length > 1 ? (
        <Text style={[styles.counter, { bottom: insets.bottom + 16 }]}>
          {index + 1} / {photos.length}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundDeep },
  page: { width: SCREEN_WIDTH, flex: 1, justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  close: { position: "absolute", left: 16, zIndex: 10, padding: 8 },
  counter: {
    position: "absolute",
    alignSelf: "center",
    color: "rgba(255,255,255,0.85)",
    fontSize: 16,
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
});
