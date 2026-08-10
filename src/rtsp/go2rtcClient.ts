export async function registerStream(baseUrl: string, name: string, rtspUrl: string): Promise<void> {
  const url = `${baseUrl}/api/streams?name=${encodeURIComponent(name)}&src=${encodeURIComponent(rtspUrl)}`
  const res = await fetch(url, { method: 'PUT' })
  if (!res.ok) {
    throw new Error(`go2rtc: failed to register stream "${name}" (${res.status})`)
  }
}

export async function unregisterStream(baseUrl: string, name: string): Promise<void> {
  await fetch(`${baseUrl}/api/streams?src=${encodeURIComponent(name)}`, { method: 'DELETE' })
}

interface WebRtcConnection {
  pc: RTCPeerConnection
  ws: WebSocket
  /** Resolves once the remote track is attached to the video element. */
  ready: Promise<void>
}

/**
 * Speaks go2rtc's browser signaling protocol: JSON messages over WebSocket
 * (`webrtc/offer`, `webrtc/answer`, `webrtc/candidate`), matching go2rtc's
 * own www/video-rtc.js client.
 */
export function connectWebRtc(baseUrl: string, streamName: string, video: HTMLVideoElement): WebRtcConnection {
  const wsUrl = `${baseUrl.replace(/^http/, 'ws')}/api/ws?src=${encodeURIComponent(streamName)}`
  const ws = new WebSocket(wsUrl)
  const pc = new RTCPeerConnection()

  pc.addTransceiver('video', { direction: 'recvonly' })
  pc.addTransceiver('audio', { direction: 'recvonly' })

  const ready = new Promise<void>((resolve, reject) => {
    let settled = false
    const fail = (err: Error) => {
      if (settled) return
      settled = true
      reject(err)
    }

    pc.addEventListener('icecandidate', (ev) => {
      if (ws.readyState !== WebSocket.OPEN) return
      const candidate = ev.candidate?.toJSON().candidate ?? ''
      ws.send(JSON.stringify({ type: 'webrtc/candidate', value: candidate }))
    })

    pc.addEventListener('track', (ev) => {
      console.debug(`[rtsp:${streamName}] received ${ev.track.kind} track`, ev.track)
    })

    pc.addEventListener('connectionstatechange', () => {
      console.debug(`[rtsp:${streamName}] connectionState = ${pc.connectionState}`)

      if (pc.connectionState === 'connected') {
        const tracks = pc
          .getTransceivers()
          .filter((tr) => tr.currentDirection === 'recvonly')
          .map((tr) => tr.receiver.track)
        video.srcObject = new MediaStream(tracks)
        video.muted = true
        video.play().catch((err) => console.error(`[rtsp:${streamName}] video.play() failed:`, err))
        settled = true
        resolve()
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        fail(new Error(`go2rtc WebRTC connection ${pc.connectionState}`))
      }
    })

    ws.addEventListener('open', () => {
      console.debug(`[rtsp:${streamName}] ws open, creating offer`)
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer).then(() => offer))
        .then((offer) => ws.send(JSON.stringify({ type: 'webrtc/offer', value: offer.sdp })))
        .catch(fail)
    })

    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data as string)
      console.debug(`[rtsp:${streamName}] ws message:`, msg.type)
      switch (msg.type) {
        case 'webrtc/answer':
          pc.setRemoteDescription({ type: 'answer', sdp: msg.value }).catch(fail)
          break
        case 'webrtc/candidate':
          if (msg.value) pc.addIceCandidate({ candidate: msg.value, sdpMid: '0' }).catch(() => {})
          break
        case 'error':
          fail(new Error(msg.value))
          break
      }
    })

    ws.addEventListener('error', () => fail(new Error('go2rtc WebSocket error')))
  })

  return { pc, ws, ready }
}
