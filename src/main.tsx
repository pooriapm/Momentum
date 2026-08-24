import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/app.css'
import App from './app/App.tsx'
import { APP_CONFIG } from './config/app'
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

const bootSplash = document.getElementById('boot-splash')

if (bootSplash) {
  const elapsedSinceNavigation = performance.now()
  const remainingDuration = Math.max(
    0,
    APP_CONFIG.brandMotion.bootMinimumDurationMs - elapsedSinceNavigation,
  )

  window.setTimeout(() => {
    let removed = false
    const removeSplash = () => {
      if (removed) {
        return
      }

      removed = true
      bootSplash.remove()
    }

    bootSplash.addEventListener('animationend', removeSplash, { once: true })
    bootSplash.classList.add('boot-splash--exit')
    window.setTimeout(
      removeSplash,
      APP_CONFIG.brandMotion.bootExitDurationMs + 150,
    )
  }, remainingDuration)
}
