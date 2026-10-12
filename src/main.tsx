import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/app.css'
import App from './app/App.tsx'
import { applyUiTheme, hasStoredThemePreference, loadUiState, systemTheme } from './lib/ui-state'
import { registerGlobalErrorReporting } from './platform/observability/safe-error-report'

registerGlobalErrorReporting()
applyUiTheme(loadUiState().theme)

// Keep following the system appearance until someone picks a theme in settings.
window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', () => {
  if (!hasStoredThemePreference()) applyUiTheme(systemTheme())
})

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Momentum root element was not found.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
