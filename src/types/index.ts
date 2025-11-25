// IPTV Types for Xtream Codes API and M3U

export interface XtreamCredentials {
  serverUrl: string;
  username: string;
  password: string;
  type: 'xtream';
}

export interface M3UCredentials {
  m3uUrl: string;
  epgUrl?: string;
  type: 'm3u';
}

export type IPTVCredentials = XtreamCredentials | M3UCredentials;

export interface XtreamUserInfo {
  username: string;
  password: string;
  message: string;
  auth: number;
  status: string;
  exp_date: string;
  is_trial: string;
  active_cons: string;
  created_at: string;
  max_connections: string;
  allowed_output_formats: string[];
}

export interface XtreamServerInfo {
  url: string;
  port: string;
  https_port: string;
  server_protocol: string;
  rtmp_port: string;
  timezone: string;
  timestamp_now: number;
  time_now: string;
}

export interface XtreamAuthResponse {
  user_info: XtreamUserInfo;
  server_info: XtreamServerInfo;
}

export interface Category {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export interface LiveStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string;
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
}

export interface VODStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  rating: string;
  rating_5based: number;
  added: string;
  category_id: string;
  container_extension: string;
  custom_sid: string;
  direct_source: string;
}

export interface SeriesInfo {
  num: number;
  name: string;
  series_id: number;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  releaseDate: string;
  last_modified: string;
  rating: string;
  rating_5based: number;
  backdrop_path: string[];
  youtube_trailer: string;
  episode_run_time: string;
  category_id: string;
}

export interface Episode {
  id: string;
  episode_num: number;
  title: string;
  container_extension: string;
  info: {
    movie_image: string;
    plot: string;
    releasedate: string;
    rating: number;
    duration_secs: number;
    duration: string;
  };
  custom_sid: string;
  added: string;
  season: number;
  direct_source: string;
}

export interface SeriesDetails {
  seasons: Record<string, { season_number: number; name: string; episode_count: number; cover?: string }>;
  info: SeriesInfo;
  episodes: Record<string, Episode[]>;
}

export interface EPGProgram {
  id: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  channelId: string;
}

export interface EPGData {
  [channelId: string]: EPGProgram[];
}

export interface M3UChannel {
  name: string;
  logo: string;
  group: string;
  url: string;
  tvgId: string;
  tvgName: string;
}

export interface MultiScreenConfig {
  id: string;
  name: string;
  rows: number;
  cols: number;
  icon: string;
}

export interface ActiveStream {
  streamId: number;
  name: string;
  url: string;
  type: 'live' | 'vod' | 'series';
  logo?: string;
}

export interface FavoriteChannel {
  streamId: number;
  name: string;
  type: 'live' | 'vod' | 'series';
  logo?: string;
  addedAt: number;
}

export interface WatchHistoryItem {
  streamId: number;
  name: string;
  type: 'live' | 'vod' | 'series';
  logo?: string;
  watchedAt: number;
  progress?: number;
}
