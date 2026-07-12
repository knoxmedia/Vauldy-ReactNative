import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { colors } from "@/constants/theme";

type Props = {
  playing: boolean;
};

function useBarAnimation(value: Animated.Value, duration: number, playing: boolean) {
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    loopRef.current?.stop();
    if (!playing) {
      value.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration, useNativeDriver: false }),
        Animated.timing(value, { toValue: 0.2, duration, useNativeDriver: false }),
      ]),
    );
    loopRef.current = loop;
    loop.start();
    return () => loop.stop();
  }, [duration, playing, value]);
}

export default function NowPlayingIndicator({ playing }: Props) {
  const bar1 = useRef(new Animated.Value(0.4)).current;
  const bar2 = useRef(new Animated.Value(0.7)).current;
  const bar3 = useRef(new Animated.Value(0.5)).current;

  useBarAnimation(bar1, 420, playing);
  useBarAnimation(bar2, 360, playing);
  useBarAnimation(bar3, 480, playing);

  const height1 = bar1.interpolate({ inputRange: [0, 1], outputRange: [4, 14] });
  const height2 = bar2.interpolate({ inputRange: [0, 1], outputRange: [5, 12] });
  const height3 = bar3.interpolate({ inputRange: [0, 1], outputRange: [6, 15] });

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.bar, { height: height1 }]} />
      <Animated.View style={[styles.bar, { height: height2 }]} />
      <Animated.View style={[styles.bar, { height: height3 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 20,
    height: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 2,
  },
  bar: {
    width: 3,
    borderRadius: 1,
    backgroundColor: colors.accent,
  },
});
