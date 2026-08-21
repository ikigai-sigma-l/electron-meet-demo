/**
 * Screen sharing over WHIP: capture a local screen/window via getDisplayMedia() and
 * publish it to a WHIP-compatible media server (tested against SRS and MediaMTX).
 *
 * Public API (this file): mount `<DesktopSourcePicker />` once, anywhere in the tree —
 * it renders nothing until a share is in progress — then call `useScreenShare()` for
 * `{ status, error, start, stop }`. Everything else in this folder is an implementation
 * detail (WHIP protocol, codec/bitrate tuning, config) and isn't re-exported on purpose.
 *
 * Requires two things outside this folder to actually work:
 *
 * 1. Electron main process wiring — Electron has no browser chrome to show a source
 *    picker, so `session.defaultSession.setDisplayMediaRequestHandler` must be set up
 *    to list sources via `desktopCapturer.getSources()`, send them to the renderer, and
 *    resolve once `DesktopSourcePicker` reports back a choice. This is main-process-only
 *    (desktopCapturer/session/ipcMain aren't available in the renderer bundle this folder
 *    is part of), so it lives separately at electron/screenShare.ts — the main-process
 *    half of this same feature — wired up from electron/main.ts. The 3 IPC channels are
 *    the contract between the two: `desktop-capturer-sources`,
 *    `desktop-capturer-source-selected`, `desktop-capturer-permission-denied`.
 *    (preload.ts must also expose `window.ipcRenderer` — see electron/preload.ts.)
 *
 * 2. Build-time config via .env (VITE_-prefixed, see config.ts for the full list) —
 *    VITE_WHIP_ENDPOINT_URL, VITE_MAX_FRAME_RATE, VITE_MAX_WIDTH, VITE_MAX_HEIGHT,
 *    VITE_MAX_VIDEO_BITRATE. These are inlined at build time, not reconfigurable
 *    post-build (see the .env at the project root for the current values).
 */
export { default as DesktopSourcePicker } from './DesktopSourcePicker'
export { useScreenShare } from './useScreenShare'
