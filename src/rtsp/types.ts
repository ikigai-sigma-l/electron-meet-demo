export interface AttachRtspOptions {
  /** go2rtc API base URL, e.g. http://127.0.0.1:1984 */
  baseUrl?: string
  /** Remove the stream mapping from go2rtc when detach() is called. Default false, since the same RTSP URL may be shared by other viewers. */
  removeStreamOnDetach?: boolean
}

export interface RtspHandle {
  readonly streamName: string
  detach(): void
}
