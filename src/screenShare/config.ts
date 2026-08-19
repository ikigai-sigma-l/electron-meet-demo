export interface ScreenShareConfig {
  whipEndpointUrl: string
  maxFrameRate: number
  maxWidth: number
  maxHeight: number
  maxVideoBitrate: number
}

// Resolved at build time from .env (see vite-env.d.ts for the ImportMetaEnv typing).
// Vite inlines these as literal values in the built bundle, so changing .env requires
// a rebuild — this is a PoC meant to show the config shape, not a live-reconfigurable app.
export const SCREEN_SHARE_CONFIG: ScreenShareConfig = {
  whipEndpointUrl: import.meta.env.VITE_WHIP_ENDPOINT_URL,
  maxFrameRate: Number(import.meta.env.VITE_MAX_FRAME_RATE),
  maxWidth: Number(import.meta.env.VITE_MAX_WIDTH),
  maxHeight: Number(import.meta.env.VITE_MAX_HEIGHT),
  maxVideoBitrate: Number(import.meta.env.VITE_MAX_VIDEO_BITRATE),
}
