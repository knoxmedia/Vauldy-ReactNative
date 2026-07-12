import { Audio, ResizeMode, Video, type AVPlaybackStatus } from "expo-av";
import { useCallback, useEffect, useRef } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { playbackEnd, playbackStart, saveProgress } from "@/api/client";
import { useMusicPlayerStore } from "@/store/musicPlayer";

const PROGRESS_SAVE_INTERVAL_MS = 30_000;

async function configureAudioSession() {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch {
    /* ignore — best effort */
  }
}

export default function GlobalMusicEngine() {
  const videoRef = useRef<Video>(null);
  const active = useMusicPlayerStore((s) => s.active);
  const playUri = useMusicPlayerStore((s) => s.playUri);
  const mediaId = useMusicPlayerStore((s) => s.mediaId);
  const playing = useMusicPlayerStore((s) => s.playing);
  const registerHandlers = useMusicPlayerStore((s) => s.registerHandlers);
  const setPlaying = useMusicPlayerStore((s) => s.setPlaying);
  const syncPlayback = useMusicPlayerStore((s) => s.syncPlayback);

  const mediaIdRef = useRef<number | null>(null);
  const lastPosition = useRef(0);
  const lastSavedPosition = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => {
    void configureAudioSession();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && useMusicPlayerStore.getState().playing) {
        void videoRef.current?.playAsync().catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  const persistProgress = useCallback((completed = false) => {
    const id = mediaIdRef.current;
    if (!id) return;
    const pos = Math.floor(lastPosition.current);
    if (pos <= 0 && !completed) return;
    if (!completed && pos === lastSavedPosition.current) return;
    lastSavedPosition.current = pos;
    saveProgress(id, pos, completed).catch(() => {});
  }, []);

  const unload = useCallback(async () => {
    const id = mediaIdRef.current;
    const video = videoRef.current;
    if (id) {
      persistProgress(false);
      playbackEnd(id).catch(() => {});
    }
    mediaIdRef.current = null;
    startedRef.current = false;
    lastPosition.current = 0;
    lastSavedPosition.current = 0;
    if (video) {
      try {
        await video.stopAsync();
        await video.unloadAsync();
      } catch {
        /* ignore */
      }
    }
  }, [persistProgress]);

  const togglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    const status = await video.getStatusAsync();
    if (!status.isLoaded) return;
    if (status.isPlaying) await video.pauseAsync();
    else await video.playAsync();
  }, []);

  const pausePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    const status = await video.getStatusAsync();
    if (!status.isLoaded || !status.isPlaying) return;
    await video.pauseAsync();
    setPlaying(false);
  }, [setPlaying]);

  const resumePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    const status = await video.getStatusAsync();
    if (!status.isLoaded || status.isPlaying) return;
    await video.playAsync();
  }, []);

  const seekBy = useCallback(async (deltaSec: number) => {
    const video = videoRef.current;
    if (!video) return;
    const status = await video.getStatusAsync();
    if (!status.isLoaded) return;
    const nextMs = Math.max(
      0,
      Math.min(status.durationMillis ?? status.positionMillis, status.positionMillis + deltaSec * 1000),
    );
    await video.setPositionAsync(nextMs);
  }, []);

  const seekTo = useCallback(async (sec: number) => {
    const video = videoRef.current;
    if (!video) return;
    const status = await video.getStatusAsync();
    if (!status.isLoaded) return;
    const nextMs = Math.max(0, Math.min(status.durationMillis ?? 0, sec * 1000));
    await video.setPositionAsync(nextMs);
  }, []);

  useEffect(() => {
    registerHandlers({ togglePlay, seekBy, seekTo, pausePlay, resumePlay, unload });
    return () => registerHandlers(null);
  }, [registerHandlers, togglePlay, seekBy, seekTo, pausePlay, resumePlay, unload]);

  useEffect(() => {
    if (!active || !playUri || !mediaId) return;
    const trackId = mediaId;
    let cancelled = false;
    mediaIdRef.current = mediaId;
    startedRef.current = false;
    lastPosition.current = 0;
    lastSavedPosition.current = 0;
    (async () => {
      await configureAudioSession();
      playbackStart(mediaId).catch(() => {});
      const video = videoRef.current;
      if (!video || cancelled) return;
      try {
        await video.unloadAsync();
        await video.loadAsync({ uri: playUri }, { shouldPlay: true, progressUpdateIntervalMillis: 500 });
      } catch {
        if (!cancelled) setPlaying(false);
      }
    })();
    const timer = setInterval(() => persistProgress(false), PROGRESS_SAVE_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
      if (mediaIdRef.current === trackId) {
        const pos = Math.floor(lastPosition.current);
        if (pos > 0) saveProgress(trackId, pos, false).catch(() => {});
        playbackEnd(trackId).catch(() => {});
      }
    };
  }, [active, playUri, mediaId, persistProgress, setPlaying]);

  useEffect(() => {
    if (!active || !playing) return;
    void videoRef.current?.playAsync().catch(() => {});
  }, [active, playing]);

  useEffect(() => {
    if (active) return;
    void unload();
  }, [active, unload]);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    const pos = status.positionMillis / 1000;
    lastPosition.current = pos;
    syncPlayback(pos, (status.durationMillis ?? 0) / 1000);
    setPlaying(status.isPlaying);
    if (!startedRef.current && pos > 0.5) startedRef.current = true;
    if (status.didJustFinish) {
      persistProgress(true);
      useMusicPlayerStore.getState().onTrackEnded();
    }
  };

  if (!active || !playUri) return null;

  return (
    <View pointerEvents="none" style={styles.hidden} focusable={false} accessible={false}>
      <Video
        ref={videoRef}
        source={{ uri: playUri }}
        style={styles.audio}
        resizeMode={ResizeMode.CONTAIN}
        useNativeControls={false}
        shouldPlay={playing}
        progressUpdateIntervalMillis={500}
        focusable={false}
        accessible={false}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { width: 0, height: 0, opacity: 0, position: "absolute" },
  audio: { width: 0, height: 0 },
});
