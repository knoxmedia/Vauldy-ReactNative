import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video, type AVPlaybackStatus } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import {
  fetchMediaDetail,
  fetchPlaybackPlan,
  playbackEnd,
  playbackStart,
  saveProgress,
} from "@/api/client";
import { colors } from "@/constants/theme";
import { t } from "@/i18n";
import { mediaPlaySrc, withAccessToken } from "@/lib/mediaUrl";

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mediaId = Number(id);
  const router = useRouter();
  const videoRef = useRef<Video>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [audioOnly, setAudioOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastPosition = useRef(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const detail = await fetchMediaDetail(mediaId);
        setAudioOnly(detail.file_type === "audio");
        await playbackStart(mediaId);
        if (detail.file_type === "audio") {
          setUri(mediaPlaySrc(mediaId));
          return;
        }
        const plan = await fetchPlaybackPlan(mediaId);
        if (plan.hls_master) {
          setUri(withAccessToken(plan.hls_master));
        } else if (plan.fallback) {
          setUri(withAccessToken(plan.fallback));
        } else {
          setUri(mediaPlaySrc(mediaId));
        }
      } catch {
        if (mounted) setError(t("player.error"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      playbackEnd(mediaId).catch(() => {});
      if (lastPosition.current > 0) {
        saveProgress(mediaId, Math.floor(lastPosition.current)).catch(() => {});
      }
    };
  }, [mediaId]);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) setError(t("player.error"));
      return;
    }
    lastPosition.current = status.positionMillis / 1000;
    if (status.didJustFinish) {
      saveProgress(mediaId, Math.floor(lastPosition.current), true).catch(() => {});
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} size="large" />
        <Text style={styles.loadingText}>{t("player.loading")}</Text>
      </View>
    );
  }

  if (error || !uri) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || t("player.error")}</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>{t("common.back")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.close} onPress={() => router.back()}>
        <Ionicons name="close" size={28} color="#fff" />
      </Pressable>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={audioOnly ? styles.audio : styles.video}
        resizeMode={ResizeMode.CONTAIN}
        useNativeControls
        shouldPlay
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        onError={() => setError(t("player.error"))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent: "center" },
  video: { width: "100%", height: "100%" },
  audio: { width: 1, height: 1 },
  close: { position: "absolute", top: 48, left: 16, zIndex: 10, padding: 8 },
  center: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: colors.textSecondary },
  errorText: { color: colors.error, fontSize: 16 },
  back: { color: colors.brand, fontSize: 15 },
});
