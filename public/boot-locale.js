(() => {
  const locale = /^\/en(?:\/|$)/.test(window.location.pathname) ? 'en' : 'fa'
  document.documentElement.lang = locale
  document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr'

  if ('serviceWorker' in navigator) {
    let hadController = Boolean(navigator.serviceWorker.controller)
    let reloading = false

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) {
        hadController = true
        return
      }
      if (reloading) return
      reloading = true
      window.location.reload()
    })

    window.addEventListener('load', () => {
      void navigator.serviceWorker.getRegistration()
        .then((registration) => registration?.update())
        .catch(() => undefined)
    }, { once: true })
  }
})()
