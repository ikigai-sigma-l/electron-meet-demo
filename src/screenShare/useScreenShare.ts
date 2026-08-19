import { useCallback, useRef, useState } from 'react'
import { attachScreenShare } from './attachScreenShare'
import { SCREEN_SHARE_CONFIG } from './config'
import type { ScreenShareHandle } from './types'

export type ScreenShareStatus = 'idle' | 'picking' | 'connecting' | 'sharing'

export function useScreenShare() {
  const [status, setStatus] = useState<ScreenShareStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const handleRef = useRef<ScreenShareHandle | null>(null)

  const stop = useCallback(() => {
    handleRef.current?.detach()
    handleRef.current = null
    setStatus('idle')
  }, [])

  const start = useCallback(async () => {
    setError(null)
    setStatus('picking')
    try {
      // Electron's main process intercepts this call and renders <DesktopSourcePicker>;
      // resolves with the chosen source's stream, or rejects if the user cancels.
      // Capping resolution/frame rate here (rather than after capture) means Chromium's
      // screen capturer does the downscaling, so the encoder never sees the full-res frames.
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: SCREEN_SHARE_CONFIG.maxFrameRate, max: SCREEN_SHARE_CONFIG.maxFrameRate },
          width: { ideal: SCREEN_SHARE_CONFIG.maxWidth, max: SCREEN_SHARE_CONFIG.maxWidth },
          height: { ideal: SCREEN_SHARE_CONFIG.maxHeight, max: SCREEN_SHARE_CONFIG.maxHeight },
        },
        audio: true,
      })
      setStatus('connecting')

      // Covers the OS-level "stop sharing" indicator, not just our own button.
      stream.getVideoTracks()[0]?.addEventListener('ended', stop)

      handleRef.current = await attachScreenShare(stream)
      setStatus('sharing')
    } catch (err) {
      console.error('[screen-share] failed to start:', err)
      setError(err instanceof Error ? err.message : String(err))
      setStatus('idle')
    }
  }, [stop])

  return { status, error, start, stop }
}
