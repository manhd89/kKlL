/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Movie } from "../types";
import { getMovieImageUrl, getQualityColor } from "../utils";
import { Play, Calendar, Eye, Trash2, MessageSquare, History } from "lucide-react";
import { motion } from "motion/react";

interface MovieGridProps {
  movies: Movie[];
  pathImage: string;
  onSelectMovie: (slug: string) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  isLoading?: boolean;
  isHistoryTab?: boolean;
  onRemoveFromHistory?: (e: React.MouseEvent, slug: string) => void;
}

export default function MovieGrid({
  movies,
  pathImage,
  onSelectMovie,
  pagination,
  onPageChange,
  isLoading,
  isHistoryTab = false,
  onRemoveFromHistory,
}: MovieGridProps) {
  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm">Đang tải danh sách phim...</p>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center px-4">
        <FilmIcon className="w-16 h-16 text-gray-700 mb-4" />
        <p className="text-gray-300 text-lg font-semibold">Không tìm thấy bộ phim nào phù hợp</p>
        <p className="text-gray-500 text-sm max-w-sm mt-1">Vui lòng thử tìm kiếm bằng từ khoá khác hoặc khám phá thêm các thể loại tuyệt vời hơn.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Cards List Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {movies.map((movie, index) => {
          return (
            <motion.div
              key={movie._id || movie.slug}
              id={`movie-card-${movie.slug}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: (index % 12) * 0.04 }}
              onClick={() => onSelectMovie(movie.slug)}
              className="group relative bg-app-card rounded-2xl overflow-hidden border border-app-border hover:border-amber-500/40 transition-all cursor-pointer shadow-xl flex flex-col"
            >
              {/* Aspect Ratio Poster Image Container */}
              <div className="relative aspect-[2/3] overflow-hidden w-full bg-gray-900">
                <img
                  src={getMovieImageUrl(movie.poster_url || movie.thumb_url, pathImage)}
                  alt={movie.name}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500 ease-out"
                />

                {/* Card hover overlay play trigger */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                  <div className="w-12 h-12 bg-amber-500 text-black rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 scale-75 group-hover:scale-100 transition-all duration-300">
                    <Play className="fill-black w-6 h-6 ml-0.5" />
                  </div>
                </div>

                {/* Subtitle / Language Badge */}
                {movie.lang && (
                  <span className="absolute top-2 left-2 z-10 px-2 py-0.5 text-[9px] font-bold bg-amber-500 text-black rounded-md tracking-wider">
                    {movie.lang}
                  </span>
                )}

                {/* Quality Indicator Badge */}
                {movie.quality && (
                  <span className={`absolute top-2 right-2 z-10 px-2 py-0.5 text-[9px] font-bold rounded-md border backdrop-blur-md ${getQualityColor(movie.quality)}`}>
                    {movie.quality}
                  </span>
                )}

                {/* Episode current state (bottom tag overlay) */}
                {movie.episode_current && (
                  <div className="absolute bottom-2 left-2 right-2 z-10 flex justify-between gap-1">
                    <span className="px-2 py-0.5 text-[10px] bg-black/80 backdrop-blur border border-gray-800 text-gray-300 rounded-md font-medium max-w-full truncate">
                      {movie.episode_current}
                    </span>
                  </div>
                )}

                {/* Delete from Watch History Hot Button */}
                {isHistoryTab && onRemoveFromHistory && (
                  <button
                    id={`remove-history-btn-${movie.slug}`}
                    onClick={(e) => onRemoveFromHistory(e, movie.slug)}
                    className="absolute bottom-2 right-2 z-20 p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white backdrop-blur hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md shadow-rose-500/10"
                    title="Xoá khỏi lịch sử xem"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Title / Meta Details Text Block */}
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-app-text group-hover:text-amber-500 transition-colors line-clamp-1 leading-tight" title={movie.name}>
                    {movie.name}
                  </h3>
                  <h4 className="text-[11px] text-app-text-muted font-medium line-clamp-1 truncate" title={movie.origin_name}>
                    {movie.origin_name}
                  </h4>
                </div>

                <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-app-border text-[10px] text-app-text-muted font-semibold uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-600" />
                    {movie.year || "N/A"}
                  </span>
                  {movie.time && (
                    <span className="bg-app-bg-input text-app-text-muted px-1.5 py-0.5 rounded text-[9px]">
                      {movie.time}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Pagination controls */}
      {pagination && pagination.totalPages > 1 && onPageChange && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 pb-12 border-t border-app-border mt-4">
          <button
            id="page-prev-btn"
            disabled={pagination.currentPage === 1}
            onClick={() => onPageChange(pagination.currentPage - 1)}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-app-border bg-app-card text-app-text-muted hover:text-app-text hover:border-amber-500/40 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center min-w-[100px]"
          >
            &larr; Trang trước
          </button>
          
          <div className="flex items-center flex-wrap justify-center gap-1.5">
            {(() => {
              const current = pagination.currentPage;
              const total = pagination.totalPages;
              const pages: (number | string)[] = [];
              
              if (total <= 7) {
                for (let i = 1; i <= total; i++) {
                  pages.push(i);
                }
              } else {
                pages.push(1);
                
                const start = Math.max(2, current - 2);
                const end = Math.min(total - 1, current + 2);
                
                if (start > 2) {
                  pages.push("...");
                }
                
                for (let i = start; i <= end; i++) {
                  pages.push(i);
                }
                
                if (end < total - 1) {
                  pages.push("...");
                }
                
                pages.push(total);
              }

              return pages.map((p, idx) => {
                if (p === "...") {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-3 py-1.5 text-xs text-gray-600 font-bold select-none cursor-default font-mono">
                      ...
                    </span>
                  );
                }
                
                const isCurrent = p === current;
                return (
                  <button
                    key={`page-${p}`}
                    onClick={() => onPageChange(Number(p))}
                    className={`w-9 h-9 text-xs rounded-xl flex items-center justify-center font-bold font-mono transition-all duration-200 cursor-pointer ${
                      isCurrent
                        ? "bg-amber-500 text-black font-extrabold shadow-md shadow-amber-500/20 shadow-inner"
                        : "bg-app-card border border-app-border text-app-text-muted hover:text-app-text hover:border-amber-500/40"
                    }`}
                  >
                    {p}
                  </button>
                );
              });
            })()}
          </div>

          <button
            id="page-next-btn"
            disabled={pagination.currentPage === pagination.totalPages}
            onClick={() => onPageChange(pagination.currentPage + 1)}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-app-border bg-app-card text-app-text-muted hover:text-app-text hover:border-amber-500/40 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center min-w-[100px]"
          >
            Trang sau &rarr;
          </button>
        </div>
      )}
    </div>
  );
}

// Icon fallbacks inside components without external SVG dependencies
function FilmIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6h16.5M3.75 12h16.5M3.75 18h16.5M9 3.75v16.5M15 3.75v16.5"
      />
    </svg>
  );
}
