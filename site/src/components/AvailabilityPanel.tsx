import { useEffect, useState } from 'react'
import { api, Group, MemberAvailability } from '../lib/api'
import { session } from '../lib/session'
import { CalendarClock, Loader2, Check } from 'lucide-react'

interface Props {
  group: Group
  onChanged: () => void
  onError: (msg: string | null) => void
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function fmt(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function AvailabilityPanel({ group, onChanged, onError }: Props) {
  const [items, setItems] = useState<MemberAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [justSaved, setJustSaved] = useState(false)

  const myId = session.getUserId()
  const mine = items.find((i) => i.user_id === myId)
  const min = group.start_date || todayIso()
  const max = group.end_date || undefined

  async function load() {
    try {
      const fresh = await api.getAvailability(group.code)
      setItems(fresh)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not load availability.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 10_000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.code])

  useEffect(() => {
    if (mine && editing) {
      setStart(mine.start_date)
      setEnd(mine.end_date)
    }
  }, [mine, editing])

  async function save() {
    if (!start || !end) return
    setSaving(true)
    onError(null)
    try {
      const updated = await api.setAvailability(group.code, start, end)
      setItems(updated)
      setEditing(false)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 1500)
      onChanged()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save dates.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-trip-card rounded-[2rem] p-6 border border-trip-border flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-trip-blue animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-trip-card rounded-[2rem] p-6 border border-trip-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-white">
          <CalendarClock className="text-trip-blue w-5 h-5" />
          <h2 className="text-lg font-bold">Who's around when</h2>
        </div>
        {justSaved && (
          <span className="text-xs text-trip-green flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>

      {!editing ? (
        <>
          <ul className="space-y-2.5">
            {items.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-white truncate">
                  {m.name}
                  {m.user_id === myId && (
                    <span className="ml-1.5 text-[10px] font-bold bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded-full border border-blue-800 uppercase">
                      You
                    </span>
                  )}
                </span>
                <span className={`text-xs font-mono ${m.is_default ? 'text-gray-500' : 'text-gray-300'}`}>
                  {fmt(m.start_date)} → {fmt(m.end_date)}
                  {m.is_default && <span className="ml-1 text-[9px] uppercase">default</span>}
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setEditing(true)}
            className="w-full mt-4 py-2 px-3 border border-trip-border rounded-2xl text-xs font-bold text-trip-blue hover:bg-trip-blue/10 hover:border-trip-blue transition-colors"
          >
            Set my dates
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Arrive</span>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                min={min}
                max={max}
                className="mt-1 w-full bg-trip-item border border-trip-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-trip-blue"
              />
            </label>
          </div>
          <div>
            <label className="block">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Leave</span>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                min={start || min}
                max={max}
                className="mt-1 w-full bg-trip-item border border-trip-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-trip-blue"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving || !start || !end || end < start}
              className="flex-1 bg-trip-blue text-white text-sm font-bold py-2 px-4 rounded-full hover:bg-blue-500 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-full text-sm text-gray-400 hover:text-white border border-trip-border"
            >
              Cancel
            </button>
          </div>
          {group.start_date && group.end_date && (
            <p className="text-[10px] text-gray-500 text-center">
              Trip is {fmt(group.start_date)} → {fmt(group.end_date)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
