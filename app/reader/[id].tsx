import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import {
  fetchDocumentDetail,
  fetchDocumentPreviewInfo,
  fetchMediaDetail,
  fetchReadProgress,
  saveReadProgress,
} from "@/api/client";
import LoadingState from "@/components/LoadingState";
import Screen from "@/components/Screen";
import { colors } from "@/constants/theme";
import { t } from "@/i18n";
import { documentPreviewSrc, mediaPlaySrc } from "@/lib/mediaUrl";

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mediaId = Number(id);
  const navigation = useNavigation();
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notReady, setNotReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [detail, media] = await Promise.all([fetchDocumentDetail(mediaId), fetchMediaDetail(mediaId)]);
        navigation.setOptions({ title: detail.title || media.title });
        const ext = (media.format || media.file_path || "").toLowerCase();
        if (ext.endsWith(".pdf")) {
          setUri(mediaPlaySrc(mediaId));
          return;
        }
        if ([".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"].some((s) => ext.endsWith(s))) {
          const info = await fetchDocumentPreviewInfo(mediaId);
          if (info.preview_ready) setUri(documentPreviewSrc(mediaId));
          else setNotReady(true);
          return;
        }
        if (ext.endsWith(".epub") || ext.endsWith(".txt") || ext.endsWith(".md") || ext.endsWith(".html")) {
          setUri(mediaPlaySrc(mediaId));
          return;
        }
        setUri(mediaPlaySrc(mediaId));
      } catch {
        setNotReady(true);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      fetchReadProgress(mediaId)
        .then((p) => {
          if (p) saveReadProgress(mediaId, p.position, p.percent).catch(() => {});
        })
        .catch(() => {});
    };
  }, [mediaId, navigation]);

  if (loading) return <LoadingState label={t("reader.loading")} />;

  if (notReady || !uri) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.text}>{t("reader.not_ready")}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri }}
        style={styles.webview}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.brand} size="large" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  webview: { flex: 1, backgroundColor: colors.background },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { color: colors.textSecondary, fontSize: 15 },
});
