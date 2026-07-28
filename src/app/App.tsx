import { AppStateProvider } from './AppStateContext'
import { AppContent } from './AppContent'

export default function App() {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  )
}
