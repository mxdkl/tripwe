import { User } from '../lib/api'
import { Users, Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface Props {
  members: User[]
  myUserId: string | null
  code: string
  progress: { user_id: string; name: string; votes: number }[]
}

const COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500']

export default function GroupRoster({ members, myUserId, code, progress }: Props) {
  const [copied, setCopied] = useState(false)
  const voteMap = new Map(progress.map((p) => [p.user_id, p.votes]))

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="bg-trip-card rounded-[2rem] p-6 border border-trip-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-white">
          <Users className="text-trip-blue w-5 h-5" />
          <h2 className="text-lg font-bold">Group ({members.length})</h2>
        </div>
        <button
          onClick={copy}
          className="text-xs text-trip-blue hover:underline flex items-center gap-1"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          Invite
        </button>
      </div>

      <div className="space-y-3">
        {members.map((m, i) => {
          const isYou = m.id === myUserId
          const votes = voteMap.get(m.id) ?? 0
          return (
            <div key={m.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${COLORS[i % COLORS.length]}`}>
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">
                    {m.name}
                    {isYou && (
                      <span className="ml-2 text-[10px] font-bold bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded-full border border-blue-800 uppercase">
                        You
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {votes === 0 ? 'No votes yet' : `${votes} vote${votes === 1 ? '' : 's'}`}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
