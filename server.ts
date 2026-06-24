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
      `${PHIMAPI_BASE}/the-loai`
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
      `${PHIMAPI_BASE}/quoc-gia`
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
        `${PHIMAPI_BASE}/danh-sach/phim-moi-cap-nhat-v3?page=${page}`
      ];
    } else {
      urls = [
        `${PHIMAPI_BASE}/v1/api/danh-sach/${slug}?page=${page}`
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
      `${PHIMAPI_BASE}/v1/api/the-loai/${slug}?page=${page}`
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
      `${PHIMAPI_BASE}/v1/api/quoc-gia/${slug}?page=${page}`
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
      `${PHIMAPI_BASE}/v1/api/tim-kiem?keyword=${encodedKeyword}&page=${page}`
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
      `${PHIMAPI_BASE}/phim/${slug}`
    ];
    const { data } = await fetchWithFallback(urls);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to load details for ${slug}`, details: err.message });
  }
});

// 8. Proxy & Clean HLS (.m3u8) playlists to remove ads and clean URLs
interface PlaylistLine {
  text: string;
  type: "discontinuity" | "tag" | "uri" | "empty";
}

function parsePlaylistLines(playlistText: string): PlaylistLine[] {
  const rawLines = playlistText.split(/\r?\n/);
  return rawLines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      return { text: line, type: "empty" };
    }
    if (trimmed.startsWith("#EXT-X-DISCONTINUITY")) {
      return { text: line, type: "discontinuity" };
    }
    if (trimmed.startsWith("#")) {
      return { text: line, type: "tag" };
    }
    return { text: line, type: "uri" };
  });
}

function cleanM3u8Ads(playlistText: string, baseUrl: string): string {
  if (!playlistText.includes("#EXTINF") && !playlistText.includes("#EXT-X-STREAM-INF")) {
    return playlistText;
  }

  const parsedLines = parsePlaylistLines(playlistText);
  const toRemove = new Array(parsedLines.length).fill(false);
  let blockCount = 0;

  // 1. Gather all discontinuity positions
  const discoIndices: number[] = [];
  for (let idx = 0; idx < parsedLines.length; idx++) {
    if (parsedLines[idx].type === "discontinuity") {
      discoIndices.push(idx);
    }
  }

  // 2. Identify ad blocks of 5 to 20 segments between discontinuities
  for (let j = 0; j < discoIndices.length - 1; j++) {
    const startDiscoIdx = discoIndices[j];
    const endDiscoIdx = discoIndices[j + 1];

    let uriCount = 0;
    for (let k = startDiscoIdx + 1; k < endDiscoIdx; k++) {
      if (parsedLines[k].type === "uri") {
        uriCount++;
      }
    }

    if (uriCount >= 5 && uriCount <= 20) {
      blockCount++;
      console.log(`[M3U8 Proxy AdBlocker] Block #${blockCount}: Found ${uriCount} ad segments between discontinuities. Removing range [${startDiscoIdx}...${endDiscoIdx}].`);
      for (let k = startDiscoIdx; k <= endDiscoIdx; k++) {
        toRemove[k] = true;
      }
    }
  }

  // 3. Build final string, resolving and cleaning URLs
  const resultLines: string[] = [];
  let cleanedUrlsCount = 0;

  for (let idx = 0; idx < parsedLines.length; idx++) {
    if (toRemove[idx]) {
      continue;
    }

    const line = parsedLines[idx];
    if (line.type === "uri") {
      const urlText = line.text.trim();
      try {
        let absUrl = new URL(urlText, baseUrl).toString();

        // Strip /convertv1,2,3,4,5,6... from URLs
        if (/\/convertv\d+/i.test(absUrl) || absUrl.includes("/convertv")) {
          const originalUrl = absUrl;
          absUrl = absUrl.replace(/\/convertv\d+/gi, "");
          absUrl = absUrl.replace(/convertv\d+\//gi, "");
          cleanedUrlsCount++;
          console.log(`[M3U8 Proxy AdBlocker] Cleaned convertv path: ${originalUrl} -> ${absUrl}`);
        }

        // If it's a sub-playlist (.m3u8), proxy it too so its segments can be filtered
        if (absUrl.toLowerCase().includes(".m3u8")) {
          const proxiedUrl = `/api/proxy-m3u8?url=${encodeURIComponent(absUrl)}`;
          resultLines.push(proxiedUrl);
        } else {
          resultLines.push(absUrl);
        }
      } catch (e) {
        resultLines.push(line.text);
      }
    } else {
      resultLines.push(line.text);
    }
  }

  if (blockCount > 0) {
    console.log(`[M3U8 Proxy AdBlocker] Total removed ad blocks: ${blockCount}`);
  }
  if (cleanedUrlsCount > 0) {
    console.log(`[M3U8 Proxy AdBlocker] Total cleaned convertv URLs: ${cleanedUrlsCount}`);
  }

  return resultLines.join("\n");
}

app.get("/api/proxy-m3u8", async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).send("Missing 'url' query parameter");
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch remote m3u8 playlist: ${response.statusText}`);
    }

    const playlistText = await response.text();
    const cleanedPlaylist = cleanM3u8Ads(playlistText, targetUrl);

    res.setHeader("Content-Type", "application/x-mpegURL");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(cleanedPlaylist);
  } catch (err: any) {
    console.error("Proxy M3U8 Error:", err.message || err);
    res.status(500).send(`Proxy Error: ${err.message}`);
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
