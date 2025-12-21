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
  X,
  Heart,
  Circle,
  Download,
  RefreshCw,
  AlertTriangle,
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

  // Error tracking refs (don't cause re-renders)
  const mediaErrorCountRef = useRef(0);
  const networkErrorCountRef = useRef(0);
  const currentUrlIndexRef = useRef(0);
  const lastSuccessTimeRef = useRef(Date.now());
  const isRecoveringRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(stream.url);
  const [hasAudioIssue, setHasAudioIssue] = useState(false);
  const [streamFormat, setStreamFormat] = useState<'m3u8' | 'ts'>('m3u8');

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

  // Get all available URLs for this stream
  const getAllUrls = useCallback(() => {
    const urls = [stream.url];
    if (stream.fallbackUrls) {
      urls.push(...stream.fallbackUrls);
    }
    return urls;
  }, [stream.url, stream.fallbackUrls]);

  // Try the next available URL
  const tryNextUrl = useCallback(() => {
    const urls = getAllUrls();
    currentUrlIndexRef.current = (currentUrlIndexRef.current + 1) % urls.length;
    const nextUrl = urls[currentUrlIndexRef.current];
    console.log(`Trying fallback URL (${currentUrlIndexRef.current + 1}/${urls.length}):`, nextUrl);
    setCurrentUrl(nextUrl);
    setStreamFormat(nextUrl.includes('.ts') ? 'ts' : 'm3u8');
    return nextUrl;
  }, [getAllUrls]);

  // Reset to first URL
  const resetToFirstUrl = useCallback(() => {
    currentUrlIndexRef.current = 0;
    setCurrentUrl(stream.url);
    setStreamFormat(stream.url.includes('.ts') ? 'ts' : 'm3u8');
  }, [stream.url]);

  // Initialize HLS player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentUrl) return;

    setError(null);
    setIsBuffering(true);
    setHasAudioIssue(false);

    const destroyHls = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    const initPlayer = () => {
      destroyHls();

      // Reset error counters for new stream
      mediaErrorCountRef.current = 0;
      networkErrorCountRef.current = 0;
      isRecoveringRef.current = false;

      // Check if it's an HLS stream (.m3u8) or MPEG-TS (.ts)
      const isHLS = currentUrl.includes('.m3u8');
      const isMpegTS = currentUrl.includes('.ts') || currentUrl.includes('/live/');

      if (Hls.isSupported() && (isHLS || isMpegTS)) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 3,
          nudgeOffset: 0.2,
          nudgeMaxRetry: 10,
          fragLoadingTimeOut: 30000,
          fragLoadingMaxRetry: 8,
          manifestLoadingTimeOut: 20000,
          manifestLoadingMaxRetry: 6,
          levelLoadingTimeOut: 20000,
          levelLoadingMaxRetry: 6,
          // Less strict stall handling
          maxStarvationDelay: 4,
          maxLoadingDelay: 4,
          // Audio handling
          audioPreference: { characteristics: [] },
        });

        hls.loadSource(currentUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          console.log('Manifest parsed, levels:', data.levels.length);
          video.play().catch(() => {});
          setIsBuffering(false);
          setError(null);
          lastSuccessTimeRef.current = Date.now();

          // Check for audio tracks
          if (data.levels.length > 0) {
            const level = data.levels[0];
            if (!level.audioCodec) {
              console.warn('No audio codec detected in stream');
            }
          }
        });

        hls.on(Hls.Events.FRAG_LOADED, () => {
          // Successfully loaded a fragment - stream is working
          lastSuccessTimeRef.current = Date.now();
          if (error) setError(null);
          if (isRecoveringRef.current) {
            isRecoveringRef.current = false;
            mediaErrorCountRef.current = 0;
            networkErrorCountRef.current = 0;
          }
        });

        hls.on(Hls.Events.FRAG_PLAYING, () => {
          setIsBuffering(false);
        });

        hls.on(Hls.Events.AUDIO_TRACK_LOADED, (_, data) => {
          console.log('Audio track loaded:', data);
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          const timeSinceSuccess = Date.now() - lastSuccessTimeRef.current;
          console.log('HLS Error:', {
            type: data.type,
            details: data.details,
            fatal: data.fatal,
            timeSinceSuccess,
            mediaErrors: mediaErrorCountRef.current,
            networkErrors: networkErrorCountRef.current,
          });

          // Non-fatal errors - just log them
          if (!data.fatal) {
            return;
          }

          isRecoveringRef.current = true;

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkErrorCountRef.current++;

              if (networkErrorCountRef.current > 5) {
                // Try fallback URL if available
                const urls = getAllUrls();
                if (urls.length > 1 && currentUrlIndexRef.current < urls.length - 1) {
                  console.log('Network errors persisting, trying fallback URL...');
                  tryNextUrl();
                } else {
                  setError('Stream unavailable');
                }
              } else {
                // Retry with backoff
                const delay = Math.min(1000 * networkErrorCountRef.current, 5000);
                setTimeout(() => {
                  if (hlsRef.current) {
                    hlsRef.current.startLoad();
                  }
                }, delay);
              }
              break;

            case Hls.ErrorTypes.MEDIA_ERROR:
              mediaErrorCountRef.current++;

              if (mediaErrorCountRef.current > 8) {
                // Try fallback URL
                const urls = getAllUrls();
                if (urls.length > 1 && currentUrlIndexRef.current < urls.length - 1) {
                  console.log('Media errors persisting, trying fallback URL...');
                  tryNextUrl();
                } else {
                  setError('Playback error');
                }
              } else if (mediaErrorCountRef.current > 4) {
                // Try swapping audio codec
                console.log('Trying audio codec swap...');
                hls.swapAudioCodec();
                hls.recoverMediaError();
              } else {
                // Standard recovery
                hls.recoverMediaError();
              }
              break;

            default:
              // For other fatal errors, try fallback
              const urls = getAllUrls();
              if (urls.length > 1 && currentUrlIndexRef.current < urls.length - 1) {
                tryNextUrl();
              } else {
                setError('Playback error');
              }
              break;
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        video.src = currentUrl;
        video.play().catch(() => {});
        setIsBuffering(false);
      } else {
        // Direct playback attempt
        video.src = currentUrl;
        video.play().catch((e) => {
          console.error('Direct playback failed:', e);
          // Try fallback
          const urls = getAllUrls();
          if (urls.length > 1 && currentUrlIndexRef.current < urls.length - 1) {
            tryNextUrl();
          } else {
            setError('Unsupported format');
          }
        });
      }
    };

    initPlayer();

    return destroyHls;
  }, [currentUrl, getAllUrls, tryNextUrl, error]);

  // Reset URL index when stream changes
  useEffect(() => {
    currentUrlIndexRef.current = 0;
    setCurrentUrl(stream.url);
  }, [stream.url, stream.streamId]);

  // Audio issue detection
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let audioCheckTimer: NodeJS.Timeout;

    const checkAudio = () => {
      // If video is playing but audio might be missing
      if (video.currentTime > 2 && !video.muted && video.volume > 0) {
        // Check if we might have audio codec issues
        const hls = hlsRef.current;
        if (hls) {
          const audioTracks = hls.audioTracks;
          if (audioTracks.length === 0) {
            setHasAudioIssue(true);
          }
        }
      }
    };

    audioCheckTimer = setTimeout(checkAudio, 5000);

    return () => clearTimeout(audioCheckTimer);
  }, [currentUrl]);

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

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };
    const handleCanPlay = () => setIsBuffering(false);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      // Native video element error
      console.log('Video element error:', video.error);
    };

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
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

  const handleRetry = useCallback(() => {
    setError(null);
    mediaErrorCountRef.current = 0;
    networkErrorCountRef.current = 0;

    // Try next URL or restart from first
    const urls = getAllUrls();
    if (currentUrlIndexRef.current >= urls.length - 1) {
      resetToFirstUrl();
    } else {
      tryNextUrl();
    }
  }, [getAllUrls, resetToFirstUrl, tryNextUrl]);

  const handleTryAlternateFormat = useCallback(() => {
    tryNextUrl();
  }, [tryNextUrl]);

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
      {isBuffering && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="text-white text-center p-4">
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
              {stream.fallbackUrls && stream.fallbackUrls.length > 0 && (
                <button
                  onClick={handleTryAlternateFormat}
                  className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700 text-sm"
                >
                  Try alternate format
                </button>
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
          {streamFormat === 'ts' && (
            <span className="text-xs text-gray-400">(TS)</span>
          )}
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
