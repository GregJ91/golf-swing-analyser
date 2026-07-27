import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

function isBrowserCompatible(): boolean {
  return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices && 'WebAssembly' in window
}

const rootElement = document.getElementById('root')!

if (!isBrowserCompatible()) {
  rootElement.innerHTML =
    '<p style="padding:1rem;font-family:system-ui">This browser is missing camera or WebAssembly support needed for pose detection. Please use an up-to-date mobile Safari or Chrome.</p>'
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
