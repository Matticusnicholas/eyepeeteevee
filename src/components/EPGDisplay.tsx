'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useIPTVStore } from '@/store';
import type { EPGProgram, LiveStream } from '@/types';
import { Clock, ChevronUp, ChevronDown, X, Tv, Info } from 'lucide-react';

// Mini EPG overlay that shows current program on the video
export function EPGMiniOverlay() {
  const { epgData, activeStreams, liveStreams } = useIPTVStore();
  const [isVisible, setIsVisible] = useState(true);

  const currentProgram = useMemo(() => {
    if (activeStreams.length === 0) return null;

    const currentStream = activeStreams[0];
    const stream = liveStreams.find((s) => s.stream_id === currentStream.streamId);
    if (!stream?.epg_channel_id) return null;

    const programs = epgData[stream.epg_channel_id] || [];
    const now = new Date();

    return programs.find((p) => {
      const start = new Date(p.start);
      const end = new Date(p.end);
      return now >= start && now < end;
    });
  }, [epgData, activeStreams, liveStreams]);

  if (!currentProgram || !isVisible) return null;

  const start = new Date(currentProgram.start);
  const end = new Date(currentProgram.end);
  const now = new Date();
  const progress = ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100;

  return (
    <div className="absolute bottom-20 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 animate-fade-in">
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-red-400 text-xs font-medium">LIVE</span>
      </div>
      <h3 className="text-white font-medium text-sm truncate pr-6">{currentProgram.title}</h3>
      <p className="text-gray-400 text-xs mt-1">
        {formatTime(start)} - {formatTime(end)}
      </p>
      <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
    </div>
  );
}

// EPG Drawer that slides up from bottom
interface EPGDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EPGDrawer({ isOpen, onClose }: EPGDrawerProps) {
  const { epgData, liveStreams, playStream, credentials, activeStreams } = useIPTVStore();
  const [selectedChannel, setSelectedChannel] = useState<LiveStream | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get channels with EPG data
  const channelsWithEPG = useMemo(() => {
    return liveStreams.filter(
      (stream) => stream.epg_channel_id && epgData[stream.epg_channel_id]?.length > 0
    );
  }, [liveStreams, epgData]);

  // Auto-select current channel
  useEffect(() => {
    if (activeStreams.length > 0 && !selectedChannel) {
      const current = liveStreams.find((s) => s.stream_id === activeStreams[0].streamId);
      if (current) setSelectedChannel(current);
    }
  }, [activeStreams, liveStreams, selectedChannel]);

  const selectedEPG = useMemo(() => {
    if (!selectedChannel?.epg_channel_id) return [];
    const programs = epgData[selectedChannel.epg_channel_id] || [];
    const now = new Date();
    // Show programs from now onwards
    return programs
      .filter((p) => new Date(p.end) > now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 20);
  }, [selectedChannel, epgData]);

  if (!isOpen) return null;

  const handlePlayChannel = (stream: LiveStream) => {
    if (!credentials || credentials.type !== 'xtream') return;

    const { XtreamAPI } = require('@/lib/xtream-api');
    const api = new XtreamAPI(credentials);

    playStream({
      streamId: stream.stream_id,
      name: stream.name,
      url: api.getLiveStreamUrl(stream.stream_id),
      type: 'live',
      logo: stream.stream_icon,
    });
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl pointer-events-auto max-h-[70vh] flex flex-col animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            TV Guide
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Channel List */}
          <div className="w-32 sm:w-40 border-r border-gray-800 overflow-y-auto flex-shrink-0">
            {channelsWithEPG.length > 0 ? (
              channelsWithEPG.map((stream) => (
                <button
                  key={stream.stream_id}
                  onClick={() => setSelectedChannel(stream)}
                  className={`w-full p-2 flex items-center gap-2 text-left transition-colors ${
                    selectedChannel?.stream_id === stream.stream_id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  {stream.stream_icon ? (
                    <img
                      src={stream.stream_icon}
                      alt=""
                      className="w-8 h-8 object-contain flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                      <Tv className="w-4 h-4 text-gray-500" />
                    </div>
                  )}
                  <span className="text-xs truncate">{stream.name}</span>
                </button>
              ))
            ) : (
              <div className="p-4 text-center">
                <p className="text-gray-500 text-sm">No EPG data</p>
              </div>
            )}
          </div>

          {/* Program List */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
            {selectedChannel ? (
              selectedEPG.length > 0 ? (
                <div className="p-2 space-y-1">
                  {selectedEPG.map((program, idx) => {
                    const now = new Date();
                    const start = new Date(program.start);
                    const end = new Date(program.end);
                    const isCurrent = now >= start && now < end;
                    const progress = isCurrent
                      ? ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100
                      : 0;

                    return (
                      <div
                        key={program.id || idx}
                        className={`p-3 rounded-lg transition-colors ${
                          isCurrent ? 'bg-blue-600/20 border border-blue-500/50' : 'bg-gray-800/50 hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">
                                  LIVE
                                </span>
                              )}
                              <span className="text-gray-400 text-xs">
                                {formatTime(start)}
                              </span>
                            </div>
                            <h4 className="text-white font-medium text-sm mt-1 truncate">
                              {program.title}
                            </h4>
                            {program.description && (
                              <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                                {program.description}
                              </p>
                            )}
                            {isCurrent && (
                              <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            )}
                          </div>
                          <span className="text-gray-500 text-xs flex-shrink-0">
                            {formatDuration(start, end)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full p-8">
                  <div className="text-center">
                    <Info className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No program info available</p>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full p-8">
                <div className="text-center">
                  <Tv className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Select a channel to view guide</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Play Button */}
        {selectedChannel && (
          <div className="p-4 border-t border-gray-800">
            <button
              onClick={() => handlePlayChannel(selectedChannel)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <Tv className="w-5 h-5" />
              Watch {selectedChannel.name}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// EPG Button to open the drawer
export function EPGButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 hover:bg-gray-700 rounded-lg transition-colors backdrop-blur-sm"
    >
      <Clock className="w-4 h-4 text-blue-400" />
      <span className="text-white text-sm font-medium">Guide</span>
      <ChevronUp className="w-4 h-4 text-gray-400" />
    </button>
  );
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(start: Date, end: Date): string {
  const durationMs = new Date(end).getTime() - new Date(start).getTime();
  const minutes = Math.round(durationMs / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

// Default export for backwards compatibility
export default function EPGDisplay() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <EPGButton onClick={() => setIsOpen(true)} />
      <EPGDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
