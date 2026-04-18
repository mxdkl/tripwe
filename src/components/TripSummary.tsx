import { MapPin, Calendar, CreditCard, Users } from 'lucide-react'
import { Trip } from '../data/mockData'

interface TripSummaryProps {
  trip: Trip;
}

const TripSummary = ({ trip }: TripSummaryProps) => {
  return (
    <div className="bg-trip-card rounded-[2.5rem] p-8 border border-trip-border h-full flex flex-col">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-2xl font-bold tracking-tight">{trip.title}</h2>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-trip-green rounded-full shadow-[0_0_8px_#10b981]"></span>
          <span className="text-gray-400 text-sm font-medium">Live</span>
        </div>
      </div>

      <div className="space-y-6 flex-grow">
        {/* Destination */}
        <div className="bg-trip-item border border-trip-border rounded-[2rem] p-5 flex items-center gap-5">
          <div className="bg-[#1e3a8a] p-4 rounded-full">
            <MapPin className="text-trip-blue w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-lg">{trip.destination}</p>
            <p className="text-gray-400 text-sm">4 days • 3 nights</p>
          </div>
        </div>

        {/* Dates */}
        <div className="bg-trip-item border border-trip-border rounded-[2rem] p-5 flex items-center gap-5">
          <div className="bg-[#1e3a8a] p-4 rounded-full">
            <Calendar className="text-trip-blue w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-lg">Jun 15-18, 2025</p>
            <p className="text-gray-400 text-sm">3 travelers confirmed</p>
          </div>
        </div>

        {/* Budget */}
        <div className="bg-trip-item border border-trip-border rounded-[2rem] p-5 flex items-center gap-5">
          <div className="bg-[#1e3a8a] p-4 rounded-full">
            <CreditCard className="text-trip-blue w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-lg">Budget</p>
            <p className="text-gray-400 text-sm">$1000</p>
          </div>
        </div>

        {/* Members */}
        <div className="bg-trip-item border border-trip-border rounded-[2rem] p-5 flex items-center gap-5">
          <div className="bg-[#1e3a8a] p-4 rounded-full">
            <Users className="text-trip-blue w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-lg">Members</p>
            <p className="text-gray-400 text-sm">Noah, Lee, Max, Ivan, Evan</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TripSummary