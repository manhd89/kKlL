/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { AlertTriangle, Loader2 } from "lucide-react";

interface HlsPlayerProps {
  url: string;
  autoplay?: boolean;
}

export default function HlsPlayer({ url, autoplay = true }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setIsLoading(true);

    let hls: Hls | null = null;

    // Check HLS compatibility
    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferSize: 30 * 1000 * 1000, // 30MB
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (autoplay) {
          video.play().catch(() => {
            // Autoplay blocked by browsers, safe to ignore
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS Player error:", data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError("Lỗi kết nối mạng đến máy chủ phát phim. Vui lòng chuyển sang trình phát dự phòng.");
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError("Lỗi bộ giải mã video hoặc định dạng không được hỗ trợ.");
              hls?.recoverMediaError();
              break;
            default:
              setError("Không thể thiết lập kết nối luồng phát phim này.");
              hls?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native m3u8 support (Safari, iOS devices)
      video.src = url;
      
      const onLoadedMetadata = () => {
        setIsLoading(false);
        if (autoplay) {
          video.play().catch(() => {});
        }
      };

      const onError = () => {
        setError("Lỗi thiết bị khi mở luồng video.");
      };

      video.addEventListener("loadedmetadata", onLoadedMetadata);
      video.addEventListener("error", onError);

      return () => {
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        video.removeEventListener("error", onError);
      };
    } else {
      setError("Trình duyệt này không hỗ trợ định dạng đĩa phát HLS (.m3u8). Hãy thử Google Chrome hoặc Safari.");
      setIsLoading(false);
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [url, autoplay]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      {isLoading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 space-y-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs text-gray-400 font-medium">Đang tải luồng phát video (.m3u8)...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#07080c] p-6 text-center z-20 space-y-4">
          <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="max-w-md">
            <p className="text-gray-200 font-bold text-sm">Lỗi tải luồng phát m3u8 trực tiếp</p>
            <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">{error}</p>
          </div>
          <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg max-w-sm">
            Mẹo: Trình phát trực tiếp có thể bị lỗi do chặn CORS hoặc mạng yếu. Vui lòng chuyển sang tab <strong>"Dự phòng (Iframe)"</strong> ở trên để xem mượt mà nhất.
          </p>
        </div>
      )}

      <video
        ref={videoRef}
        controls
        playsInline
        className="w-full h-full object-contain"
      />
    </div>
  );
}
