import { MatchesResponse } from '../lib/api'
import { Sparkles, MapPin } from 'lucide-react'
import PlaceImage from './PlaceImage'

interface Props {
  matches: MatchesResponse | null
}

export default function MatchesPanel({ matches }: Props) {
  return (
    <div className="bg-trip-card rounded-[2rem] p-6 border border-trip-border">
      <div className="flex items-center gap-2 text-white mb-4">
        <Sparkles className="text-trip-green w-5 h-5" />
        <h2 className="text-lg font-bold">Matches</h2>
      </div>

      {!matches || matches.matches.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400">No matches yet.</p>
          <p className="text-xs text-gray-500 mt-1">
            When everyone in the group likes the same place, it shows up here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {matches.matches.slice(0, 8).map((m) => (
            <li
              key={m.id}
              className="bg-trip-item border border-trip-border rounded-2xl p-3 flex gap-3"
            >
              <div className="w-14 h-14 rounded-xl bg-trip-card overflow-hidden flex-shrink-0">
                <PlaceImage
                  src={m.image}
                  title={m.title}
                  category={m.category}
                  className="w-full h-full"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{m.title}</p>
                <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {m.location}
                </p>
                <p className="text-[10px] text-trip-green font-bold mt-1 uppercase tracking-wider">
                  {m.likes} of {matches.member_count} liked
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
