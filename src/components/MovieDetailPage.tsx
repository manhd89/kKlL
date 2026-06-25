/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { MovieDetail, MovieEpisode, EpisodeItem, Movie } from "../types";
import { getMovieImageUrl, getDirectApiUrl } from "../utils";
import StreamPlayer from "./StreamPlayer";
import { ArrowLeft, Star, Calendar, Clock, Eye, Play, Film, AlertTriangle, List, CheckCircle2, History } from "lucide-react";

interface MovieDetailPageProps {
  movieSlug: string;
  onBack: () => void;
  onSelectRelatedMovie?: (slug: string) => void;
  watchHistory: Movie[];
  onUpdateHistoryState: (
    movieDetail: MovieDetail,
    serverName: string,
    epName: string,
    epSlug: string,
    position: number,
    duration: number
  ) => void;
}

export default function MovieDetailPage({
  movieSlug,
  onBack,
  watchHistory,
  onUpdateHistoryState,
}: MovieDetailPageProps) {
  const [movieData, setMovieData] = useState<MovieDetail | null>(null);
  const [episodes, setEpisodes] = useState<MovieEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Video Streaming State
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [activeEpisode, setActiveEpisode] = useState<EpisodeItem | null>(null);
  const [watchedEpisodes, setWatchedEpisodes] = useState<string[]>([]);
  const [playerAutoplay, setPlayerAutoplay] = useState(false);
  const [initialPlaybackTime, setInitialPlaybackTime] = useState(0);

  const playerRef = useRef<HTMLDivElement>(null);
  const lastSaveTimeRef = useRef<number>(0);

  // Look up history record for this movie
  const historyRecord = watchHistory.find((m) => m.slug === movieSlug);

  // Fetch Movie Details from proxy API
  useEffect(() => {
    let active = true;
    const fetchMovieDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(getDirectApiUrl(`/api/movies/detail/${movieSlug}`));
        if (!res.ok) {
          throw new Error("Không thể tải thông tin chi tiết phim!");
        }
        const json = await res.json();
        if (active) {
          if (json && json.movie) {
            setMovieData(json.movie);
            setEpisodes(json.episodes || []);

            const urlParams = new URLSearchParams(window.location.search);
            const urlServerName = urlParams.get("server");
            const urlEpisodeSlug = urlParams.get("episode");

            // 1. Determine server index
            let serverIndex = 0;
            if (urlServerName && json.episodes) {
              const foundIdx = json.episodes.findIndex(
                (srv: MovieEpisode) => srv.server_name === urlServerName
              );
              if (foundIdx !== -1) serverIndex = foundIdx;
            } else if (historyRecord?.history_server && json.episodes) {
              const foundIdx = json.episodes.findIndex(
                (srv: MovieEpisode) => srv.server_name === historyRecord.history_server
              );
              if (foundIdx !== -1) serverIndex = foundIdx;
            }
            setSelectedServerIndex(serverIndex);

            // 2. Determine target episode
            let targetEp: EpisodeItem | null = null;
            if (json.episodes && json.episodes.length > 0) {
              const server = json.episodes[serverIndex];
              if (server && server.server_data && server.server_data.length > 0) {
                if (urlEpisodeSlug) {
                  targetEp = server.server_data.find((e: EpisodeItem) => e.slug === urlEpisodeSlug) || null;
                } else if (historyRecord?.history_episode_slug) {
                  targetEp = server.server_data.find(
                    (e: EpisodeItem) => e.slug === historyRecord.history_episode_slug
                  ) || null;
                }

                if (!targetEp) {
                  targetEp = server.server_data[0];
                }
              }
            }
            setActiveEpisode(targetEp);

            // 3. Determine saved position
            if (
              targetEp &&
              historyRecord?.history_episode_slug === targetEp.slug &&
              typeof historyRecord.history_position === "number"
            ) {
              setInitialPlaybackTime(historyRecord.history_position);
            } else {
              setInitialPlaybackTime(0);
            }

            // Immediately register history entry on load
            if (targetEp && json.episodes[serverIndex]) {
              onUpdateHistoryState(
                json.movie,
                json.episodes[serverIndex].server_name,
                targetEp.name,
                targetEp.slug,
                historyRecord?.history_position || 0,
                historyRecord?.history_duration || 0
              );
            }
          } else {
            throw new Error("Định dạng dữ liệu phim không khớp.");
          }
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "Đã xảy ra lỗi khi tải dữ liệu phim.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchMovieDetails();

    // Fetch local watched episode list
    const storedHistory = localStorage.getItem(`watched:${movieSlug}`);
    if (storedHistory) {
      try {
        setWatchedEpisodes(JSON.parse(storedHistory));
      } catch (e) {}
    }

    return () => {
      active = false;
    };
  }, [movieSlug]);

  // Synchronize active episode/server changes back to the browser URL
  useEffect(() => {
    if (!movieData) return;
    const params = new URLSearchParams(window.location.search);
    params.set("movie", movieSlug);

    const activeServer = episodes[selectedServerIndex];
    if (activeServer) {
      params.set("server", activeServer.server_name);
    } else {
      params.delete("server");
    }

    if (activeEpisode) {
      params.set("episode", activeEpisode.slug);
    } else {
      params.delete("episode");
    }

    const newQuery = `?${params.toString()}`;
    if (newQuery !== window.location.search) {
      window.history.replaceState(null, "", newQuery);
    }
  }, [activeEpisode, selectedServerIndex, episodes, movieData, movieSlug]);

  // Handle selecting an episode
  const handleSelectEpisode = (episode: EpisodeItem) => {
    setPlayerAutoplay(true);
    setActiveEpisode(episode);
    lastSaveTimeRef.current = 0;

    // Restore saved time if this exact episode was previously watched
    if (historyRecord?.history_episode_slug === episode.slug && typeof historyRecord.history_position === "number") {
      setInitialPlaybackTime(historyRecord.history_position);
    } else {
      setInitialPlaybackTime(0);
    }

    if (!watchedEpisodes.includes(episode.slug)) {
      const updated = [...watchedEpisodes, episode.slug];
      setWatchedEpisodes(updated);
      localStorage.setItem(`watched:${movieSlug}`, JSON.stringify(updated));
    }

    // Save history change
    if (movieData && episodes[selectedServerIndex]) {
      onUpdateHistoryState(
        movieData,
        episodes[selectedServerIndex].server_name,
        episode.name,
        episode.slug,
        historyRecord?.history_episode_slug === episode.slug ? (historyRecord.history_position || 0) : 0,
        0
      );
    }

    playerRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Throttled time updates from StreamPlayer
  const handlePlayerTimeUpdate = (currentTime: number, duration: number) => {
    if (Math.abs(currentTime - lastSaveTimeRef.current) >= 3) {
      lastSaveTimeRef.current = currentTime;
      if (movieData && activeEpisode && episodes[selectedServerIndex]) {
        onUpdateHistoryState(
          movieData,
          episodes[selectedServerIndex].server_name,
          activeEpisode.name,
          activeEpisode.slug,
          currentTime,
          duration
        );
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[500px] bg-app-card rounded-3xl border border-app-border p-8 flex flex-col items-center justify-center space-y-4 shadow-xl">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-app-text-muted text-sm font-medium">Đang tải trang chi tiết phim...</p>
      </div>
    );
  }

  if (error || !movieData) {
    return (
      <div className="min-h-[450px] bg-app-card rounded-3xl border border-app-border p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-xl max-w-lg mx-auto">
        <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <p className="text-app-text font-bold text-base">Không thể tải thông tin phim</p>
          <p className="text-app-text-muted text-xs mt-1">{error}</p>
        </div>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-amber-500 text-black hover:bg-amber-400 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-md"
        >
          Quay Lại Danh Sách
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-app-card rounded-3xl border border-app-border p-4 sm:p-8 space-y-8 shadow-2xl text-app-text transition-colors duration-300 animate-fadeIn">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-app-border">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-app-bg-input hover:bg-amber-500 hover:text-black text-app-text font-bold text-xs border border-app-border/80 transition-all cursor-pointer shadow-sm w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Quay Lại
        </button>

        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3.5 py-1.5 rounded-xl text-xs text-amber-400 font-semibold w-fit">
          <History className="w-3.5 h-3.5 shrink-0" />
          <span>Lưu tự động: Tập {activeEpisode?.name || "N/A"} ({selectedServerIndex + 1 > 0 ? episodes[selectedServerIndex]?.server_name : ""})</span>
        </div>
      </div>

      {/* Top Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Poster Column */}
        <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-4">
          <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden border border-app-border shadow-2xl bg-gray-900 group relative">
            <img
              src={getMovieImageUrl(movieData.poster_url || movieData.thumb_url)}
              alt={movieData.name}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            {movieData.quality && (
              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500 text-black shadow-md">
                {movieData.quality}
              </span>
            )}
          </div>

          <div className="bg-app-bg-input border border-app-border rounded-xl p-3.5 flex flex-col gap-2.5 text-xs text-app-text-muted">
            <div className="flex items-center justify-between">
              <span>Trạng thái:</span>
              <span className="text-emerald-400 font-bold">
                {movieData.status === "completed" ? "Hoàn thành" : "Đang chiếu"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Thời lượng:</span>
              <span className="text-app-text font-medium">{movieData.time || "N/A"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tập mới nhất:</span>
              <span className="text-amber-500 font-bold">{movieData.episode_current || "N/A"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Năm sản xuất:</span>
              <span className="text-app-text font-medium">{movieData.year || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Text Attributes Column */}
        <div className="md:col-span-8 lg:col-span-9 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-app-bg-input text-amber-500 border border-amber-500/30">
                {movieData.lang || "Lồng Tiếng"}
              </span>
              {movieData.chieurap && (
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  Chiếu Rạp
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-app-text tracking-tight leading-tight">
              {movieData.name}
            </h1>
            <h2 className="text-base font-semibold text-app-text-muted">
              {movieData.origin_name}
            </h2>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-app-bg-input/50 border border-app-border rounded-2xl p-5 text-xs">
            <div className="space-y-2.5">
              <p className="flex gap-1.5 leading-relaxed">
                <span className="text-app-text-muted shrink-0">Đạo diễn:</span>
                <span className="text-app-text font-semibold">
                  {movieData.director && movieData.director.filter(Boolean).length > 0
                    ? movieData.director.join(", ")
                    : "Đang cập nhật"}
                </span>
              </p>
              <p className="flex gap-1.5 leading-relaxed">
                <span className="text-app-text-muted shrink-0">Diễn viên:</span>
                <span className="text-app-text font-semibold line-clamp-2">
                  {movieData.actor && movieData.actor.filter(Boolean).length > 0
                    ? movieData.actor.join(", ")
                    : "Đang cập nhật"}
                </span>
              </p>
            </div>

            <div className="space-y-2.5">
              <p className="flex gap-1.5 leading-relaxed">
                <span className="text-app-text-muted shrink-0">Thể loại:</span>
                <span className="text-amber-500 font-bold">
                  {movieData.category && movieData.category.map((c) => c.name).join(", ")}
                </span>
              </p>
              <p className="flex gap-1.5 leading-relaxed">
                <span className="text-app-text-muted shrink-0">Quốc gia:</span>
                <span className="text-app-text font-semibold">
                  {movieData.country && movieData.country.map((c) => c.name).join(", ")}
                </span>
              </p>
            </div>
          </div>

          {/* Synopsis */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-app-text-muted">Tóm tắt nội dung</h3>
            <div
              className="text-app-text/90 text-sm leading-relaxed max-h-[160px] overflow-y-auto pr-2 scrollbar-thin select-text line-clamp-4 hover:line-clamp-none transition-all"
              dangerouslySetInnerHTML={{ __html: movieData.content || "Nội dung phim đang cập nhật..." }}
            />
          </div>
        </div>
      </div>

      {/* VIDEO PLAYER COMPONENT BLOCK */}
      <div ref={playerRef} className="pt-6 border-t border-app-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-app-bg-input/60 border border-app-border p-4 rounded-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-ping shrink-0" />
            <h2 className="text-base font-extrabold text-app-text flex items-center gap-2 truncate">
              <Play className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
              <span>Đang Xem: <span className="text-amber-400">{activeEpisode?.name || "N/A"}</span></span>
            </h2>
          </div>

          {episodes[selectedServerIndex] && (
            <span className="text-xs text-app-text-muted font-bold bg-black/40 px-3 py-1 rounded-lg border border-white/5">
              Server: {episodes[selectedServerIndex].server_name}
            </span>
          )}
        </div>

        {/* 16:9 Video Player Stage */}
        {activeEpisode ? (
          <div className="relative aspect-[16/9] w-full bg-black rounded-2xl overflow-hidden border border-app-border shadow-2xl">
            {activeEpisode.link_m3u8 ? (
              <StreamPlayer
                url={activeEpisode.link_m3u8}
                autoplay={playerAutoplay}
                initialTime={initialPlaybackTime}
                onTimeUpdate={handlePlayerTimeUpdate}
              />
            ) : (
              <div className="aspect-[16/9] w-full bg-gray-950 border border-gray-900 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-2">
                <AlertTriangle className="w-10 h-10 text-amber-500 animate-pulse" />
                <p className="text-app-text font-semibold text-sm">Tập phim này hiện chưa có liên kết phát m3u8 trực tiếp</p>
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-[16/9] w-full bg-gray-950 border border-gray-900 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-2">
            <Film className="w-10 h-10 text-gray-800 animate-pulse" />
            <p className="text-app-text-muted text-sm font-medium">Vui lòng chọn tập phim bên dưới để phát video</p>
          </div>
        )}
      </div>

      {/* EPISODE LIST & SERVER SELECTION */}
      <div className="pt-4 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-app-border pb-4">
          <div className="flex items-center gap-2">
            <List className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-black uppercase tracking-wider text-app-text">Danh Sách Tập Phim</h3>
          </div>

          {/* Server Selector Tabs */}
          {episodes.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 bg-app-bg-input border border-app-border p-1.5 rounded-xl">
              <span className="text-[11px] text-app-text-muted font-bold px-2">Đổi Server:</span>
              {episodes.map((srv, idx) => {
                const isSelected = selectedServerIndex === idx;
                return (
                  <button
                    key={srv.server_name}
                    onClick={() => {
                      setSelectedServerIndex(idx);
                      setPlayerAutoplay(true);
                      if (activeEpisode) {
                        const matched = srv.server_data.find((e) => e.slug === activeEpisode.slug);
                        if (matched) setActiveEpisode(matched);
                        else if (srv.server_data.length > 0) setActiveEpisode(srv.server_data[0]);
                      } else if (srv.server_data.length > 0) {
                        setActiveEpisode(srv.server_data[0]);
                      }
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? "bg-amber-500 text-black shadow-md"
                        : "text-app-text-muted hover:text-app-text"
                    }`}
                  >
                    {srv.server_name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {episodes && episodes[selectedServerIndex] ? (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {episodes[selectedServerIndex].server_data.map((epi) => {
              const isActive = activeEpisode?.slug === epi.slug;
              const isWatched = watchedEpisodes.includes(epi.slug);
              return (
                <button
                  key={epi.slug}
                  id={`episode-btn-${epi.slug}`}
                  onClick={() => handleSelectEpisode(epi)}
                  className={`relative flex items-center justify-center py-3 px-3.5 rounded-xl border font-bold text-xs cursor-pointer transition-all ${
                    isActive
                      ? "bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20 scale-105 z-10"
                      : isWatched
                      ? "bg-app-bg-input text-app-text-muted border-app-border hover:text-app-text"
                      : "bg-app-bg-input/40 text-app-text border-app-border hover:border-amber-500/50 hover:bg-app-bg-input"
                  }`}
                >
                  <span className="truncate">{epi.name}</span>
                  {isWatched && !isActive && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 absolute top-1 right-1" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-app-text-muted text-xs">Chưa cập nhật danh sách tập phim.</p>
        )}
      </div>
    </div>
  );
}
