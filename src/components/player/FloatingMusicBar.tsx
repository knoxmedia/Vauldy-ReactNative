import { useSegments } from "expo-router";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MusicCoverArt from "@/components/player/MusicCoverArt";
import MusicLyricsPanel from "@/components/player/MusicLyricsPanel";
import MusicTransportButtons from "@/components/player/MusicTransportButtons";
import { colors, radius, spacing } from "@/constants/theme";
import { useMusicPlayerStore } from "@/store/musicPlayer";

const TAB_BAR_HEIGHT = 68;
const BAR_HEIGHT = 88;

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function FloatingMusicBar() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const inAuth = segments[0] === "login" || segments[0] === "setup";
  const onPlayerScreen = segments[0] === "player";
  const onTabs = segments[0] === "(tabs)";

  const active = useMusicPlayerStore((s) => s.active);
  const previewBarHidden = useMusicPlayerStore((s) => s.previewBarHidden);
  const videoPausedMusic = useMusicPlayerStore((s) => s.videoPausedMusic);
  const lyricsExpanded = useMusicPlayerStore((s) => s.lyricsExpanded);
  const mediaId = useMusicPlayerStore((s) => s.mediaId);
  const title = useMusicPlayerStore((s) => s.title);
  const artist = useMusicPlayerStore((s) => s.artist);
  const albumTitle = useMusicPlayerStore((s) => s.albumTitle);
  const coverUri = useMusicPlayerStore((s) => s.coverUri);
  const playing = useMusicPlayerStore((s) => s.playing);
  const position = useMusicPlayerStore((s) => s.position);
  const duration = useMusicPlayerStore((s) => s.duration);
  const toggle = useMusicPlayerStore((s) => s.toggle);
  const stop = useMusicPlayerStore((s) => s.stop);
  const prev = useMusicPlayerStore((s) => s.prev);
  const next = useMusicPlayerStore((s) => s.next);
  const queue = useMusicPlayerStore((s) => s.queue);
  const queueIndex = useMusicPlayerStore((s) => s.queueIndex);
  const setLyricsExpanded = useMusicPlayerStore((s) => s.setLyricsExpanded);

  const canGoPrev = queue.length > 0 && (position > 3 || queueIndex > 0);
  const canGoNext = queue.length > 0 && queueIndex + 1 < queue.length;
  const barVisible =
    !inAuth && active && !onPlayerScreen && !previewBarHidden && !videoPausedMusic && !!mediaId;

  if (!barVisible || !mediaId) return null;

  const progress = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  const subtitle = [artist, albumTitle].filter(Boolean).join(" — ");
  const bottomOffset = (onTabs ? TAB_BAR_HEIGHT : 0) + insets.bottom;
  const overlayHeight = windowHeight - bottomOffset - BAR_HEIGHT;

  const toggleLyrics = () => setLyricsExpanded(!lyricsExpanded);

  const artBlock = (
    <View style={[styles.lyricsHeader, isLandscape && styles.lyricsHeaderLandscape]}>
      <View style={[styles.coverWrap, isLandscape && styles.coverWrapLandscape]}>
        <MusicCoverArt uri={coverUri} style={styles.coverImg} iconSize={isLandscape ? 40 : 48} />
      </View>
      <Text style={[styles.artTitle, isLandscape && styles.artTitleLandscape]} numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.artSub, isLandscape && styles.artSubLandscape]} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.wrap, { bottom: bottomOffset }]} pointerEvents="box-none">
      <View
        style={[
          styles.lyricsOverlay,
          { height: overlayHeight, top: -overlayHeight },
          !lyricsExpanded && styles.lyricsHidden,
        ]}
        pointerEvents={lyricsExpanded ? "auto" : "none"}
      >
        <View
          style={[
            styles.lyricsInner,
            isLandscape && styles.lyricsInnerLandscape,
            {
              paddingTop: isLandscape ? insets.top + spacing.sm : insets.top + spacing.sm,
              paddingLeft: insets.left + spacing.sm,
              paddingRight: insets.right + spacing.sm,
            },
          ]}
        >
          {artBlock}
          <View style={[styles.lyricsBody, isLandscape && styles.lyricsBodyLandscape]}>
            <MusicLyricsPanel
              mediaId={mediaId}
              position={position}
              playing={playing}
              variant="fullscreen"
              landscape={isLandscape}
            />
          </View>
        </View>
      </View>

      <View style={styles.bar} pointerEvents="auto">
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.mainRow}>
          <Pressable style={styles.expandBtn} onPress={toggleLyrics} hitSlop={8}>
            <Text style={styles.expandGlyph}>{lyricsExpanded ? "▼" : "▲"}</Text>
          </Pressable>

          <View style={styles.meta}>
            <Text style={styles.titleText} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitleText} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
            <Text style={styles.timeInline}>
              {formatTime(position)} / {formatTime(duration)}
            </Text>
          </View>

          <MusicTransportButtons
            playing={playing}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
            onPrev={prev}
            onToggle={toggle}
            onNext={next}
            onStop={stop}
            compact
          />
        </View>
      </View>
    </View>
  );
}

export const MUSIC_BAR_TOTAL_HEIGHT = BAR_HEIGHT;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 200,
    elevation: 24,
    pointerEvents: "box-none",
  },
  lyricsOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    zIndex: 1,
  },
  lyricsHidden: {
    opacity: 0,
  },
  lyricsInner: {
    flex: 1,
    minHeight: 0,
  },
  lyricsInnerLandscape: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.lg,
  },
  lyricsHeader: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexShrink: 0,
  },
  lyricsHeaderLandscape: {
    width: "38%",
    maxWidth: 300,
    justifyContent: "center",
    paddingBottom: 0,
    paddingHorizontal: spacing.sm,
  },
  coverWrap: {
    width: 140,
    height: 140,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coverWrapLandscape: {
    width: 120,
    height: 120,
  },
  coverImg: { width: "100%", height: "100%" },
  artTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginTop: spacing.md,
    textAlign: "center",
  },
  artTitleLandscape: {
    fontSize: 20,
    marginTop: spacing.sm,
  },
  artSub: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
  },
  artSubLandscape: {
    fontSize: 13,
  },
  lyricsBody: {
    flex: 1,
    minHeight: 0,
    width: "100%",
  },
  lyricsBodyLandscape: {
    flex: 1,
    minWidth: 0,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingLeft: spacing.md,
  },
  bar: {
    backgroundColor: "#0a0a0a",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    minHeight: BAR_HEIGHT,
    paddingBottom: 8,
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  progressFill: { height: "100%", backgroundColor: colors.accent },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  expandBtn: {
    width: 36,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  expandGlyph: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
  },
  meta: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  titleText: { color: colors.text, fontSize: 14, fontWeight: "600" },
  subtitleText: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  timeInline: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});
