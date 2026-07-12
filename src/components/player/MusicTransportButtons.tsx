import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { colors, radius } from "@/constants/theme";

type Props = {
  playing: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onToggle: () => void;
  onNext: () => void;
  onStop: () => void;
  compact?: boolean;
};

function PlayShape({ color, size }: { color: string; size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: 0,
          height: 0,
          marginLeft: size * 0.14,
          borderTopWidth: size * 0.3,
          borderBottomWidth: size * 0.3,
          borderLeftWidth: size * 0.52,
          borderTopColor: "transparent",
          borderBottomColor: "transparent",
          borderLeftColor: color,
        }}
      />
    </View>
  );
}

function PauseShape({ color, size }: { color: string; size: number }) {
  const barW = Math.max(3, size * 0.2);
  const barH = size * 0.62;
  const gap = size * 0.14;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={{ flexDirection: "row", gap }}>
        <View style={{ width: barW, height: barH, backgroundColor: color, borderRadius: 1 }} />
        <View style={{ width: barW, height: barH, backgroundColor: color, borderRadius: 1 }} />
      </View>
    </View>
  );
}

function StopShape({ color, size }: { color: string; size: number }) {
  const s = size * 0.42;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: s, height: s, backgroundColor: color, borderRadius: 2 }} />
    </View>
  );
}

function SkipBackwardShape({ color, size }: { color: string; size: number }) {
  const tri = size * 0.34;
  const barW = Math.max(2, size * 0.12);
  const barH = size * 0.5;
  return (
    <View style={{ width: size, height: size, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2 }}>
      <View
        style={{
          width: 0,
          height: 0,
          borderTopWidth: tri * 0.55,
          borderBottomWidth: tri * 0.55,
          borderRightWidth: tri,
          borderTopColor: "transparent",
          borderBottomColor: "transparent",
          borderRightColor: color,
        }}
      />
      <View style={{ width: barW, height: barH, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

function SkipForwardShape({ color, size }: { color: string; size: number }) {
  const tri = size * 0.34;
  const barW = Math.max(2, size * 0.12);
  const barH = size * 0.5;
  return (
    <View style={{ width: size, height: size, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2 }}>
      <View style={{ width: barW, height: barH, backgroundColor: color, borderRadius: 1 }} />
      <View
        style={{
          width: 0,
          height: 0,
          borderTopWidth: tri * 0.55,
          borderBottomWidth: tri * 0.55,
          borderLeftWidth: tri,
          borderTopColor: "transparent",
          borderBottomColor: "transparent",
          borderLeftColor: color,
        }}
      />
    </View>
  );
}

function TransportBtn({
  onPress,
  disabled,
  primary,
  children,
  style,
}: {
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [
        styles.btn,
        primary && styles.playBtn,
        disabled && styles.btnDisabled,
        pressed && !disabled && styles.btnPressed,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export default function MusicTransportButtons({
  playing,
  canGoPrev,
  canGoNext,
  onPrev,
  onToggle,
  onNext,
  onStop,
  compact = false,
}: Props) {
  const iconSize = compact ? 18 : 20;
  const playSize = compact ? 22 : 24;
  const iconColor = colors.text;
  const playColor = "#0a0a0a";

  return (
    <View style={styles.row}>
      <TransportBtn onPress={onPrev} disabled={!canGoPrev}>
        <SkipBackwardShape color={canGoPrev ? iconColor : colors.textMuted} size={iconSize} />
      </TransportBtn>
      <TransportBtn onPress={onToggle} primary>
        {playing ? <PauseShape color={playColor} size={playSize} /> : <PlayShape color={playColor} size={playSize} />}
      </TransportBtn>
      <TransportBtn onPress={onNext} disabled={!canGoNext}>
        <SkipForwardShape color={canGoNext ? iconColor : colors.textMuted} size={iconSize} />
      </TransportBtn>
      <TransportBtn onPress={onStop}>
        <StopShape color={iconColor} size={iconSize} />
      </TransportBtn>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  playBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnPressed: {
    opacity: 0.85,
  },
});
