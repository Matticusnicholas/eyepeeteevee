import type {
  XtreamCredentials,
  XtreamAuthResponse,
  Category,
  LiveStream,
  VODStream,
  SeriesInfo,
  SeriesDetails,
  EPGData,
  EPGProgram,
} from '@/types';

// Helper to proxy requests through our API to avoid CORS
function getProxyUrl(url: string): string {
  // Only proxy in browser environment
  if (typeof window !== 'undefined') {
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export class XtreamAPI {
  private serverUrl: string;
  private username: string;
  private password: string;

  constructor(credentials: XtreamCredentials) {
    // Normalize server URL - remove trailing slash
    this.serverUrl = credentials.serverUrl.replace(/\/$/, '');
    this.username = credentials.username;
    this.password = credentials.password;
  }

  private getBaseUrl(): string {
    return `${this.serverUrl}/player_api.php?username=${this.username}&password=${this.password}`;
  }

  private async fetchApi<T>(action?: string, params?: Record<string, string>): Promise<T> {
    let url = this.getBaseUrl();
    if (action) {
      url += `&action=${action}`;
    }
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url += `&${key}=${value}`;
      });
    }

    // Use proxy to avoid CORS
    const proxyUrl = getProxyUrl(url);
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    return response.json();
  }

  // Authentication
  async authenticate(): Promise<XtreamAuthResponse> {
    const response = await this.fetchApi<XtreamAuthResponse>();
    if (response.user_info?.auth !== 1) {
      throw new Error('Authentication failed');
    }
    return response;
  }

  // Live TV
  async getLiveCategories(): Promise<Category[]> {
    return this.fetchApi<Category[]>('get_live_categories');
  }

  async getLiveStreams(categoryId?: string): Promise<LiveStream[]> {
    const params = categoryId ? { category_id: categoryId } : undefined;
    return this.fetchApi<LiveStream[]>('get_live_streams', params);
  }

  // VOD
  async getVodCategories(): Promise<Category[]> {
    return this.fetchApi<Category[]>('get_vod_categories');
  }

  async getVodStreams(categoryId?: string): Promise<VODStream[]> {
    const params = categoryId ? { category_id: categoryId } : undefined;
    return this.fetchApi<VODStream[]>('get_vod_streams', params);
  }

  async getVodInfo(vodId: number): Promise<{ info: VODStream; movie_data: Record<string, unknown> }> {
    return this.fetchApi('get_vod_info', { vod_id: vodId.toString() });
  }

  // Series
  async getSeriesCategories(): Promise<Category[]> {
    return this.fetchApi<Category[]>('get_series_categories');
  }

  async getSeries(categoryId?: string): Promise<SeriesInfo[]> {
    const params = categoryId ? { category_id: categoryId } : undefined;
    return this.fetchApi<SeriesInfo[]>('get_series', params);
  }

  async getSeriesInfo(seriesId: number): Promise<SeriesDetails> {
    return this.fetchApi<SeriesDetails>('get_series_info', { series_id: seriesId.toString() });
  }

  // EPG
  async getEPG(streamId: number): Promise<{ epg_listings: EPGProgram[] }> {
    return this.fetchApi('get_short_epg', { stream_id: streamId.toString() });
  }

  async getFullEPG(streamId: number): Promise<{ epg_listings: EPGProgram[] }> {
    return this.fetchApi('get_simple_data_table', { stream_id: streamId.toString() });
  }

  // Get XMLTV EPG URL
  getXMLTVUrl(): string {
    return `${this.serverUrl}/xmltv.php?username=${this.username}&password=${this.password}`;
  }

  // Stream URLs - these go direct (no proxy needed for video)
  getLiveStreamUrl(streamId: number, format: 'ts' | 'm3u8' = 'm3u8'): string {
    return `${this.serverUrl}/live/${this.username}/${this.password}/${streamId}.${format}`;
  }

  getVodStreamUrl(streamId: number, extension: string = 'mp4'): string {
    return `${this.serverUrl}/movie/${this.username}/${this.password}/${streamId}.${extension}`;
  }

  getSeriesStreamUrl(streamId: number, extension: string = 'mp4'): string {
    return `${this.serverUrl}/series/${this.username}/${this.password}/${streamId}.${extension}`;
  }

  // Catchup/Timeshift
  getCatchupUrl(streamId: number, start: Date, duration: number): string {
    const startStr = start.toISOString().replace(/[-:]/g, '').split('.')[0];
    return `${this.serverUrl}/timeshift/${this.username}/${this.password}/${duration}/${startStr}/${streamId}.ts`;
  }
}

// Parse full XMLTV EPG data
export async function parseXMLTV(xmltvUrl: string): Promise<EPGData> {
  try {
    // Use proxy to avoid CORS
    const proxyUrl = getProxyUrl(xmltvUrl);
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      console.error('EPG fetch failed:', response.status);
      return {};
    }

    const xmlText = await response.text();

    // Check if we got valid XML
    if (!xmlText || !xmlText.includes('<tv')) {
      console.error('Invalid EPG data received');
      return {};
    }

    const { XMLParser } = await import('fast-xml-parser');
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const result = parser.parse(xmlText);
    const epgData: EPGData = {};

    const programmes = result?.tv?.programme || [];
    const programmeList = Array.isArray(programmes) ? programmes : [programmes];

    for (const prog of programmeList) {
      const channelId = prog['@_channel'];
      if (!channelId) continue;

      if (!epgData[channelId]) {
        epgData[channelId] = [];
      }

      const parseXMLTVDate = (dateStr: string): Date => {
        if (!dateStr) return new Date();
        // Format: 20231225120000 +0000
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        const hour = parseInt(dateStr.substring(8, 10)) || 0;
        const minute = parseInt(dateStr.substring(10, 12)) || 0;
        const second = parseInt(dateStr.substring(12, 14)) || 0;
        return new Date(Date.UTC(year, month, day, hour, minute, second));
      };

      epgData[channelId].push({
        id: `${channelId}-${prog['@_start']}`,
        title: prog.title?.['#text'] || prog.title || 'Unknown',
        description: prog.desc?.['#text'] || prog.desc || '',
        start: parseXMLTVDate(prog['@_start']),
        end: parseXMLTVDate(prog['@_stop']),
        channelId,
      });
    }

    return epgData;
  } catch (error) {
    console.error('Failed to parse XMLTV:', error);
    return {};
  }
}
