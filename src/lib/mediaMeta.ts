import type { MediaItem } from "@/api/types";

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

export type SeasonEpisode = { season: number; episode: number };

export function extractSeasonEpisode(item: {
  title?: string;
  file_path?: string;
  meta_json?: string;
}): SeasonEpisode | null {
  // Try meta_json scrape extra first
  if (item.meta_json) {
    try {
      const raw = JSON.parse(item.meta_json) as {
        scrape?: { extra?: Record<string, unknown> };
      };
      const extra = raw.scrape?.extra;
      if (extra) {
        const sn =
          typeof extra.season_number === "number"
            ? extra.season_number
            : typeof extra.season === "number"
              ? extra.season
              : typeof extra.season_number === "string"
                ? Number(extra.season_number)
                : typeof extra.season === "string"
                  ? Number(extra.season)
                  : undefined;
        const ep =
          typeof extra.episode_number === "number"
            ? extra.episode_number
            : typeof extra.episode === "number"
              ? extra.episode
              : typeof extra.episode_number === "string"
                ? Number(extra.episode_number)
                : typeof extra.episode === "string"
                  ? Number(extra.episode)
                  : undefined;
        if (typeof sn === "number" && !Number.isNaN(sn) && typeof ep === "number" && !Number.isNaN(ep)) {
          return { season: sn, episode: ep };
        }
      }
    } catch {
      /* fall through to title parsing */
    }
  }

  // Parse patterns from title or file_path
  const candidates = [item.title, item.file_path].filter(Boolean) as string[];
  for (const text of candidates) {
    // 1x03 / 01x03 format
    let m = text.match(/(\d{1,2})[xX](\d{1,3})/);
    if (m) return { season: Number(m[1]), episode: Number(m[2]) };

    // S01E03 / s01e03 / S01.E03 / S01-E03 / S01 E03 / S01 EP03
    m = text.match(/[Ss](\d{1,2})\s*[.\-]?\s*[Ee][Pp]?\s*(\d{1,3})/);
    if (m) return { season: Number(m[1]), episode: Number(m[2]) };

    // Season 1 Episode 3 / Season.1.Episode.3
    m = text.match(/[Ss]eason\s*[.\-]?\s*(\d{1,2})\s*[.\-]?\s*[Ee]pisode\s*[.\-]?\s*(\d{1,3})/i);
    if (m) return { season: Number(m[1]), episode: Number(m[2]) };

    // 第1季 第3集 / 第1季第3集
    m = text.match(/第\s*(\d{1,2})\s*季\s*第?\s*(\d{1,3})\s*集/);
    if (m) return { season: Number(m[1]), episode: Number(m[2]) };

    // EP03 / Ep03 / ep03 (standalone episode, assume season 1)
    // Use word boundary to avoid matching 'e' inside words like "Movie"
    m = text.match(/\b[Ee][Pp]?\s*(\d{1,3})\b/);
    if (m) return { season: 1, episode: Number(m[1]) };
  }
  return null;
}

/** Supported season-episode markers for stripping show name from paths/titles. */
const SE_MARKERS = /\d{1,2}x\d{1,3}|[Ss]\d{1,2}\s*[.\-]?\s*[Ee][Pp]?\s*\d{1,3}|[Ss]eason\s*[.\-]?\s*\d{1,2}\s*[.\-]?\s*[Ee]pisode\s*[.\-]?\s*\d{1,3}|第\s*\d{1,2}\s*季\s*第?\s*\d{1,3}\s*集/;

export function extractSeriesKey(item: {
  title?: string;
  file_path?: string;
  meta_json?: string;
}): string {
  // 1. Try meta_json scrape extra for show name/id
  if (item.meta_json) {
    try {
      const raw = JSON.parse(item.meta_json) as {
        scrape?: { extra?: Record<string, unknown> };
      };
      const extra = raw.scrape?.extra;
      if (extra) {
        for (const key of ["series_name", "series_title", "show_name", "tvshow", "series_id", "tmdb_show_id"]) {
          const v = extra[key];
          if (typeof v === "string" && v.trim()) return v.trim().toLowerCase();
          if (typeof v === "number" && v > 0) return `series_${v}`;
        }
      }
    } catch { /* fall through */ }
  }

  // 2. Extract from file_path: everything before season/episode markers
  if (item.file_path) {
    const clean = item.file_path.replace(/\\/g, "/");
    const idx = clean.search(SE_MARKERS);
    if (idx > 0) {
      const dir = clean.slice(0, idx);
      // Take the last meaningful segment (directory or filename prefix)
      const name = dir.replace(/\/+$/, "").split("/").pop() || dir;
      const trimmed = name.replace(/[.\-_]+$/, "").trim();
      if (trimmed.length > 1) return trimmed.toLowerCase();
    }
    // Try extracting from parent directory name
    const parts = clean.split("/");
    if (parts.length >= 2) {
      // Second-to-last segment is often the show name
      const parent = parts[parts.length - 2];
      if (parent && parent.length > 1 && !parent.match(/^[Ss]eason/i)) {
        return parent.toLowerCase();
      }
      if (parts.length >= 3) {
        const grandparent = parts[parts.length - 3];
        if (grandparent && grandparent.length > 1 && !grandparent.match(/^[Ss]eason/i)) {
          return grandparent.toLowerCase();
        }
      }
    }
  }

  // 3. Extract from title: everything before season/episode markers
  if (item.title) {
    const idx = item.title.search(SE_MARKERS);
    if (idx > 0) {
      const name = item.title.slice(0, idx).replace(/[.\-_]+$/, "").trim();
      if (name.length > 1) return name.toLowerCase();
    }
  }

  // 4. Fallback: no grouping, all items belong to the library
  return "__single__";
}

export type SeriesGroup = {
  key: string;
  name: string;
  episodes: MediaItem[];
  posterUrl: string;
  overview: string;
  year: string;
  episodeCount: number;
};

export function groupMediaBySeries(items: MediaItem[]): SeriesGroup[] {
  const map = new Map<string, MediaItem[]>();
  for (const item of items) {
    const key = extractSeriesKey(item);
    const list = map.get(key) || [];
    list.push(item);
    map.set(key, list);
  }

  const groups: SeriesGroup[] = [];
  for (const [key, episodes] of map) {
    // Try to find a representative item with metadata
    const first = episodes.find((e) => e.overview || e.poster_url) || episodes[0];
    const meta = parseMediaMeta(first?.meta_json);

    // Derive display name
    let name = key;
    if (name === "__single__" || map.size <= 1) {
      name = ""; // Will use library name
    } else {
      // Title-case the series key
      name = name
        .replace(/[.\-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
    }

    const year = first ? _extractYear(first) : "";

    groups.push({
      key,
      name: name || "",
      episodes,
      posterUrl: first?.poster_url || meta.poster || "",
      overview: first?.overview || meta.overview || "",
      year,
      episodeCount: episodes.length,
    });
  }

  return groups;
}

function _extractYear(item: MediaItem): string {
  if (typeof item.year === "number" && item.year > 0) return String(item.year);
  const rd = (item.release_date || "").trim();
  if (rd.length >= 4 && /^\d{4}/.test(rd)) return rd.slice(0, 4);
  const match = item.file_path?.match(/(19|20)\d{2}/);
  return match ? match[0] : "";
}
