import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video, type AVPlaybackStatus } from "expo-av";
import * as ScreenOrientation from "expo-screen-orientation";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { fetchMediaDetail, fetchPlaybackPlan, playbackEnd, playbackStart, saveProgress } from "@/api/client";
import { colors } from "@/constants/theme";
import { t } from "@/i18n";
import { formatPlaybackTime, getVideoOrientation, seekTargetFromDrag, volumeFromDrag, type VideoOrientation } from "@/lib/videoPlayerGestures";
import { mediaPlaySrc, withAccessToken } from "@/lib/mediaUrl";
import { useMusicPlayerStore } from "@/store/musicPlayer";

type GestureMode = "horizontal" | "vertical";
type GestureSnapshot = { positionMillis: number; durationMillis: number; volume: number };

let nextOrientationToken = 0;
let currentOrientationOwner: number | null = null;

export default function PlayerScreen() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const mediaId = Number(id);
  const router = useRouter();
  const videoRef = useRef<Video>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoOrientation, setVideoOrientation] = useState<VideoOrientation | null>(null);
  const orientationDesired = useRef<VideoOrientation | null>(null);
  const orientationToken = useRef<number | null>(null);
  const orientationWorker = useRef<Promise<void> | null>(null);
  const orientationRetryCount = useRef(0);
  const orientationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orientationTimerResolve = useRef<(() => void) | null>(null);
  const playerMounted = useRef(true);
  const volumeLatest = useRef<number | null>(null);
  const volumeInFlight = useRef(false);
  const [gestureInfo, setGestureInfo] = useState<{ mode: GestureMode; value: string } | null>(null);
  const lastPosition = useRef(0);
  const playbackState = useRef<GestureSnapshot>({ positionMillis: 0, durationMillis: 0, volume: 1 });
  const gestureMode = useRef<GestureMode | null>(null);
  const gestureFinalized = useRef(false);
  const gestureStart = useRef<GestureSnapshot>(playbackState.current);
  const lockedOrientation = useRef<VideoOrientation | null>(null);
  const pauseForVideo = useMusicPlayerStore((s) => s.pauseForVideo);
  const resumeAfterVideo = useMusicPlayerStore((s) => s.resumeAfterVideo);

  useEffect(() => { pauseForVideo(); return () => resumeAfterVideo(); }, [pauseForVideo, resumeAfterVideo]);

  useEffect(() => {
    let mounted = true;
    let playbackStarted = false;
    let playbackEnded = false;
    const endPlaybackSession = () => {
      if (!playbackStarted || playbackEnded) return;
      playbackEnded = true;
      playbackEnd(mediaId).catch(() => {});
    };
    (async () => {
      try {
        const detail = await fetchMediaDetail(mediaId);
        if (!mounted) return;
        if (detail.file_type === "audio") { router.back(); return; }
        setVideoOrientation(getVideoOrientation(detail.width, detail.height));
        await playbackStart(mediaId);
        playbackStarted = true;
        if (!mounted) { endPlaybackSession(); return; }
        const plan = await fetchPlaybackPlan(mediaId);
        if (!mounted) return;
        if (plan.hls_master) setUri(withAccessToken(plan.hls_master));
        else if (plan.fallback) setUri(withAccessToken(plan.fallback));
        else setUri(mediaPlaySrc(mediaId));
      } catch { if (mounted) setError(t("player.error")); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => {
      mounted = false;
      endPlaybackSession();
      if (lastPosition.current > 0) saveProgress(mediaId, Math.floor(lastPosition.current)).catch(() => {});
    };
  }, [mediaId, router]);

  useEffect(() => {
    playerMounted.current = true;
    const token = ++nextOrientationToken;
    orientationToken.current = token;
    currentOrientationOwner = token;
    return () => {
      playerMounted.current = false;
      volumeLatest.current = null;
      if (orientationTimer.current) clearTimeout(orientationTimer.current);
      orientationTimer.current = null;
      orientationTimerResolve.current?.();
      orientationTimerResolve.current = null;
      const worker = orientationWorker.current ?? Promise.resolve();
      worker.finally(() => {
        if (currentOrientationOwner !== token) return;
        currentOrientationOwner = null;
        ScreenOrientation.unlockAsync().catch(() => {});
      });
      lockedOrientation.current = null;
    };
  }, []);

  const runOrientationWorker = () => {
    if (orientationWorker.current) return;
    orientationWorker.current = (async () => {
      let retryTarget: VideoOrientation | null = null;
      while (playerMounted.current && orientationToken.current === currentOrientationOwner && orientationDesired.current) {
        const target = orientationDesired.current;
        if (retryTarget !== target) { retryTarget = target; orientationRetryCount.current = 0; lockedOrientation.current = null; }
        if (lockedOrientation.current === target) return;
        const lock = target === "landscape" ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.PORTRAIT_UP;
        try {
          await ScreenOrientation.lockAsync(lock);
          if (!playerMounted.current || orientationToken.current !== currentOrientationOwner) return;
          if (orientationDesired.current === target) { lockedOrientation.current = target; return; }
        } catch {
          if (!playerMounted.current || orientationToken.current !== currentOrientationOwner || orientationDesired.current !== target) continue;
          orientationRetryCount.current += 1;
          if (orientationRetryCount.current >= 3) return;
          await new Promise<void>((resolve) => {
            orientationTimerResolve.current = resolve;
            orientationTimer.current = setTimeout(() => { orientationTimer.current = null; orientationTimerResolve.current = null; resolve(); }, 250 * 2 ** (orientationRetryCount.current - 1));
          });
        }
      }
    })().finally(() => { orientationWorker.current = null; });
  };

  useEffect(() => {
    if (orientationDesired.current !== videoOrientation) {
      orientationDesired.current = videoOrientation;
      orientationRetryCount.current = 0;
      lockedOrientation.current = null;
      if (orientationTimer.current) clearTimeout(orientationTimer.current);
      orientationTimer.current = null;
      orientationTimerResolve.current?.();
      orientationTimerResolve.current = null;
      if (videoOrientation) runOrientationWorker();
    }
  }, [videoOrientation]);


  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!playerMounted.current) return;
    if (!status.isLoaded) { if (status.error) setError(t("player.error")); return; }
    playbackState.current = { positionMillis: status.positionMillis, durationMillis: status.durationMillis ?? 0, volume: status.volume };
    lastPosition.current = status.positionMillis / 1000;
    if (status.didJustFinish) saveProgress(mediaId, Math.floor(lastPosition.current), true).catch(() => {});
  };

  const onReadyForDisplay = (event: { naturalSize?: { width?: number; height?: number } }) => {
    if (!videoOrientation) {
      const orientation = getVideoOrientation(event.naturalSize?.width, event.naturalSize?.height);
      if (orientation) setVideoOrientation(orientation);
    } else if (orientationDesired.current === videoOrientation && !orientationWorker.current && lockedOrientation.current !== videoOrientation) {
      runOrientationWorker();
    }
  };

  const pumpVolume = () => {
    if (!playerMounted.current || volumeInFlight.current || volumeLatest.current === null) return;
    const target = volumeLatest.current;
    volumeInFlight.current = true;
    videoRef.current?.setVolumeAsync(target).catch(() => {}).finally(() => {
      volumeInFlight.current = false;
      if (playerMounted.current && volumeLatest.current !== null && volumeLatest.current !== target) pumpVolume();
    });
  };

  const finalizeGesture = (deltaX: number) => {
    if (gestureFinalized.current) return;
    gestureFinalized.current = true;
    const mode = gestureMode.current;
    gestureMode.current = null;
    setGestureInfo(null);
    if (mode === "horizontal") {
      const target = seekTargetFromDrag(gestureStart.current.positionMillis, gestureStart.current.durationMillis, deltaX, windowWidth);
      videoRef.current?.setPositionAsync(target).catch(() => {});
    }
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => Math.max(Math.abs(gesture.dx), Math.abs(gesture.dy)) >= 12,
    onPanResponderGrant: () => { gestureFinalized.current = false; gestureMode.current = null; gestureStart.current = { ...playbackState.current }; },
    onPanResponderMove: (_, gesture) => {
      if (!gestureMode.current) gestureMode.current = Math.abs(gesture.dx) >= Math.abs(gesture.dy) ? "horizontal" : "vertical";
      if (gestureMode.current === "horizontal") {
        const target = seekTargetFromDrag(gestureStart.current.positionMillis, gestureStart.current.durationMillis, gesture.dx, windowWidth);
        setGestureInfo({ mode: "horizontal", value: `${formatPlaybackTime(target)} / ${formatPlaybackTime(gestureStart.current.durationMillis)}` });
      } else {
        const volume = volumeFromDrag(gestureStart.current.volume, gesture.dy, windowHeight);
        setGestureInfo({ mode: "vertical", value: `${Math.round(volume * 100)}%` });
        volumeLatest.current = volume;
        pumpVolume();
      }
    },
    onPanResponderRelease: (_, gesture) => finalizeGesture(gesture.dx),
    onPanResponderTerminate: (_, gesture) => finalizeGesture(gesture.dx),
    onPanResponderTerminationRequest: () => true,
  }), [windowHeight, windowWidth]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.brand} size="large" /><Text style={styles.loadingText}>{t("player.loading")}</Text></View>;
  if (error || !uri) return <View style={styles.center}><Text style={styles.errorText}>{error || t("player.error")}</Text><Pressable onPress={() => router.back()}><Text style={styles.back}>{t("common.back")}</Text></Pressable></View>;
  return <View style={styles.container} {...panResponder.panHandlers}>
    <Video ref={videoRef} source={{ uri }} style={styles.video} resizeMode={ResizeMode.CONTAIN} useNativeControls shouldPlay onPlaybackStatusUpdate={onPlaybackStatusUpdate} onReadyForDisplay={onReadyForDisplay} onError={() => setError(t("player.error"))} />
    <Pressable style={styles.close} onStartShouldSetResponder={() => true} onResponderTerminationRequest={() => false} onPress={() => router.back()}><Ionicons name="close" size={28} color="#fff" /></Pressable>
    {gestureInfo && <View pointerEvents="none" style={styles.gestureHint}><Ionicons name={gestureInfo.mode === "horizontal" ? "play-forward" : "volume-high"} size={28} color="#fff" /><Text style={styles.gestureText}>{gestureInfo.value}</Text></View>}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent: "center" }, video: { width: "100%", height: "100%" },
  close: { position: "absolute", top: 48, left: 16, zIndex: 10, padding: 8 },
  gestureHint: { position: "absolute", alignSelf: "center", top: "45%", alignItems: "center", gap: 6, padding: 14, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.65)" },
  gestureText: { color: "#fff", fontSize: 16, fontWeight: "600" }, center: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: colors.textSecondary }, errorText: { color: colors.error, fontSize: 16 }, back: { color: colors.brand, fontSize: 15 },
});
