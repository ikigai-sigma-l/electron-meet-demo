import { useCallback, useRef, useState } from 'react'
import { attachScreenShare } from './webrtc'
import type { ScreenShareHandle } from './webrtc'

export type ScreenShareStatus = 'idle' | 'picking' | 'connecting' | 'sharing'

export function useScreenShare(serverUrl: string) {
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
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      setStatus('connecting')

      // Covers the OS-level "stop sharing" indicator, not just our own button.
      stream.getVideoTracks()[0]?.addEventListener('ended', stop)

      handleRef.current = await attachScreenShare(stream, { serverUrl })
      setStatus('sharing')
    } catch (err) {
      console.error('[screen-share] failed to start:', err)
      setError(err instanceof Error ? err.message : String(err))
      setStatus('idle')
    }
  }, [stop])

  return { status, error, start, stop }
}
