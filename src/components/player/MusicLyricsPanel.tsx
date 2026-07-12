import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { fetchMediaLyrics } from "@/api/client";
import { colors, radius, spacing } from "@/constants/theme";
import { t } from "@/i18n";
import { activeLrcIndex, parseLrc } from "@/lib/lrc";

const LYRIC_LINE_HEIGHT = 44;

type Props = {
  mediaId: number;
  position: number;
  playing: boolean;
  variant?: "inline" | "fullscreen";
  landscape?: boolean;
};

export default function MusicLyricsPanel({
  mediaId,
  position,
  playing,
  variant = "inline",
  landscape = false,
}: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const lyricsScrollRef = useRef<ScrollView>(null);
  const [lrcRaw, setLrcRaw] = useState("");

  const lines = useMemo(() => parseLrc(lrcRaw), [lrcRaw]);
  const activeIdx = activeLrcIndex(lines, position);
  const fullscreen = variant === "fullscreen";

  useEffect(() => {
    let cancelled = false;
    setLrcRaw("");
    fetchMediaLyrics(mediaId)
      .then((res) => {
        if (!cancelled) setLrcRaw(res?.lrc ?? "");
      })
      .catch(() => {
        if (!cancelled) setLrcRaw("");
      });
    return () => {
      cancelled = true;
    };
  }, [mediaId]);

  useEffect(() => {
    if (activeIdx < 0 || !lyricsScrollRef.current) return;
    const lineHeight = fullscreen ? 52 : LYRIC_LINE_HEIGHT;
    const viewport = fullscreen ? (landscape ? windowHeight * 0.72 : windowHeight * 0.38) : 180;
    const offset = Math.max(0, activeIdx * lineHeight - viewport / 2 + lineHeight / 2);
    lyricsScrollRef.current.scrollTo({ y: offset, animated: playing });
  }, [activeIdx, playing, fullscreen, landscape, windowHeight]);

  if (lines.length === 0) {
    return (
      <View style={[styles.panel, fullscreen ? styles.panelFullscreen : styles.panelInline]}>
        <View style={styles.noLyricsWrap}>
          <Text style={styles.noLyrics}>{t("player.no_lyrics")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.panel, fullscreen ? styles.panelFullscreen : styles.panelInline]}>
      <ScrollView
        ref={lyricsScrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.lyricsContent}
      >
        {lines.map((line, idx) => (
          <Text
            key={`${line.timeSec}-${idx}-${line.text}`}
            style={[
              styles.lyricLine,
              fullscreen && styles.lyricLineFullscreen,
              idx === activeIdx ? [styles.lyricActive, fullscreen && styles.lyricActiveFullscreen] : undefined,
              idx < activeIdx ? styles.lyricPast : undefined,
            ]}
          >
            {line.text}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { overflow: "hidden" },
  panelInline: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  panelFullscreen: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    backgroundColor: "transparent",
  },
  lyricsContent: {
    flexGrow: 1,
    width: "100%",
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  lyricLine: {
    width: "100%",
    color: colors.textMuted,
    fontSize: 22,
    lineHeight: LYRIC_LINE_HEIGHT,
    textAlign: "center",
  },
  lyricLineFullscreen: { fontSize: 28, lineHeight: 52 },
  lyricActive: { color: colors.accent, fontWeight: "700" },
  lyricActiveFullscreen: { fontSize: 34 },
  lyricPast: { color: colors.textSecondary },
  noLyricsWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  noLyrics: { color: colors.textMuted, fontSize: 20, textAlign: "center" },
});
