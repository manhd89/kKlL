/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { AlertTriangle, Loader2 } from "lucide-react";

interface HlsPlayerProps {
  url: string;
  autoplay?: boolean;
}

export default function HlsPlayer({ url, autoplay = true }: HlsPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    setError(null);
    setIsLoading(true);

    // 1. Create a dynamic video element for stable videojs initialization with default skin support
    const videoElement = document.createElement("video");
    videoElement.className = "video-js vjs-default-skin vjs-big-play-centered w-full h-full";
    videoElement.setAttribute("playsinline", "true");
    videoElement.setAttribute("controls", "true");
    containerRef.current.appendChild(videoElement);

    // 2. Initialize videojs player with optimal configuration
    const player = videojs(videoElement, {
      autoplay: autoplay,
      controls: true,
      responsive: true,
      fluid: false,
      fill: true,
      preload: "auto",
      errorDisplay: false, // Handled customly in UI
      sources: [
        {
          src: url,
          type: "application/x-mpegURL",
        }
      ],
      html5: {
        vhs: {
          overrideNative: true,
          fastQualityChange: true,
        }
      }
    });

    playerRef.current = player;

    // 3. Configure player event streams to drive state smoothly
    player.on("loadedmetadata", () => {
      setIsLoading(false);
    });

    player.on("playing", () => {
      setIsLoading(false);
    });

    player.on("waiting", () => {
      setIsLoading(true);
    });

    player.on("error", () => {
      const liveError = player.error();
      console.error("VideoJS Player Error: ", liveError);
      setError(
        liveError?.message || 
        "Không thể kết nối hoặc giải mã thuộc tính luồng video này (.m3u8)."
      );
      setIsLoading(false);
    });

    // Clean up when lifecycle updates or component unmounts
    return () => {
      if (player) {
        player.dispose();
        playerRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [url, autoplay]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      {/* Dynamic Amber Overrides for VideoJS Controls CSS */}
      <style>{`
        .video-js {
          width: 100% !important;
          height: 100% !important;
          background-color: #030303 !important;
          color: #ffffff !important;
        }
        .video-js .vjs-big-play-button {
          background-color: rgba(245, 158, 11, 0.9) !important;
          border-color: #f59e0b !important;
          color: #000000 !important;
          border-radius: 9999px !important;
          width: 2.2em !important;
          height: 2.2em !important;
          line-height: 2.2em !important;
          margin-left: -1.1em !important;
          margin-top: -1.1em !important;
          box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.4);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .video-js:hover .vjs-big-play-button, .video-js .vjs-big-play-button:focus {
          background-color: #fbbf24 !important;
          transform: scale(1.1);
          box-shadow: 0 10px 30px -5px rgba(251, 191, 36, 0.6);
        }
        .video-js .vjs-play-progress {
          background-color: #fbbf24 !important;
        }
        .video-js .vjs-slider {
          background-color: rgba(255, 255, 255, 0.1) !important;
          border-radius: 9999px;
        }
        .video-js .vjs-load-progress {
          background-color: rgba(255, 255, 255, 0.15) !important;
          border-radius: 9999px;
        }
        .video-js .vjs-volume-level {
          background-color: #fbbf24 !important;
        }
        .video-js .vjs-control-bar {
          background-color: rgba(5, 5, 8, 0.85) !important;
          backdrop-filter: blur(12px);
          display: flex !important; /* Ensure the control bar is visible */
        }
      `}</style>

      {isLoading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 space-y-3 pointer-events-none">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs text-gray-400 font-semibold tracking-wide">Đang tải luồng phát video (.m3u8)...</p>
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
          <p className="text-[11px] text-amber-400 bg-amber-500/5 border border-amber-500/20 px-3.5 py-2.5 rounded-xl max-w-sm">
            Mẹo: Thử đổi một tập khác hoặc đổi nguồn phát (Server Hà Nội/Hồ Chí Minh) ở danh sách tập bên dưới để làm mới kết nối.
          </p>
        </div>
      )}

      {/* Container for VideoJS mounting */}
      <div ref={containerRef} className="w-full h-full overflow-hidden" />
    </div>
  );
}
