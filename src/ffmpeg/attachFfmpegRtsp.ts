import mpegts from 'mpegts.js'
import { FFMPEG_WS_BASE_URL } from './constants'
import type { AttachFfmpegOptions, FfmpegHandle } from './types'

/**
 * Plays an RTSP source by asking the local ffmpeg-over-WebSocket relay
 * (electron/ffmpeg/ffmpegWsServer.ts) to remux it to FLV, then feeding that
 * into mpegts.js (MSE) on `video`.
 */
export async function attachFfmpegRtsp(
  video: HTMLVideoElement,
  rtspUrl: string,
  options: AttachFfmpegOptions = {},
): Promise<FfmpegHandle> {
  if (!mpegts.isSupported()) {
    throw new Error('mpegts.js is not supported in this environment (Media Source Extensions unavailable)')
  }

  const baseUrl = options.baseUrl ?? FFMPEG_WS_BASE_URL
  const url = `${baseUrl}/rtsp?url=${encodeURIComponent(rtspUrl)}`

  const player = mpegts.createPlayer(
    { type: 'flv', isLive: true, url },
    { isLive: true, liveBufferLatencyChasing: true },
  )
  player.attachMediaElement(video)
  player.load()
  await player.play()

  return {
    detach() {
      player.pause()
      player.unload()
      player.detachMediaElement()
      player.destroy()
    },
  }
}
