export function Brand() {
  return (
    <div className="brand-lockup flex items-center gap-3">
      <img
        alt=""
        aria-hidden="true"
        className="brand-mark size-11 shrink-0 rounded-[15px] border border-[var(--border-strong)] object-cover shadow-[0_8px_24px_rgba(0,0,0,0.22)]"
        src="/pwa-192.png"
      />
      <div>
        <p className="brand-wordmark text-[10px] font-bold tracking-[0.24em]" dir="ltr">
          MOMENTUM
        </p>
        <p className="mt-0.5 text-sm font-bold text-[var(--text-primary)]">
          ریتم پایدار، پیشرفت واقعی
        </p>
      </div>
    </div>
  )
}
