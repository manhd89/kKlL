import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dns from "dns";

// Enable DNS caching or lookups
dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = 3000;

app.use(express.json());

// API Fallback Hosts
const PHIMAPI_BASE = "https://phimapi.com";
const OPHIM_BASE = "https://ophim1.com";

// Helper function to fetch with timeout and fallbacks
async function fetchWithFallback(endpoints: string[]) {
  let lastError: any = null;
  
  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout
      
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7"
        }
      });
      clearTimeout(id);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status} from ${url}`);
      }
      
      const data = await response.json();
      return { data, sourceUrl: url };
    } catch (err: any) {
      console.warn(`Failed to fetch from ${url}:`, err.message || err);
      lastError = err;
    }
  }
  
  throw lastError || new Error("All fallback sources failed");
}

// 1. Get genre list
app.get("/api/genres", async (req, res) => {
  try {
    const urls = [
      `${PHIMAPI_BASE}/the-loai`,
      `${OPHIM_BASE}/v1/api/the-loai`,
      `${OPHIM_BASE}/api/v1/the-loai`
    ];
    const { data } = await fetchWithFallback(urls);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load genres", details: err.message });
  }
});

// 2. Get countries list
app.get("/api/countries", async (req, res) => {
  try {
    const urls = [
      `${PHIMAPI_BASE}/quoc-gia`,
      `${OPHIM_BASE}/v1/api/quoc-gia`,
      `${OPHIM_BASE}/api/v1/quoc-gia`
    ];
    const { data } = await fetchWithFallback(urls);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load countries", details: err.message });
  }
});

// 3. Get film list by list slug (e.g., phim-moi-cap-nhat, phim-le, phim-bo, hoat-hinh, tv-shows)
app.get("/api/movies/list/:slug", async (req, res) => {
  const { slug } = req.params;
  const page = req.query.page || "1";
  try {
    let urls: string[] = [];
    if (slug === "phim-moi-cap-nhat" || slug === "phim-moi-cap-nhat-v3") {
      urls = [
        `${PHIMAPI_BASE}/danh-sach/phim-moi-cap-nhat-v3?page=${page}`,
        `${OPHIM_BASE}/api/v1/danh-sach/phim-moi-cap-nhat?page=${page}`,
        `${OPHIM_BASE}/v1/api/danh-sach/phim-moi-cap-nhat?page=${page}`
      ];
    } else {
      urls = [
        `${PHIMAPI_BASE}/v1/api/danh-sach/${slug}?page=${page}`,
        `${OPHIM_BASE}/api/v1/danh-sach/${slug}?page=${page}`,
        `${OPHIM_BASE}/v1/api/danh-sach/${slug}?page=${page}`
      ];
    }
    
    const { data } = await fetchWithFallback(urls);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to load list ${slug}`, details: err.message });
  }
});

// 4. Get movies by Genre slug
app.get("/api/movies/genre/:slug", async (req, res) => {
  const { slug } = req.params;
  const page = req.query.page || "1";
  try {
    const urls = [
      `${PHIMAPI_BASE}/v1/api/the-loai/${slug}?page=${page}`,
      `${OPHIM_BASE}/v1/api/the-loai/${slug}?page=${page}`,
      `${OPHIM_BASE}/api/v1/the-loai/${slug}?page=${page}`
    ];
    const { data } = await fetchWithFallback(urls);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to load movies of genre ${slug}`, details: err.message });
  }
});

// 5. Get movies by Country slug
app.get("/api/movies/country/:slug", async (req, res) => {
  const { slug } = req.params;
  const page = req.query.page || "1";
  try {
    const urls = [
      `${PHIMAPI_BASE}/v1/api/quoc-gia/${slug}?page=${page}`,
      `${OPHIM_BASE}/v1/api/quoc-gia/${slug}?page=${page}`,
      `${OPHIM_BASE}/api/v1/quoc-gia/${slug}?page=${page}`
    ];
    const { data } = await fetchWithFallback(urls);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to load movies of country ${slug}`, details: err.message });
  }
});

// 6. Search movies
app.get("/api/movies/search", async (req, res) => {
  const keyword = req.query.keyword || "";
  const page = req.query.page || "1";
  if (!keyword) {
    return res.json({ status: "success", items: [], pagination: { currentPage: 1, totalPages: 1 } });
  }
  
  try {
    const encodedKeyword = encodeURIComponent(String(keyword));
    const urls = [
      `${PHIMAPI_BASE}/v1/api/tim-kiem?keyword=${encodedKeyword}&page=${page}`,
      `${OPHIM_BASE}/v1/api/tim-kiem?keyword=${encodedKeyword}&page=${page}`,
      `${OPHIM_BASE}/api/v1/tim-kiem?keyword=${encodedKeyword}&page=${page}`
    ];
    const { data } = await fetchWithFallback(urls);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to search movies", details: err.message });
  }
});

// 7. Get movie details by slug
app.get("/api/movies/detail/:slug", async (req, res) => {
  const { slug } = req.params;
  try {
    const urls = [
      `${PHIMAPI_BASE}/phim/${slug}`,
      `${OPHIM_BASE}/phim/${slug}`,
      `${OPHIM_BASE}/api/v1/phim/${slug}`,
      `${OPHIM_BASE}/v1/api/phim/${slug}`
    ];
    const { data } = await fetchWithFallback(urls);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to load details for ${slug}`, details: err.message });
  }
});

// Setup Vite Dev server or Serve build files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}/`);
  });
}

startServer();
