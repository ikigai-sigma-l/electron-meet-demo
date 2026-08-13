import { WHIP_ENDPOINT_URL } from './constants'
import { createSilentAudioTrack } from './silentAudioTrack'
import { publishWhip, teardownWhip } from './whipClient'
import type { ScreenShareHandle, ScreenShareOptions } from './types'

/**
 * Publishes `stream` (as returned by getDisplayMedia()) to the SRS WHIP
 * endpoint. Resolves once the connection is up; call detach() to stop the
 * stream on the server and tear down locally.
 */
export async function attachScreenShare(
  stream: MediaStream,
  options: ScreenShareOptions = {},
): Promise<ScreenShareHandle> {
  const serverUrl = options.serverUrl ?? WHIP_ENDPOINT_URL

  // stream has no audio track (Electron's desktop-capturer handler doesn't attach one,
  // and there's no system-audio loopback option on macOS) — see silentAudioTrack.ts for why
  // that matters to SRS.
  const silentAudio = stream.getAudioTracks().length === 0 ? createSilentAudioTrack() : null
  const publishStream = silentAudio ? new MediaStream([silentAudio.track, ...stream.getVideoTracks()]) : stream

  const session = await publishWhip(serverUrl, publishStream).catch((err) => {
    silentAudio?.stop()
    stream.getTracks().forEach((track) => track.stop())
    throw err
  })

  return {
    detach() {
      teardownWhip(session).catch(() => {})
      silentAudio?.stop()
      stream.getTracks().forEach((track) => track.stop())
    },
  }
}
