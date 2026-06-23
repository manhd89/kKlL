/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Movie } from "../types";
import { getMovieImageUrl } from "../utils";
import { Play, Heart, ChevronLeft, ChevronRight, Calendar, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MovieCarouselProps {
  movies: Movie[];
  pathImage: string;
  onSelectMovie: (slug: string) => void;
  favorites: string[];
  onToggleFavorite: (e: React.MouseEvent, movie: Movie) => void;
}

export default function MovieCarousel({
  movies,
  pathImage,
  onSelectMovie,
  favorites,
  onToggleFavorite,
}: MovieCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Take first 5 movies for the premium hero banner rotation
  const featuredMovies = movies.slice(0, 5);

  // Auto scroll every 7 seconds
  useEffect(() => {
    if (featuredMovies.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [featuredMovies.length]);

  if (featuredMovies.length === 0) return null;

  const activeMovie = featuredMovies[currentIndex];
  const isFav = favorites.includes(activeMovie.slug);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + featuredMovies.length) % featuredMovies.length);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredMovies.length);
  };

  return (
    <div 
      className="relative w-full h-[320px] md:h-[420px] rounded-3xl overflow-hidden border border-gray-800/80 bg-black group shadow-2xl"
      id="hero-cinematic-banner"
    >
      {/* Background Poster Image with Widescreen Linear Mask */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          {/* Main Background Image */}
          <img
            src={getMovieImageUrl(activeMovie.poster_url || activeMovie.thumb_url, pathImage)}
            alt={activeMovie.name}
            className="w-full h-full object-cover opacity-35 scale-102 blur-[1px]"
            referrerPolicy="no-referrer"
          />

          {/* Vignette Spotlighting Layer */}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e1017] via-transparent to-[#0e1017]/30 z-10" />
        </motion.div>
      </AnimatePresence>

      {/* Slide textual information overlays */}
      <div className="absolute inset-y-0 left-0 w-full md:w-3/4 lg:w-2/3 z-20 flex flex-col justify-center p-6 sm:p-12 space-y-4 text-left select-none">
        
        <div className="space-y-1 sm:space-y-2">
          {/* Mini labels */}
          <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold tracking-widest uppercase">
            <span className="bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-500" /> Nổi bật
            </span>
            {activeMovie.year && (
              <span className="text-gray-400 font-medium">| {activeMovie.year}</span>
            )}
            {activeMovie.quality && (
              <span className="text-gray-400 font-medium">| {activeMovie.quality}</span>
            )}
          </div>

          <h2 className="text-xl sm:text-3xl md:text-3xl font-black text-white leading-tight line-clamp-2 uppercase tracking-wide">
            {activeMovie.name}
          </h2>
          <h3 className="text-xs sm:text-sm font-semibold text-gray-400/90 line-clamp-1 italic">
            {activeMovie.origin_name}
          </h3>
        </div>

        {/* Buttons tray */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => onSelectMovie(activeMovie.slug)}
            className="px-5 py-2.5 sm:px-6 sm:py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/15 cursor-pointer hover:scale-[1.02] transition-all"
            title="Xem ngay tức thì"
          >
            <Play className="fill-black w-4 h-4 ml-0.5" /> Xem Phim
          </button>

          <button
            onClick={(e) => onToggleFavorite(e, activeMovie)}
            className={`p-2.5 sm:p-3 rounded-xl border backdrop-blur cursor-pointer hover:scale-[1.02] transition-transform ${
              isFav
                ? "bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20"
                : "bg-black/60 text-gray-300 border-gray-800 hover:text-white"
            }`}
            title={isFav ? "Xoá khỏi danh sách yêu thích" : "Đánh dấu lưu trữ"}
          >
            <Heart className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isFav ? "fill-white" : ""}`} />
          </button>
        </div>

      </div>

      {/* Navigation Indicators */}
      {featuredMovies.length > 1 && (
        <>
          {/* Prev Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full border border-gray-800 bg-black/60 text-gray-400 hover:text-white hover:bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hidden sm:block"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Next Arrows */}
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full border border-gray-800 bg-black/60 text-gray-400 hover:text-white hover:bg-black/90 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hidden sm:block"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Sliced dots line indicator */}
          <div className="absolute bottom-4 right-6 z-30 flex gap-2">
            {featuredMovies.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                  currentIndex === i ? "w-6 bg-amber-500" : "bg-gray-600 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>
        </>
      )}

    </div>
  );
}
