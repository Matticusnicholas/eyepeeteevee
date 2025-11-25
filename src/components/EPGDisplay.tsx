'use client';

import { useMemo } from 'react';
import { useIPTVStore } from '@/store';
import type { EPGProgram } from '@/types';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface EPGDisplayProps {
  channelId?: string;
  compact?: boolean;
}

export default function EPGDisplay({ channelId, compact = false }: EPGDisplayProps) {
  const { epgData, activeStreams, liveStreams } = useIPTVStore();

  // Get EPG for current channel
  const currentEPG = useMemo(() => {
    if (!channelId && activeStreams.length > 0) {
      // Try to find EPG by matching stream
      const currentStream = activeStreams[0];
      const stream = liveStreams.find((s) => s.stream_id === currentStream.streamId);
      if (stream?.epg_channel_id) {
        return epgData[stream.epg_channel_id] || [];
      }
    }
    return channelId ? epgData[channelId] || [] : [];
  }, [epgData, channelId, activeStreams, liveStreams]);

  const now = new Date();

  // Find current and upcoming programs
  const { currentProgram, upcomingPrograms } = useMemo(() => {
    const current = currentEPG.find((p) => {
      const start = new Date(p.start);
      const end = new Date(p.end);
      return now >= start && now < end;
    });

    const upcoming = currentEPG
      .filter((p) => new Date(p.start) > now)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 5);

    return { currentProgram: current, upcomingPrograms: upcoming };
  }, [currentEPG, now]);

  if (currentEPG.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="bg-gray-800/80 backdrop-blur px-4 py-2 rounded-lg">
        {currentProgram ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-green-400 text-xs">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              LIVE
            </div>
            <span className="text-white text-sm font-medium truncate">
              {currentProgram.title}
            </span>
            <span className="text-gray-400 text-xs">
              {formatTime(new Date(currentProgram.start))} - {formatTime(new Date(currentProgram.end))}
            </span>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">No program info available</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border-t border-gray-800">
      {/* Current Program */}
      {currentProgram && (
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-1 text-green-400 text-xs bg-green-400/10 px-2 py-1 rounded">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              NOW
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">{currentProgram.title}</h3>
              <p className="text-gray-400 text-sm mt-1">
                {formatTime(new Date(currentProgram.start))} - {formatTime(new Date(currentProgram.end))}
              </p>
              {currentProgram.description && (
                <p className="text-gray-500 text-sm mt-2 line-clamp-2">
                  {currentProgram.description}
                </p>
              )}
              {/* Progress bar */}
              <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${getProgress(new Date(currentProgram.start), new Date(currentProgram.end))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Programs */}
      {upcomingPrograms.length > 0 && (
        <div className="p-4">
          <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Coming Up
          </h4>
          <div className="space-y-2">
            {upcomingPrograms.map((program, idx) => (
              <div
                key={program.id || idx}
                className="flex items-center gap-3 text-sm"
              >
                <span className="text-gray-500 w-16 flex-shrink-0">
                  {formatTime(new Date(program.start))}
                </span>
                <span className="text-gray-300 truncate">{program.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// EPG Timeline component for horizontal scrolling view
export function EPGTimeline() {
  const { epgData, liveStreams, playStream, credentials } = useIPTVStore();
  const now = new Date();

  // Get channels with EPG data
  const channelsWithEPG = useMemo(() => {
    return liveStreams
      .filter((stream) => stream.epg_channel_id && epgData[stream.epg_channel_id]?.length > 0)
      .slice(0, 20);
  }, [liveStreams, epgData]);

  if (channelsWithEPG.length === 0) {
    return (
      <div className="bg-gray-900 p-8 text-center">
        <Clock className="w-12 h-12 text-gray-700 mx-auto mb-4" />
        <p className="text-gray-500">No EPG data available</p>
        <p className="text-gray-600 text-sm mt-2">
          EPG data is being loaded in the background
        </p>
      </div>
    );
  }

  // Generate time slots for 4 hours
  const timeSlots = [];
  const startTime = new Date(now);
  startTime.setMinutes(0, 0, 0);
  for (let i = 0; i < 8; i++) {
    const time = new Date(startTime.getTime() + i * 30 * 60000);
    timeSlots.push(time);
  }

  return (
    <div className="bg-gray-900 overflow-x-auto">
      {/* Time header */}
      <div className="flex border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
        <div className="w-48 flex-shrink-0 p-2 border-r border-gray-800">
          <span className="text-gray-400 text-sm">Channel</span>
        </div>
        {timeSlots.map((time, idx) => (
          <div key={idx} className="w-32 flex-shrink-0 p-2 text-gray-400 text-sm border-r border-gray-800">
            {formatTime(time)}
          </div>
        ))}
      </div>

      {/* Channel rows */}
      {channelsWithEPG.map((stream) => {
        const programs = epgData[stream.epg_channel_id] || [];
        const visiblePrograms = programs.filter((p) => {
          const end = new Date(p.end);
          const start = new Date(p.start);
          return end > startTime && start < new Date(startTime.getTime() + 4 * 60 * 60000);
        });

        return (
          <div key={stream.stream_id} className="flex border-b border-gray-800">
            <div className="w-48 flex-shrink-0 p-2 border-r border-gray-800 flex items-center gap-2">
              {stream.stream_icon && (
                <img src={stream.stream_icon} alt="" className="w-8 h-8 object-contain" />
              )}
              <span className="text-white text-sm truncate">{stream.name}</span>
            </div>
            <div className="flex-1 relative h-16 flex">
              {visiblePrograms.map((program, idx) => {
                const progStart = new Date(program.start);
                const progEnd = new Date(program.end);
                const slotStart = startTime;
                const slotEnd = new Date(startTime.getTime() + 4 * 60 * 60000);

                // Calculate position and width
                const startOffset = Math.max(0, (progStart.getTime() - slotStart.getTime()) / (30 * 60000));
                const duration = (Math.min(progEnd.getTime(), slotEnd.getTime()) -
                  Math.max(progStart.getTime(), slotStart.getTime())) / (30 * 60000);

                const isCurrent = now >= progStart && now < progEnd;

                return (
                  <div
                    key={program.id || idx}
                    className={`absolute top-1 bottom-1 rounded px-2 py-1 overflow-hidden cursor-pointer transition-colors ${
                      isCurrent
                        ? 'bg-blue-600 hover:bg-blue-500'
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                    style={{
                      left: `${startOffset * 128}px`,
                      width: `${duration * 128 - 4}px`,
                    }}
                    title={`${program.title}\n${formatTime(progStart)} - ${formatTime(progEnd)}`}
                  >
                    <span className="text-white text-xs font-medium block truncate">
                      {program.title}
                    </span>
                    <span className="text-gray-300 text-xs">
                      {formatTime(progStart)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getProgress(start: Date, end: Date): number {
  const now = new Date();
  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}
