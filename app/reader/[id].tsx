import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import {
  fetchAuthenticatedText,
  fetchDocumentDetail,
  fetchDocumentPreviewInfo,
  fetchMediaDetail,
  fetchReadProgress,
  saveReadProgress,
} from "@/api/client";
import LoadingState from "@/components/LoadingState";
import Screen from "@/components/Screen";
import { useMusicPreviewBar } from "@/hooks/useMusicPreviewBar";
import { colors, spacing } from "@/constants/theme";
import { t } from "@/i18n";
import {
  buildPdfViewerHtmlFromUrl,
  buildTextViewerHtml,
  isOfficeDocumentFormat,
  normalizeDocumentFormat,
  parseResumePage,
  TEXT_DOCUMENT_FORMATS,
} from "@/lib/documentPdfViewer";
import { getBundledPdfJsInline, getBundledPdfJsWorkerSrc } from "@/lib/bundledPdfJs";
import { documentPreviewSrc, mediaPlaySrc } from "@/lib/mediaUrl";

type ViewerMode = "pdf" | "text";

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mediaId = Number(id);
  const router = useRouter();
  useMusicPreviewBar();

  const [title, setTitle] = useState("");
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notReady, setNotReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewerMode>("pdf");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);

  const webRef = useRef<WebView>(null);
  const pageRef = useRef(page);
  pageRef.current = page;
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setNotReady(false);
      setError(null);
      setHtml(null);
      setPage(1);
      setPages(0);

      try {
        const [detail, media, progress] = await Promise.all([
          fetchDocumentDetail(mediaId),
          fetchMediaDetail(mediaId),
          fetchReadProgress(mediaId).catch(() => null),
        ]);
        if (cancelled) return;

        setTitle(detail.title || media.title);
        const format = normalizeDocumentFormat(detail.format || media.format, media.file_path);
        const resumePage = parseResumePage(progress?.position);

        if (format === "pdf" || isOfficeDocumentFormat(format)) {
          if (isOfficeDocumentFormat(format)) {
            const info = await fetchDocumentPreviewInfo(mediaId);
            if (!info.preview_ready) {
              setNotReady(true);
              return;
            }
          }

          const pdfUrl = isOfficeDocumentFormat(format)
            ? documentPreviewSrc(mediaId)
            : mediaPlaySrc(mediaId);
          const pdfJsInline = getBundledPdfJsInline();
          const pdfWorkerSrc = getBundledPdfJsWorkerSrc();
          if (cancelled) return;
          setMode("pdf");
          setPage(resumePage);
          pageRef.current = resumePage;
          setHtml(buildPdfViewerHtmlFromUrl(pdfUrl, pdfJsInline, pdfWorkerSrc, resumePage));
          return;
        }

        if (TEXT_DOCUMENT_FORMATS.has(format)) {
          const text = await fetchAuthenticatedText(`/api/v1/media/${mediaId}/play`);
          if (cancelled) return;
          setMode("text");
          setHtml(buildTextViewerHtml(text, format));
          return;
        }

        setNotReady(true);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("reader.not_ready"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (modeRef.current === "pdf" && pagesRef.current > 0) {
        const percent = Math.round((pageRef.current / pagesRef.current) * 100);
        saveReadProgress(mediaId, pageRef.current, percent).catch(() => {});
      }
    };
  }, [mediaId]);

  const onWebMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as {
        type: string;
        page?: number;
        pages?: number;
        message?: string;
      };
      if (msg.type === "ready" || msg.type === "page") {
        if (msg.page) {
          pageRef.current = msg.page;
          setPage(msg.page);
        }
        if (msg.pages) {
          pagesRef.current = msg.pages;
          setPages(msg.pages);
        }
      }
      if (msg.type === "error" && msg.message) {
        setError(msg.message);
      }
    } catch {
      /* ignore malformed messages */
    }
  }, []);

  if (loading) return <LoadingState label={t("reader.loading")} />;

  if (notReady || error || !html) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.text}>{error || t("reader.not_ready")}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.titleText} numberOfLines={1}>
          {title}
        </Text>
        {mode === "pdf" && pages > 0 ? (
          <Text style={styles.pageIndicator}>
            {page} / {pages}
          </Text>
        ) : null}
      </View>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.webview}
        onMessage={onWebMessage}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        nestedScrollEnabled
        setBuiltInZoomControls
        setDisplayZoomControls={false}
        startInLoadingState
        onError={() => setError(t("reader.not_ready"))}
        onHttpError={() => setError(t("reader.not_ready"))}
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.brand} size="large" />
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  titleText: { flex: 1, color: colors.text, fontSize: 18, fontWeight: "700" },
  pageIndicator: { color: colors.textSecondary, fontSize: 14, fontWeight: "600" },
  webview: { flex: 1, backgroundColor: colors.background },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  text: { color: colors.textSecondary, fontSize: 16, textAlign: "center" },
});
