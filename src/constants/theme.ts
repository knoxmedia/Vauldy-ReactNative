export const colors = {
  background: "#0f1419",
  backgroundDeep: "#000000",
  surface: "#141414",
  surfaceElevated: "#1a2332",
  header: "#0a0a0a",
  border: "#1f1f1f",
  borderLight: "#30363d",
  text: "#e6edf3",
  textSecondary: "#8b949e",
  textMuted: "#6e7681",
  brand: "#00a4dc",
  accent: "#ed6d00",
  accentBg: "rgba(237, 109, 0, 0.08)",
  accentBgStrong: "rgba(237, 109, 0, 0.12)",
  error: "#f85149",
  success: "#3fb950",
  card: "#161b22",
  inputBg: "#0d1117",
  overlay: "rgba(0, 0, 0, 0.72)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
};

export const typography = {
  title: { fontSize: 22, fontWeight: "700" as const, color: colors.text },
  subtitle: { fontSize: 16, fontWeight: "600" as const, color: colors.text },
  body: { fontSize: 14, color: colors.text },
  caption: { fontSize: 12, color: colors.textSecondary },
};

export const libGradients: Record<string, [string, string]> = {
  movie: ["#1a2a4a", "#0d1528"],
  tv: ["#2a1a4a", "#150d28"],
  anime: ["#4a1a3a", "#280d20"],
  music: ["#1a3a2a", "#0d2818"],
  photo: ["#1a3a4a", "#0d2028"],
  document: ["#3a3a2a", "#202018"],
  video: ["#2a2a3a", "#14141c"],
};

export function libGradient(type: string, id: number): [string, string, string] {
  const [a, b] = libGradients[type] || ["#252535", "#12121a"];
  const tint = id % 40;
  return [a, b, `hsl(${220 + tint}, 28%, ${14 + (id % 8)}%)`];
}
