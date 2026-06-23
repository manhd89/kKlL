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
import { Film, Sparkles, BookMarked, ThumbsUp } from "lucide-react";

export default function App() {
  // Navigation & Filter states
  const [activeTab, setActiveTab] = useState("phim-moi-cap-nhat"); // e.g. 'phim-moi-cap-nhat', 'phim-le', 'phim-bo', 'genre', 'country', 'search', 'bookmarks'
  const [activeSubSlug, setActiveSubSlug] = useState(""); // Genre slug or Country slug
  const [activeLabel, setActiveLabel] = useState(""); // UI title label (e.g. "Hành động")
  const [currentPage, setCurrentPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState("");

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
  const [selectedMovieSlug, setSelectedMovieSlug] = useState<string | null>(null);

  // Bookmarks/Favorites serialization persistence
  const [favoriteMovies, setFavoriteMovies] = useState<Movie[]>([]);

  // Load static collections on mount
  useEffect(() => {
    // 1. Fetch auxiliary genres + countries dynamically from local proxy
    const fetchMetadata = async () => {
      try {
        const [genresRes, countriesRes] = await Promise.all([
          fetch("/api/genres"),
          fetch("/api/countries"),
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

    // 2. Fetch bookmarks list from local cache
    const storedFavorites = localStorage.getItem("kkphim_my_favorites_list");
    if (storedFavorites) {
      try {
        setFavoriteMovies(JSON.parse(storedFavorites));
      } catch (e) {
        console.error("Failed load local storage bookmarks list", e);
      }
    }
  }, []);

  // Sync favorites back to localStorage whenever it changes
  const saveFavorites = (list: Movie[]) => {
    setFavoriteMovies(list);
    localStorage.setItem("kkphim_my_favorites_list", JSON.stringify(list));
  };

  // Movie list loader trigger based on filters
  useEffect(() => {
    // If active tab is bookmarks, we don't query remote database
    if (activeTab === "bookmarks") {
      setMovies(favoriteMovies);
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

        const res = await fetch(fetchUrl);
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
          const pagin = data.pagination || data.data?.pagination;
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
  }, [activeTab, activeSubSlug, currentPage, searchKeyword, favoriteMovies.length]);

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

  // Toggle saving movie item on local Favorites array
  const handleToggleFavorite = (e: React.MouseEvent, movie: Movie) => {
    e.stopPropagation(); // prevent trigger card details modals opening
    
    const exists = favoriteMovies.find((f) => f.slug === movie.slug);
    let updated: Movie[] = [];
    if (exists) {
      updated = favoriteMovies.filter((f) => f.slug !== movie.slug);
    } else {
      updated = [movie, ...favoriteMovies];
    }
    saveFavorites(updated);
  };

  const handleToggleFavoriteInModal = (movieSlugStr: string) => {
    const exists = favoriteMovies.find((f) => f.slug === movieSlugStr);
    let updated: Movie[] = [];
    if (exists) {
      updated = favoriteMovies.filter((f) => f.slug !== movieSlugStr);
    } else {
      // Find film in active array list
      const originalMovie = movies.find((m) => m.slug === movieSlugStr);
      if (originalMovie) {
        updated = [originalMovie, ...favoriteMovies];
      } else {
        // If it was selected outside current list, construct stub
        const mockMovieItem: Movie = {
          _id: movieSlugStr,
          name: movieSlugStr.replace(/-/g, " "),
          origin_name: "",
          slug: movieSlugStr,
          thumb_url: "",
          poster_url: "",
          year: new Date().getFullYear(),
        };
        updated = [mockMovieItem, ...favoriteMovies];
      }
    }
    saveFavorites(updated);
  };

  const favoritesSlugs = favoriteMovies.map((f) => f.slug);

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
    if (activeTab === "bookmarks") return "Phim Bạn Yêu Thích";
    return "Danh Sách Phim";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 font-sans flex flex-col">
      {/* Dynamic Header Component */}
      <Header
        genres={genres}
        countries={countries}
        activeTab={activeTab}
        activeSubSlug={activeSubSlug}
        activeLabel={activeLabel}
        favoriteCount={favoriteMovies.length}
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
            favorites={favoritesSlugs}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {/* Categories / Genres header label panel */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-900 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              {activeTab === "bookmarks" ? (
                <BookMarked className="w-5.5 h-5.5" />
              ) : (
                <Film className="w-5.5 h-5.5" />
              )}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-100 tracking-tight leading-none uppercase">
                {getSectionTitle()}
              </h2>
              {pagination && (
                <p className="text-[10px] text-gray-500 font-mono tracking-wider mt-1.5 font-semibold">
                  HIỂN THỊ {movies.length} TRÊN TỔNG SỐ {pagination.totalItems} PHIM
                </p>
              )}
            </div>
          </div>

          {/* Quick toggle list controls for favorites view empty conditions */}
          {activeTab === "bookmarks" && favoriteMovies.length === 0 && (
            <div className="text-xs text-rose-400 font-medium">
              Chưa lưu phim nào! Hãy click biểu tượng Trái Tim ❤️ ở mỗi thẻ phim để thêm.
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
            favorites={favoritesSlugs}
            onToggleFavorite={handleToggleFavorite}
            pagination={pagination}
            onPageChange={handlePageChange}
            isLoading={isLoading}
          />
        )}

      </main>

      {/* Global immersive movie details & Streaming video player Overlay drawer */}
      {selectedMovieSlug && (
        <MovieDetailModal
          movieSlug={selectedMovieSlug}
          onClose={() => setSelectedMovieSlug(null)}
          isFavorite={favoritesSlugs.includes(selectedMovieSlug)}
          onToggleFavorite={() => handleToggleFavoriteInModal(selectedMovieSlug)}
        />
      )}

      {/* Structured disclaimer website footer */}
      <Footer />
    </div>
  );
}
