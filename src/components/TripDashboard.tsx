import { Trip } from '../data/mockData'
import { Calendar, MapPin, Share2, MoreHorizontal } from 'lucide-react'

interface TripDashboardProps {
  trip: Trip;
}

const TripDashboard = ({ trip }: TripDashboardProps) => {
  return (
    <div className="bg-trip-card rounded-[2rem] overflow-hidden shadow-sm border border-trip-border">
      <div className="h-48 bg-gradient-to-r from-blue-900 to-indigo-900 relative">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="absolute bottom-6 left-8 text-white">
          <div className="flex items-center gap-2 text-blue-300 mb-1">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium uppercase tracking-wider">{trip.destination}</span>
          </div>
          <h1 className="text-4xl font-bold">{trip.title}</h1>
        </div>
        <div className="absolute top-6 right-8 flex gap-2">
          <button className="bg-white/10 backdrop-blur-md text-white p-2 rounded-lg hover:bg-white/20 transition-colors border border-white/10">
            <Share2 className="w-5 h-5" />
          </button>
          <button className="bg-white/10 backdrop-blur-md text-white p-2 rounded-lg hover:bg-white/20 transition-colors border border-white/10">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="px-8 py-6 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-trip-item p-3 rounded-xl border border-trip-border">
            <Calendar className="text-trip-blue w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Trip Duration</p>
            <p className="text-white font-bold text-lg">July 15 - July 20, 2026</p>
          </div>
        </div>
        
        <div className="flex -space-x-3">
          {trip.members.map((member, i) => (
            <div 
              key={member.id} 
              className={`w-10 h-10 rounded-full border-2 border-trip-card flex items-center justify-center text-xs font-bold text-white shadow-sm
                ${['bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-purple-500', 'bg-rose-500'][i % 5]}`}
              title={member.name}
            >
              {member.name.charAt(0)}
            </div>
          ))}
        </div>

        <button className="bg-trip-blue text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-blue-900/20 hover:bg-blue-500 transition-all hover:scale-[1.02] active:scale-[0.98]">
          Manage Trip
        </button>
      </div>
    </div>
  )
}

export default TripDashboard