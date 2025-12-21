'use client';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

class FFmpegHelper {
  private ffmpeg: FFmpeg | null = null;
  private isLoading: boolean = false;
  private isLoaded: boolean = false;
  private loadPromise: Promise<void> | null = null;

  async load(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this._load();
    return this.loadPromise;
  }

  private async _load(): Promise<void> {
    if (this.isLoading || this.isLoaded) return;
    this.isLoading = true;

    try {
      this.ffmpeg = new FFmpeg();

      // Load FFmpeg core from CDN
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.isLoaded = true;
      console.log('[FFmpeg] Loaded successfully');
    } catch (error) {
      console.error('[FFmpeg] Failed to load:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  isReady(): boolean {
    return this.isLoaded;
  }

  async transcodeAudio(
    inputData: Uint8Array,
    inputFormat: string,
    outputFormat: string = 'aac'
  ): Promise<Uint8Array> {
    if (!this.ffmpeg || !this.isLoaded) {
      await this.load();
    }

    const ffmpeg = this.ffmpeg!;
    const inputFile = `input.${inputFormat}`;
    const outputFile = `output.${outputFormat}`;

    try {
      await ffmpeg.writeFile(inputFile, inputData);

      await ffmpeg.exec([
        '-i', inputFile,
        '-c:a', outputFormat === 'aac' ? 'aac' : 'libmp3lame',
        '-b:a', '192k',
        outputFile,
      ]);

      const data = await ffmpeg.readFile(outputFile);

      // Cleanup
      await ffmpeg.deleteFile(inputFile);
      await ffmpeg.deleteFile(outputFile);

      return data as Uint8Array;
    } catch (error) {
      console.error('[FFmpeg] Transcode failed:', error);
      throw error;
    }
  }

  async convertRecording(
    inputBlob: Blob,
    outputFormat: string = 'mp4'
  ): Promise<Blob> {
    if (!this.ffmpeg || !this.isLoaded) {
      await this.load();
    }

    const ffmpeg = this.ffmpeg!;
    const inputFile = 'input.webm';
    const outputFile = `output.${outputFormat}`;

    try {
      const inputData = await fetchFile(inputBlob);
      await ffmpeg.writeFile(inputFile, inputData);

      // Convert webm to mp4 with compatible codecs
      await ffmpeg.exec([
        '-i', inputFile,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '22',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        outputFile,
      ]);

      const data = await ffmpeg.readFile(outputFile);

      // Cleanup
      await ffmpeg.deleteFile(inputFile);
      await ffmpeg.deleteFile(outputFile);

      // Convert FileData to ArrayBuffer for Blob compatibility
      // Need to copy to a regular ArrayBuffer to avoid SharedArrayBuffer issues
      const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data);
      const buffer = new ArrayBuffer(bytes.length);
      new Uint8Array(buffer).set(bytes);
      return new Blob([buffer], { type: `video/${outputFormat}` });
    } catch (error) {
      console.error('[FFmpeg] Convert failed:', error);
      throw error;
    }
  }

  async extractAudio(inputBlob: Blob, format: string = 'mp3'): Promise<Blob> {
    if (!this.ffmpeg || !this.isLoaded) {
      await this.load();
    }

    const ffmpeg = this.ffmpeg!;
    const inputFile = 'input.webm';
    const outputFile = `output.${format}`;

    try {
      const inputData = await fetchFile(inputBlob);
      await ffmpeg.writeFile(inputFile, inputData);

      await ffmpeg.exec([
        '-i', inputFile,
        '-vn',
        '-c:a', format === 'mp3' ? 'libmp3lame' : 'aac',
        '-b:a', '192k',
        outputFile,
      ]);

      const data = await ffmpeg.readFile(outputFile);

      // Cleanup
      await ffmpeg.deleteFile(inputFile);
      await ffmpeg.deleteFile(outputFile);

      // Convert FileData to ArrayBuffer for Blob compatibility
      // Need to copy to a regular ArrayBuffer to avoid SharedArrayBuffer issues
      const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data);
      const buffer = new ArrayBuffer(bytes.length);
      new Uint8Array(buffer).set(bytes);
      return new Blob([buffer], { type: `audio/${format}` });
    } catch (error) {
      console.error('[FFmpeg] Extract audio failed:', error);
      throw error;
    }
  }

  // Get info about a media file
  async getMediaInfo(inputBlob: Blob): Promise<string> {
    if (!this.ffmpeg || !this.isLoaded) {
      await this.load();
    }

    const ffmpeg = this.ffmpeg!;
    const inputFile = 'input.bin';
    let output = '';

    try {
      const inputData = await fetchFile(inputBlob);
      await ffmpeg.writeFile(inputFile, inputData);

      ffmpeg.on('log', ({ message }) => {
        output += message + '\n';
      });

      await ffmpeg.exec(['-i', inputFile]);
    } catch {
      // ffmpeg -i always exits with error, but output contains info
    }

    try {
      await ffmpeg.deleteFile(inputFile);
    } catch {}

    return output;
  }

  terminate(): void {
    if (this.ffmpeg) {
      this.ffmpeg.terminate();
      this.ffmpeg = null;
      this.isLoaded = false;
    }
  }
}

// Singleton instance
export const ffmpegHelper = new FFmpegHelper();
export default ffmpegHelper;
