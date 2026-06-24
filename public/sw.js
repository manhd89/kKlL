/**
 * Service Worker for HLS Proxy and Ad Blocker
 * Intercepts .m3u8 playlists, filters out ad blocks, and cleans convertv path segments.
 */

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function parsePlaylistLines(playlistText) {
  const rawLines = playlistText.split(/\r?\n/);
  return rawLines.map((line) => {
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

function cleanM3u8Ads(playlistText, baseUrl) {
  if (!playlistText.includes("#EXTINF") && !playlistText.includes("#EXT-X-STREAM-INF")) {
    return playlistText;
  }

  const parsedLines = parsePlaylistLines(playlistText);
  const toRemove = new Array(parsedLines.length).fill(false);
  let blockCount = 0;

  // 1. Gather all discontinuity positions
  const discoIndices = [];
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
      console.log(`[SW AdBlocker] Block #${blockCount}: Found ${uriCount} ad segments between discontinuities. Removing range [${startDiscoIdx}...${endDiscoIdx}].`);
      for (let k = startDiscoIdx; k <= endDiscoIdx; k++) {
        toRemove[k] = true;
      }
    }
  }

  // 3. Build final string, resolving and cleaning URLs
  const resultLines = [];
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
          absUrl = absUrl.replace(/\/convertv\d+/gi, "");
          absUrl = absUrl.replace(/convertv\d+\//gi, "");
        }

        // If it's a sub-playlist (.m3u8), proxy it too so its segments can be filtered
        if (absUrl.toLowerCase().includes(".m3u8")) {
          const proxiedUrl = `/proxy-hls/?url=${encodeURIComponent(absUrl)}`;
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
    console.log(`[SW AdBlocker] Total removed ad blocks: ${blockCount}`);
  }

  return resultLines.join("\n");
}

async function handleProxyHls(targetUrl, request) {
  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*"
      }
    });

    if (!response.ok) {
      return new Response(`Failed to fetch remote m3u8 playlist: ${response.statusText}`, {
        status: response.status,
        headers: { "Content-Type": "text/plain" }
      });
    }

    const playlistText = await response.text();
    const cleanedPlaylist = cleanM3u8Ads(playlistText, targetUrl);

    return new Response(cleanedPlaylist, {
      status: 200,
      headers: {
        "Content-Type": "application/x-mpegURL",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
  } catch (err) {
    console.error("SW Proxy Error:", err);
    return new Response(`Proxy Error: ${err.message}`, {
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === "/proxy-hls/") {
    const targetUrl = url.searchParams.get("url");
    if (targetUrl) {
      event.respondWith(handleProxyHls(targetUrl, event.request));
    }
  } else if (/\/convertv\d+/i.test(event.request.url) || event.request.url.includes("/convertv")) {
    const cleanedUrl = event.request.url
      .replace(/\/convertv\d+/gi, "")
      .replace(/convertv\d+\//gi, "");
    console.log(`[SW AdBlocker] Intercepted convertv request: ${event.request.url} -> ${cleanedUrl}`);
    event.respondWith(fetch(new Request(cleanedUrl, event.request)));
  }
});
