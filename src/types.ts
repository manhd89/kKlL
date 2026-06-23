/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Movie {
  _id: string;
  name: string;
  origin_name: string;
  slug: string;
  thumb_url: string;
  poster_url: string;
  year: number;
  time?: string;
  episode_current?: string;
  quality?: string;
  lang?: string;
}

export interface Genre {
  _id: string;
  name: string;
  slug: string;
}

export interface Country {
  _id: string;
  name: string;
  slug: string;
}

export interface Pagination {
  totalItems: number;
  totalItemsPerPage: number;
  currentPage: number;
  totalPages: number;
}

export interface MovieDetail {
  _id: string;
  name: string;
  origin_name: string;
  slug: string;
  content: string;
  thumb_url: string;
  poster_url: string;
  type: string;
  status: string;
  is_copyright: boolean;
  sub_docquyen: boolean;
  chieurap: boolean;
  trailer_url: string;
  time: string;
  episode_current: string;
  episode_total: string;
  quality: string;
  lang: string;
  notify: string;
  showtimes: string;
  year: number;
  view: number;
  actor: string[];
  director: string[];
  category: { id: string; name: string; slug: string }[];
  country: { id: string; name: string; slug: string }[];
}

export interface EpisodeItem {
  name: string;
  slug: string;
  filename: string;
  link_embed: string;
  link_m3u8: string;
}

export interface MovieEpisode {
  server_name: string;
  server_data: EpisodeItem[];
}

export interface MovieDetailResponse {
  status: boolean;
  msg?: string;
  movie: MovieDetail;
  episodes: MovieEpisode[];
}
