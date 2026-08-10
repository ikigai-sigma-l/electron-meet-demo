export interface AttachFfmpegOptions {
  /** ffmpeg WebSocket relay base URL, e.g. ws://127.0.0.1:8590 */
  baseUrl?: string
}

export interface FfmpegHandle {
  detach(): void
}
