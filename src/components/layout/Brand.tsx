import { APP_CONFIG } from '../../config/app'
import { MomentumLogo } from '../brand/MomentumLogo'

export function Brand() {
  return (
    <div className="brand-lockup flex items-center gap-2" dir="rtl">
      <MomentumLogo
        className="brand-mark size-11 shrink-0 rounded-[15px] shadow-[var(--shadow-brand)]"
        motion="header"
      />
      <div className="brand-copy min-w-0 text-right">
        <p
          className="brand-wordmark w-full text-right text-[10px] font-bold tracking-[0.22em]"
          dir="ltr"
        >
          {APP_CONFIG.wordmark}
        </p>
        <p className="brand-tagline mt-0.5 whitespace-nowrap text-right text-sm font-bold text-[var(--color-text)]">
          {APP_CONFIG.tagline}
        </p>
      </div>
    </div>
  )
}
