import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";
import { fetchMediaDetail } from "@/api/client";
import LoadingState from "@/components/LoadingState";
import { colors } from "@/constants/theme";
import { photoMediumSrc } from "@/lib/mediaUrl";

export default function PhotoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mediaId = Number(id);
  const router = useRouter();
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMediaDetail(mediaId)
      .then(() => setUri(photoMediumSrc(mediaId)))
      .catch(() => setUri(null))
      .finally(() => setLoading(false));
  }, [mediaId]);

  if (loading) return <LoadingState />;

  return (
    <View style={styles.container}>
      <Pressable style={styles.close} onPress={() => router.back()}>
        <Ionicons name="close" size={28} color="#fff" />
      </Pressable>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: Dimensions.get("window").width, height: Dimensions.get("window").height }}
          contentFit="contain"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundDeep, justifyContent: "center" },
  close: { position: "absolute", top: 48, right: 16, zIndex: 10, padding: 8 },
});
