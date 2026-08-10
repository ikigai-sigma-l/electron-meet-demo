import { useState } from 'react'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import { TokenSource } from 'livekit-client'
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

export default function App() {
  const [credentials, setCredentials] = useState<RoomCredentials | null>(null)

  if (!credentials) {
    return <JoinForm onJoin={setCredentials} />
  }

  return (
    <LiveKitRoom
      serverUrl={credentials.serverUrl}
      token={credentials.token}
      connect
      audio
      video
      data-lk-theme="default"
      style={{ height: '100vh' }}
      onDisconnected={() => setCredentials(null)}
    >
      <VideoConference />
      <DesktopSourcePicker />
    </LiveKitRoom>
  )
}
