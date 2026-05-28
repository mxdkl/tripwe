import { useEffect, useState } from 'react'
import { api, ItineraryResponse, ItineraryItem } from '../lib/api'
import {
  Loader2,
  Sparkles,
  Clock,
  MapPin,
  Sun,
  Utensils,
  Sunset,
  Moon,
  ThumbsUp,
  Users,
} from 'lucide-react'
import PlaceImage from './PlaceImage'

interface Props {
  code: string
  onError: (msg: string | null) => void
}

const SLOT_META: Record<string, { label: string; Icon: typeof Sun; color: string }> = {
  morning: { label: 'Morning', Icon: Sun, color: 'text-amber-400' },
  lunch: { label: 'Lunch', Icon: Utensils, color: 'text-orange-400' },
  afternoon: { label: 'Afternoon', Icon: Sunset, color: 'text-rose-400' },
  dinner: { label: 'Dinner', Icon: Moon, color: 'text-indigo-300' },
}

const POLL_INTERVAL_MS = 10_000

function dayHeader(idx: number, isoDate: string | null): string {
  if (!isoDate) return `Day ${idx + 1}`
  const d = new Date(isoDate + 'T00:00:00')
  const formatted = d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  return `Day ${idx + 1} · ${formatted}`
}

export default function ItineraryPanel({ code, onError }: Props) {
  const [data, setData] = useState<ItineraryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0) // forces re-render of "updated X ago"

  async function load() {
    try {
      const fresh = await api.getItinerary(code)
      setData(fresh)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not load itinerary.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    load()
    const t = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  if (loading && !data) {
    return (
      <div className="bg-trip-card border border-trip-border rounded-[2rem] p-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-trip-blue animate-spin" />
      </div>
    )
  }

  const hasItems = data && data.place_count > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-trip-blue" /> Group itinerary
          </h2>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
            Live — updates as you vote and set availability
          </p>
        </div>
        {data && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-trip-green animate-pulse" />
            Updated {timeAgo(data.generated_at)}
          </div>
        )}
      </div>

      {!hasItems ? (
        <EmptyState />
      ) : (
        <>
          <p className="text-xs text-gray-500">
            {data!.place_count} stop{data!.place_count === 1 ? '' : 's'} across{' '}
            {data!.days.length} day{data!.days.length === 1 ? '' : 's'} · {data!.member_count}{' '}
            member{data!.member_count === 1 ? '' : 's'}
          </p>

          <div className="space-y-6">
            {data!.days.map((day) => (
              <DayCard
                key={day.day_index}
                index={day.day_index}
                date={day.date}
                presentMembers={day.present_members}
                items={day.items}
              />
            ))}
          </div>
        </>
      )}

      {/* tick is intentionally referenced so the re-render keeps "Updated X ago" current */}
      <span className="hidden" aria-hidden>{tick}</span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-trip-card border border-trip-border rounded-[2rem] p-12 text-center">
      <div className="inline-flex bg-trip-blue/15 p-4 rounded-2xl mb-4">
        <Sparkles className="w-7 h-7 text-trip-blue" />
      </div>
      <h3 className="text-xl font-bold text-white">No itinerary yet</h3>
      <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
        Vote on places in the <span className="text-white font-semibold">Vote</span> tab — your
        itinerary builds itself as the group's likes come in.
      </p>
    </div>
  )
}

function DayCard({
  index,
  date,
  presentMembers,
  items,
}: {
  index: number
  date: string | null
  presentMembers: { user_id: string; name: string }[]
  items: ItineraryItem[]
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="bg-blue-900/40 text-blue-300 font-bold py-1 px-3 rounded-full text-xs border border-blue-800 uppercase tracking-wider">
            Day {index + 1}
          </div>
          <h3 className="text-lg font-bold text-white">{dayHeader(index, date)}</h3>
        </div>
        <PresentMembersChip members={presentMembers} />
      </div>

      {items.length === 0 ? (
        <div className="bg-trip-card border border-dashed border-trip-border rounded-2xl p-6 text-center text-sm text-gray-500">
          {presentMembers.length === 0
            ? "Nobody available this day."
            : "Nothing scheduled — present members haven't liked enough places yet."}
        </div>
      ) : (
        <div className="ml-3 pl-7 border-l-2 border-trip-border space-y-4">
          {items.map((item, i) => (
            <ItemRow key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function PresentMembersChip({ members }: { members: { user_id: string; name: string }[] }) {
  if (members.length === 0) {
    return (
      <span className="text-xs text-rose-400 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" /> Nobody
      </span>
    )
  }
  return (
    <span className="text-xs text-gray-400 flex items-center gap-1.5">
      <Users className="w-3.5 h-3.5" />
      {members.map((m) => m.name).join(' · ')}
    </span>
  )
}

function ItemRow({ item }: { item: ItineraryItem }) {
  const meta = SLOT_META[item.slot] ?? { label: item.slot, Icon: Clock, color: 'text-gray-300' }
  const Icon = meta.Icon
  const p = item.place

  return (
    <div className="relative bg-trip-card border border-trip-border rounded-2xl p-5">
      <div className="absolute -left-[37px] top-6 w-4 h-4 bg-trip-dark border-4 border-trip-blue rounded-full" />
      <div className="flex gap-4">
        <div className="w-20 h-20 rounded-xl bg-trip-item flex-shrink-0 overflow-hidden">
          <PlaceImage src={p.image} title={p.title} category={p.category} className="w-full h-full" />
        </div>
        <div className="min-w-0 flex-grow">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div
              className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${meta.color}`}
            >
              <Icon className="w-3.5 h-3.5" /> {meta.label} · {item.time}
            </div>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold bg-trip-item px-2 py-0.5 rounded-full border border-trip-border">
              {p.category}
            </span>
          </div>
          <h4 className="text-base font-bold text-white mt-1">{p.title}</h4>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {p.location}
          </p>
          <div className="flex items-center gap-3 mt-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1 text-trip-green font-bold">
              <ThumbsUp className="w-3 h-3" /> {p.likes}
            </span>
            {p.dislikes > 0 && (
              <span className="text-rose-400">
                {p.dislikes} pass{p.dislikes === 1 ? '' : 'es'}
              </span>
            )}
            {p.tags?.website && (
              <a
                href={p.tags.website}
                target="_blank"
                rel="noreferrer"
                className="text-trip-blue hover:underline truncate max-w-[200px]"
              >
                Website ↗
              </a>
            )}
            {p.lat != null && p.lon != null && (
              <a
                href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=18/${p.lat}/${p.lon}`}
                target="_blank"
                rel="noreferrer"
                className="text-trip-blue hover:underline"
              >
                Map ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function timeAgo(epochSeconds: number): string {
  const diff = Date.now() / 1000 - epochSeconds
  if (diff < 5) return 'just now'
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`
  return `${Math.floor(diff / 86400)} d ago`
}
