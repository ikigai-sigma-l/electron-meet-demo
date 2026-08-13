interface WhipSession {
  pc: RTCPeerConnection
  /** Absolute URL of the resource SRS created for this session; DELETE it to stop publishing. */
  resourceUrl: string | null
}

/**
 * SRS's WHIP endpoint answers synchronously from a single POST (it's ICE-lite
 * and doesn't support trickle ICE), so the offer must already contain the
 * full candidate set — wait for gathering to finish before sending it.
 */
function waitForIceGatheringComplete(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    const check = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', check)
        resolve()
      }
    }
    pc.addEventListener('icegatheringstatechange', check)
  })
}

function waitForConnected(pc: RTCPeerConnection): Promise<void> {
  if (pc.connectionState === 'connected') return Promise.resolve()
  return new Promise((resolve, reject) => {
    const onChange = () => {
      if (pc.connectionState === 'connected') {
        pc.removeEventListener('connectionstatechange', onChange)
        resolve()
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        pc.removeEventListener('connectionstatechange', onChange)
        reject(new Error(`media server connection ${pc.connectionState}`))
      }
    }
    pc.addEventListener('connectionstatechange', onChange)
  })
}

/** Resolves the `Location` response header (often relative) against the WHIP endpoint. */
function resolveResourceUrl(endpoint: string, location: string | null): string | null {
  if (!location) return null
  return new URL(location, endpoint).toString()
}

/**
 * Publishes `stream` to an SRS WHIP endpoint: POST the SDP offer as
 * `application/sdp` and get the SDP answer back as the response body.
 */
export async function publishWhip(endpoint: string, stream: MediaStream): Promise<WhipSession> {
  const pc = new RTCPeerConnection()

  try {
    // Track order in the offer's m-lines must be audio-then-video: that's the order
    // SRS's WHIP answerer always emits, and JSEP requires the answer's m-line order
    // to match the offer's exactly. stream.getTracks() order isn't guaranteed to be
    // audio-first (getDisplayMedia({video, audio}) puts video first in Chromium),
    // so add explicitly rather than iterating it.
    const audioTrack = stream.getAudioTracks()[0]
    const videoTrack = stream.getVideoTracks()[0]
    if (audioTrack) pc.addTrack(audioTrack, stream)
    if (videoTrack) pc.addTrack(videoTrack, stream)

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await waitForIceGatheringComplete(pc)

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: pc.localDescription?.sdp ?? '',
    })
    if (!res.ok) {
      throw new Error(`WHIP publish failed: ${res.status} ${res.statusText}`)
    }

    const answerSdp = await res.text()
    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

    const resourceUrl = resolveResourceUrl(endpoint, res.headers.get('Location'))
    await waitForConnected(pc)

    return { pc, resourceUrl }
  } catch (err) {
    pc.close()
    throw err
  }
}

/** Tells SRS to stop the stream (best-effort) and closes the local connection. */
export async function teardownWhip(session: WhipSession): Promise<void> {
  if (session.resourceUrl) {
    await fetch(session.resourceUrl, { method: 'DELETE' }).catch((err) => {
      console.error('[screen-share] WHIP DELETE failed:', err)
    })
  }
  session.pc.close()
}
