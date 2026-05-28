import { useState } from 'react'
import { api, Group } from '../lib/api'
import { Loader2, MapPin, Copy, Check, Compass, Globe2 } from 'lucide-react'

interface Props {
  group: Group
  onDone: (g: Group) => void
  onLeave: () => void
  onError: (msg: string | null) => void
}

type Mode = 'choose' | 'have-destination' | 'browse-countries'

const SUGGESTED_COUNTRIES = [
  'Japan',
  'Italy',
  'France',
  'Thailand',
  'Spain',
  'Greece',
  'Portugal',
  'Iceland',
  'Mexico',
  'Vietnam',
  'Morocco',
  'Croatia',
]

const COUNTRY_CITIES: Record<string, string[]> = {
  Japan: ['Tokyo', 'Kyoto', 'Osaka', 'Hokkaido'],
  Italy: ['Rome', 'Florence', 'Venice', 'Milan'],
  France: ['Paris', 'Nice', 'Lyon', 'Bordeaux'],
  Thailand: ['Bangkok', 'Chiang Mai', 'Phuket'],
  Spain: ['Barcelona', 'Madrid', 'Seville', 'Valencia'],
  Greece: ['Athens', 'Santorini', 'Crete'],
  Portugal: ['Lisbon', 'Porto', 'Algarve'],
  Iceland: ['Reykjavík'],
  Mexico: ['Mexico City', 'Oaxaca', 'Tulum'],
  Vietnam: ['Hanoi', 'Ho Chi Minh City', 'Da Nang'],
  Morocco: ['Marrakech', 'Fez', 'Chefchaouen'],
  Croatia: ['Split', 'Dubrovnik', 'Zagreb'],
}

export default function SetupWizard({ group, onDone, onLeave, onError }: Props) {
  const [mode, setMode] = useState<Mode>('choose')
  const [destination, setDestination] = useState(group.destination ?? '')
  const [country, setCountry] = useState<string | null>(group.country)
  const [start, setStart] = useState(group.start_date ?? '')
  const [end, setEnd] = useState(group.end_date ?? '')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(group.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  async function saveAndFinish(payload: {
    destination?: string | null
    country?: string | null
    start_date?: string | null
    end_date?: string | null
  }) {
    setBusy(true)
    onError(null)
    try {
      const updated = await api.updateSetup(group.code, { ...payload, mark_done: true })
      onDone(updated)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save setup.')
    } finally {
      setBusy(false)
    }
  }

  async function saveCountryOnly(c: string) {
    setBusy(true)
    onError(null)
    try {
      await api.updateSetup(group.code, { country: c, mark_done: false })
      setCountry(c)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save country.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-[2.5rem] p-8 mb-6 shadow-xl">
          <p className="text-xs uppercase tracking-widest text-blue-200 font-medium">Group created</p>
          <h1 className="text-3xl font-bold text-white mt-1 mb-5">{group.name}</h1>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between border border-white/10">
            <div>
              <p className="text-xs text-blue-200 uppercase tracking-wider font-medium">Share this code</p>
              <p className="text-3xl font-bold text-white tracking-[0.3em] font-mono mt-1">{group.code}</p>
            </div>
            <button
              onClick={copyCode}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-blue-200 mt-3">
            Anyone with this code can join your group and vote on places.
          </p>
        </div>

        <div className="bg-trip-card border border-trip-border rounded-[2rem] p-8 shadow-xl">
          {mode === 'choose' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">Do you know where you're going?</h2>
                <p className="text-sm text-gray-400 mt-1">
                  We'll pull places for the whole group to vote on.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setMode('have-destination')}
                  className="bg-trip-item border border-trip-border rounded-2xl p-5 text-left hover:border-trip-blue hover:bg-trip-blue/5 transition-colors group"
                >
                  <div className="bg-trip-blue/20 p-2.5 rounded-xl w-fit mb-3 group-hover:bg-trip-blue/30 transition-colors">
                    <MapPin className="w-5 h-5 text-trip-blue" />
                  </div>
                  <p className="font-bold text-white">Yes, I have a city</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Tell us where and start swiping.
                  </p>
                </button>
                <button
                  onClick={() => setMode('browse-countries')}
                  className="bg-trip-item border border-trip-border rounded-2xl p-5 text-left hover:border-trip-blue hover:bg-trip-blue/5 transition-colors group"
                >
                  <div className="bg-trip-green/20 p-2.5 rounded-xl w-fit mb-3 group-hover:bg-trip-green/30 transition-colors">
                    <Globe2 className="w-5 h-5 text-trip-green" />
                  </div>
                  <p className="font-bold text-white">Still deciding</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Pick a country first, then narrow it down.
                  </p>
                </button>
              </div>
            </div>
          )}

          {mode === 'have-destination' && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!destination.trim()) return
                saveAndFinish({
                  destination: destination.trim(),
                  start_date: start || null,
                  end_date: end || null,
                })
              }}
              className="space-y-5"
            >
              <div>
                <button
                  type="button"
                  onClick={() => setMode('choose')}
                  className="text-xs text-gray-500 hover:text-gray-300 mb-3"
                >
                  ← Back
                </button>
                <h2 className="text-xl font-bold text-white">Where to?</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Enter a city or area. We'll geocode it with OpenStreetMap.
                </p>
              </div>
              <input
                autoFocus
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Paris, France"
                className="w-full bg-trip-item border border-trip-border rounded-2xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-trip-blue"
              />
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Start (optional)</span>
                  <input
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="mt-1 w-full bg-trip-item border border-trip-border rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-trip-blue"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">End (optional)</span>
                  <input
                    type="date"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="mt-1 w-full bg-trip-item border border-trip-border rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-trip-blue"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={busy || !destination.trim()}
                className="w-full bg-trip-blue text-white font-bold py-3 px-6 rounded-full shadow-lg shadow-blue-900/30 disabled:opacity-40 hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Start swiping
              </button>
            </form>
          )}

          {mode === 'browse-countries' && (
            <div className="space-y-5">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setMode('choose')
                    setCountry(null)
                  }}
                  className="text-xs text-gray-500 hover:text-gray-300 mb-3"
                >
                  ← Back
                </button>
                <h2 className="text-xl font-bold text-white">
                  {country ? `Where in ${country}?` : 'Pick a country'}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  {country
                    ? 'Pick a city, or skip and we use the country itself.'
                    : 'Just a starting point — you can change this anytime.'}
                </p>
              </div>

              {!country && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SUGGESTED_COUNTRIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => saveCountryOnly(c)}
                      disabled={busy}
                      className="bg-trip-item border border-trip-border rounded-2xl px-4 py-3 text-sm font-bold text-white hover:border-trip-blue hover:bg-trip-blue/5 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <Compass className="w-4 h-4 text-trip-blue" />
                      {c}
                    </button>
                  ))}
                </div>
              )}

              {country && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {(COUNTRY_CITIES[country] ?? []).map((city) => (
                      <button
                        key={city}
                        disabled={busy}
                        onClick={() => saveAndFinish({ destination: `${city}, ${country}`, country })}
                        className="bg-trip-item border border-trip-border rounded-2xl px-4 py-3 text-sm font-bold text-white hover:border-trip-blue hover:bg-trip-blue/5 transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        <MapPin className="w-4 h-4 text-trip-blue" />
                        {city}
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={busy}
                    onClick={() => saveAndFinish({ destination: country, country })}
                    className="w-full bg-trip-blue text-white font-bold py-3 px-6 rounded-full shadow-lg shadow-blue-900/30 disabled:opacity-40 hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                  >
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                    Use {country} (any city)
                  </button>
                  <button
                    onClick={() => setCountry(null)}
                    className="w-full text-xs text-gray-500 hover:text-gray-300"
                  >
                    Pick a different country
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onLeave}
          className="block mx-auto mt-6 text-xs text-gray-500 hover:text-gray-300"
        >
          Leave this group
        </button>
      </div>
    </div>
  )
}
