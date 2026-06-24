/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import { DefaultVideoLayout, defaultLayoutIcons } from "@vidstack/react/player/layouts/default";
import { AlertTriangle, Loader2 } from "lucide-react";

// Import Vidstack player and layout styles
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

interface HlsPlayerProps {
  url: string;
  autoplay?: boolean;
}

// Timeout helper for client-side fetch requests
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Helper to resolve relative path to absolute
function resolveUrl(relativeUrl: string, baseUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).toString();
  } catch (e) {
    return relativeUrl;
  }
}

// Cleans ad segments containing keywords and strips convertv path segments from URLs
function cleanMediaPlaylist(playlistText: string, baseUrl: string): string {
  const lines = playlistText.split(/\r?\n/);
  const resultLines: string[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed) {
      resultLines.push(line);
      i++;
      continue;
    }
    
    if (trimmed.startsWith("#EXTINF")) {
      const extinfLine = line;
      let j = i + 1;
      let segmentUrlLine = "";
      const skippedLines: string[] = [extinfLine];
      
      // Look ahead for the segment URL (non-tag line)
      while (j < lines.length) {
        const nextLine = lines[j];
        const nextTrimmed = nextLine.trim();
        if (nextTrimmed) {
          if (!nextTrimmed.startsWith("#")) {
            segmentUrlLine = nextLine;
            break;
          } else {
            // It's another tag (like #EXT-X-BYTERANGE, #EXT-X-DISCONTINUITY, etc.)
            skippedLines.push(nextLine);
          }
        } else {
          skippedLines.push(nextLine);
        }
        j++;
      }
      
      if (segmentUrlLine) {
        const absoluteSegmentUrl = resolveUrl(segmentUrlLine.trim(), baseUrl);
        
        // Strip any convertv1, convertv2, convertv... path segments
        let cleanedSegmentUrl = absoluteSegmentUrl;
        if (/\/convertv\d+/i.test(cleanedSegmentUrl) || cleanedSegmentUrl.includes("/convertv")) {
          cleanedSegmentUrl = cleanedSegmentUrl.replace(/\/convertv\d+/gi, "");
          cleanedSegmentUrl = cleanedSegmentUrl.replace(/convertv\d+\//gi, "");
        }
        
        // Check if the segment URL contains ad keywords
        const lowerUrl = cleanedSegmentUrl.toLowerCase();
        const hasAdKeyword = 
          lowerUrl.includes("/v8/") || 
          lowerUrl.includes("/v8-ads/") || 
          lowerUrl.includes("/ads/") || 
          lowerUrl.includes("qc_") || 
          lowerUrl.includes("segment_00");
          
        if (hasAdKeyword) {
          console.log(`[Blob AdBlocker] Filtered out ad segment: ${absoluteSegmentUrl}`);
          // Skip this segment block entirely
          i = j + 1;
          continue;
        } else {
          // Keep the segment and its preceding tags, using the absolute (and convertv-cleaned) URL
          resultLines.push(...skippedLines);
          resultLines.push(cleanedSegmentUrl);
          i = j + 1;
          continue;
        }
      } else {
        // Fallback: no segment URL found, just push the original line
        resultLines.push(line);
        i++;
      }
    } else {
      // Normal line. If it's a URI line (not starting with #), resolve it to absolute and clean convertv
      if (!trimmed.startsWith("#")) {
        let absUrl = resolveUrl(trimmed, baseUrl);
        if (/\/convertv\d+/i.test(absUrl) || absUrl.includes("/convertv")) {
          absUrl = absUrl.replace(/\/convertv\d+/gi, "");
          absUrl = absUrl.replace(/convertv\d+\//gi, "");
        }
        resultLines.push(absUrl);
      } else {
        resultLines.push(line);
      }
      i++;
    }
  }
  
  return resultLines.join("\n");
}

// Recursively processes master/media playlists and tracks created Blob URLs
async function processPlaylistAndGetBlobUrl(
  playlistUrl: string, 
  createdBlobUrls: string[],
  visitedUrls = new Set<string>()
): Promise<string> {
  if (visitedUrls.has(playlistUrl)) {
    return playlistUrl;
  }
  visitedUrls.add(playlistUrl);
  
  console.log(`[Blob AdBlocker] Fetching playlist: ${playlistUrl}`);
  const response = await fetchWithTimeout(playlistUrl, {
    headers: {
      "Accept": "*/*"
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch HLS stream (${response.status})`);
  }
  
  const playlistText = await response.text();
  
  // 1. Is this a Master Playlist?
  if (playlistText.includes("#EXT-X-STREAM-INF")) {
    console.log(`[Blob AdBlocker] Master Playlist detected. Processing sub-playlists...`);
    const lines = playlistText.split(/\r?\n/);
    
    // Resolve variant stream playlists in parallel
    const resolvedLines = await Promise.all(
      lines.map(async (line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const subUrl = resolveUrl(trimmed, playlistUrl);
          try {
            const cleanedBlobUrl = await processPlaylistAndGetBlobUrl(subUrl, createdBlobUrls, visitedUrls);
            return cleanedBlobUrl;
          } catch (e) {
            console.warn(`[Blob AdBlocker] Failed to process variant stream, using absolute URL fallback: ${subUrl}`, e);
            return subUrl;
          }
        }
        return line;
      })
    );
    
    const cleanedMaster = resolvedLines.join("\n");
    const blob = new Blob([cleanedMaster], { type: "application/x-mpegURL" });
    const masterBlobUrl = URL.createObjectURL(blob);
    createdBlobUrls.push(masterBlobUrl);
    return masterBlobUrl;
  } else {
    // 2. It's a Media Playlist
    console.log(`[Blob AdBlocker] Media Playlist detected. Cleaning segments...`);
    const cleanedMedia = cleanMediaPlaylist(playlistText, playlistUrl);
    const blob = new Blob([cleanedMedia], { type: "application/x-mpegURL" });
    const mediaBlobUrl = URL.createObjectURL(blob);
    createdBlobUrls.push(mediaBlobUrl);
    return mediaBlobUrl;
  }
}

export default function HlsPlayer({ url, autoplay = false }: HlsPlayerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [playUrl, setPlayUrl] = useState<string>("");

  useEffect(() => {
    if (!url) {
      setPlayUrl("");
      return;
    }

    setIsInitialLoading(true);
    setError(null);
    const sessionBlobUrls: string[] = [];

    async function prepareStream() {
      try {
        const blobUrl = await processPlaylistAndGetBlobUrl(url, sessionBlobUrls);
        setPlayUrl(blobUrl);
      } catch (err: any) {
        console.error("[Blob AdBlocker] Error processing playlist, falling back to original:", err);
        setPlayUrl(url);
        // Keep loading state as false so Vidstack can attempt to load the original directly
        setIsInitialLoading(false);
      }
    }

    prepareStream();

    // Cleanup: revoke all Blob URLs generated during this session to prevent memory leaks
    return () => {
      sessionBlobUrls.forEach((blobUrl) => {
        if (blobUrl.startsWith("blob:")) {
          console.log(`[Blob AdBlocker] Revoking blob URL: ${blobUrl}`);
          URL.revokeObjectURL(blobUrl);
        }
      });
    };
  }, [url]);

  const handleCanPlay = () => {
    setIsInitialLoading(false);
    setError(null);
  };

  const handleError = (event: any) => {
    console.error("Vidstack Player Error:", event?.message || event?.type || "unknown error");
    setError(
      "Không thể kết nối hoặc giải mã nguồn video phát trực tiếp này (.m3u8). " +
      "Vui lòng thử đổi tập phim hoặc đổi nguồn phát (Server khác) ở bên dưới."
    );
    setIsInitialLoading(false);
  };

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden rounded-2xl border border-white/5 shadow-2xl">
      {isInitialLoading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#07080c] z-20 space-y-3 pointer-events-none">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs text-gray-400 font-semibold tracking-wide animate-pulse text-center px-4">
            Đang tải luồng phát video HLS (.m3u8) với Vidstack...
          </p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#07080c] p-6 text-center z-20 space-y-4">
          <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="max-w-md">
            <p className="text-gray-200 font-bold text-sm">Lỗi tải dữ liệu nguồn phát m3u8</p>
            <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">{error}</p>
          </div>
          <p className="text-[11px] text-amber-400 bg-amber-500/5 border border-amber-500/20 px-3.5 py-2.5 rounded-xl max-w-sm">
            Mẹo: Thử đổi sang Source khác hoặc đổi tập khác ở danh sách tập bên dưới để làm mới tải liên kết.
          </p>
        </div>
      )}

      {playUrl && (
        <MediaPlayer
          key={playUrl}
          title=""
          src={playUrl}
          autoplay={autoplay}
          onCanPlay={handleCanPlay}
          onError={handleError}
          playsInline
          className="w-full h-full"
        >
          <MediaProvider className="w-full h-full" />
          <DefaultVideoLayout icons={defaultLayoutIcons} />
        </MediaPlayer>
      )}
    </div>
  );
}
