import { DesktopSourcePicker, useScreenShare } from './screenShare'

const STATUS_LABEL: Record<string, string> = {
  picking: '請選擇要分享的畫面...',
  connecting: '連線中...',
}

export default function App() {
  const { status, error, start, stop } = useScreenShare()

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      {/* Mounted throughout so its IPC listeners are already attached by the time
          getDisplayMedia() triggers the main process to send sources over. */}
      <DesktopSourcePicker />

      {status === 'sharing' ? (
        <button onClick={stop} style={{ fontSize: 24, padding: '24px 48px' }}>
          停止分享
        </button>
      ) : (
        <button
          onClick={start}
          disabled={status === 'picking' || status === 'connecting'}
          style={{ fontSize: 24, padding: '24px 48px' }}
        >
          {STATUS_LABEL[status] ?? '分享畫面'}
        </button>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}
