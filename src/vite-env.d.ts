/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WHIP_ENDPOINT_URL: string
  readonly VITE_MAX_FRAME_RATE: string
  readonly VITE_MAX_WIDTH: string
  readonly VITE_MAX_HEIGHT: string
  readonly VITE_MAX_VIDEO_BITRATE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
