'use client';

import { useIPTVStore, MULTI_SCREEN_CONFIGS } from '@/store';
import VideoPlayer from './VideoPlayer';
import { Grid3X3, LayoutGrid, Square, Columns, Grid2X2, MonitorPlay } from 'lucide-react';

export default function MultiScreenPlayer() {
  const { activeStreams, multiScreenConfig, setMultiScreenConfig, stopStream } = useIPTVStore();

  if (activeStreams.length === 0) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <MonitorPlay className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Select a channel to start watching</p>
          <p className="text-gray-600 text-sm mt-2">Browse channels on the left panel</p>
        </div>
      </div>
    );
  }

  const getLayoutIcon = (configId: string) => {
    switch (configId) {
      case 'single':
        return <Square className="w-4 h-4" />;
      case 'pip':
        return <LayoutGrid className="w-4 h-4" />;
      case '2x1':
        return <Columns className="w-4 h-4" />;
      case '2x2':
        return <Grid2X2 className="w-4 h-4" />;
      case '3x3':
        return <Grid3X3 className="w-4 h-4" />;
      default:
        return <Square className="w-4 h-4" />;
    }
  };

  // Special layout for PiP mode
  if (multiScreenConfig.id === 'pip' && activeStreams.length >= 2) {
    return (
      <div className="relative w-full h-full bg-black">
        {/* Main video */}
        <VideoPlayer stream={activeStreams[0]} index={0} isMain onClose={() => stopStream(0)} />

        {/* PiP overlay */}
        <div className="absolute bottom-20 right-4 w-64 h-36 shadow-2xl rounded-lg overflow-hidden border-2 border-gray-700">
          <VideoPlayer stream={activeStreams[1]} index={1} onClose={() => stopStream(1)} />
        </div>

        {/* Layout Selector */}
        <LayoutSelector />
      </div>
    );
  }

  // Special layout for 1+3 mode
  if (multiScreenConfig.id === '1+3') {
    return (
      <div className="relative w-full h-full bg-black grid grid-cols-3 grid-rows-2 gap-1">
        {/* Main large video spanning 2 cols and 2 rows */}
        <div className="col-span-2 row-span-2">
          {activeStreams[0] && (
            <VideoPlayer stream={activeStreams[0]} index={0} isMain onClose={() => stopStream(0)} />
          )}
        </div>
        {/* Three smaller videos on the right */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="col-span-1">
            {activeStreams[i] ? (
              <VideoPlayer stream={activeStreams[i]} index={i} onClose={() => stopStream(i)} />
            ) : (
              <EmptySlot index={i} />
            )}
          </div>
        ))}

        {/* Layout Selector */}
        <LayoutSelector />
      </div>
    );
  }

  // Standard grid layout
  const gridCols = multiScreenConfig.cols;
  const gridRows = multiScreenConfig.rows;
  const totalSlots = gridCols * gridRows;

  return (
    <div className="relative w-full h-full bg-black">
      <div
        className="w-full h-full grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          gridTemplateRows: `repeat(${gridRows}, 1fr)`,
        }}
      >
        {Array.from({ length: totalSlots }).map((_, i) => (
          <div key={i} className="relative">
            {activeStreams[i] ? (
              <VideoPlayer
                stream={activeStreams[i]}
                index={i}
                isMain={i === 0}
                onClose={() => stopStream(i)}
              />
            ) : (
              <EmptySlot index={i} />
            )}
          </div>
        ))}
      </div>

      {/* Layout Selector */}
      <LayoutSelector />
    </div>
  );
}

function EmptySlot({ index }: { index: number }) {
  return (
    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-2">
          <span className="text-gray-600 font-medium">{index + 1}</span>
        </div>
        <p className="text-gray-600 text-xs">Empty slot</p>
      </div>
    </div>
  );
}

function LayoutSelector() {
  const { multiScreenConfig, setMultiScreenConfig } = useIPTVStore();

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/80 rounded-lg p-1 backdrop-blur">
      {MULTI_SCREEN_CONFIGS.map((config) => (
        <button
          key={config.id}
          onClick={() => setMultiScreenConfig(config)}
          title={config.name}
          className={`p-2 rounded transition-colors ${
            multiScreenConfig.id === config.id
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:bg-gray-700'
          }`}
        >
          <LayoutIcon configId={config.id} />
        </button>
      ))}
    </div>
  );
}

function LayoutIcon({ configId }: { configId: string }) {
  switch (configId) {
    case 'single':
      return <Square className="w-5 h-5" />;
    case 'pip':
      return (
        <div className="w-5 h-5 relative">
          <div className="absolute inset-0 border border-current rounded-sm" />
          <div className="absolute bottom-0.5 right-0.5 w-2 h-1.5 bg-current rounded-sm" />
        </div>
      );
    case '2x1':
      return (
        <div className="w-5 h-5 flex gap-0.5">
          <div className="flex-1 border border-current rounded-sm" />
          <div className="flex-1 border border-current rounded-sm" />
        </div>
      );
    case '2x2':
      return <Grid2X2 className="w-5 h-5" />;
    case '3x3':
      return <Grid3X3 className="w-5 h-5" />;
    case '1+3':
      return (
        <div className="w-5 h-5 grid grid-cols-3 grid-rows-2 gap-0.5">
          <div className="col-span-2 row-span-2 border border-current rounded-sm" />
          <div className="border border-current rounded-sm" />
          <div className="border border-current rounded-sm" />
        </div>
      );
    default:
      return <Square className="w-5 h-5" />;
  }
}
