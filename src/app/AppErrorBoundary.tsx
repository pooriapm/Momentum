import { Component, type ReactNode } from 'react'
import { reportSafeError } from '../platform/observability/safe-error-report'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  failed: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    reportSafeError({ code: 'fatal_render', error })
  }

  render() {
    if (!this.state.failed) return this.props.children
    const fa = document.documentElement.lang === 'fa'
    return (
      <main className="fatal-error-page" role="alert">
        <img alt="Momentum" decoding="async" height="72" src="/brand/momentum-orbit-splash.svg" width="72" />
        <h1>{fa ? 'این صفحه کامل بارگذاری نشد' : 'This page did not load completely'}</h1>
        <p>{fa ? 'اطلاعات حسابت تغییری نکرده است. صفحه را دوباره بارگذاری کن.' : 'Your account data has not changed. Reload the page to try again.'}</p>
        <button className="orbit-button orbit-button--primary" onClick={() => window.location.reload()} type="button">{fa ? 'بارگذاری دوباره' : 'Reload'}</button>
      </main>
    )
  }
}
