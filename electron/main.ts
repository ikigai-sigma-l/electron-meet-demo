import { app, BrowserWindow, desktopCapturer, ipcMain, session, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('before-quit', () => {
})

app.whenReady().then(() => {
  createWindow()

  // The renderer's getDisplayMedia() call (triggered by the screen-share button in
  // @livekit/components-react) has no browser chrome to show a source picker, so we
  // intercept it here, ask the renderer to render its own picker, and resolve once
  // the user chooses a source.
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
        request.frame.send('desktop-capturer-permission-denied')
        denyRequest()
      })
  })
})
