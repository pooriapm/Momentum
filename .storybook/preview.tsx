import type { Preview } from '@storybook/react-vite'
import type { ReactNode } from 'react'
import { sb } from 'storybook/test'
import '../src/styles/app.css'
import './preview.css'

sb.mock(import('../src/v2/data/pricing.ts'), { spy: true })
sb.mock(import('../src/v2/data/repository.ts'), { spy: true })
sb.mock(import('../src/v2/onboarding/repository.ts'), { spy: true })
sb.mock(import('../src/v2/external-plan/external-plan.ts'), { spy: true })
sb.mock(import('../src/platform/pwa/network.ts'), { spy: true })

type MomentumTheme = 'light' | 'dark'
type MomentumLocale = 'fa' | 'en'

const preview: Preview = {
  initialGlobals: {
    theme: 'light',
    locale: 'fa',
  },
  globalTypes: {
    theme: {
      description: 'Momentum color theme',
      toolbar: {
        icon: 'contrast',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
    locale: {
      description: 'Preview language and direction',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'fa', title: 'فارسی' },
          { value: 'en', title: 'English' },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme as MomentumTheme
      const locale = context.globals.locale as MomentumLocale
      const direction = locale === 'fa' ? 'rtl' : 'ltr'

      document.documentElement.dataset.theme = theme
      document.documentElement.classList.toggle('light', theme === 'light')
      document.documentElement.lang = locale
      document.documentElement.dir = direction

      return (
        <div className="storybook-canvas" dir={direction} lang={locale}>
          <Story />
        </div>
      ) as ReactNode
    },
  ],
  parameters: {
    a11y: {
      test: 'todo',
    },
    controls: {
      expanded: true,
    },
    layout: 'fullscreen',
    viewport: {
      options: {
        compact320: { name: 'Compact 320', styles: { width: '320px', height: '568px' }, type: 'mobile' },
        compact375: { name: 'Compact 375', styles: { width: '375px', height: '667px' }, type: 'mobile' },
        compact390: { name: 'Compact 390', styles: { width: '390px', height: '844px' }, type: 'mobile' },
        medium768: { name: 'Medium 768', styles: { width: '768px', height: '1024px' }, type: 'tablet' },
        expanded1440: { name: 'Expanded 1440', styles: { width: '1440px', height: '1024px' }, type: 'desktop' },
      },
    },
    options: {
      storySort: {
        order: ['Foundations', 'Components', 'Patterns', 'Screens'],
      },
    },
  },
}

export default preview
