import { useEffect, useState } from 'react'
import { LiveKitRoom, useLocalParticipant, useRoomContext } from '@livekit/components-react'
import { Room, TokenSource } from 'livekit-client'
import '@livekit/components-styles'
import DesktopSourcePicker from './DesktopSourcePicker'

interface RoomCredentials {
  serverUrl: string
  token: string
}

function JoinForm({ onJoin }: { onJoin: (creds: RoomCredentials) => void }) {
  const [sandboxId, setSandboxId] = useState(localStorage.getItem('lk-sandbox-id') ?? '')
  const [roomName, setRoomName] = useState('test-room')
  const [participantName, setParticipantName] = useState(
    `user-${Math.floor(Math.random() * 10000)}`,
  )
  const [error, setError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsJoining(true)
    try {
      localStorage.setItem('lk-sandbox-id', sandboxId)
      const tokenSource = TokenSource.sandboxTokenServer(sandboxId)
      const { serverUrl, participantToken } = await tokenSource.fetch({
        roomName,
        participantName,
        participantIdentity: participantName,
      })
      onJoin({ serverUrl, token: participantToken })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 360, margin: '80px auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h1>加入會議</h1>
      <label>
        Sandbox ID
        <input value={sandboxId} onChange={(e) => setSandboxId(e.target.value)} required placeholder="來自 LiveKit Cloud Sandbox > Token Server" />
      </label>
      <label>
        Room name
        <input value={roomName} onChange={(e) => setRoomName(e.target.value)} required />
      </label>
      <label>
        Your name
        <input value={participantName} onChange={(e) => setParticipantName(e.target.value)} required />
      </label>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit" disabled={isJoining}>
        {isJoining ? '連線中...' : '加入會議'}
      </button>
    </form>
  )
}

/**
 * Renders only the interactive source picker while a screen share hasn't been
 * published yet (auto-triggered by the `screen` prop on <LiveKitRoom>, see below —
 * NOT called imperatively here, to avoid racing LiveKitRoom's own on-connect publish
 * logic), and a single stop button once it has. A watchdog disconnects the room if
 * sharing hasn't started within a reasonable time (e.g. picker cancelled, no
 * permission) — LiveKitRoom's onError prop handles the case where it fails outright.
 */
function ScreenShareSession() {
  const room = useRoomContext()
  const { isScreenShareEnabled } = useLocalParticipant()
  const [isPublishing, setIsPublishing] = useState(false)

  useEffect(() => {
    if (isScreenShareEnabled) return
    const timeout = setTimeout(() => {
      console.error('[screen-share] timed out waiting for screen share to start')
      room.disconnect()
    }, 20_000)
    return () => clearTimeout(timeout)
  }, [room, isScreenShareEnabled])

  const handleStop = async () => {
    await room.localParticipant.setScreenShareEnabled(false)
    await room.disconnect()
  }

  if (!isScreenShareEnabled) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>{isPublishing ? '已選擇畫面，正在建立分享連線...' : '正在選擇要分享的畫面...'}</p>
        <DesktopSourcePicker
          onSourceChosen={() => {
            console.log('[screen-share] source chosen, awaiting publish...')
            setIsPublishing(true)
          }}
        />
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button onClick={handleStop} style={{ fontSize: 24, padding: '24px 48px' }}>
        結束分享並離開會議室
      </button>
    </div>
  )
}

export default function App() {
  const [credentials, setCredentials] = useState<RoomCredentials | null>(null)
  // Created ourselves (rather than letting <LiveKitRoom> create one internally) so
  // onError below can call room.disconnect() directly.
  const [room] = useState(() => new Room())

  if (!credentials) {
    return <JoinForm onJoin={setCredentials} />
  }

  return (
    <LiveKitRoom
      room={room}
      serverUrl={credentials.serverUrl}
      token={credentials.token}
      connect
      audio={false}
      video={false}
      screen
      onError={(err) => {
        console.error('[screen-share] failed to start:', err)
        room.disconnect()
      }}
      data-lk-theme="default"
      style={{ height: '100vh' }}
      onDisconnected={() => setCredentials(null)}
    >
      <ScreenShareSession />
    </LiveKitRoom>
  )
}
