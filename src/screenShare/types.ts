export interface ScreenShareOptions {
  /** WHIP publish endpoint, e.g. http://host:8889/room1/whip */
  serverUrl?: string
  /** Caps the video encoder's target bitrate, in bits/sec. */
  maxVideoBitrate?: number
}

export interface ScreenShareHandle {
  detach(): void
}
