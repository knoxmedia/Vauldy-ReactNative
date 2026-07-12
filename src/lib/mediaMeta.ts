export type ParsedMediaMeta = {
  overview: string;
  releaseDate: string;
  rating: number;
  genres: string[];
  director: string[];
  videoCodec: string;
  audioCodec: string;
  container: string;
  bitrate?: number;
  fps: string;
  poster: string;
};

function readNameList(...sources: unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const src of sources) {
    if (typeof src === "string") {
      for (const part of src.split(/[,、/|]/)) {
        const s = part.trim();
        if (!s) continue;
        const key = s.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(s);
      }
      continue;
    }
    if (!Array.isArray(src)) continue;
    for (const item of src) {
      const s =
        typeof item === "string"
          ? item.trim()
          : item && typeof item === "object" && typeof (item as { name?: unknown }).name === "string"
            ? (item as { name: string }).name.trim()
            : "";
      if (!s) continue;
      const key = s.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
  }
  return out;
}

export function parseMediaMeta(metaJson?: string): ParsedMediaMeta {
  const empty: ParsedMediaMeta = {
    overview: "",
    releaseDate: "",
    rating: 0,
    genres: [],
    director: [],
    videoCodec: "",
    audioCodec: "",
    container: "",
    fps: "",
    poster: "",
  };
  if (!metaJson) return empty;
  try {
    const raw = JSON.parse(metaJson) as {
      format?: { format_name?: string };
      streams?: Array<{
        codec_type?: string;
        codec_name?: string;
        avg_frame_rate?: string;
        bit_rate?: string | number;
      }>;
      scrape?: {
        overview?: string;
        release_date?: string;
        rating?: number;
        poster?: string;
        genres?: string[];
        extra?: Record<string, unknown>;
      };
    };
    const out = { ...empty, container: raw.format?.format_name || "" };
    for (const st of raw.streams ?? []) {
      const type = (st.codec_type || "").toLowerCase();
      const codec = st.codec_name || "";
      if (type === "video" && !out.videoCodec) {
        out.videoCodec = codec;
        out.fps = st.avg_frame_rate || "";
      }
      if (type === "audio" && !out.audioCodec) out.audioCodec = codec;
      const bitRate = typeof st.bit_rate === "string" ? Number(st.bit_rate) : st.bit_rate;
      if (!Number.isNaN(Number(bitRate)) && Number(bitRate) > 0 && !out.bitrate) {
        out.bitrate = Number(bitRate);
      }
    }
    const scrape = raw.scrape;
    if (scrape) {
      out.overview = scrape.overview || "";
      out.releaseDate = scrape.release_date || "";
      out.rating = scrape.rating || 0;
      if (Array.isArray(scrape.genres)) {
        out.genres = scrape.genres.filter((x) => typeof x === "string" && x.trim().length > 0);
      }
      const extra = scrape.extra || {};
      if (Array.isArray(extra.genres) && out.genres.length === 0) {
        out.genres = (extra.genres as unknown[]).filter(
          (x): x is string => typeof x === "string" && x.trim().length > 0,
        );
      }
      out.director = readNameList(extra.director, extra.directors, extra.crew);
      const metaPoster = typeof extra.poster === "string" ? extra.poster : "";
      const scrapePoster = typeof scrape.poster === "string" ? scrape.poster : "";
      out.poster = (metaPoster || scrapePoster).trim();
    }
    return out;
  } catch {
    return empty;
  }
}

export function formatMetaRating(rating: number): string {
  if (!rating || rating <= 0) return "";
  return rating > 10 ? (rating / 10).toFixed(1) : rating.toFixed(1);
}

export function formatBitrate(bps?: number): string {
  if (!bps || bps <= 0) return "";
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  return `${Math.round(bps / 1000)} Kbps`;
}
