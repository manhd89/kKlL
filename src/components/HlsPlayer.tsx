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

export default function HlsPlayer({ url, autoplay = false }: HlsPlayerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Reset state whenever src URL changes to ensure smooth loading feedback
  useEffect(() => {
    setIsInitialLoading(true);
    setError(null);
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

      <MediaPlayer
        key={url}
        title=""
        src={url}
        autoplay={autoplay}
        onCanPlay={handleCanPlay}
        onError={handleError}
        playsInline
        className="w-full h-full"
      >
        <MediaProvider className="w-full h-full" />
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>
    </div>
  );
}
