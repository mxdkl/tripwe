import { User } from '../data/mockData'
import { Users, UserPlus, CheckCircle2 } from 'lucide-react'

interface GroupRosterProps {
  members: User[];
}

const GroupRoster = ({ members }: GroupRosterProps) => {
  return (
    <div className="bg-trip-card rounded-[2rem] p-6 shadow-sm border border-trip-border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-white">
          <Users className="text-trip-blue w-5 h-5" />
          <h2 className="text-lg font-bold">Group Roster</h2>
        </div>
        <button className="text-trip-blue hover:bg-trip-item p-1.5 rounded-lg transition-colors">
          <UserPlus className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {members.map((member, i) => (
          <div key={member.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white
                ${['bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-purple-500', 'bg-rose-500'][i % 5]}`}>
                {member.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{member.name}</p>
                <p className="text-xs text-trip-green flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Confirmed
                </p>
              </div>
            </div>
            {i === 0 && (
              <span className="text-[10px] font-bold bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full border border-blue-800 uppercase tracking-wider">
                You
              </span>
            )}
          </div>
        ))}
      </div>
      
      <button className="w-full mt-6 py-3 px-4 border-2 border-dashed border-trip-border rounded-[1.5rem] text-gray-500 text-sm font-medium hover:border-trip-blue hover:text-trip-blue transition-colors">
        Invite more friends
      </button>
    </div>
  )
}

export default GroupRoster