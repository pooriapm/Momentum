import { I18nProvider } from '../platform/i18n/I18nProvider'
import { QueryProvider } from '../platform/query/QueryProvider'
import { MomentumRouter } from '../v2/router/MomentumRouter'
import { ConnectivityLayer } from '../v2/components/ConnectivityLayer'
import { AppErrorBoundary } from './AppErrorBoundary'

export default function App() {
  return (
    <I18nProvider>
      <QueryProvider>
        <AppErrorBoundary>
          <MomentumRouter />
          <ConnectivityLayer />
        </AppErrorBoundary>
      </QueryProvider>
    </I18nProvider>
  )
}
