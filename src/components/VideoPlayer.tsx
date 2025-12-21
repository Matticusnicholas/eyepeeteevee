'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useIPTVStore } from '@/store';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  X,
  Heart,
  Circle,
  Download,
  RefreshCw,
  AlertTriangle,
  Cpu,
  Radio,
} from 'lucide-react';
import type { ActiveStream } from '@/types';
import { MultiEnginePlayer, PlayerEngine, PlayerState } from '@/lib/player-engines';

interface VideoPlayerProps {
  stream: ActiveStream;
  index: number;
  isMain?: boolean;
  onClose?: () => void;
}

export default function VideoPlayer({ stream, index, isMain = false, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<MultiEnginePlayer | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasAudioIssue, setHasAudioIssue] = useState(false);
  const [currentEngine, setCurrentEngine] = useState<PlayerEngine>('mpegts');
  const [showEngineMenu, setShowEngineMenu] = useState(false);

  const {
    isRecording,
    stopStream,
    addToFavorites,
    removeFromFavorites,
    favorites,
    addToRecordingBuffer,
    startRecording,
    stopRecording,
    downloadRecording,
  } = useIPTVStore();

  const isFavorite = favorites.some((f) => f.streamId === stream.streamId && f.type === stream.type);

  // Initialize multi-engine player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream.url) return;

    setError(null);
    setIsBuffering(true);
    setHasAudioIssue(false);

    // Destroy previous player
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    const player = new MultiEnginePlayer(
      video,
      stream.url,
      stream.fallbackUrls || [],
      {
        onStateChange: (state: Partial<PlayerState>) => {
          if (state.isPlaying !== undefined) setIsPlaying(state.isPlaying);
          if (state.isBuffering !== undefined) setIsBuffering(state.isBuffering);
          if (state.hasError !== undefined && state.hasError) {
            setError(state.errorMessage || 'Playback error');
          }
          if (state.hasAudio === false) setHasAudioIssue(true);
          if (state.engine) setCurrentEngine(state.engine);
        },
        onEngineSwitch: (from: PlayerEngine, to: PlayerEngine) => {
          console.log(`Switching from ${from} to ${to}`);
          setCurrentEngine(to);
          setIsBuffering(true);
        },
        onFatalError: (message: string) => {
          setError(message);
          setIsBuffering(false);
        },
      }
    );

    playerRef.current = player;
    player.start();

    return () => {
      player.destroy();
    };
  }, [stream.url, stream.streamId, stream.fallbackUrls]);

  // Recording functionality
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isRecording && isMain) {
      try {
        const captureStream = (video as HTMLVideoElement & { captureStream: () => MediaStream }).captureStream();
        const mediaRecorder = new MediaRecorder(captureStream, {
          mimeType: 'video/webm;codecs=vp9',
        });

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            addToRecordingBuffer(e.data);
          }
        };

        mediaRecorder.start(1000);
        mediaRecorderRef.current = mediaRecorder;
      } catch (err) {
        console.error('Recording not supported:', err);
      }
    } else if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
    };
  }, [isRecording, isMain, addToRecordingBuffer]);

  // Auto-hide controls
  useEffect(() => {
    if (!showControls) return;

    const timeout = setTimeout(() => {
      setShowControls(false);
      setShowEngineMenu(false);
    }, 4000);

    return () => clearTimeout(timeout);
  }, [showControls]);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    player.setMuted(!isMuted);
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const player = playerRef.current;
    if (!player) return;

    const newVolume = parseFloat(e.target.value);
    player.setVolume(newVolume);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  }, []);

  const handleFavoriteToggle = useCallback(() => {
    if (isFavorite) {
      removeFromFavorites(stream.streamId);
    } else {
      addToFavorites({
        streamId: stream.streamId,
        name: stream.name,
        type: stream.type,
        logo: stream.logo,
        addedAt: Date.now(),
      });
    }
  }, [isFavorite, stream, addToFavorites, removeFromFavorites]);

  const handleRecordingToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
      downloadRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording, downloadRecording]);

  const handleRetry = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    setError(null);
    setIsBuffering(true);
    player.retry();
  }, []);

  const handleSwitchEngine = useCallback((engine: PlayerEngine) => {
    const player = playerRef.current;
    if (!player) return;

    setShowEngineMenu(false);
    setIsBuffering(true);
    setError(null);
    player.switchEngine(engine);
  }, []);

  const handleTryNextUrl = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    setError(null);
    setIsBuffering(true);
    player.tryNextUrl();
  }, []);

  const getEngineLabel = (engine: PlayerEngine): string => {
    switch (engine) {
      case 'mpegts': return 'MPEG-TS';
      case 'hls': return 'HLS.js';
      case 'native': return 'Native';
    }
  };

  return (
    <div
      className="relative w-full h-full bg-black group"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => {
        setShowControls(false);
        setShowEngineMenu(false);
      }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        autoPlay
        crossOrigin="anonymous"
      />

      {/* Buffering Indicator */}
      {isBuffering && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-white text-sm">Loading with {getEngineLabel(currentEngine)}...</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="text-white text-center p-4 max-w-sm">
            <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <p className="text-red-400 mb-4">{error}</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>

              <div className="flex gap-2">
                {stream.fallbackUrls && stream.fallbackUrls.length > 0 && (
                  <button
                    onClick={handleTryNextUrl}
                    className="flex-1 px-3 py-2 bg-gray-600 rounded hover:bg-gray-700 text-sm"
                  >
                    Try next URL
                  </button>
                )}
                <button
                  onClick={() => setShowEngineMenu(!showEngineMenu)}
                  className="flex-1 px-3 py-2 bg-gray-600 rounded hover:bg-gray-700 text-sm flex items-center justify-center gap-1"
                >
                  <Cpu className="w-3 h-3" />
                  Switch Engine
                </button>
              </div>

              {showEngineMenu && (
                <div className="flex gap-1 justify-center">
                  {(['mpegts', 'hls', 'native'] as PlayerEngine[]).map((engine) => (
                    <button
                      key={engine}
                      onClick={() => handleSwitchEngine(engine)}
                      className={`px-3 py-1 rounded text-xs ${
                        engine === currentEngine
                          ? 'bg-blue-600'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      {getEngineLabel(engine)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audio Issue Warning */}
      {hasAudioIssue && !error && (
        <div className="absolute top-12 left-2 bg-yellow-600/90 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Audio may not be available
        </div>
      )}

      {/* Channel Name Overlay */}
      <div
        className={`absolute top-2 left-2 right-2 flex items-center justify-between transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded">
          {stream.logo && (
            <img src={stream.logo} alt="" className="w-6 h-6 object-contain" />
          )}
          <span className="text-white text-sm font-medium truncate max-w-[200px]">
            {stream.name}
          </span>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Radio className="w-3 h-3" />
            {getEngineLabel(currentEngine)}
          </span>
        </div>

        {onClose && (
          <button
            onClick={() => stopStream(index)}
            className="p-1.5 bg-black/60 rounded hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      {/* Recording Indicator */}
      {isRecording && isMain && (
        <div className="absolute top-2 right-16 flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded">
          <Circle className="w-3 h-3 text-white fill-white animate-pulse" />
          <span className="text-white text-sm">REC</span>
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-colors">
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-white hover:text-blue-400 transition-colors">
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Engine Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowEngineMenu(!showEngineMenu)}
                className="text-white hover:text-blue-400 transition-colors flex items-center gap-1"
                title="Switch playback engine"
              >
                <Cpu className="w-5 h-5" />
              </button>

              {showEngineMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                  {(['mpegts', 'hls', 'native'] as PlayerEngine[]).map((engine) => (
                    <button
                      key={engine}
                      onClick={() => handleSwitchEngine(engine)}
                      className={`block w-full px-4 py-2 text-sm text-left whitespace-nowrap ${
                        engine === currentEngine
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-200 hover:bg-gray-700'
                      }`}
                    >
                      {getEngineLabel(engine)}
                      {engine === currentEngine && ' ✓'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Favorite */}
            <button
              onClick={handleFavoriteToggle}
              className={`transition-colors ${isFavorite ? 'text-red-500' : 'text-white hover:text-red-400'}`}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>

            {/* Recording (main player only) */}
            {isMain && (
              <button
                onClick={handleRecordingToggle}
                className={`transition-colors ${isRecording ? 'text-red-500' : 'text-white hover:text-red-400'}`}
                title={isRecording ? 'Stop & Download Recording' : 'Start Recording Buffer'}
              >
                {isRecording ? (
                  <Download className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>
            )}

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="text-white hover:text-blue-400 transition-colors">
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
