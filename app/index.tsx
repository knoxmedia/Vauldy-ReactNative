import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/auth";
import { useConfigStore } from "@/store/config";

export default function Index() {
  const token = useAuthStore((s) => s.token);
  const serverUrl = useConfigStore((s) => s.serverUrl);
  if (!serverUrl) return <Redirect href="/setup" />;
  if (!token) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)" />;
}
