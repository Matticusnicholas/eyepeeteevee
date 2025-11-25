'use client';

import { useMemo, useState } from 'react';
import { useIPTVStore } from '@/store';
import type { LiveStream, VODStream, SeriesInfo, Category, ActiveStream } from '@/types';
import { XtreamAPI } from '@/lib/xtream-api';
import {
  Search,
  Tv,
  Film,
  Video,
  Heart,
  Clock,
  ChevronRight,
  Play,
  Star,
  Grid3X3,
  LayoutGrid,
  List,
} from 'lucide-react';

type ViewMode = 'grid' | 'list';

export default function ChannelBrowser() {
  const {
    credentials,
    activeTab,
    setActiveTab,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    liveCategories,
    liveStreams,
    vodCategories,
    vodStreams,
    seriesCategories,
    series,
    favorites,
    watchHistory,
    playStream,
    multiScreenConfig,
  } = useIPTVStore();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filter streams based on search and category
  const filteredLiveStreams = useMemo(() => {
    let streams = liveStreams;
    if (selectedCategory) {
      streams = streams.filter((s) => s.category_id === selectedCategory);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      streams = streams.filter((s) => s.name.toLowerCase().includes(query));
    }
    return streams;
  }, [liveStreams, selectedCategory, searchQuery]);

  const filteredVodStreams = useMemo(() => {
    let streams = vodStreams;
    if (selectedCategory) {
      streams = streams.filter((s) => s.category_id === selectedCategory);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      streams = streams.filter((s) => s.name.toLowerCase().includes(query));
    }
    return streams;
  }, [vodStreams, selectedCategory, searchQuery]);

  const filteredSeries = useMemo(() => {
    let items = series;
    if (selectedCategory) {
      items = items.filter((s) => s.category_id === selectedCategory);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter((s) => s.name.toLowerCase().includes(query));
    }
    return items;
  }, [series, selectedCategory, searchQuery]);

  const getCategories = (): Category[] => {
    switch (activeTab) {
      case 'live':
        return liveCategories;
      case 'vod':
        return vodCategories;
      case 'series':
        return seriesCategories;
      default:
        return [];
    }
  };

  const handlePlayLive = (stream: LiveStream) => {
    if (!credentials || credentials.type !== 'xtream') return;

    const api = new XtreamAPI(credentials);
    const activeStream: ActiveStream = {
      streamId: stream.stream_id,
      name: stream.name,
      url: api.getLiveStreamUrl(stream.stream_id),
      type: 'live',
      logo: stream.stream_icon,
    };

    playStream(activeStream);
  };

  const handlePlayVod = (stream: VODStream) => {
    if (!credentials || credentials.type !== 'xtream') return;

    const api = new XtreamAPI(credentials);
    const activeStream: ActiveStream = {
      streamId: stream.stream_id,
      name: stream.name,
      url: api.getVodStreamUrl(stream.stream_id, stream.container_extension),
      type: 'vod',
      logo: stream.stream_icon,
    };

    playStream(activeStream);
  };

  const handlePlayM3U = (stream: LiveStream) => {
    const activeStream: ActiveStream = {
      streamId: stream.stream_id,
      name: stream.name,
      url: stream.direct_source,
      type: 'live',
      logo: stream.stream_icon,
    };

    playStream(activeStream);
  };

  const categories = getCategories();

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header with Tabs */}
      <div className="border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex gap-1">
            {[
              { id: 'live', label: 'Live TV', icon: Tv },
              { id: 'vod', label: 'Movies', icon: Film },
              { id: 'series', label: 'Series', icon: Video },
              { id: 'favorites', label: 'Favorites', icon: Heart },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-gray-700' : ''}`}
              >
                <LayoutGrid className="w-4 h-4 text-gray-400" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-gray-700' : ''}`}
              >
                <List className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search channels, movies, series..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Categories Sidebar */}
        {activeTab !== 'favorites' && categories.length > 0 && (
          <div className="w-48 lg:w-56 border-r border-gray-800 overflow-y-auto flex-shrink-0">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between ${
                !selectedCategory ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'
              }`}
            >
              <span>All Channels</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            {categories.map((cat) => (
              <button
                key={cat.category_id}
                onClick={() => setSelectedCategory(cat.category_id)}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between ${
                  selectedCategory === cat.category_id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                <span className="truncate">{cat.category_name}</span>
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Live TV */}
          {activeTab === 'live' && (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
                  : 'flex flex-col gap-2'
              }
            >
              {filteredLiveStreams.map((stream) => (
                <ChannelCard
                  key={stream.stream_id}
                  name={stream.name}
                  logo={stream.stream_icon}
                  viewMode={viewMode}
                  onClick={() =>
                    credentials?.type === 'xtream' ? handlePlayLive(stream) : handlePlayM3U(stream)
                  }
                />
              ))}
            </div>
          )}

          {/* VOD */}
          {activeTab === 'vod' && (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
                  : 'flex flex-col gap-2'
              }
            >
              {filteredVodStreams.map((stream) => (
                <MovieCard
                  key={stream.stream_id}
                  name={stream.name}
                  poster={stream.stream_icon}
                  rating={stream.rating_5based}
                  viewMode={viewMode}
                  onClick={() => handlePlayVod(stream)}
                />
              ))}
            </div>
          )}

          {/* Series */}
          {activeTab === 'series' && (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
                  : 'flex flex-col gap-2'
              }
            >
              {filteredSeries.map((s) => (
                <MovieCard
                  key={s.series_id}
                  name={s.name}
                  poster={s.cover}
                  rating={s.rating_5based}
                  viewMode={viewMode}
                  onClick={() => {
                    // TODO: Open series detail modal
                  }}
                />
              ))}
            </div>
          )}

          {/* Favorites */}
          {activeTab === 'favorites' && (
            <div>
              {favorites.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500">No favorites yet</p>
                  <p className="text-gray-600 text-sm">Click the heart icon on any channel to add it</p>
                </div>
              ) : (
                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
                      : 'flex flex-col gap-2'
                  }
                >
                  {favorites.map((fav) => (
                    <ChannelCard
                      key={`${fav.type}-${fav.streamId}`}
                      name={fav.name}
                      logo={fav.logo}
                      viewMode={viewMode}
                      onClick={() => {
                        if (!credentials || credentials.type !== 'xtream') return;
                        const api = new XtreamAPI(credentials);
                        let url = '';
                        if (fav.type === 'live') {
                          url = api.getLiveStreamUrl(fav.streamId);
                        } else if (fav.type === 'vod') {
                          url = api.getVodStreamUrl(fav.streamId);
                        }
                        playStream({
                          streamId: fav.streamId,
                          name: fav.name,
                          url,
                          type: fav.type,
                          logo: fav.logo,
                        });
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Recent History */}
              {watchHistory.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-white text-lg font-medium mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recently Watched
                  </h3>
                  <div
                    className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3'
                        : 'flex flex-col gap-2'
                    }
                  >
                    {watchHistory.slice(0, 12).map((item) => (
                      <ChannelCard
                        key={`${item.type}-${item.streamId}-${item.watchedAt}`}
                        name={item.name}
                        logo={item.logo}
                        viewMode={viewMode}
                        onClick={() => {
                          if (!credentials || credentials.type !== 'xtream') return;
                          const api = new XtreamAPI(credentials);
                          let url = '';
                          if (item.type === 'live') {
                            url = api.getLiveStreamUrl(item.streamId);
                          } else if (item.type === 'vod') {
                            url = api.getVodStreamUrl(item.streamId);
                          }
                          playStream({
                            streamId: item.streamId,
                            name: item.name,
                            url,
                            type: item.type,
                            logo: item.logo,
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChannelCard({
  name,
  logo,
  viewMode,
  onClick,
}: {
  name: string;
  logo?: string;
  viewMode: ViewMode;
  onClick: () => void;
}) {
  if (viewMode === 'list') {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-700 rounded-lg transition-colors text-left group"
      >
        <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
          {logo ? (
            <img src={logo} alt="" className="w-full h-full object-contain" />
          ) : (
            <Tv className="w-6 h-6 text-gray-500" />
          )}
        </div>
        <span className="text-white text-sm truncate flex-1">{name}</span>
        <Play className="w-5 h-5 text-gray-500 group-hover:text-blue-400 flex-shrink-0" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center p-3 bg-gray-800/50 hover:bg-gray-700 rounded-lg transition-colors group"
    >
      <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden mb-2">
        {logo ? (
          <img src={logo} alt="" className="w-full h-full object-contain" />
        ) : (
          <Tv className="w-8 h-8 text-gray-500" />
        )}
      </div>
      <span className="text-white text-xs text-center truncate w-full">{name}</span>
    </button>
  );
}

function MovieCard({
  name,
  poster,
  rating,
  viewMode,
  onClick,
}: {
  name: string;
  poster?: string;
  rating?: number;
  viewMode: ViewMode;
  onClick: () => void;
}) {
  if (viewMode === 'list') {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-700 rounded-lg transition-colors text-left group"
      >
        <div className="w-16 h-24 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
          {poster ? (
            <img src={poster} alt="" className="w-full h-full object-cover" />
          ) : (
            <Film className="w-8 h-8 text-gray-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-white text-sm block truncate">{name}</span>
          {rating && rating > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <span className="text-gray-400 text-xs">{rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        <Play className="w-5 h-5 text-gray-500 group-hover:text-blue-400 flex-shrink-0" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex flex-col bg-gray-800/50 hover:bg-gray-700 rounded-lg overflow-hidden transition-colors group"
    >
      <div className="aspect-[2/3] bg-gray-700 flex items-center justify-center overflow-hidden">
        {poster ? (
          <img src={poster} alt="" className="w-full h-full object-cover" />
        ) : (
          <Film className="w-12 h-12 text-gray-500" />
        )}
      </div>
      <div className="p-2">
        <span className="text-white text-xs truncate block">{name}</span>
        {rating && rating > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className="text-gray-400 text-xs">{rating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </button>
  );
}
