import { useEffect, useState } from 'react'
import { api, Group } from './lib/api'
import { session } from './lib/session'
import Welcome from './screens/Welcome'
import SetupWizard from './screens/SetupWizard'
import GroupView from './screens/GroupView'
import { Loader2 } from 'lucide-react'

type Phase = 'loading' | 'welcome' | 'setup' | 'group'

export default function App() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [group, setGroup] = useState<Group | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const uid = session.getUserId()
    if (!uid) {
      setPhase('welcome')
      return
    }
    ;(async () => {
      try {
        await api.me()
      } catch {
        session.signOut()
        setPhase('welcome')
        return
      }
      const last = session.getLastGroup()
      if (last) {
        try {
          const g = await api.getGroup(last)
          setGroup(g)
          setPhase(g.setup_done ? 'group' : 'setup')
          return
        } catch {
          session.forgetGroup()
        }
      }
      setPhase('welcome')
    })()
  }, [])

  function handleEnterGroup(g: Group) {
    session.rememberGroup(g.code)
    setGroup(g)
    setPhase(g.setup_done ? 'group' : 'setup')
    setError(null)
  }

  function handleSetupDone(g: Group) {
    setGroup(g)
    setPhase('group')
  }

  function handleLeave() {
    session.forgetGroup()
    setGroup(null)
    setPhase('welcome')
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-trip-dark">
        <Loader2 className="w-8 h-8 text-trip-blue animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-trip-dark">
      {error && (
        <div className="bg-rose-900/40 border-b border-rose-700/50 text-rose-100 text-sm px-4 py-2 text-center">
          {error}
        </div>
      )}

      {phase === 'welcome' && (
        <Welcome onEnterGroup={handleEnterGroup} onError={setError} />
      )}

      {phase === 'setup' && group && (
        <SetupWizard
          group={group}
          onDone={handleSetupDone}
          onLeave={handleLeave}
          onError={setError}
        />
      )}

      {phase === 'group' && group && (
        <GroupView
          initialGroup={group}
          onLeave={handleLeave}
          onError={setError}
        />
      )}
    </div>
  )
}
