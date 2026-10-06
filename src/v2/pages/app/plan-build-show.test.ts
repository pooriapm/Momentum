import { describe, expect, it } from 'vitest'
import { PLAN_BUILD_ESTIMATE_MS, PLAN_BUILD_STAGES, planBuildBar, rememberPlanBuildDuration, resolvePlanBuildShow } from './plan-build-show'

describe('plan build show', () => {
  it('opens on personal setup and ends on almost ready', () => {
    expect(PLAN_BUILD_STAGES[0]?.title.fa).toBe('داریم شرایط شخصی‌ت رو بررسی می‌کنیم')
    expect(PLAN_BUILD_STAGES[1]?.title.fa).toContain('غذاهای مورد علاقه‌ت')
    expect(PLAN_BUILD_STAGES.at(-1)?.title.fa).toBe('برنامه اختصاصی‌ت تقریباً آماده‌ست')
    expect(PLAN_BUILD_STAGES[0]?.title.en).toBe("We're looking through what works for you")
    expect(PLAN_BUILD_STAGES.at(-1)?.title.en).toBe('Your plan is almost ready')
  })

  it('walks the stages across the estimate and holds the finale if the job runs long', () => {
    const start = resolvePlanBuildShow({ elapsedMs: 0 })
    const middle = resolvePlanBuildShow({ elapsedMs: PLAN_BUILD_ESTIMATE_MS * 0.45 })
    const ending = resolvePlanBuildShow({ elapsedMs: PLAN_BUILD_ESTIMATE_MS })
    const late = resolvePlanBuildShow({ elapsedMs: PLAN_BUILD_ESTIMATE_MS * 2 })

    expect(start.stageIndex).toBe(0)
    expect(start.bar).toBe(0)
    expect(middle.stageIndex).toBeGreaterThan(0)
    expect(middle.stageIndex).toBeLessThan(PLAN_BUILD_STAGES.length - 1)
    expect(ending.stageIndex).toBe(PLAN_BUILD_STAGES.length - 1)
    expect(ending.bar).toBeLessThanOrEqual(0.9)
    expect(late.stageIndex).toBe(PLAN_BUILD_STAGES.length - 1)
    expect(late.overtime).toBe(true)
    expect(late.bar).toBeGreaterThan(ending.bar)
    expect(late.bar).toBeLessThan(1)
  })

  it('keeps the bar moving forward and stretches when the estimate changes', () => {
    let previous = 0
    for (let elapsed = 0; elapsed <= 180_000; elapsed += 5_000) {
      const bar = planBuildBar(elapsed, PLAN_BUILD_ESTIMATE_MS)
      expect(bar).toBeGreaterThanOrEqual(previous)
      expect(bar).toBeLessThan(1)
      previous = bar
    }

    const fast = resolvePlanBuildShow({ elapsedMs: 30_000, estimateMs: 45_000 })
    const slow = resolvePlanBuildShow({ elapsedMs: 30_000, estimateMs: 150_000 })
    expect(fast.stageIndex).toBeGreaterThan(slow.stageIndex)
  })

  it('jumps ahead when the real job is already validating or importing', () => {
    expect(resolvePlanBuildShow({ elapsedMs: 0, phase: 'validating' }).stageIndex).toBe(6)
    expect(resolvePlanBuildShow({ elapsedMs: 0, phase: 'importing' }).stageIndex).toBe(7)
  })

  it('changes the detail line while a stage is on screen', () => {
    const first = resolvePlanBuildShow({ elapsedMs: 1_000 })
    const next = resolvePlanBuildShow({ elapsedMs: 8_000 })
    expect(first.stageIndex).toBe(0)
    expect(next.stageIndex).toBe(0)
    expect(next.detailIndex).toBeGreaterThan(first.detailIndex)
  })

  it('remembers a finished run without treating a flash as the new estimate', () => {
    const storage = {
      value: null as string | null,
      getItem() { return this.value },
      setItem(_key: string, value: string) { this.value = value },
    }
    rememberPlanBuildDuration(2_000, storage)
    expect(storage.value).toBeNull()
    rememberPlanBuildDuration(120_000, storage)
    expect(Number(storage.value)).toBeGreaterThan(90_000)
    expect(Number(storage.value)).toBeLessThanOrEqual(150_000)
  })
})