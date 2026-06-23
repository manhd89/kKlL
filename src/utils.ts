/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Normalizes movie thumbnail/poster URL based on custom path values
 */
export function getMovieImageUrl(url: string, pathImage?: string): string {
  if (!url) {
    return "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=60"; // beautiful fallback
  }
  
  let cleanUrl = url.trim();

  // 1. If it's already an absolute URL (starts with http:// or https:// or //)
  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
    return cleanUrl;
  }
  if (cleanUrl.startsWith("//")) {
    return `https:${cleanUrl}`;
  }

  // 2. Prepare the base directory path safely
  let base = (pathImage || "").trim();
  if (!base) {
    base = "https://img.phimapi.com/uploads/movies/";
  }

  // Ensure base has a valid scheme (http:// or https://)
  if (base.startsWith("//")) {
    base = `https:${base}`;
  } else if (!base.startsWith("http://") && !base.startsWith("https://")) {
    base = `https://${base}`;
  }

  // Parse origin and clean host safely
  let hostOrigin = "https://img.phimapi.com";
  try {
    const urlObj = new URL(base);
    hostOrigin = urlObj.origin;
  } catch (err) {
    // fallback if base is invalid or unparseable
  }

  // 3. If the relative URL actually contains a domain name or host prefix
  if (/^(img\.)?(phimapi\.com|ophim\d*|kkphim)/i.test(cleanUrl)) {
    return `https://${cleanUrl}`;
  }

  // Remove leading slash from the relative path if any
  if (cleanUrl.startsWith("/")) {
    cleanUrl = cleanUrl.substring(1);
  }

  // 4. If the relative URL contains "uploads/" or "upload/"
  if (cleanUrl.includes("uploads/")) {
    const relativePart = cleanUrl.substring(cleanUrl.indexOf("uploads/"));
    return `${hostOrigin}/${relativePart}`;
  } else if (cleanUrl.includes("upload/")) {
    const relativePart = cleanUrl.substring(cleanUrl.indexOf("upload/"));
    return `${hostOrigin}/${relativePart}`;
  }

  // 5. If it includes "movies/", prepend uploads/
  if (cleanUrl.includes("movies/")) {
    const relativePart = cleanUrl.substring(cleanUrl.indexOf("movies/"));
    return `${hostOrigin}/uploads/${relativePart}`;
  }

  // 6. Default combine behavior:
  // If base already contains "uploads/movies", just join them
  if (base.includes("/uploads/movies")) {
    return base.endsWith("/") ? `${base}${cleanUrl}` : `${base}/${cleanUrl}`;
  }

  // Otherwise construct a clean subfolder path using the safe origin
  return `${hostOrigin}/uploads/movies/${cleanUrl}`;
}

/**
 * Standardize category names for badges
 */
export function getQualityColor(quality: string | undefined): string {
  const q = (quality || "").toLowerCase();
  if (q.includes("hd") || q.includes("1080")) {
    return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  }
  if (q.includes("cam") || q.includes("ts")) {
    return "bg-rose-500/20 text-rose-300 border-rose-500/40";
  }
  return "bg-sky-500/20 text-sky-300 border-sky-500/40";
}
