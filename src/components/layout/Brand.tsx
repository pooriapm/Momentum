export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <img
        alt=""
        aria-hidden="true"
        className="size-11 shrink-0 rounded-[15px] border border-[var(--border-strong)] object-cover shadow-[0_8px_24px_rgba(0,0,0,0.22)]"
        src="/pwa-192.png"
      />
      <div>
        <p className="text-[10px] font-bold tracking-[0.24em] text-[var(--text-muted)]" dir="ltr">
          MOMENTUM
        </p>
        <p className="mt-0.5 text-sm font-bold text-[var(--text-primary)]">
          ریتم پایدار، پیشرفت واقعی
        </p>
      </div>
    </div>
  )
}
