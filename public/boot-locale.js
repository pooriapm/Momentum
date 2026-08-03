(() => {
  const locale = /^\/en(?:\/|$)/.test(window.location.pathname) ? 'en' : 'fa'
  document.documentElement.lang = locale
  document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr'
})()
