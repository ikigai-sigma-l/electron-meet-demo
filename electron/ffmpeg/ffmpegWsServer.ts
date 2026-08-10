import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import { WebSocket, WebSocketServer } from 'ws'
import { FFMPEG_WS_PORT } from '../../src/ffmpeg/constants'

let httpServer: Server | null = null
let wss: WebSocketServer | null = null

function resolveBinaryPath(): string {
  return process.env.FFMPEG_BIN || 'ffmpeg'
}

function handleConnection(ws: WebSocket, rtspUrl: string): void {
  const ffmpeg: ChildProcessWithoutNullStreams = spawn(resolveBinaryPath(), [
    '-rtsp_transport',
    'tcp',
    '-i',
    rtspUrl,
    '-c:v',
    'copy',
    '-c:a',
    'copy',
    '-f',
    'flv',
    'pipe:1',
  ])

  ffmpeg.stdout.on('data', (chunk: Buffer) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(chunk)
  })
  ffmpeg.stderr.on('data', (chunk: Buffer) => console.error(`[ffmpeg] ${chunk}`.trimEnd()))
  ffmpeg.on('exit', (code) => {
    console.warn(`[ffmpeg] process exited with code ${code}`)
    if (ws.readyState === WebSocket.OPEN) ws.close()
  })

  ws.on('close', () => ffmpeg.kill())
}

/** Spawns one ffmpeg process per connected client; no de-dup across viewers of the same URL. */
export function startFfmpegWsServer(): void {
  if (wss) return

  httpServer = createServer()
  wss = new WebSocketServer({ server: httpServer })

  wss.on('connection', (ws, req) => {
    const rtspUrl = new URL(req.url ?? '', 'http://localhost').searchParams.get('url')
    if (!rtspUrl) {
      ws.close(1008, 'missing "url" query param')
      return
    }
    handleConnection(ws, rtspUrl)
  })

  httpServer.listen(FFMPEG_WS_PORT, '127.0.0.1')
}

export function stopFfmpegWsServer(): void {
  wss?.clients.forEach((client) => client.close())
  wss?.close()
  wss = null
  httpServer?.close()
  httpServer = null
}
