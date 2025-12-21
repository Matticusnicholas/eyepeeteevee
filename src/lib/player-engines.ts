'use client';

import Hls from 'hls.js';

// mpegts.js will be dynamically imported to avoid SSR issues
type MpegtsPlayer = {
  attachMediaElement: (video: HTMLVideoElement) => void;
  load: () => void;
  play: () => Promise<void>;
  pause: () => void;
  unload: () => void;
  detachMediaElement: () => void;
  destroy: () => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
};

type MpegtsModule = {
  isSupported: () => boolean;
  createPlayer: (config: unknown, options: unknown) => MpegtsPlayer;
  Events: {
    ERROR: string;
    LOADING_COMPLETE: string;
    MEDIA_INFO: string;
    STATISTICS_INFO: string;
  };
  ErrorTypes: {
    NETWORK_ERROR: string;
    MEDIA_ERROR: string;
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mpegtsModule: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getMpegts(): Promise<any> {
  if (typeof window === 'undefined') return null;
  if (mpegtsModule) return mpegtsModule;

  try {
    const mod = await import('mpegts.js');
    mpegtsModule = mod.default || mod;
    return mpegtsModule;
  } catch (error) {
    console.error('[Player] Failed to load mpegts.js:', error);
    return null;
  }
}

export type PlayerEngine = 'mpegts' | 'hls' | 'native';

export interface PlayerState {
  engine: PlayerEngine;
  isPlaying: boolean;
  isBuffering: boolean;
  hasError: boolean;
  errorMessage: string | null;
  hasAudio: boolean;
}

export interface PlayerCallbacks {
  onStateChange: (state: Partial<PlayerState>) => void;
  onEngineSwitch: (from: PlayerEngine, to: PlayerEngine) => void;
  onFatalError: (message: string) => void;
}

export class MultiEnginePlayer {
  private video: HTMLVideoElement;
  private url: string;
  private fallbackUrls: string[];
  private callbacks: PlayerCallbacks;

  private hlsInstance: Hls | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mpegtsPlayer: any = null;
  private currentEngine: PlayerEngine = 'mpegts';
  private currentUrlIndex: number = 0;
  private errorCounts: Record<PlayerEngine, number> = { mpegts: 0, hls: 0, native: 0 };
  private isDestroyed: boolean = false;

  // Engine priority order - mpegts first as it handles IPTV streams best
  private engineOrder: PlayerEngine[] = ['mpegts', 'hls', 'native'];

  constructor(
    video: HTMLVideoElement,
    url: string,
    fallbackUrls: string[],
    callbacks: PlayerCallbacks
  ) {
    this.video = video;
    this.url = url;
    this.fallbackUrls = fallbackUrls;
    this.callbacks = callbacks;
  }

  private getAllUrls(): string[] {
    return [this.url, ...this.fallbackUrls];
  }

  private getCurrentUrl(): string {
    const urls = this.getAllUrls();
    return urls[this.currentUrlIndex % urls.length];
  }

  private destroyCurrentEngine(): void {
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }
    if (this.mpegtsPlayer) {
      try {
        this.mpegtsPlayer.pause();
        this.mpegtsPlayer.unload();
        this.mpegtsPlayer.detachMediaElement();
        this.mpegtsPlayer.destroy();
      } catch (e) {
        console.warn('[Player] Error destroying mpegts player:', e);
      }
      this.mpegtsPlayer = null;
    }
    this.video.src = '';
    this.video.load();
  }

  async start(): Promise<void> {
    if (this.isDestroyed) return;
    await this.tryEngine(this.currentEngine);
  }

  private async tryEngine(engine: PlayerEngine): Promise<void> {
    if (this.isDestroyed) return;

    this.destroyCurrentEngine();
    this.currentEngine = engine;
    const url = this.getCurrentUrl();

    console.log(`[Player] Trying engine: ${engine}, URL: ${url}`);
    this.callbacks.onStateChange({ engine, isBuffering: true, hasError: false });

    try {
      switch (engine) {
        case 'mpegts':
          await this.initMpegts(url);
          break;
        case 'hls':
          await this.initHls(url);
          break;
        case 'native':
          await this.initNative(url);
          break;
      }
    } catch (error) {
      console.error(`[Player] Engine ${engine} failed to initialize:`, error);
      this.handleEngineError(engine);
    }
  }

  private async initMpegts(url: string): Promise<void> {
    const mpegts = await getMpegts();

    if (!mpegts || !mpegts.isSupported()) {
      throw new Error('mpegts.js is not supported in this browser');
    }

    const player = mpegts.createPlayer(
      {
        type: url.includes('.m3u8') ? 'hls' : 'mpegts',
        url: url,
        isLive: true,
      },
      {
        enableWorker: true,
        enableStashBuffer: true,
        stashInitialSize: 1024 * 1024, // 1MB initial buffer
        lazyLoad: false,
        lazyLoadMaxDuration: 3 * 60, // 3 minutes
        lazyLoadRecoverDuration: 30,
        deferLoadAfterSourceOpen: false,
        autoCleanupSourceBuffer: true,
        autoCleanupMaxBackwardDuration: 60,
        autoCleanupMinBackwardDuration: 30,
        fixAudioTimestampGap: true,
        accurateSeek: false,
        seekType: 'range',
        reuseRedirectedURL: true,
        liveBufferLatencyChasing: true,
        liveBufferLatencyMaxLatency: 1.5,
        liveBufferLatencyMinRemain: 0.5,
      }
    );

    player.attachMediaElement(this.video);

    player.on(mpegts.Events.ERROR, (errorType: unknown, errorDetail: unknown, errorInfo: unknown) => {
      console.error(`[mpegts] Error: ${errorType} - ${errorDetail}`, errorInfo);

      // Check if it's a fatal error
      if (errorType === mpegts.ErrorTypes.NETWORK_ERROR ||
          errorType === mpegts.ErrorTypes.MEDIA_ERROR) {
        this.handleEngineError('mpegts');
      }
    });

    player.on(mpegts.Events.LOADING_COMPLETE, () => {
      console.log('[mpegts] Loading complete');
    });

    player.on(mpegts.Events.MEDIA_INFO, (mediaInfo: unknown) => {
      console.log('[mpegts] Media info:', mediaInfo);
      // Check for audio
      const info = mediaInfo as { hasAudio?: boolean };
      if (info.hasAudio === false) {
        this.callbacks.onStateChange({ hasAudio: false });
      } else {
        this.callbacks.onStateChange({ hasAudio: true });
      }
    });

    player.on(mpegts.Events.STATISTICS_INFO, () => {
      // Stream is working, reset error count
      this.errorCounts.mpegts = 0;
    });

    player.load();
    player.play();
    this.mpegtsPlayer = player;

    // Set up video element listeners
    this.setupVideoListeners();
  }

  private async initHls(url: string): Promise<void> {
    if (!Hls.isSupported()) {
      throw new Error('HLS.js is not supported in this browser');
    }

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
      maxStarvationDelay: 4,
      maxLoadingDelay: 4,
    });

    hls.loadSource(url);
    hls.attachMedia(this.video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log('[HLS] Manifest parsed');
      this.video.play().catch(() => {});
      this.callbacks.onStateChange({ isBuffering: false });
      this.errorCounts.hls = 0;
    });

    hls.on(Hls.Events.FRAG_LOADED, () => {
      this.errorCounts.hls = 0;
    });

    hls.on(Hls.Events.ERROR, (_, data) => {
      console.error('[HLS] Error:', data.type, data.details, data.fatal);

      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            this.errorCounts.hls++;
            if (this.errorCounts.hls > 3) {
              this.handleEngineError('hls');
            } else {
              setTimeout(() => hls.startLoad(), 1000 * this.errorCounts.hls);
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            this.errorCounts.hls++;
            if (this.errorCounts.hls > 5) {
              this.handleEngineError('hls');
            } else if (this.errorCounts.hls > 3) {
              hls.swapAudioCodec();
              hls.recoverMediaError();
            } else {
              hls.recoverMediaError();
            }
            break;
          default:
            this.handleEngineError('hls');
            break;
        }
      }
    });

    this.hlsInstance = hls;
    this.setupVideoListeners();
  }

  private async initNative(url: string): Promise<void> {
    this.video.src = url;

    this.video.onerror = () => {
      console.error('[Native] Video error:', this.video.error);
      this.handleEngineError('native');
    };

    try {
      await this.video.play();
      this.callbacks.onStateChange({ isBuffering: false });
    } catch (error) {
      console.error('[Native] Play failed:', error);
      this.handleEngineError('native');
    }

    this.setupVideoListeners();
  }

  private setupVideoListeners(): void {
    const video = this.video;

    video.onwaiting = () => {
      this.callbacks.onStateChange({ isBuffering: true });
    };

    video.onplaying = () => {
      this.callbacks.onStateChange({ isBuffering: false, isPlaying: true });
    };

    video.oncanplay = () => {
      this.callbacks.onStateChange({ isBuffering: false });
    };

    video.onpause = () => {
      this.callbacks.onStateChange({ isPlaying: false });
    };
  }

  private handleEngineError(failedEngine: PlayerEngine): void {
    if (this.isDestroyed) return;

    console.log(`[Player] Engine ${failedEngine} failed, finding fallback...`);
    this.errorCounts[failedEngine]++;

    // Find the next engine to try
    const currentIndex = this.engineOrder.indexOf(failedEngine);
    const nextEngines = this.engineOrder.slice(currentIndex + 1);

    if (nextEngines.length > 0) {
      // Try next engine with same URL
      const nextEngine = nextEngines[0];
      console.log(`[Player] Switching to engine: ${nextEngine}`);
      this.callbacks.onEngineSwitch(failedEngine, nextEngine);
      this.tryEngine(nextEngine);
    } else {
      // All engines failed for this URL, try next URL
      const urls = this.getAllUrls();
      this.currentUrlIndex++;

      if (this.currentUrlIndex < urls.length) {
        console.log(`[Player] All engines failed, trying next URL (${this.currentUrlIndex + 1}/${urls.length})`);
        // Reset to first engine with new URL
        this.errorCounts = { mpegts: 0, hls: 0, native: 0 };
        this.tryEngine('mpegts');
      } else {
        // All URLs and engines exhausted
        console.error('[Player] All playback options exhausted');
        this.callbacks.onStateChange({
          hasError: true,
          errorMessage: 'Unable to play stream',
          isBuffering: false,
        });
        this.callbacks.onFatalError('Unable to play this stream. The source may be offline or incompatible.');
      }
    }
  }

  retry(): void {
    // Reset everything and start fresh
    this.currentUrlIndex = 0;
    this.errorCounts = { mpegts: 0, hls: 0, native: 0 };
    this.callbacks.onStateChange({ hasError: false, errorMessage: null });
    this.tryEngine('mpegts');
  }

  tryNextUrl(): void {
    const urls = this.getAllUrls();
    this.currentUrlIndex = (this.currentUrlIndex + 1) % urls.length;
    this.errorCounts = { mpegts: 0, hls: 0, native: 0 };
    this.tryEngine('mpegts');
  }

  switchEngine(engine: PlayerEngine): void {
    this.callbacks.onEngineSwitch(this.currentEngine, engine);
    this.tryEngine(engine);
  }

  getCurrentEngine(): PlayerEngine {
    return this.currentEngine;
  }

  play(): void {
    this.video.play().catch(() => {});
  }

  pause(): void {
    this.video.pause();
  }

  setVolume(volume: number): void {
    this.video.volume = volume;
  }

  setMuted(muted: boolean): void {
    this.video.muted = muted;
  }

  destroy(): void {
    this.isDestroyed = true;
    this.destroyCurrentEngine();
  }
}
