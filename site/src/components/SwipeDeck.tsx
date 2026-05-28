import { useEffect, useMemo, useState } from 'react'
import { api, Group, Place } from '../lib/api'
import { Loader2, X, Heart, MapPin, Star, RefreshCw } from 'lucide-react'
import PlaceImage from './PlaceImage'

interface Props {
  group: Group
  onVoted: () => void
  onError: (msg: string | null) => void
}

const CATEGORIES = ['All', 'Sights', 'Food', 'Museums'] as const
type Category = (typeof CATEGORIES)[number]

export default function SwipeDeck({ group, onVoted, onError }: Props) {
  const [category, setCategory] = useState<Category>('All')
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right' | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setLoading(true)
    onError(null)
    try {
      const res = await api.getGroupPlaces(group, category)
      // skip places this user already voted on
      const pending = res.places.filter((p) => !p.my_vote)
      setPlaces(pending)
      setIndex(0)
      setDirection(null)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not load places.')
      setPlaces([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!group.destination) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.code, category])

  const active = places[index] ?? null

  const remaining = useMemo(() => Math.max(places.length - index, 0), [places.length, index])

  async function handleVote(liked: boolean) {
    if (!active || submitting) return
    setSubmitting(true)
    setDirection(liked ? 'right' : 'left')
    try {
      await api.vote(group.code, active, liked)
      onVoted()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save vote.')
    } finally {
      setTimeout(() => {
        setIndex((i) => i + 1)
        setDirection(null)
        setSubmitting(false)
      }, 250)
    }
  }

  if (!group.destination) {
    return (
      <div className="bg-trip-card border border-trip-border rounded-[2rem] p-12 text-center">
        <p className="text-gray-400">No destination yet — finish setup first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">
            What to do in {group.destination}?
          </h2>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
            Swipe right to like — everyone who likes the same place makes a match.
          </p>
        </div>
        <button
          onClick={load}
          className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-trip-border hover:border-trip-blue transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-all border ${
              category === c
                ? 'bg-trip-blue text-white border-trip-blue shadow-lg shadow-blue-900/20'
                : 'bg-trip-item text-gray-400 border-trip-border hover:text-white hover:border-gray-500'
            }`}
          >
            {c}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-500">
          {loading ? '…' : `${remaining} left`}
        </span>
      </div>

      <div className="relative w-full max-w-md mx-auto h-[600px]">
        {loading ? (
          <div className="absolute inset-0 bg-trip-card rounded-[2.5rem] border border-trip-border flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-trip-blue animate-spin mb-3" />
            <p className="text-gray-400 text-sm">
              Finding {category.toLowerCase()} in {group.destination}…
            </p>
          </div>
        ) : active ? (
          <>
            <div className="absolute inset-0 bg-trip-card rounded-[2.5rem] transform translate-y-4 scale-95 opacity-40 border border-trip-border" />
            <div className="absolute inset-0 bg-trip-card rounded-[2.5rem] transform translate-y-2 scale-[0.975] opacity-60 border border-trip-border" />
            <div
              className={`absolute inset-0 bg-trip-card rounded-[2.5rem] overflow-hidden border border-trip-border shadow-2xl flex flex-col transition-all duration-300 ${
                direction === 'left' ? '-translate-x-[150%] -rotate-12 opacity-0' : ''
              } ${direction === 'right' ? 'translate-x-[150%] rotate-12 opacity-0' : ''}`}
            >
              <div className="relative h-[300px] flex-shrink-0 bg-trip-item">
                <PlaceImage
                  src={active.image}
                  title={active.title}
                  category={active.category}
                  className="absolute inset-0 w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-trip-card via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5">
                  <span className="bg-trip-blue/90 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {active.category}
                  </span>
                  <h3 className="text-2xl font-bold text-white mt-2 leading-tight">
                    {active.title}
                  </h3>
                </div>
              </div>
              <div className="p-6 flex-grow flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-trip-green font-bold">
                      <Star className="w-4 h-4 fill-current" /> {active.rating}
                    </div>
                    <div className="text-white font-bold">{active.price}</div>
                  </div>
                  <div className="flex items-start gap-2 text-gray-400 text-sm">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{active.location}</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
                    {active.description}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-8 pt-6">
                  <button
                    onClick={() => handleVote(false)}
                    disabled={submitting}
                    className="w-16 h-16 rounded-full bg-trip-item border border-trip-border flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition-colors shadow-lg active:scale-90 disabled:opacity-50"
                    aria-label="Pass"
                  >
                    <X className="w-8 h-8" />
                  </button>
                  <button
                    onClick={() => handleVote(true)}
                    disabled={submitting}
                    className="w-16 h-16 rounded-full bg-trip-item border border-trip-border flex items-center justify-center text-trip-green hover:bg-trip-green/10 transition-colors shadow-lg active:scale-90 disabled:opacity-50"
                    aria-label="Like"
                  >
                    <Heart className="w-8 h-8 fill-current" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-trip-card rounded-[2.5rem] border border-trip-border flex flex-col items-center justify-center text-center p-8">
            <p className="text-white font-bold text-lg mb-2">All swiped!</p>
            <p className="text-gray-400 text-sm mb-6">
              You've voted on every {category === 'All' ? 'place' : category.toLowerCase()} we have for {group.destination}.
            </p>
            <button
              onClick={load}
              className="bg-trip-blue text-white font-bold py-2 px-6 rounded-full hover:bg-blue-500 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Reload
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
