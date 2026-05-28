import { useState } from 'react'
import { MapPin, Utensils, Landmark, Building2 } from 'lucide-react'

interface Props {
  src: string | null | undefined
  title: string
  category: string
  className?: string
}

const CATEGORY_STYLE: Record<
  string,
  { from: string; to: string; Icon: typeof MapPin }
> = {
  Food: { from: 'from-orange-700', to: 'to-rose-900', Icon: Utensils },
  Museums: { from: 'from-violet-700', to: 'to-indigo-900', Icon: Landmark },
  Sights: { from: 'from-cyan-700', to: 'to-blue-900', Icon: Building2 },
}

// Deterministic hue offset per title so a row of fallback cards isn't monotone.
function hueShiftDeg(title: string): number {
  let h = 0
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) & 0xff
  return (h % 36) - 18
}

export default function PlaceImage({ src, title, category, className = '' }: Props) {
  const [broken, setBroken] = useState(false)
  const showImage = src && !broken

  const style = CATEGORY_STYLE[category] ?? CATEGORY_STYLE.Sights
  const { Icon } = style

  if (showImage) {
    return (
      <img
        src={src}
        alt={title}
        loading="lazy"
        className={`object-cover ${className}`}
        onError={() => setBroken(true)}
      />
    )
  }

  return (
    <div
      className={`relative bg-gradient-to-br ${style.from} ${style.to} flex flex-col items-center justify-center text-center p-4 ${className}`}
      style={{ filter: `hue-rotate(${hueShiftDeg(title)}deg)` }}
    >
      <Icon className="w-10 h-10 text-white/40 mb-2" />
      <p className="text-white/90 font-bold text-sm leading-tight line-clamp-3">{title}</p>
      <span className="text-[10px] text-white/50 uppercase tracking-widest mt-1">{category}</span>
    </div>
  )
}
