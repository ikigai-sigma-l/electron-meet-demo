export interface ScreenShareOptions {
  /** SRS WHIP publish endpoint, e.g. http://host:1985/rtc/v1/whip/?app=live&stream=room1 */
  serverUrl?: string
}

export interface ScreenShareHandle {
  detach(): void
}
