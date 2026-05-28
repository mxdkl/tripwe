import { useState } from 'react'
import { api, ApiError, Group } from '../lib/api'
import { session } from '../lib/session'
import { MapPin, Loader2, Users, PlusCircle } from 'lucide-react'

interface Props {
  onEnterGroup: (g: Group) => void
  onError: (msg: string | null) => void
}

type Step = 'name' | 'choose' | 'create' | 'join'

export default function Welcome({ onEnterGroup, onError }: Props) {
  const [step, setStep] = useState<Step>(session.getUserId() ? 'choose' : 'name')
  const [name, setName] = useState(session.getName() ?? '')
  const [groupName, setGroupName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function submitName(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    onError(null)
    try {
      const u = await api.createUser(name.trim())
      session.setUser(u.id, u.name)
      setStep('choose')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not create user.')
    } finally {
      setBusy(false)
    }
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!groupName.trim()) return
    setBusy(true)
    onError(null)
    try {
      const g = await api.createGroup(groupName.trim())
      onEnterGroup(g)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not create group.')
    } finally {
      setBusy(false)
    }
  }

  async function submitJoin(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setBusy(true)
    onError(null)
    try {
      const g = await api.joinGroup(trimmed)
      onEnterGroup(g)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        onError(`No group with code "${trimmed}".`)
      } else {
        onError(err instanceof Error ? err.message : 'Could not join group.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="flex items-center gap-3 mb-10">
        <div className="bg-trip-blue p-3 rounded-2xl shadow-lg shadow-blue-900/30">
          <MapPin className="text-white w-7 h-7" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">TripWe</h1>
          <p className="text-sm text-gray-400">Collaborative group travel, simplified.</p>
        </div>
      </div>

      <div className="w-full max-w-md bg-trip-card border border-trip-border rounded-[2rem] p-8 shadow-xl">
        {step === 'name' && (
          <form onSubmit={submitName} className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-white">What should we call you?</h2>
              <p className="text-sm text-gray-400 mt-1">
                No accounts. We just keep this in a cookie on your device.
              </p>
            </div>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-trip-item border border-trip-border rounded-2xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-trip-blue"
              maxLength={40}
            />
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="w-full bg-trip-blue text-white font-bold py-3 px-6 rounded-full shadow-lg shadow-blue-900/30 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Continue
            </button>
          </form>
        )}

        {step === 'choose' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">Hi {session.getName()}!</h2>
              <p className="text-sm text-gray-400 mt-1">
                Start a new trip group or join one with a code.
              </p>
            </div>
            <button
              onClick={() => setStep('create')}
              className="w-full bg-trip-item border border-trip-border rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-trip-blue hover:bg-trip-blue/5 transition-colors text-left"
            >
              <div className="bg-trip-blue/20 p-2.5 rounded-xl">
                <PlusCircle className="w-5 h-5 text-trip-blue" />
              </div>
              <div>
                <p className="font-bold text-white">Create a new group</p>
                <p className="text-xs text-gray-400">Get a code to share with friends.</p>
              </div>
            </button>
            <button
              onClick={() => setStep('join')}
              className="w-full bg-trip-item border border-trip-border rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-trip-blue hover:bg-trip-blue/5 transition-colors text-left"
            >
              <div className="bg-trip-green/20 p-2.5 rounded-xl">
                <Users className="w-5 h-5 text-trip-green" />
              </div>
              <div>
                <p className="font-bold text-white">Join an existing group</p>
                <p className="text-xs text-gray-400">Enter a 6-character group code.</p>
              </div>
            </button>
            <button
              onClick={() => {
                session.signOut()
                setStep('name')
              }}
              className="w-full text-xs text-gray-500 hover:text-gray-300 mt-2"
            >
              Not {session.getName()}? Start over.
            </button>
          </div>
        )}

        {step === 'create' && (
          <form onSubmit={submitCreate} className="space-y-5">
            <div>
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="text-xs text-gray-500 hover:text-gray-300 mb-3"
              >
                ← Back
              </button>
              <h2 className="text-xl font-bold text-white">Name your trip group</h2>
              <p className="text-sm text-gray-400 mt-1">
                Like "Summer Roadtrip" or "Lee's Bachelor Party".
              </p>
            </div>
            <input
              autoFocus
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name"
              className="w-full bg-trip-item border border-trip-border rounded-2xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-trip-blue"
              maxLength={60}
            />
            <button
              type="submit"
              disabled={busy || !groupName.trim()}
              className="w-full bg-trip-blue text-white font-bold py-3 px-6 rounded-full shadow-lg shadow-blue-900/30 disabled:opacity-40 hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Create group
            </button>
          </form>
        )}

        {step === 'join' && (
          <form onSubmit={submitJoin} className="space-y-5">
            <div>
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="text-xs text-gray-500 hover:text-gray-300 mb-3"
              >
                ← Back
              </button>
              <h2 className="text-xl font-bold text-white">Enter group code</h2>
              <p className="text-sm text-gray-400 mt-1">
                Ask whoever created the group for their 6-character code.
              </p>
            </div>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="w-full bg-trip-item border border-trip-border rounded-2xl px-4 py-3 text-white placeholder-gray-500 tracking-[0.4em] text-center text-2xl font-bold focus:outline-none focus:border-trip-blue uppercase"
            />
            <button
              type="submit"
              disabled={busy || code.trim().length < 4}
              className="w-full bg-trip-blue text-white font-bold py-3 px-6 rounded-full shadow-lg shadow-blue-900/30 disabled:opacity-40 hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Join
            </button>
          </form>
        )}
      </div>

      <p className="text-xs text-gray-600 mt-8 text-center max-w-md">
        No accounts. Sessions live on your device. Voting data uses{' '}
        <a className="underline hover:text-gray-400" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>.
      </p>
    </div>
  )
}
