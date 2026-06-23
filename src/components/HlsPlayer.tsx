/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { AlertTriangle, Loader2 } from "lucide-react";

// Get standard Button component of Video.js
const Button = videojs.getComponent("Button");

// 1. Skip Backward 10 seconds button component
class SkipBackwardButton extends Button {
  constructor(player: any, options: any) {
    super(player, options);
    (this as any).controlText("Lùi lại 10 giây");
  }
  buildCSSClass() {
    return "vjs-skip-backward-control " + super.buildCSSClass();
  }
  handleClick() {
    const player = this.player();
    const current = player.currentTime() || 0;
    player.currentTime(Math.max(0, current - 10));
  }
}

// 2. Skip Forward 10 seconds button component
class SkipForwardButton extends Button {
  constructor(player: any, options: any) {
    super(player, options);
    (this as any).controlText("Tua nhanh 10 giây");
  }
  buildCSSClass() {
    return "vjs-skip-forward-control " + super.buildCSSClass();
  }
  handleClick() {
    const player = this.player();
    const current = player.currentTime() || 0;
    const duration = player.duration() || 0;
    player.currentTime(Math.min(duration, current + 10));
  }
}

// 3. Register components if not registered
if (!videojs.getComponent("SkipBackwardButton")) {
  videojs.registerComponent("SkipBackwardButton", SkipBackwardButton);
}
if (!videojs.getComponent("SkipForwardButton")) {
  videojs.registerComponent("SkipForwardButton", SkipForwardButton);
}

interface HlsPlayerProps {
  url: string;
  autoplay?: boolean;
}

export default function HlsPlayer({ url, autoplay = true }: HlsPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    setError(null);
    setIsInitialLoading(true);

    // Create a dynamic video element matching the VideoJS spec
    const videoElement = document.createElement("video");
    videoElement.className = "video-js vjs-big-play-centered w-full h-full";
    videoElement.setAttribute("playsinline", "true");
    containerRef.current.appendChild(videoElement);

    // Initialize videojs player with modern layouts matched to videojs.org
    const player = videojs(videoElement, {
      autoplay: autoplay,
      controls: true,
      responsive: true,
      fluid: false,
      fill: true,
      preload: "auto",
      errorDisplay: false, 
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
      controlBar: {
        children: [
          "playToggle",
          "SkipBackwardButton",
          "SkipForwardButton",
          "currentTimeDisplay",
          "progressControl",
          "durationDisplay",
          "playbackRateMenuButton",
          "volumePanel",
          "fullscreenToggle",
        ],
      },
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

    // Configure loading events correctly to animate loaders nicely
    player.on("loadedmetadata", () => {
      setIsInitialLoading(false);
    });

    player.on("playing", () => {
      setIsInitialLoading(false);
    });

    player.on("error", () => {
      const liveError = player.error();
      console.error("VideoJS Player Error: ", liveError);
      setError(
        liveError?.message || 
        "Không thể kết nối hoặc giải mã thuộc tính luồng video này (.m3u8)."
      );
      setIsInitialLoading(false);
    });

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
      {/* 
        CLEAN SPECIFIC STYLES FOR OVERLAYS AND CUSTOM CONTROLS WITHOUT OVERRIDING NATIVE DEFAULT/MINIMAL DESIGN
      */}
      <style>{`
        .video-js {
          width: 100% !important;
          height: 100% !important;
          font-family: inherit !important;
        }

        /* Styling Skip Buttons simply with custom SVGs using data-urls */
        .video-js .vjs-skip-backward-control .vjs-icon-placeholder::before {
          content: "" !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='lucide lucide-rotate-ccw' viewBox='0 0 24 24'%3E%3Cpath d='M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8'/%3E%3Cpath d='M3 3v5h5'/%3E%3Ctext x='11.5' y='15' font-size='8' font-weight='700' fill='white' text-anchor='middle' font-family='system-ui, sans-serif'%3E10%3C/text%3E%3C/svg%3E") !important;
          background-size: 18px 18px !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          opacity: 0.8;
          transition: opacity 0.2s ease;
        }
        .video-js .vjs-skip-backward-control:hover .vjs-icon-placeholder::before {
          opacity: 1 !important;
        }

        .video-js .vjs-skip-forward-control .vjs-icon-placeholder::before {
          content: "" !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='lucide lucide-rotate-cw' viewBox='0 0 24 24'%3E%3Cpath d='M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8'/%3E%3Cpath d='M21 3v5h-5'/%3E%3Ctext x='12.5' y='15' font-size='8' font-weight='700' fill='white' text-anchor='middle' font-family='system-ui, sans-serif'%3E10%3C/text%3E%3C/svg%3E") !important;
          background-size: 18px 18px !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          opacity: 0.8;
          transition: opacity 0.2s ease;
        }
        .video-js .vjs-skip-forward-control:hover .vjs-icon-placeholder::before {
          opacity: 1 !important;
        }
      `}</style>

      {isInitialLoading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#07080c] z-20 space-y-3 pointer-events-none">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs text-gray-400 font-semibold tracking-wide animate-pulse">Đang kết nối luồng phát video (.m3u8)...</p>
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
      <div ref={containerRef} className="w-full h-full overflow-hidden rounded-2xl border border-white/5 shadow-2xl" id="vjs-player-container" />
    </div>
  );
}
