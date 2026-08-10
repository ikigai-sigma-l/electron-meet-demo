import { GO2RTC_BASE_URL } from './constants'
import { connectWebRtc, registerStream, unregisterStream } from './go2rtcClient'
import type { AttachRtspOptions, RtspHandle } from './types'

function toStreamName(rtspUrl: string): string {
  let hash = 0
  for (let i = 0; i < rtspUrl.length; i++) {
    hash = (hash * 31 + rtspUrl.charCodeAt(i)) >>> 0
  }
  return `cam-${hash.toString(16)}`
}

/**
 * Registers `rtspUrl` with the local go2rtc gateway and plays it on `video`
 * over WebRTC. The same rtspUrl always maps to the same go2rtc stream name,
 * so concurrent attach() calls for the same camera share one upstream pull.
 */
export async function attachRtsp(
  video: HTMLVideoElement,
  rtspUrl: string,
  options: AttachRtspOptions = {},
): Promise<RtspHandle> {
  const baseUrl = options.baseUrl ?? GO2RTC_BASE_URL
  const streamName = toStreamName(rtspUrl)

  await registerStream(baseUrl, streamName, rtspUrl)

  const { pc, ws, ready } = connectWebRtc(baseUrl, streamName, video)

  try {
    await ready
  } catch (err) {
    pc.close()
    ws.close()
    throw err
  }

  return {
    streamName,
    detach() {
      pc.close()
      ws.close()
      video.srcObject = null
      if (options.removeStreamOnDetach) {
        unregisterStream(baseUrl, streamName).catch(() => {})
      }
    },
  }
}
