import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ConfigState = {
  serverUrl: string | null;
  appName: string;
  setServerUrl: (url: string | null) => void;
  setAppName: (name: string) => void;
};

export function normalizeServerUrl(raw: string): string {
  let u = raw.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(u)) {
    u = `http://${u}`;
  }
  return u;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      serverUrl: null,
      appName: "Vauldy",
      setServerUrl: (url) => set({ serverUrl: url ? normalizeServerUrl(url) : null }),
      setAppName: (name) => set({ appName: name || "Vauldy" }),
    }),
    {
      name: "vauldy-config",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
