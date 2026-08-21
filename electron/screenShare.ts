import { desktopCapturer, ipcMain, session, shell } from 'electron'

/**
 * Main-process half of the screenShare feature (renderer half: src/screenShare/).
 * Electron has no browser chrome to show a getDisplayMedia() source picker, so this
 * intercepts the request, asks the renderer to render its own picker
 * (src/screenShare/DesktopSourcePicker.tsx), and resolves once the user chooses a
 * source. The 3 IPC channel names below are the contract with that component.
 */
export function setupScreenShareHandler() {
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    // Electron's native binding throws synchronously if `video` was requested but the
    // callback doesn't provide a stream, so there's no clean "deny" path when the user
    // cancels or sources can't be listed — swallow that specific throw instead of
    // letting it surface as an unhandled promise rejection.
    const denyRequest = () => {
      try {
        callback({})
      } catch {
        // expected when request.videoRequested is true; see comment above.
      }
    }

    desktopCapturer
      .getSources({ types: ['screen', 'window'], thumbnailSize: { width: 300, height: 200 } })
      .then((sources) => {
        // The requesting frame may have navigated away or been destroyed by the time
        // sources finish listing — nothing to send the picker to in that case.
        if (!request.frame) {
          denyRequest()
          return
        }
        request.frame.send(
          'desktop-capturer-sources',
          sources.map((source) => ({
            id: source.id,
            name: source.name,
            thumbnailDataUrl: source.thumbnail.toDataURL(),
          })),
        )
        ipcMain.once('desktop-capturer-source-selected', (_event, sourceId: string | null) => {
          const source = sourceId ? sources.find((s) => s.id === sourceId) : undefined
          if (source) {
            callback({ video: source })
          } else {
            denyRequest()
          }
        })
      })
      .catch((err) => {
        // Calling getSources() is what makes macOS register this app in
        // System Settings > Privacy & Security > Screen Recording in the first
        // place, so this failure path is also the first time that entry appears.
        console.error('Failed to list desktop capturer sources:', err)
        if (process.platform === 'darwin') {
          shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture')
        }
        request.frame?.send('desktop-capturer-permission-denied')
        denyRequest()
      })
  })
}
