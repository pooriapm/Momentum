import { useEffect, type RefObject } from 'react'
import { glass } from '../../design/tokens'

// Liquid Glass refraction for the web. The same technique as rdev/liquid-glass-react and the
// parameters of the Android app's Kyant backdrop: an SVG displacement map, generated for the
// element's exact size and corner radius, bends what is behind the glass in a band along its edge.
// Only Chromium renders SVG filters inside backdrop-filter; Safari and Firefox keep the clear frost
// from CSS (tint, blur, vibrancy), which is what every web implementation falls back to.

const SVG_NS = 'http://www.w3.org/2000/svg'
let host: SVGSVGElement | null = null
let nextId = 0
const mapCache = new Map<string, string>()

export function supportsLiquidRefraction() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  const brands = (navigator as Navigator & { userAgentData?: { brands?: Array<{ brand: string }> } }).userAgentData?.brands
  const chromium = Boolean(brands?.some(({ brand }) => /Chromium|Google Chrome|Microsoft Edge/.test(brand)))
  if (!chromium) return false
  try {
    if (window.matchMedia('(prefers-reduced-transparency: reduce)').matches) return false
    if (window.matchMedia('(prefers-contrast: more)').matches) return false
  } catch {
    // matchMedia unavailable: keep refraction
  }
  return true
}

function filterHost() {
  if (host && host.isConnected) return host
  host = document.createElementNS(SVG_NS, 'svg')
  host.setAttribute('aria-hidden', 'true')
  host.setAttribute('width', '0')
  host.setAttribute('height', '0')
  host.style.position = 'absolute'
  host.style.pointerEvents = 'none'
  document.body.appendChild(host)
  return host
}

// Red and green encode the x and y displacement (128 = none). Inside the bezel the vector points
// toward the centre and grows toward the edge on a convex profile, so the edge magnifies like a lens.
function displacementMap(width: number, height: number, radius: number, bezel: number) {
  const key = `${width}x${height}r${radius}b${bezel}`
  const cached = mapCache.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return ''
  const image = context.createImageData(width, height)
  const r = Math.min(radius, width / 2, height / 2)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Signed distance to the rounded-rectangle edge (positive inside) and the inward normal.
      const px = x + 0.5 - width / 2
      const py = y + 0.5 - height / 2
      const qx = Math.abs(px) - (width / 2 - r)
      const qy = Math.abs(py) - (height / 2 - r)
      let distance: number
      let nx: number
      let ny: number
      if (qx > 0 && qy > 0) {
        const length = Math.hypot(qx, qy) || 1
        distance = r - length
        nx = -Math.sign(px) * (qx / length)
        ny = -Math.sign(py) * (qy / length)
      } else if (qx > qy) {
        distance = r - qx
        nx = -Math.sign(px)
        ny = 0
      } else {
        distance = r - qy
        nx = 0
        ny = -Math.sign(py)
      }
      const t = Math.min(Math.max(distance / bezel, 0), 1)
      const strength = (1 - t) * (1 - t)
      const index = (y * width + x) * 4
      image.data[index] = 128 + nx * strength * 127
      image.data[index + 1] = 128 + ny * strength * 127
      image.data[index + 2] = 128
      image.data[index + 3] = 255
    }
  }
  context.putImageData(image, 0, 0)
  const url = canvas.toDataURL()
  if (mapCache.size > 64) mapCache.clear()
  mapCache.set(key, url)
  return url
}

interface LiquidGlassOptions {
  /** Edge refraction in px; defaults to the material's. 0 keeps frost only. */
  refraction?: number
  /** Width of the refracting edge band in px. */
  bezel?: number
  /** Frost token for the blur: clear (chrome) or frost (menus over text). */
  frost?: 'clear' | 'frost'
  enabled?: boolean
}

export function useLiquidGlass<T extends HTMLElement>(ref: RefObject<T | null>, { refraction = glass.refraction, bezel = glass.bezel, frost = 'clear', enabled = true }: LiquidGlassOptions = {}) {
  useEffect(() => {
    const element = ref.current
    if (!element || !enabled || refraction <= 0 || !supportsLiquidRefraction()) return
    const id = `liquid-glass-${nextId++}`
    const filter = document.createElementNS(SVG_NS, 'filter')
    filter.setAttribute('id', id)
    filter.setAttribute('x', '0')
    filter.setAttribute('y', '0')
    filter.setAttribute('width', '100%')
    filter.setAttribute('height', '100%')
    filter.setAttribute('color-interpolation-filters', 'sRGB')
    const map = document.createElementNS(SVG_NS, 'feImage')
    map.setAttribute('x', '0')
    map.setAttribute('y', '0')
    map.setAttribute('preserveAspectRatio', 'none')
    map.setAttribute('result', 'map')
    const displace = document.createElementNS(SVG_NS, 'feDisplacementMap')
    displace.setAttribute('in', 'SourceGraphic')
    displace.setAttribute('in2', 'map')
    displace.setAttribute('xChannelSelector', 'R')
    displace.setAttribute('yChannelSelector', 'G')
    displace.setAttribute('scale', String(refraction * 2))
    filter.append(map, displace)
    filterHost().appendChild(filter)

    const blur = frost === 'frost' ? 'var(--glass-blur-frost)' : 'var(--glass-blur)'
    const value = `url(#${id}) blur(${blur}) saturate(var(--glass-saturation))`
    const previous = element.style.backdropFilter

    // ResizeObserver already delivers once per frame; the map is cached per size and radius.
    const update = () => {
      const width = Math.round(element.offsetWidth)
      const height = Math.round(element.offsetHeight)
      if (!width || !height) return
      const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0
      const href = displacementMap(width, height, radius, Math.min(bezel, width / 2, height / 2))
      map.setAttribute('width', String(width))
      map.setAttribute('height', String(height))
      map.setAttribute('href', href)
      element.style.backdropFilter = value
      element.style.setProperty('-webkit-backdrop-filter', value)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => {
      observer.disconnect()
      filter.remove()
      element.style.backdropFilter = previous
      element.style.removeProperty('-webkit-backdrop-filter')
    }
  }, [ref, refraction, bezel, frost, enabled])
}
