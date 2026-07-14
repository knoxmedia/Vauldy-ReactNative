import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setUnauthorizedHandler } from "@/api/client";
import GlobalMusicEngine from "@/components/player/GlobalMusicEngine";
import FloatingMusicBar from "@/components/player/FloatingMusicBar";
import { useAuthStore } from "@/store/auth";
import { useConfigStore } from "@/store/config";

function useProtectedRoute() {
  const router = useRouter();
  const segments = useSegments();
  const token = useAuthStore((s) => s.token);
  const serverUrl = useConfigStore((s) => s.serverUrl);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      router.replace("/login");
    });
  }, [router]);

  useEffect(() => {
    const inAuth = segments[0] === "login" || segments[0] === "setup";
    if (!serverUrl) {
      if (segments[0] !== "setup") router.replace("/setup");
      return;
    }
    if (!token) {
      if (!inAuth) router.replace("/login");
      return;
    }
    if (inAuth) router.replace("/(tabs)");
  }, [token, serverUrl, segments, router]);
}

export default function RootLayout() {
  useProtectedRoute();
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
        <StatusBar style="light" />
        <GlobalMusicEngine />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#0a0a0a" },
            headerTintColor: "#e6edf3",
            headerTitleStyle: { fontWeight: "600" },
            contentStyle: { backgroundColor: "#0f1419" },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="setup" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="library/[id]" options={{ title: "" }} />
          <Stack.Screen name="media/[id]" options={{ title: "" }} />
          <Stack.Screen name="player/[id]" options={{ headerShown: false, orientation: "landscape" }} />
          <Stack.Screen name="reader/[id]" options={{ title: "" }} />
          <Stack.Screen name="photo/[id]" options={{ headerShown: false, presentation: "fullScreenModal" }} />
        </Stack>
        <FloatingMusicBar />
      </View>
    </SafeAreaProvider>
  );
}
