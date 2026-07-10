import zhCN from "./zh-CN";
import en from "./en";
import { useAuthStore } from "@/store/auth";

const catalogs = { "zh-CN": zhCN, en } as const;
export type Locale = keyof typeof catalogs;

export function resolveLocale(): Locale {
  const ui = useAuthStore.getState().uiLocale;
  if (ui && ui in catalogs) return ui as Locale;
  return "zh-CN";
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const locale = resolveLocale();
  const dict = catalogs[locale];
  let text = (dict as Record<string, string>)[key] ?? (en as Record<string, string>)[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function useT() {
  return t;
}
