import { useEffect, useState } from 'react'

interface DesktopSource {
  id: string
  name: string
  thumbnailDataUrl: string
}

export default function DesktopSourcePicker({ onSourceChosen }: { onSourceChosen?: () => void }) {
  const [sources, setSources] = useState<DesktopSource[] | null>(null)

  useEffect(() => {
    // Not present when this build is opened in a plain browser tab (e.g. `vite
    // preview`) instead of the Electron shell — nothing to intercept there, the
    // browser shows its own native getDisplayMedia() picker.
    if (!window.ipcRenderer) return

    const handleSources = (_event: unknown, incoming: DesktopSource[]) => setSources(incoming)
    const handlePermissionDenied = () => {
      setSources(null)
      alert(
        '無法取得螢幕分享來源，請到「系統設定 > 隱私權與安全性 > 螢幕錄製」授權此 App，並完全重新啟動 App 後再試一次。',
      )
    }
    window.ipcRenderer.on('desktop-capturer-sources', handleSources)
    window.ipcRenderer.on('desktop-capturer-permission-denied', handlePermissionDenied)
    return () => {
      window.ipcRenderer.off('desktop-capturer-sources', handleSources)
      window.ipcRenderer.off('desktop-capturer-permission-denied', handlePermissionDenied)
    }
  }, [])

  if (!sources) return null

  const select = (id: string | null) => {
    window.ipcRenderer.send('desktop-capturer-source-selected', id)
    setSources(null)
    if (id) onSourceChosen?.()
  }

  return (
    <div
      onClick={() => select(null)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#1e1e1e', borderRadius: 8, padding: 24, maxWidth: 640, width: '90%' }}
      >
        <h2 style={{ marginTop: 0 }}>選擇要分享的畫面</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxHeight: 400, overflowY: 'auto' }}>
          {sources.map((source) => (
            <button
              key={source.id}
              onClick={() => select(source.id)}
              style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 8, cursor: 'pointer' }}
            >
              <img src={source.thumbnailDataUrl} alt={source.name} style={{ width: '100%', borderRadius: 4 }} />
              <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {source.name}
              </span>
            </button>
          ))}
        </div>
        <button onClick={() => select(null)} style={{ marginTop: 16 }}>
          取消
        </button>
      </div>
    </div>
  )
}
