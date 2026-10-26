import {
  BatteryMedium,
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  ChartLine,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleUserRound,
  Clock3,
  Dumbbell,
  GlassWater,
  House,
  Info,
  LoaderCircle,
  Minus,
  Plus,
  RefreshCw,
  Salad,
  Scale,
  ShieldAlert,
  ShoppingBasket,
  TriangleAlert,
  Utensils,
  WifiOff,
  X,
  type LucideIcon,
} from 'lucide-react'

// One glyph per concept. Look a concept up here before importing a Lucide icon; a new concept is
// added here first, so the same idea never appears as two different icons. Line icons, stroke 2,
// 18–20px in controls (icon-slot-sm), 64px in empty states (icon-slot-lg). Back/forward chevrons
// take the directional-icon class so they mirror in RTL.
export const conceptIcons = {
  // Destinations
  today: House,
  plan: CalendarRange,
  progress: ChartLine,
  account: CircleUserRound,
  // Plan content
  week: CalendarDays,
  meal: Salad,
  eatingOut: Utensils,
  workout: Dumbbell,
  water: GlassWater,
  grocery: ShoppingBasket,
  weight: Scale,
  energy: BatteryMedium,
  time: Clock3,
  weeklyReport: CalendarCheck2,
  // Status
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
  safety: ShieldAlert,
  offline: WifiOff,
  // Actions
  loading: LoaderCircle,
  retry: RefreshCw,
  back: ChevronLeft,
  forward: ChevronRight,
  close: X,
  add: Plus,
  remove: Minus,
  done: Check,
} as const satisfies Record<string, LucideIcon>

/** Lucide names that duplicate a concept above, with the name to use instead. Tests reject them. */
export const supersededIcons = {
  AlertTriangle: 'TriangleAlert',
  Droplet: 'GlassWater',
  LineChart: 'ChartLine',
  BarChart3: 'ChartLine',
  ArrowLeft: 'ChevronLeft',
  Clock: 'Clock3',
} as const
