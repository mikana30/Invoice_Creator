import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import LicenseActivation from './components/LicenseActivation.jsx'
import { initializeAPI } from './api'

// Check if we should show license activation screen
const isActivatePage = window.location.hash === '#/activate'

// Initialize API (gets port from Electron if running in Electron)
initializeAPI().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      {isActivatePage ? (
        <LicenseActivation onActivated={() => {
          // License activated - reload to main app
          window.location.hash = ''
          window.location.reload()
        }} />
      ) : (
        <App />
      )}
    </StrictMode>,
  )
})
