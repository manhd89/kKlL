/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Search, Film, Heart, ChevronDown, Menu, X, Play } from "lucide-react";
import { Genre, Country } from "../types";

interface HeaderProps {
  genres: Genre[];
  countries: Country[];
  activeTab: string; // e.g. 'phim-moi-cap-nhat', 'phim-le', 'phim-bo', 'genre', 'country', 'search', 'bookmarks'
  activeSubSlug: string; // the specific genre or country slug
  activeLabel: string; // e.g. "Hành động"
  favoriteCount: number;
  onSearch: (keyword: string) => void;
  onSelectTab: (tab: string, subSlug?: string, label?: string) => void;
}

export default function Header({
  genres,
  countries,
  activeTab,
  activeSubSlug,
  activeLabel,
  favoriteCount,
  onSearch,
  onSelectTab,
}: HeaderProps) {
  const [searchVal, setSearchVal] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<"genre" | "country" | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      onSearch(searchVal.trim());
      setIsMobileMenuOpen(false);
    }
  };

  const categories = [
    { slug: "phim-moi-cap-nhat", name: "Mới nhất" },
    { slug: "phim-le", name: "Phim Lẻ" },
    { slug: "phim-bo", name: "Phim Bộ" },
    { slug: "hoat-hinh", name: "Hoạt Hình" },
    { slug: "tv-shows", name: "TV Shows" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-app-bg-header border-b border-app-border backdrop-blur-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo */}
          <div 
            onClick={() => {
              setSearchVal("");
              onSelectTab("phim-moi-cap-nhat");
            }}
            className="flex items-center gap-2 cursor-pointer group shrink-0"
            id="app-logo"
          >
            <div className="w-10 h-10 bg-gradient-to-tr from-amber-500 to-rose-500 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-rose-500/10 group-hover:scale-105 transition-transform">
              <Play className="fill-white w-5 h-5 ml-0.5" />
            </div>
            <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-gray-900 to-amber-600 dark:from-white dark:via-gray-100 dark:to-amber-400 bg-clip-text text-transparent hidden sm:block">
              KK<span className="text-amber-500">PHIM</span>
            </span>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center space-x-1">
            {categories.map((cat) => (
              <button
                key={cat.slug}
                id={`nav-${cat.slug}`}
                onClick={() => {
                  setSearchVal("");
                  onSelectTab(cat.slug);
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === cat.slug
                    ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                    : "text-app-text-muted hover:text-app-text hover:bg-app-bg-input border border-transparent"
                }`}
              >
                {cat.name}
              </button>
            ))}

            {/* Genres Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setActiveDropdown("genre")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                id="genre-dropdown-trigger"
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-app-text-muted hover:text-app-text hover:bg-app-bg-input border border-transparent transition-colors cursor-pointer ${
                  activeTab === "genre" ? "text-amber-500 bg-amber-500/10 border border-amber-500/20" : ""
                }`}
              >
                Thể loại
                <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === "genre" ? "rotate-180" : ""}`} />
              </button>

              {activeDropdown === "genre" && (
                <div 
                  id="genre-dropdown-menu"
                  className="absolute top-full left-0 mt-1 w-64 max-h-[350px] overflow-y-auto bg-app-card border border-app-border rounded-xl shadow-2xl py-2 z-50 grid grid-cols-2 gap-1 px-2 scrollbar-thin scrollbar-thumb-app-border"
                >
                  {genres.map((g) => (
                    <button
                      key={g._id}
                      onClick={() => {
                        setSearchVal("");
                        onSelectTab("genre", g.slug, g.name);
                        setActiveDropdown(null);
                      }}
                      className={`text-left px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
                        activeTab === "genre" && activeSubSlug === g.slug
                          ? "bg-amber-500 text-black font-semibold"
                          : "text-app-text-muted hover:text-app-text hover:bg-app-bg-input"
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Countries Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setActiveDropdown("country")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                id="country-dropdown-trigger"
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-app-text-muted hover:text-app-text hover:bg-app-bg-input border border-transparent transition-colors cursor-pointer ${
                  activeTab === "country" ? "text-amber-500 bg-amber-500/10 border border-amber-500/20" : ""
                }`}
              >
                Quốc gia
                <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === "country" ? "rotate-180" : ""}`} />
              </button>

              {activeDropdown === "country" && (
                <div 
                  id="country-dropdown-menu"
                  className="absolute top-full left-0 mt-1 w-60 max-h-[350px] overflow-y-auto bg-app-card border border-app-border rounded-xl shadow-2xl py-2 z-50 scrollbar-thin"
                >
                  {countries.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => {
                        setSearchVal("");
                        onSelectTab("country", c.slug, c.name);
                        setActiveDropdown(null);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs rounded-md transition-colors cursor-pointer ${
                        activeTab === "country" && activeSubSlug === c.slug
                          ? "bg-amber-500 text-black font-semibold"
                          : "text-app-text-muted hover:text-app-text hover:bg-app-bg-input"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Search bar & Extras */}
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
              <input
                id="desktop-search-input"
                type="text"
                placeholder="Tìm phim, diễn viên..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="w-full bg-app-bg-input text-app-text pl-10 pr-4 py-2 rounded-xl text-sm border border-app-border hover:border-amber-500/40 focus:border-amber-500 focus:outline-none transition-colors"
              />
            </form>
          </div>

          <div className="flex items-center gap-2">
            {/* Bookmark button */}
            <button
              id="bookmark-btn"
              onClick={() => {
                setSearchVal("");
                onSelectTab("bookmarks");
              }}
              className={`relative p-2 rounded-xl cursor-pointer transition-all ${
                activeTab === "bookmarks"
                  ? "bg-rose-500/20 text-rose-500 border border-rose-500/30 shadow-md shadow-rose-500/10"
                  : "text-app-text-muted hover:text-rose-400 hover:bg-rose-500/5"
              }`}
              title="Danh sách yêu thích"
            >
              <Heart className={`w-5.5 h-5.5 ${activeTab === "bookmarks" ? "fill-rose-500" : ""}`} />
              {favoriteCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center leading-none animate-pulse">
                  {favoriteCount}
                </span>
              )}
            </button>

            {/* Mobile menu trigger */}
            <button
              id="mobile-menu-trigger"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 lg:hidden rounded-lg bg-app-bg-input text-app-text-muted hover:text-app-text transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div 
          id="mobile-nav-panel"
          className="lg:hidden bg-app-card border-t border-app-border max-h-[85vh] overflow-y-auto py-4 px-4 space-y-4 transition-colors duration-300"
        >
          {/* Mobile search bar */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
            <input
              id="mobile-search-input"
              type="text"
              placeholder="Tìm phim, diễn viên..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full bg-app-bg-input text-app-text pl-10 pr-4 py-2 rounded-xl text-sm border border-app-border focus:border-amber-500 focus:outline-none"
            />
          </form>

          {/* Quick Categories */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider px-2 mb-1">Danh mục</p>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => {
                    setSearchVal("");
                    onSelectTab(cat.slug);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2 text-left rounded-lg text-xs font-semibold cursor-pointer ${
                    activeTab === cat.slug
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-app-bg-input text-app-text-muted hover:text-app-text"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Genres */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider px-2 mb-1">Thể loại</p>
            <div className="grid grid-cols-3 gap-1 px-1">
              {genres.slice(0, 15).map((g) => (
                <button
                  key={g._id}
                  onClick={() => {
                    setSearchVal("");
                    onSelectTab("genre", g.slug, g.name);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`text-[11px] py-1 px-2 rounded-md truncate cursor-pointer ${
                    activeTab === "genre" && activeSubSlug === g.slug
                      ? "bg-amber-500 text-black font-semibold"
                      : "bg-app-bg-input text-app-text-muted hover:text-app-text"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Countries */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider px-2 mb-1">Quốc gia</p>
            <div className="grid grid-cols-3 gap-1 px-1">
              {countries.slice(0, 12).map((c) => (
                <button
                  key={c._id}
                  onClick={() => {
                    setSearchVal("");
                    onSelectTab("country", c.slug, c.name);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`text-[11px] py-1 px-2 rounded-md truncate cursor-pointer ${
                    activeTab === "country" && activeSubSlug === c.slug
                      ? "bg-amber-500 text-black font-semibold"
                      : "bg-app-bg-input text-app-text-muted hover:text-app-text"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
