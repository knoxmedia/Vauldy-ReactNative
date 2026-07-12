import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import type { MediaItem } from "@/api/types";
import { colors, radius, spacing } from "@/constants/theme";
import { photoThumbSrc } from "@/lib/mediaUrl";
import {
  distributePhotosToColumns,
  PHOTO_MASONRY_GAP,
  PHOTO_MASONRY_MIN_COL_PX,
  photoMasonryColumnCount,
  photoMasonryColumnWidth,
  resolvePhotoDim,
  type PhotoDim,
} from "@/lib/photoMasonry";

type Props = {
  items: MediaItem[];
  onPress: (item: MediaItem) => void;
  ListHeaderComponent?: ReactNode;
  ListEmptyComponent?: ReactNode;
  contentPaddingBottom?: number;
};

export default function PhotoMasonryList({
  items,
  onPress,
  ListHeaderComponent,
  ListEmptyComponent,
  contentPaddingBottom = 140,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const horizontalPadding = spacing.md * 2;
  const containerWidth = Math.max(0, windowWidth - horizontalPadding);
  const dimsRef = useRef<Map<number, PhotoDim>>(new Map());
  const [dimVersion, setDimVersion] = useState(0);

  const bumpDims = useCallback(() => setDimVersion((v) => v + 1), []);

  const setDim = useCallback(
    (id: number, w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      const prev = dimsRef.current.get(id);
      if (prev && prev.w === w && prev.h === h) return;
      dimsRef.current.set(id, { w, h });
      bumpDims();
    },
    [bumpDims],
  );

  useEffect(() => {
    let changed = false;
    for (const item of items) {
      if (item.width > 0 && item.height > 0) {
        const prev = dimsRef.current.get(item.id);
        if (!prev || prev.w !== item.width || prev.h !== item.height) {
          dimsRef.current.set(item.id, { w: item.width, h: item.height });
          changed = true;
        }
      }
    }
    if (changed) bumpDims();
  }, [items, bumpDims]);

  const cols = photoMasonryColumnCount(containerWidth);
  const colWidth = containerWidth > 0 ? photoMasonryColumnWidth(containerWidth, cols) : PHOTO_MASONRY_MIN_COL_PX;
  const dims = dimsRef.current;

  const columns = useMemo(
    () => distributePhotosToColumns(items, cols, colWidth, dims),
    [items, cols, colWidth, dimVersion],
  );

  if (items.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        {ListHeaderComponent}
        {ListEmptyComponent}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
      showsVerticalScrollIndicator
    >
      {ListHeaderComponent}
      <View style={styles.columns}>
        {columns.map((column, colIdx) => (
          <View key={colIdx} style={[styles.column, { width: colWidth }]}>
            {column.map((item) => {
              const { w, h } = resolvePhotoDim(item, dims);
              const uri = photoThumbSrc(item.id);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => onPress(item)}
                  style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
                >
                  <View style={[styles.imageWrap, { aspectRatio: w / h }]}>
                    {uri ? (
                      <Image
                        source={{ uri }}
                        style={styles.image}
                        contentFit="cover"
                        transition={200}
                        onLoad={(event) => {
                          const source = event.source;
                          if (source.width > 0 && source.height > 0) {
                            setDim(item.id, source.width, source.height);
                          }
                        }}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { flexGrow: 1 },
  emptyWrap: { flex: 1 },
  columns: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: PHOTO_MASONRY_GAP,
  },
  column: { gap: PHOTO_MASONRY_GAP },
  cell: { width: "100%" },
  cellPressed: { opacity: 0.88 },
  imageWrap: {
    width: "100%",
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: { width: "100%", height: "100%" },
});
