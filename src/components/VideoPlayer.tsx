'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { useIPTVStore } from '@/store';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  X,
  Heart,
  Circle,
  Download,
  Settings,
} from 'lucide-react';
import type { ActiveStream } from '@/types';

interface VideoPlayerProps {
  stream: ActiveStream;
  index: number;
  isMain?: boolean;
  onClose?: () => void;
}

export default function VideoPlayer({ stream, index, isMain = false, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(true);

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

  // Initialize HLS player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream.url) return;

    setError(null);
    setIsBuffering(true);

    const initPlayer = () => {
      // Cleanup previous instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      // Check if it's an HLS stream
      const isHLS = stream.url.includes('.m3u8') || stream.url.includes('/live/');

      if (isHLS && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        });

        hls.loadSource(stream.url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
          setIsBuffering(false);
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setError('Network error - retrying...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                setError('Media error - recovering...');
                hls.recoverMediaError();
                break;
              default:
                setError('Playback error');
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS support
        video.src = stream.url;
        video.play().catch(() => {});
      } else {
        // Regular video source
        video.src = stream.url;
        video.play().catch(() => {});
      }
    };

    initPlayer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [stream.url]);

  // Recording functionality
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isRecording && isMain) {
      try {
        const stream = (video as HTMLVideoElement & { captureStream: () => MediaStream }).captureStream();
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
        });

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            addToRecordingBuffer(e.data);
          }
        };

        mediaRecorder.start(1000); // Capture every second
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

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleCanPlay = () => setIsBuffering(false);

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  // Auto-hide controls
  useEffect(() => {
    if (!showControls) return;

    const timeout = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [showControls]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
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

  return (
    <div
      className="relative w-full h-full bg-black group"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        autoPlay
        crossOrigin="anonymous"
      />

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="text-white text-center">
            <p className="text-red-400 mb-2">{error}</p>
            <button
              onClick={() => {
                setError(null);
                if (hlsRef.current) {
                  hlsRef.current.startLoad();
                }
              }}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
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
