import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { GO2RTC_API_PORT } from '../../src/rtsp/constants'

let proc: ChildProcessWithoutNullStreams | null = null

function resolveBinaryPath(): string {
  if (process.env.GO2RTC_BIN) return process.env.GO2RTC_BIN

  const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'darwin' : 'linux'
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64'
  const exe = process.platform === 'win32' ? 'go2rtc.exe' : 'go2rtc'
  return path.join(process.env.APP_ROOT ?? process.cwd(), 'resources', 'go2rtc', `${platform}-${arch}`, exe)
}

function writeConfig(): string {
  const configPath = path.join(os.tmpdir(), 'go2rtc.electron.yaml')
  // `streams:` must stay block-style (no trailing `{}`) — go2rtc patches this
  // file with line-based text edits when streams are added via the API, and
  // a flow-style empty map breaks that patcher ("did not find expected key").
  const yaml = ['api:', `  listen: "127.0.0.1:${GO2RTC_API_PORT}"`, '  origin: "*"', 'streams:', ''].join('\n')
  fs.writeFileSync(configPath, yaml, 'utf-8')
  return configPath
}

/** Spawns the go2rtc gateway so `src/rtsp` can reach it at GO2RTC_BASE_URL. */
export function startGo2rtc(): void {
  if (proc) return

  const bin = resolveBinaryPath()
  if (!fs.existsSync(bin)) {
    console.error(`[go2rtc] binary not found at "${bin}". Set GO2RTC_BIN or place the executable there.`)
    return
  }

  const configPath = writeConfig()
  proc = spawn(bin, ['-config', configPath], { stdio: 'pipe' })
  proc.stdout.on('data', (chunk) => console.log(`[go2rtc] ${chunk}`.trimEnd()))
  proc.stderr.on('data', (chunk) => console.error(`[go2rtc] ${chunk}`.trimEnd()))
  proc.on('exit', (code) => {
    console.warn(`[go2rtc] process exited with code ${code}`)
    proc = null
  })
}

export function stopGo2rtc(): void {
  if (!proc) return
  proc.kill()
  proc = null
}
