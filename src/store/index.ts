import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  IPTVCredentials,
  XtreamCredentials,
  M3UCredentials,
  Category,
  LiveStream,
  VODStream,
  SeriesInfo,
  EPGData,
  ActiveStream,
  FavoriteChannel,
  WatchHistoryItem,
  MultiScreenConfig,
} from '@/types';
import { XtreamAPI, parseXMLTV } from '@/lib/xtream-api';
import { fetchAndParseM3U } from '@/lib/m3u-parser';

interface IPTVState {
  // Auth
  credentials: IPTVCredentials | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Data
  liveCategories: Category[];
  liveStreams: LiveStream[];
  vodCategories: Category[];
  vodStreams: VODStream[];
  seriesCategories: Category[];
  series: SeriesInfo[];
  epgData: EPGData;

  // UI State
  activeTab: 'live' | 'vod' | 'series' | 'favorites';
  selectedCategory: string | null;
  searchQuery: string;

  // Player State
  activeStreams: ActiveStream[];
  multiScreenConfig: MultiScreenConfig;
  isFullscreen: boolean;

  // Recording
  isRecording: boolean;
  recordingBuffer: Blob[];

  // User Data
  favorites: FavoriteChannel[];
  watchHistory: WatchHistoryItem[];

  // Actions
  login: (credentials: IPTVCredentials) => Promise<void>;
  logout: () => void;
  refreshData: () => Promise<void>;
  refreshEPG: () => Promise<void>;

  setActiveTab: (tab: 'live' | 'vod' | 'series' | 'favorites') => void;
  setSelectedCategory: (categoryId: string | null) => void;
  setSearchQuery: (query: string) => void;

  playStream: (stream: ActiveStream, index?: number) => void;
  stopStream: (index: number) => void;
  setMultiScreenConfig: (config: MultiScreenConfig) => void;
  toggleFullscreen: () => void;

  addToFavorites: (channel: FavoriteChannel) => void;
  removeFromFavorites: (streamId: number) => void;
  addToHistory: (item: WatchHistoryItem) => void;

  startRecording: () => void;
  stopRecording: () => void;
  addToRecordingBuffer: (blob: Blob) => void;
  downloadRecording: () => void;
}

export const MULTI_SCREEN_CONFIGS: MultiScreenConfig[] = [
  { id: 'single', name: 'Single', rows: 1, cols: 1, icon: '⬛' },
  { id: 'pip', name: 'Picture in Picture', rows: 1, cols: 1, icon: '🔲' },
  { id: '2x1', name: 'Side by Side', rows: 1, cols: 2, icon: '⬛⬛' },
  { id: '2x2', name: '2x2 Grid', rows: 2, cols: 2, icon: '🔲' },
  { id: '3x3', name: '3x3 Grid', rows: 3, cols: 3, icon: '⊞' },
  { id: '1+3', name: '1 Large + 3 Small', rows: 2, cols: 2, icon: '🔳' },
];

export const useIPTVStore = create<IPTVState>()(
  persist(
    (set, get) => ({
      // Initial State
      credentials: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      liveCategories: [],
      liveStreams: [],
      vodCategories: [],
      vodStreams: [],
      seriesCategories: [],
      series: [],
      epgData: {},

      activeTab: 'live',
      selectedCategory: null,
      searchQuery: '',

      activeStreams: [],
      multiScreenConfig: MULTI_SCREEN_CONFIGS[0],
      isFullscreen: false,

      isRecording: false,
      recordingBuffer: [],

      favorites: [],
      watchHistory: [],

      // Auth Actions
      login: async (credentials: IPTVCredentials) => {
        set({ isLoading: true, error: null });

        try {
          if (credentials.type === 'xtream') {
            const api = new XtreamAPI(credentials);
            await api.authenticate();

            // Fetch all data
            const [liveCategories, liveStreams, vodCategories, vodStreams, seriesCategories, series] =
              await Promise.all([
                api.getLiveCategories().catch(() => []),
                api.getLiveStreams().catch(() => []),
                api.getVodCategories().catch(() => []),
                api.getVodStreams().catch(() => []),
                api.getSeriesCategories().catch(() => []),
                api.getSeries().catch(() => []),
              ]);

            set({
              credentials,
              isAuthenticated: true,
              isLoading: false,
              liveCategories,
              liveStreams,
              vodCategories,
              vodStreams,
              seriesCategories,
              series,
            });

            // Fetch EPG in background
            get().refreshEPG();
          } else {
            // M3U Login
            const { categories, streams } = await fetchAndParseM3U(credentials.m3uUrl);

            set({
              credentials,
              isAuthenticated: true,
              isLoading: false,
              liveCategories: categories,
              liveStreams: streams,
              vodCategories: [],
              vodStreams: [],
              seriesCategories: [],
              series: [],
            });

            // Fetch EPG if provided
            if (credentials.epgUrl) {
              get().refreshEPG();
            }
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
          });
          throw error;
        }
      },

      logout: () => {
        set({
          credentials: null,
          isAuthenticated: false,
          liveCategories: [],
          liveStreams: [],
          vodCategories: [],
          vodStreams: [],
          seriesCategories: [],
          series: [],
          epgData: {},
          activeStreams: [],
        });
      },

      refreshData: async () => {
        const { credentials } = get();
        if (!credentials) return;

        set({ isLoading: true });

        try {
          if (credentials.type === 'xtream') {
            const api = new XtreamAPI(credentials);
            const [liveCategories, liveStreams, vodCategories, vodStreams, seriesCategories, series] =
              await Promise.all([
                api.getLiveCategories().catch(() => []),
                api.getLiveStreams().catch(() => []),
                api.getVodCategories().catch(() => []),
                api.getVodStreams().catch(() => []),
                api.getSeriesCategories().catch(() => []),
                api.getSeries().catch(() => []),
              ]);

            set({
              liveCategories,
              liveStreams,
              vodCategories,
              vodStreams,
              seriesCategories,
              series,
              isLoading: false,
            });
          } else {
            const { categories, streams } = await fetchAndParseM3U(credentials.m3uUrl);
            set({
              liveCategories: categories,
              liveStreams: streams,
              isLoading: false,
            });
          }
        } catch (error) {
          set({ isLoading: false, error: 'Failed to refresh data' });
        }
      },

      refreshEPG: async () => {
        const { credentials } = get();
        if (!credentials) return;

        try {
          let epgUrl: string | undefined;

          if (credentials.type === 'xtream') {
            const api = new XtreamAPI(credentials);
            epgUrl = api.getXMLTVUrl();
          } else if (credentials.epgUrl) {
            epgUrl = credentials.epgUrl;
          }

          if (epgUrl) {
            const epgData = await parseXMLTV(epgUrl);
            set({ epgData });
          }
        } catch (error) {
          console.error('Failed to fetch EPG:', error);
        }
      },

      // UI Actions
      setActiveTab: (tab) => set({ activeTab: tab, selectedCategory: null }),
      setSelectedCategory: (categoryId) => set({ selectedCategory: categoryId }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      // Player Actions
      playStream: (stream, index = 0) => {
        const { activeStreams, multiScreenConfig } = get();
        const maxStreams = multiScreenConfig.rows * multiScreenConfig.cols;
        const newStreams = [...activeStreams];

        if (index >= maxStreams) index = 0;

        // Ensure array is large enough
        while (newStreams.length <= index) {
          newStreams.push(null as unknown as ActiveStream);
        }

        newStreams[index] = stream;
        set({ activeStreams: newStreams.filter(Boolean) });

        // Add to history
        get().addToHistory({
          streamId: stream.streamId,
          name: stream.name,
          type: stream.type,
          logo: stream.logo,
          watchedAt: Date.now(),
        });
      },

      stopStream: (index) => {
        const { activeStreams } = get();
        const newStreams = activeStreams.filter((_, i) => i !== index);
        set({ activeStreams: newStreams });
      },

      setMultiScreenConfig: (config) => {
        set({ multiScreenConfig: config });
      },

      toggleFullscreen: () => {
        set({ isFullscreen: !get().isFullscreen });
      },

      // Favorites
      addToFavorites: (channel) => {
        const { favorites } = get();
        if (!favorites.find((f) => f.streamId === channel.streamId && f.type === channel.type)) {
          set({ favorites: [...favorites, { ...channel, addedAt: Date.now() }] });
        }
      },

      removeFromFavorites: (streamId) => {
        const { favorites } = get();
        set({ favorites: favorites.filter((f) => f.streamId !== streamId) });
      },

      // Watch History
      addToHistory: (item) => {
        const { watchHistory } = get();
        const filtered = watchHistory.filter((h) => h.streamId !== item.streamId);
        const newHistory = [{ ...item, watchedAt: Date.now() }, ...filtered].slice(0, 100);
        set({ watchHistory: newHistory });
      },

      // Recording
      startRecording: () => {
        set({ isRecording: true, recordingBuffer: [] });
      },

      stopRecording: () => {
        set({ isRecording: false });
      },

      addToRecordingBuffer: (blob) => {
        const { recordingBuffer } = get();
        // Keep only last 60 seconds of data (assuming ~1MB per 10 seconds)
        const maxSize = 6 * 1024 * 1024; // ~6MB for 60 seconds
        let totalSize = recordingBuffer.reduce((sum, b) => sum + b.size, 0);

        const newBuffer = [...recordingBuffer, blob];
        while (totalSize > maxSize && newBuffer.length > 1) {
          const removed = newBuffer.shift();
          if (removed) totalSize -= removed.size;
        }

        set({ recordingBuffer: newBuffer });
      },

      downloadRecording: () => {
        const { recordingBuffer, activeStreams } = get();
        if (recordingBuffer.length === 0) return;

        const blob = new Blob(recordingBuffer, { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recording-${activeStreams[0]?.name || 'clip'}-${Date.now()}.mp4`;
        a.click();
        URL.revokeObjectURL(url);
      },
    }),
    {
      name: 'eyepeeteevee-storage',
      partialize: (state) => ({
        credentials: state.credentials,
        favorites: state.favorites,
        watchHistory: state.watchHistory,
        multiScreenConfig: state.multiScreenConfig,
      }),
    }
  )
);
