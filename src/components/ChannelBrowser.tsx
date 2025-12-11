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
  ChevronDown,
  Play,
  Star,
  Loader2,
} from 'lucide-react';

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
    isLoading,
  } = useIPTVStore();

  const [showCategories, setShowCategories] = useState(true);

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

  const getCategoryName = (categoryId: string): string => {
    const categories = getCategories();
    return categories.find((c) => c.category_id === categoryId)?.category_name || 'Unknown';
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
    <div className="flex flex-col h-full bg-gray-900 min-h-0">
      {/* Header with Tabs */}
      <div className="flex-shrink-0 border-b border-gray-800">
        <div className="flex items-center gap-1 px-2 py-2 overflow-x-auto">
          {[
            { id: 'live', label: 'Live TV', icon: Tv },
            { id: 'vod', label: 'Movies', icon: Film },
            { id: 'series', label: 'Series', icon: Video },
            { id: 'favorites', label: 'Favorites', icon: Heart },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Categories Dropdown (for Live/VOD/Series) */}
      {activeTab !== 'favorites' && categories.length > 0 && (
        <div className="flex-shrink-0 border-b border-gray-800">
          <button
            onClick={() => setShowCategories(!showCategories)}
            className="w-full px-3 py-2 flex items-center justify-between text-sm text-gray-300 hover:bg-gray-800"
          >
            <span className="font-medium">
              {selectedCategory ? getCategoryName(selectedCategory) : 'All Channels'}
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showCategories ? 'rotate-180' : ''}`}
            />
          </button>

          {showCategories && (
            <div className="max-h-48 overflow-y-auto border-t border-gray-800 bg-gray-850">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setShowCategories(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${
                  !selectedCategory
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span>All Channels</span>
                {!selectedCategory && <ChevronRight className="w-4 h-4" />}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.category_id}
                  onClick={() => {
                    setSelectedCategory(cat.category_id);
                    setShowCategories(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${
                    selectedCategory === cat.category_id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="truncate pr-2">{cat.category_name}</span>
                  {selectedCategory === cat.category_id && (
                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content Area - Scrollable Channel List */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Live TV */}
            {activeTab === 'live' && (
              <div className="divide-y divide-gray-800">
                {filteredLiveStreams.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    {searchQuery ? 'No channels match your search' : 'No channels available'}
                  </div>
                ) : (
                  filteredLiveStreams.map((stream) => (
                    <ChannelRow
                      key={stream.stream_id}
                      name={stream.name}
                      logo={stream.stream_icon}
                      onClick={() =>
                        credentials?.type === 'xtream'
                          ? handlePlayLive(stream)
                          : handlePlayM3U(stream)
                      }
                    />
                  ))
                )}
              </div>
            )}

            {/* VOD */}
            {activeTab === 'vod' && (
              <div className="divide-y divide-gray-800">
                {filteredVodStreams.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    {searchQuery ? 'No movies match your search' : 'No movies available'}
                  </div>
                ) : (
                  filteredVodStreams.map((stream) => (
                    <MovieRow
                      key={stream.stream_id}
                      name={stream.name}
                      poster={stream.stream_icon}
                      rating={stream.rating_5based}
                      onClick={() => handlePlayVod(stream)}
                    />
                  ))
                )}
              </div>
            )}

            {/* Series */}
            {activeTab === 'series' && (
              <div className="divide-y divide-gray-800">
                {filteredSeries.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    {searchQuery ? 'No series match your search' : 'No series available'}
                  </div>
                ) : (
                  filteredSeries.map((s) => (
                    <MovieRow
                      key={s.series_id}
                      name={s.name}
                      poster={s.cover}
                      rating={s.rating_5based}
                      onClick={() => {
                        // TODO: Open series detail modal
                      }}
                    />
                  ))
                )}
              </div>
            )}

            {/* Favorites */}
            {activeTab === 'favorites' && (
              <div>
                {favorites.length === 0 && watchHistory.length === 0 ? (
                  <div className="p-8 text-center">
                    <Heart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500">No favorites yet</p>
                    <p className="text-gray-600 text-sm mt-1">
                      Click the heart icon on any channel to add it
                    </p>
                  </div>
                ) : (
                  <>
                    {favorites.length > 0 && (
                      <div>
                        <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-800/50">
                          Favorites
                        </div>
                        <div className="divide-y divide-gray-800">
                          {favorites.map((fav) => (
                            <ChannelRow
                              key={`${fav.type}-${fav.streamId}`}
                              name={fav.name}
                              logo={fav.logo}
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
                      </div>
                    )}

                    {watchHistory.length > 0 && (
                      <div>
                        <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-800/50 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          Recently Watched
                        </div>
                        <div className="divide-y divide-gray-800">
                          {watchHistory.slice(0, 20).map((item) => (
                            <ChannelRow
                              key={`${item.type}-${item.streamId}-${item.watchedAt}`}
                              name={item.name}
                              logo={item.logo}
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
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Channel count */}
      <div className="flex-shrink-0 px-3 py-2 border-t border-gray-800 text-xs text-gray-500">
        {activeTab === 'live' && `${filteredLiveStreams.length} channels`}
        {activeTab === 'vod' && `${filteredVodStreams.length} movies`}
        {activeTab === 'series' && `${filteredSeries.length} series`}
        {activeTab === 'favorites' && `${favorites.length} favorites`}
      </div>
    </div>
  );
}

// Simple text-based channel row
function ChannelRow({
  name,
  logo,
  onClick,
}: {
  name: string;
  logo?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-800 transition-colors text-left group"
    >
      {logo ? (
        <img
          src={logo}
          alt=""
          className="w-8 h-8 object-contain rounded flex-shrink-0 bg-gray-800"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
          <Tv className="w-4 h-4 text-gray-600" />
        </div>
      )}
      <span className="text-white text-sm flex-1 truncate">{name}</span>
      <Play className="w-4 h-4 text-gray-600 group-hover:text-blue-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

// Movie/Series row with optional rating
function MovieRow({
  name,
  poster,
  rating,
  onClick,
}: {
  name: string;
  poster?: string;
  rating?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-800 transition-colors text-left group"
    >
      {poster ? (
        <img
          src={poster}
          alt=""
          className="w-10 h-14 object-cover rounded flex-shrink-0 bg-gray-800"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div className="w-10 h-14 bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
          <Film className="w-5 h-5 text-gray-600" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="text-white text-sm block truncate">{name}</span>
        {rating && rating > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className="text-gray-500 text-xs">{rating.toFixed(1)}</span>
          </div>
        )}
      </div>
      <Play className="w-4 h-4 text-gray-600 group-hover:text-blue-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
