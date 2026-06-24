/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import MovieCarousel from "./components/MovieCarousel";
import MovieGrid from "./components/MovieGrid";
import MovieDetailModal from "./components/MovieDetailModal";
import Footer from "./components/Footer";
import { Movie, Genre, Country, Pagination } from "./types";
import { Film, Sparkles, History, Trash2 } from "lucide-react";
import { getDirectApiUrl } from "./utils";

export default function App() {
  // Navigation & Filter states (Initialized directly from URL params)
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "phim-moi-cap-nhat";
  });
  const [activeSubSlug, setActiveSubSlug] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("sub") || "";
  });
  const [activeLabel, setActiveLabel] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("label") || "";
  });
  const [currentPage, setCurrentPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get("page") || "1", 10);
  });
  const [searchKeyword, setSearchKeyword] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("search") || "";
  });

  // DB Metadata states
  const [genres, setGenres] = useState<Genre[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  
  // Movies list fetch results
  const [movies, setMovies] = useState<Movie[]>([]);
  const [pathImage, setPathImage] = useState("");
  const [pagination, setPagination] = useState<Pagination | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active watching movie details
  const [selectedMovieSlug, setSelectedMovieSlug] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("movie");
  });

  // Watch History serialization persistence
  const [watchHistory, setWatchHistory] = useState<Movie[]>([]);

  // Listen to popstate (back/forward history events)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedMovieSlug(params.get("movie"));
      setActiveTab(params.get("tab") || "phim-moi-cap-nhat");
      setActiveSubSlug(params.get("sub") || "");
      setActiveLabel(params.get("label") || "");
      setCurrentPage(parseInt(params.get("page") || "1", 10));
      setSearchKeyword(params.get("search") || "");
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Synchronize state changes back to url
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Process movie details
    if (selectedMovieSlug) {
      params.set("movie", selectedMovieSlug);
    } else {
      params.delete("movie");
      params.delete("episode");
      params.delete("server");
    }

    // Process tab/genres/countries filters
    if (activeTab && activeTab !== "phim-moi-cap-nhat") {
      params.set("tab", activeTab);
    } else {
      params.delete("tab");
    }

    if (activeSubSlug) {
      params.set("sub", activeSubSlug);
    } else {
      params.delete("sub");
    }

    if (activeLabel) {
      params.set("label", activeLabel);
    } else {
      params.delete("label");
    }

    if (currentPage > 1) {
      params.set("page", currentPage.toString());
    } else {
      params.delete("page");
    }

    if (searchKeyword && activeTab === "search") {
      params.set("search", searchKeyword);
    } else {
      params.delete("search");
    }

    const newQuery = params.toString() ? `?${params.toString()}` : "/";
    const currentQuery = window.location.search || "/";

    const newPath = newQuery.startsWith("/") ? newQuery : `/${newQuery}`;
    const currentPath = currentQuery.startsWith("/") ? currentQuery : `/${currentQuery}`;

    if (newPath !== currentPath) {
      const prevMovie = new URLSearchParams(window.location.search).get("movie");
      const isMovieToggle = (selectedMovieSlug && !prevMovie) || (!selectedMovieSlug && prevMovie);

      if (isMovieToggle) {
        window.history.pushState(null, "", newQuery);
      } else {
        window.history.replaceState(null, "", newQuery);
      }
    }
  }, [activeTab, activeSubSlug, activeLabel, currentPage, searchKeyword, selectedMovieSlug]);

  // Load static collections on mount
  useEffect(() => {
    // 1. Fetch auxiliary genres + countries dynamically from local proxy
    const fetchMetadata = async () => {
      try {
        const [genresRes, countriesRes] = await Promise.all([
          fetch(getDirectApiUrl("/api/genres")),
          fetch(getDirectApiUrl("/api/countries")),
        ]);
        if (genresRes.ok) {
          const data = await genresRes.json();
          let rawGenres = [];
          if (Array.isArray(data)) {
            rawGenres = data;
          } else if (data && data.items) {
            rawGenres = data.items;
          } else if (data && data.data) {
            rawGenres = data.data;
          } else if (data && typeof data === "object") {
            // Find any property that is an array
            const foundArr = Object.values(data).find(Array.isArray);
            if (foundArr) rawGenres = foundArr;
          }
          const mappedGenres = rawGenres.map((item: any) => ({
            _id: item._id || item.id || item.slug || Math.random().toString(),
            name: item.name || "",
            slug: item.slug || ""
          })).filter((item: any) => item.slug);
          setGenres(mappedGenres);
        }
        if (countriesRes.ok) {
          const data = await countriesRes.json();
          let rawCountries = [];
          if (Array.isArray(data)) {
            rawCountries = data;
          } else if (data && data.items) {
            rawCountries = data.items;
          } else if (data && data.data) {
            rawCountries = data.data;
          } else if (data && typeof data === "object") {
            // Find any property that is an array
            const foundArr = Object.values(data).find(Array.isArray);
            if (foundArr) rawCountries = foundArr;
          }
          const mappedCountries = rawCountries.map((item: any) => ({
            _id: item._id || item.id || item.slug || Math.random().toString(),
            name: item.name || "",
            slug: item.slug || ""
          })).filter((item: any) => item.slug);
          setCountries(mappedCountries);
        }
      } catch (err) {
        console.warn("Could not download filter lists metadata:", err);
      }
    };

    fetchMetadata();

    // 2. Fetch watch history list from local cache
    const storedHistory = localStorage.getItem("kkphim_watch_history");
    if (storedHistory) {
      try {
        setWatchHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error("Failed load local storage watch history", e);
      }
    }
  }, []);

  // Sync watch history back to localStorage whenever it changes
  const saveWatchHistory = (list: Movie[]) => {
    setWatchHistory(list);
    localStorage.setItem("kkphim_watch_history", JSON.stringify(list));
  };

  // Movie list loader trigger based on filters
  useEffect(() => {
    // If active tab is history, we don't query remote database
    if (activeTab === "history") {
      setMovies(watchHistory);
      setPathImage("");
      setPagination(undefined);
      setIsLoading(false);
      setError(null);
      return;
    }

    let active = true;
    const fetchMoviesList = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let fetchUrl = "";
        
        if (activeTab === "search") {
          fetchUrl = `/api/movies/search?keyword=${encodeURIComponent(searchKeyword)}&page=${currentPage}`;
        } else if (activeTab === "genre") {
          fetchUrl = `/api/movies/genre/${activeSubSlug}?page=${currentPage}`;
        } else if (activeTab === "country") {
          fetchUrl = `/api/movies/country/${activeSubSlug}?page=${currentPage}`;
        } else {
          // It's a standard endpoint matching: phim-moi-cap-nhat, phim-le, phim-bo, hoat-hinh, tv-shows
          fetchUrl = `/api/movies/list/${activeTab}?page=${currentPage}`;
        }

        const res = await fetch(getDirectApiUrl(fetchUrl));
        if (!res.ok) {
          throw new Error("Không thể liên kết máy chủ cung cấp dữ liệu phim.");
        }

        const data = await res.json();
        
        if (active) {
          // If search has zero matches, some APIs pack empty list structures
          const loadedItems = data.items || data.data?.items || [];
          setMovies(loadedItems);
          
          // Image path defaults
          const path = data.pathImage || data.data?.pathImage || data.data?.APP_DOMAIN_CDN_IMAGE || data.APP_DOMAIN_CDN_IMAGE || "https://img.phimapi.com/uploads/movies/";
          setPathImage(path);

          // Pagination stats
          const pagin = data.pagination || data.data?.params?.pagination || data.data?.pagination;
          if (pagin) {
            setPagination({
              totalItems: Number(pagin.totalItems),
              totalItemsPerPage: Number(pagin.totalItemsPerPage),
              currentPage: Number(pagin.currentPage),
              totalPages: Number(pagin.totalPages),
            });
          } else {
            setPagination(undefined);
          }
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "Không thể nạp dữ liệu phim mới.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchMoviesList();

    return () => {
      active = false;
    };
  }, [activeTab, activeSubSlug, currentPage, searchKeyword, watchHistory.length]);

  // Handles updating active state selections
  const handleSelectTab = (tab: string, subSlug = "", label = "") => {
    setActiveTab(tab);
    setActiveSubSlug(subSlug);
    setActiveLabel(label);
    setCurrentPage(1); // restart back to page 1
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearch = (keyword: string) => {
    setActiveTab("search");
    setSearchKeyword(keyword);
    setActiveLabel(`Tìm kiếm: "${keyword}"`);
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Automatically add a movie to the top of Watch History
  const handleAddToHistory = (movieDetail: any) => {
    if (!movieDetail) return;

    const movieItem: Movie = {
      _id: movieDetail._id || movieDetail.slug || Math.random().toString(),
      name: movieDetail.name || "",
      origin_name: movieDetail.origin_name || "",
      slug: movieDetail.slug || "",
      thumb_url: movieDetail.thumb_url || "",
      poster_url: movieDetail.poster_url || "",
      year: movieDetail.year || new Date().getFullYear(),
      episode_current: movieDetail.episode_current || "",
      quality: movieDetail.quality || "",
      lang: movieDetail.lang || ""
    };

    setWatchHistory((prev) => {
      const filtered = prev.filter((item) => item.slug !== movieItem.slug);
      const updated = [movieItem, ...filtered].slice(0, 50); // limit to last 50 movies
      localStorage.setItem("kkphim_watch_history", JSON.stringify(updated));
      return updated;
    });
  };

  const handleRemoveFromHistory = (e: React.MouseEvent, movieSlug: string) => {
    e.stopPropagation();
    const updated = watchHistory.filter((item) => item.slug !== movieSlug);
    setWatchHistory(updated);
    localStorage.setItem("kkphim_watch_history", JSON.stringify(updated));
  };

  const handleClearHistory = () => {
    setWatchHistory([]);
    localStorage.removeItem("kkphim_watch_history");
  };

  // Derive dynamic page titles based on current selection
  const getSectionTitle = () => {
    if (activeTab === "phim-moi-cap-nhat") return "Phim Mới Cập Nhật";
    if (activeTab === "phim-le") return "Phim Lẻ Đề Xuất";
    if (activeTab === "phim-bo") return "Phim Bộ Hấp Dẫn";
    if (activeTab === "hoat-hinh") return "Thế Giới Hoạt Hình";
    if (activeTab === "tv-shows") return "Chương Trình TV Shows";
    if (activeTab === "genre") return `Thể Loại: ${activeLabel}`;
    if (activeTab === "country") return `Quốc Gia: ${activeLabel}`;
    if (activeTab === "search") return activeLabel;
    if (activeTab === "history") return "Lịch Sử Xem Phim";
    return "Danh Sách Phim";
  };

  return (
    <div className="min-h-screen bg-app-bg text-app-text font-sans flex flex-col transition-colors duration-300">
      {/* Dynamic Header Component */}
      <Header
        genres={genres}
        countries={countries}
        activeTab={activeTab}
        activeSubSlug={activeSubSlug}
        activeLabel={activeLabel}
        historyCount={watchHistory.length}
        onSearch={handleSearch}
        onSelectTab={handleSelectTab}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-10">
        
        {/* Widescreen visual spotlight carousel at the top (Only on standard home pages page 1) */}
        {activeTab === "phim-moi-cap-nhat" && currentPage === 1 && !isLoading && movies.length > 0 && (
          <MovieCarousel
            movies={movies}
            pathImage={pathImage}
            onSelectMovie={setSelectedMovieSlug}
          />
        )}

        {/* Categories / Genres header label panel */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-app-border pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              {activeTab === "history" ? (
                <History className="w-5.5 h-5.5" />
              ) : (
                <Film className="w-5.5 h-5.5" />
              )}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-app-text tracking-tight leading-none uppercase">
                {getSectionTitle()}
              </h2>
              {pagination && (
                <p className="text-[10px] text-gray-500 font-mono tracking-wider mt-1.5 font-semibold">
                  HIỂN THỊ {movies.length} TRÊN TỔNG SỐ {pagination.totalItems} PHIM
                </p>
              )}
            </div>
          </div>

          {/* Quick toggle list controls for history view conditions */}
          {activeTab === "history" && watchHistory.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl text-xs font-bold border border-rose-500/20 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xoá Toàn Bộ Lịch Sử
            </button>
          )}

          {activeTab === "history" && watchHistory.length === 0 && (
            <div className="text-xs text-amber-500 font-semibold bg-amber-500/5 px-3 py-1.5 rounded-lg border border-amber-500/15">
              Bạn chưa xem bộ phim nào gần đây! Hãy bấm vào các bộ phim để thưởng thức.
            </div>
          )}
        </div>

        {/* Central main movie grid list panel */}
        {error ? (
          <div className="py-20 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-gray-200 font-black">Xung đột tín hiệu đường truyền API</p>
              <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">
                Nguồn máy chủ của KKPhim hiện đang nghỉ tải hoặc giới hạn lượt truy vấn tạm thời. Đừng lo lắng, hãy bấm thử lại hoặc chọn bộ lọc thể loại khác.
              </p>
            </div>
            <button
              onClick={() => handleSelectTab("phim-moi-cap-nhat")}
              className="px-5 py-2.5 bg-amber-500 text-black font-extrabold rounded-xl text-xs hover:bg-amber-400 cursor-pointer shadow-lg shadow-amber-500/10 active:scale-95 transition-all"
            >
              Mở lại Trang chủ
            </button>
          </div>
        ) : (
          <MovieGrid
            movies={movies}
            pathImage={pathImage}
            onSelectMovie={setSelectedMovieSlug}
            pagination={pagination}
            onPageChange={handlePageChange}
            isLoading={isLoading}
            isHistoryTab={activeTab === "history"}
            onRemoveFromHistory={handleRemoveFromHistory}
          />
        )}

      </main>

      {/* Global immersive movie details & Streaming video player Overlay drawer */}
      {selectedMovieSlug && (
        <MovieDetailModal
          movieSlug={selectedMovieSlug}
          onClose={() => setSelectedMovieSlug(null)}
          onAddToHistory={handleAddToHistory}
        />
      )}

      {/* Structured disclaimer website footer */}
      <Footer />
    </div>
  );
}
