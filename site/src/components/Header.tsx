import { useState } from 'react'
import { MapPin, Copy, Check, LogOut } from 'lucide-react'
import { session } from '../lib/session'

interface Props {
  groupName: string
  groupCode: string
  destination: string
  onLeave: () => void
}

export default function Header({ groupName, groupCode, destination, onLeave }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(groupCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <header className="bg-trip-card border-b border-trip-border sticky top-0 z-40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4 max-w-6xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-trip-blue p-2 rounded-lg flex-shrink-0">
            <MapPin className="text-white w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate leading-tight">{groupName}</p>
            <p className="text-xs text-gray-400 truncate">{destination}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copy}
            title="Copy group code"
            className="bg-trip-item border border-trip-border rounded-full pl-3 pr-4 py-1.5 flex items-center gap-2 text-sm font-mono font-bold tracking-widest text-white hover:border-trip-blue transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-trip-green" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
            {groupCode}
          </button>
          <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-trip-border">
            <div className="text-right">
              <p className="text-xs font-bold text-white leading-none">
                {session.getName()}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">Member</p>
            </div>
            <button
              onClick={onLeave}
              title="Leave group"
              className="p-2 text-gray-400 hover:text-white hover:bg-trip-item rounded-full transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
