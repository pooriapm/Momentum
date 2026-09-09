import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/app.css'
import App from './app/App.tsx'
import { applyUiTheme, loadUiState } from './lib/ui-state'
import { registerGlobalErrorReporting } from './platform/observability/safe-error-report'

registerGlobalErrorReporting()
applyUiTheme(loadUiState().theme)

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Momentum root element was not found.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
