import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "@/constants/theme";

type Props = {
  uri: string;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
};

/** Album/track artwork with headset fallback when missing or failed to load. */
export default function MusicCoverArt({ uri, style, iconSize = 72 }: Props) {
  const [available, setAvailable] = useState(Boolean(uri.trim()));

  useEffect(() => {
    setAvailable(Boolean(uri.trim()));
  }, [uri]);

  const imageStyle = style as StyleProp<ImageStyle>;

  if (available && uri.trim()) {
    return (
      <Image
        source={{ uri }}
        style={imageStyle}
        contentFit="cover"
        onError={() => setAvailable(false)}
      />
    );
  }

  return (
    <View style={[style, styles.fallback]}>
      <Ionicons name="headset-outline" size={iconSize} color={colors.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
});
