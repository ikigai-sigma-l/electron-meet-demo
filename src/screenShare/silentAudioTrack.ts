interface SilentAudioTrack {
  track: MediaStreamTrack
  stop(): void
}

/**
 * SRS keeps a fixed audio-then-video slot order for a published source; a
 * video-only publish leaves the audio slot empty, so SRS's playback answer
 * ends up collapsing/reordering m-lines relative to what viewers actually
 * offer, and their browsers reject it. Electron also has no system-audio
 * loopback option for getDisplayMedia() on macOS, so publish silence instead
 * just to keep that audio slot populated.
 */
export function createSilentAudioTrack(): SilentAudioTrack {
  const context = new AudioContext()
  const destination = context.createMediaStreamDestination()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  gain.gain.value = 0
  oscillator.connect(gain).connect(destination)
  oscillator.start()

  return {
    track: destination.stream.getAudioTracks()[0],
    stop() {
      oscillator.stop()
      context.close()
    },
  }
}
