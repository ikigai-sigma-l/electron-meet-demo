import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import App from './App'

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Only present when running inside Electron (injected by the preload script);
// absent when this build is opened in a plain browser tab (e.g. `vite preview`).
window.ipcRenderer?.on('main-process-message', (_event, message) => {
  console.log(message)
})
