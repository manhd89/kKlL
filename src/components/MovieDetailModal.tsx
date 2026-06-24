/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { MovieDetail, MovieEpisode, EpisodeItem } from "../types";
import { getMovieImageUrl, getDirectApiUrl } from "../utils";
import HlsPlayer from "./HlsPlayer";
import { X, Heart, Star, Calendar, Clock, Eye, Play, Film, MessageCircle, AlertTriangle, List, CheckCircle2 } from "lucide-react";

interface MovieDetailModalProps {
  movieSlug: string;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export default function MovieDetailModal({
  movieSlug,
  onClose,
  isFavorite,
  onToggleFavorite,
}: MovieDetailModalProps) {
  const [movieData, setMovieData] = useState<MovieDetail | null>(null);
  const [episodes, setEpisodes] = useState<MovieEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Video Streaming State
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [activeEpisode, setActiveEpisode] = useState<EpisodeItem | null>(null);
  const [watchedEpisodes, setWatchedEpisodes] = useState<string[]>([]); // list of episode name/slug watched

  const playerRef = useRef<HTMLDivElement>(null);

  // Fetch Movie Details from local proxy endpoint
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
            
            // Check dynamic URL params for matching server name and episode slug
            const urlParams = new URLSearchParams(window.location.search);
            const urlServerName = urlParams.get("server");
            const urlEpisodeSlug = urlParams.get("episode");

            // 1. Determine server index
            let serverIndex = 0;
            if (urlServerName && json.episodes) {
              const foundIdx = json.episodes.findIndex((srv: MovieEpisode) => srv.server_name === urlServerName);
              if (foundIdx !== -1) {
                serverIndex = foundIdx;
              }
            }
            setSelectedServerIndex(serverIndex);

            // 2. Determine target episode
            if (json.episodes && json.episodes.length > 0) {
              const server = json.episodes[serverIndex];
              if (server && server.server_data && server.server_data.length > 0) {
                let targetEp = null;
                if (urlEpisodeSlug) {
                  targetEp = server.server_data.find((e: EpisodeItem) => e.slug === urlEpisodeSlug);
                }
                
                // fallback to first episode if not found or not specified
                if (!targetEp) {
                  targetEp = server.server_data[0];
                }
                
                setActiveEpisode(targetEp || null);
              }
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

    // Fetch watched list from local storage
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

  // Synchronize active episode/server changes back to the URL
  useEffect(() => {
    if (!movieData) return;
    const params = new URLSearchParams(window.location.search);
    
    // Ensure we preserve other fields like tab, sub, label, page, search
    // but update those related to movie detailed streaming
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
    const currentQuery = window.location.search;

    if (newQuery !== currentQuery) {
      window.history.replaceState(null, "", newQuery);
    }
  }, [activeEpisode, selectedServerIndex, episodes, movieData, movieSlug]);

  // Save watched history state
  const handleSelectEpisode = (episode: EpisodeItem) => {
    setActiveEpisode(episode);
    
    // Add to watched array
    if (!watchedEpisodes.includes(episode.slug)) {
      const updated = [...watchedEpisodes, episode.slug];
      setWatchedEpisodes(updated);
      localStorage.setItem(`watched:${movieSlug}`, JSON.stringify(updated));
    }

    // Smooth scroll to the top player area
    playerRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div 
      id="movie-expanded-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#07080c]/98 backdrop-blur-sm flex justify-center py-4 px-2 sm:py-8 sm:px-4"
    >
      <div 
        className="relative w-full max-w-5xl bg-[#0e1017] rounded-3xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col max-h-full"
      >
        
        {/* Absolute header actions */}
        <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
          <button
            id="modal-fav-toggle"
            onClick={onToggleFavorite}
            className={`p-2.5 rounded-full border backdrop-blur-md transition-all cursor-pointer ${
              isFavorite
                ? "bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/20"
                : "bg-black/60 text-gray-300 border-gray-800 hover:text-rose-400"
            }`}
            title="Đánh dấu yêu thích"
          >
            <Heart className={`w-5 h-5 ${isFavorite ? "fill-white" : ""}`} />
          </button>
          
          <button
            id="modal-close-btn"
            onClick={onClose}
            className="p-2.5 rounded-full bg-black/60 text-gray-300 border border-gray-800 hover:bg-black/80 hover:text-white backdrop-blur-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Backdrop Blurred Poster Graphic */}
        {movieData && (
          <div className="absolute top-0 left-0 right-0 h-[300px] overflow-hidden pointer-events-none select-none z-0">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0e1017]/80 to-[#0e1017] z-10" />
            <img 
              src={getMovieImageUrl(movieData.poster_url || movieData.thumb_url)} 
              alt="" 
              className="w-full h-full object-cover scale-110 opacity-15 blur-3xl"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Modal Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto z-10 p-4 sm:p-8 space-y-8 scrollbar-thin">
          
          {isLoading ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400 text-sm font-medium">Đang thu thập dữ liệu chi tiết phim...</p>
            </div>
          ) : error ? (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-md mx-auto">
              <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-200 font-bold">Không thể khớp dữ liệu phim</p>
                <p className="text-gray-500 text-xs mt-1">{error}</p>
              </div>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-gray-800 text-gray-200 hover:text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Quay lại Trang chủ
              </button>
            </div>
          ) : movieData ? (
            <>
              {/* Top Details Grid Block */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-6 sm:pt-0">
                
                {/* Poster column */}
                <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-4">
                  <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden border border-gray-800 shadow-2xl bg-gray-900 group">
                    <img 
                      src={getMovieImageUrl(movieData.thumb_url || movieData.poster_url)} 
                      alt={movieData.name} 
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  {/* Secondary stats under poster */}
                  <div className="bg-[#151824] border border-gray-800/60 rounded-xl p-3 flex flex-col gap-2.5 text-xs text-gray-400">
                    <div className="flex items-center justify-between">
                      <span>Trạng thái:</span>
                      <span className="text-emerald-400 font-bold">{movieData.status === "completed" ? "Hoàn thành" : "Đang chiếu"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Thời lượng:</span>
                      <span className="text-gray-200 font-medium">{movieData.time || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Số tập hiện có:</span>
                      <span className="text-amber-500 font-bold">{movieData.episode_current || "1/1"}</span>
                    </div>
                  </div>
                </div>

                {/* Text attributes column */}
                <div className="md:col-span-8 lg:col-span-9 flex flex-col justify-between space-y-6">
                  
                  <div className="space-y-3">
                    {/* Tags line */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-black">
                        {movieData.quality || "HD"}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-800 text-gray-300">
                        {movieData.lang || "Lồng Tiếng"}
                      </span>
                      {movieData.year && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-800 text-gray-300">
                          Năm {movieData.year}
                        </span>
                      )}
                      {movieData.chieurap && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Chiếu Rạp
                        </span>
                      )}
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                      {movieData.name}
                    </h1>
                    <h2 className="text-sm font-semibold text-gray-400 leading-none">
                      {movieData.origin_name}
                    </h2>
                  </div>

                  {/* Complete Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#121420] border border-gray-800/50 rounded-2xl p-4 text-xs">
                    <div className="space-y-2">
                      <p>
                        <span className="text-gray-500">Đạo diễn: </span>
                        <span className="text-gray-200 font-medium select-all">
                          {movieData.director && movieData.director.filter(Boolean).length > 0
                            ? movieData.director.join(", ")
                            : "N/A"}
                        </span>
                      </p>
                      <p className="line-clamp-2">
                        <span className="text-gray-500">Diễn viên: </span>
                        <span className="text-gray-200 font-medium select-all">
                          {movieData.actor && movieData.actor.filter(Boolean).length > 0
                            ? movieData.actor.join(", ")
                            : "Đang cập nhật"}
                        </span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p>
                        <span className="text-gray-500">Thể loại: </span>
                        <span className="text-amber-500/95 font-semibold">
                          {movieData.category && movieData.category.map((c) => c.name).join(", ")}
                        </span>
                      </p>
                      <p>
                        <span className="text-gray-500">Quốc gia: </span>
                        <span className="text-gray-200 font-medium">
                          {movieData.country && movieData.country.map((c) => c.name).join(", ")}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Summary content description */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[#6c7a89]">Tóm tắt nội dung</h4>
                    <div 
                      className="text-gray-300 text-sm leading-relaxed max-h-[140px] overflow-y-auto pr-2 scrollbar-thin select-text line-clamp-4 hover:line-clamp-none transition-all duration-300"
                      dangerouslySetInnerHTML={{ __html: movieData.content || "Nội dung phim đang được cập nhật..." }}
                    />
                  </div>

                </div>
              </div>

              {/* VIDEO PLAYER COMPONENT BLOCK */}
              <div 
                ref={playerRef}
                className="pt-4 border-t border-gray-800/50 space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-ping shrink-0" />
                    <h2 className="text-base font-extrabold text-white flex items-center gap-2 select-none truncate">
                      <Play className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                      {activeEpisode 
                        ? `Đang Xem: ${activeEpisode.name}`
                        : "Chọn một tập để bắt đầu xem"
                      }
                    </h2>
                  </div>
                </div>

                {/* 16:9 Video container stage */}
                {activeEpisode ? (
                  <div className="relative aspect-[16/9] w-full bg-[#030303] rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
                    {activeEpisode.link_m3u8 ? (
                      <HlsPlayer url={activeEpisode.link_m3u8} autoplay={false} />
                    ) : (
                      <div className="aspect-[16/9] w-full bg-gray-950 border border-gray-900 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-2">
                        <AlertTriangle className="w-10 h-10 text-amber-500 animate-pulse" />
                        <p className="text-gray-400 text-sm">Tập phim này chưa sãn sàng nguồn phát m3u8 trực tiếp</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-[16/9] w-full bg-gray-950 border border-gray-900 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-2">
                    <Film className="w-10 h-10 text-gray-800 animate-pulse" />
                    <p className="text-gray-500 text-sm font-medium">Vui lòng chọn tập phim bên dưới để bắt đầu xem trực tiếp m3u8</p>
                  </div>
                )}
              </div>

              {/* EPISODE LIST AREA */}
              <div className="pt-2 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-3">
                  <div className="flex items-center gap-2">
                    <List className="w-4.5 h-4.5 text-gray-400" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#6c7a89]">Danh sách tập phim</h3>
                  </div>

                  {/* Server tabs selection directly in the episode area */}
                  {episodes.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5 bg-[#121420] border border-gray-800 p-1 rounded-xl">
                      <span className="text-[10px] text-gray-500 font-bold uppercase px-2 select-none">Hệ thống Server:</span>
                      {episodes.map((srv, idx) => {
                        const isSelected = selectedServerIndex === idx;
                        return (
                          <button
                            key={srv.server_name}
                            onClick={() => {
                              setSelectedServerIndex(idx);
                              // Keep the same episode slug active if possible across servers
                              if (activeEpisode) {
                                const matched = srv.server_data.find(e => e.slug === activeEpisode.slug);
                                if (matched) {
                                  setActiveEpisode(matched);
                                } else if (srv.server_data.length > 0) {
                                  setActiveEpisode(srv.server_data[0]);
                                }
                              } else if (srv.server_data.length > 0) {
                                setActiveEpisode(srv.server_data[0]);
                              }
                            }}
                            className={`px-3 py-1 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? "bg-amber-500 text-black shadow-md font-extrabold"
                                : "text-gray-400 hover:text-white"
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
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                    {episodes[selectedServerIndex].server_data.map((epi) => {
                      const isActive = activeEpisode?.slug === epi.slug;
                      const isWatched = watchedEpisodes.includes(epi.slug);
                      return (
                        <button
                          key={epi.slug}
                          id={`episode-selector-${epi.slug}`}
                          onClick={() => handleSelectEpisode(epi)}
                          className={`relative flex items-center justify-center py-2.5 px-3 rounded-xl border font-bold text-xs cursor-pointer transition-all ${
                            isActive
                              ? "bg-amber-500 text-black border-amber-400 font-extrabold shadow-md shadow-amber-500/20 scale-[1.03]"
                              : isWatched
                              ? "bg-[#181d2a] text-gray-400 border-gray-800/80 hover:text-white"
                              : "bg-[#0e1017] text-gray-300 border-gray-800 hover:border-gray-700 hover:text-white"
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
                  <p className="text-gray-500 text-xs">Phim chưa cập nhật tập nào, vui lòng quay lại sau.</p>
                )}
              </div>
            </>
          ) : null}

        </div>
      </div>
    </div>
  );
}
