import { useEffect, useState } from 'react'
import { api, Group, MatchesResponse } from '../lib/api'
import { session } from '../lib/session'
import Header from '../components/Header'
import SwipeDeck from '../components/SwipeDeck'
import MatchesPanel from '../components/MatchesPanel'
import GroupRoster from '../components/GroupRoster'
import ItineraryPanel from '../components/ItineraryPanel'
import AvailabilityPanel from '../components/AvailabilityPanel'
import { Heart, ListChecks } from 'lucide-react'

interface Props {
  initialGroup: Group
  onLeave: () => void
  onError: (msg: string | null) => void
}

type Tab = 'vote' | 'itinerary'

export default function GroupView({ initialGroup, onLeave, onError }: Props) {
  const [group, setGroup] = useState<Group>(initialGroup)
  const [matches, setMatches] = useState<MatchesResponse | null>(null)
  const [tab, setTab] = useState<Tab>('vote')

  async function refreshGroup() {
    try {
      const g = await api.getGroup(group.code)
      setGroup(g)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not refresh group.')
    }
  }

  async function refreshMatches() {
    try {
      const m = await api.getMatches(group.code)
      setMatches(m)
    } catch (err) {
      console.warn(err)
    }
  }

  useEffect(() => {
    refreshMatches()
    const t = setInterval(() => {
      refreshGroup()
      refreshMatches()
    }, 8000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.code])

  const myId = session.getUserId()

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        groupName={group.name}
        groupCode={group.code}
        destination={group.destination ?? '—'}
        onLeave={onLeave}
      />

      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="inline-flex bg-trip-card border border-trip-border rounded-full p-1">
              <TabButton active={tab === 'vote'} onClick={() => setTab('vote')} icon={<Heart className="w-4 h-4" />}>
                Vote
              </TabButton>
              <TabButton active={tab === 'itinerary'} onClick={() => setTab('itinerary')} icon={<ListChecks className="w-4 h-4" />}>
                Itinerary
              </TabButton>
            </div>

            {tab === 'vote' ? (
              <SwipeDeck
                group={group}
                onVoted={() => refreshMatches()}
                onError={onError}
              />
            ) : (
              <ItineraryPanel code={group.code} onError={onError} />
            )}
          </div>
          <div className="space-y-8">
            <GroupRoster
              members={group.members}
              myUserId={myId}
              code={group.code}
              progress={matches?.progress ?? []}
            />
            <AvailabilityPanel group={group} onChanged={() => {}} onError={onError} />
            <MatchesPanel matches={matches} />
          </div>
        </div>
      </main>

      <footer className="border-t border-trip-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-500 text-xs">
          TripWe · {group.members.length} member{group.members.length === 1 ? '' : 's'} ·
          places from{' '}
          <a className="underline hover:text-gray-300" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            OpenStreetMap
          </a>
        </div>
      </footer>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-colors ${
        active ? 'bg-trip-blue text-white shadow' : 'text-gray-400 hover:text-white'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}
