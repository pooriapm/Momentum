import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import type { AppLocale } from '../../platform/i18n/catalog'
import {
  loadEnglishGuides,
  loadExerciseAnimation,
  loadExerciseLibrary,
  type LibraryExercise,
} from '../data/exercise-library'
import type { WorkoutExerciseDetail } from '../data/types'
import { formatNumber } from '../lib/format'
import './ExerciseGuide.css'

const DAY_MS = 86_400_000

function useExerciseLibrary() {
  return useQuery({ queryKey: ['exercise-library'], queryFn: loadExerciseLibrary, staleTime: 3 * DAY_MS, gcTime: Infinity, retry: 1 })
}

function ExerciseAnimation({ anim, label }: { anim: string; label: string }) {
  const host = useRef<HTMLDivElement>(null)
  const animation = useQuery({ queryKey: ['exercise-animation', anim], queryFn: () => loadExerciseAnimation(anim), staleTime: Infinity, gcTime: Infinity, retry: 1 })
  const data = animation.data

  useEffect(() => {
    const container = host.current
    if (!container || !data) return
    let disposed = false
    let player: { destroy: () => void } | undefined
    void import('lottie-web/build/player/lottie_light').then(({ default: lottie }) => {
      if (disposed) return
      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
      const instance = lottie.loadAnimation({
        container,
        renderer: 'svg',
        loop: true,
        autoplay: !still,
        // Lottie mutates the data it plays, so each player gets its own copy.
        animationData: structuredClone(data),
      })
      if (still) instance.goToAndStop(Math.floor(instance.totalFrames / 2), true)
      player = instance
    })
    return () => {
      disposed = true
      player?.destroy()
    }
  }, [data])

  if (animation.isError) return null
  return <div aria-label={label} className="exercise-guide__animation" ref={host} role="img" />
}

/** How to do one exercise: the animated figure, the steps and a safety tip. */
export function ExerciseGuide({ exercise, locale }: { exercise: WorkoutExerciseDetail; locale: AppLocale }) {
  const fa = locale === 'fa'
  const library = useExerciseLibrary()
  const english = useQuery({ queryKey: ['exercise-guide-en'], queryFn: loadEnglishGuides, enabled: !fa, staleTime: Infinity, gcTime: Infinity })
  const match: LibraryExercise | undefined = library.data?.find(exercise.exerciseId, [exercise.name.fa, exercise.name.en])

  if (library.isPending || (!fa && english.isPending)) {
    return <div aria-busy="true" className="exercise-guide exercise-guide--loading">{fa ? 'در حال آوردن راهنما…' : 'Loading the guide…'}</div>
  }
  if (library.isError || english.isError) {
    return (
      <div className="exercise-guide" role="alert">
        {fa ? 'راهنما بارگیری نشد. اتصال را بررسی کن.' : 'The guide could not be loaded. Check your connection.'}
        <button className="exercise-guide__retry" onClick={() => { void library.refetch(); void english.refetch() }} type="button">{fa ? 'دوباره' : 'Retry'}</button>
      </div>
    )
  }
  if (!match) {
    return <div className="exercise-guide">{fa ? 'برای این حرکت هنوز راهنمایی نداریم.' : 'There is no guide for this exercise yet.'}</div>
  }

  const text = fa
    ? { muscles: match.muscles, steps: match.steps, tip: match.tip ?? undefined, eq: match.eq }
    : english.data?.[match.id]
  if (!text) {
    return <div className="exercise-guide">{fa ? 'برای این حرکت هنوز راهنمایی نداریم.' : 'There is no guide for this exercise yet.'}</div>
  }
  const name = fa ? match.fa : match.en

  return (
    <div className="exercise-guide">
      {match.anim ? <ExerciseAnimation anim={match.anim} label={fa ? `نمایش حرکت ${name}` : `${name} demonstration`} /> : null}
      <div className="exercise-guide__body">
        <p className="exercise-guide__meta">
          <strong>{fa ? 'عضلات: ' : 'Muscles: '}</strong>{text.muscles}
          {text.eq?.length ? <><br /><strong>{fa ? 'وسیله: ' : 'Equipment: '}</strong>{text.eq.join(fa ? '، ' : ', ')}</> : null}
        </p>
        <ol className="exercise-guide__steps">
          {text.steps.map((step, index) => (
            <li key={step}><span aria-hidden="true">{formatNumber(index + 1, locale)}</span>{step}</li>
          ))}
        </ol>
        {text.tip ? <p className="exercise-guide__tip"><strong>{fa ? 'نکته: ' : 'Tip: '}</strong>{text.tip}</p> : null}
      </div>
    </div>
  )
}
