import type { MediaItem, MusicTrackRow } from "@/api/types";
import { albumArtworkSrc, mediaPlaySrc } from "@/lib/mediaUrl";
import type { MusicTrack } from "@/store/musicPlayer";

export function trackRowToMusicTrack(row: MusicTrackRow): MusicTrack {
  const albumId = Number(row.album_id) || 0;
  const coverUri = albumId > 0 ? albumArtworkSrc(albumId) : "";
  return {
    mediaId: Number(row.media_id),
    title: row.title,
    artist: row.artist || row.album_artist || "Various Artists",
    albumTitle: row.album_title || "",
    albumId,
    duration: row.duration,
    coverUri,
    playUri: mediaPlaySrc(row.media_id),
  };
}

export function trackRowsToMusicTracks(rows: MusicTrackRow[]): MusicTrack[] {
  return rows.filter((row) => Number(row.media_id) > 0).map(trackRowToMusicTrack);
}

export function mediaItemToMusicTrack(item: MediaItem): MusicTrack {
  const albumId = Number(item.music_album_id) || 0;
  const coverUri = albumId > 0 ? albumArtworkSrc(albumId) : "";
  return {
    mediaId: item.id,
    title: item.title,
    artist: (item.music_artist || "").trim() || "Various Artists",
    albumTitle: (item.music_album_title || "").trim(),
    albumId,
    duration: item.duration,
    coverUri,
    playUri: mediaPlaySrc(item.id),
  };
}
