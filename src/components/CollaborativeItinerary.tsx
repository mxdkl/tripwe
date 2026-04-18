import { DayItinerary } from '../data/mockData'
import { Clock, Plus, MapPin as MapPinIcon, MessageSquare } from 'lucide-react'

interface CollaborativeItineraryProps {
  itinerary: DayItinerary[];
}

const CollaborativeItinerary = ({ itinerary }: CollaborativeItineraryProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Trip Itinerary</h2>
        <div className="flex gap-2">
          <button className="bg-trip-card border border-trip-border text-gray-300 font-semibold py-2 px-4 rounded-full hover:bg-trip-item transition-colors flex items-center gap-2">
            View Map
          </button>
          <button className="bg-trip-blue text-white font-semibold py-2 px-4 rounded-full hover:bg-blue-500 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Activity
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {itinerary.map((day, dayIdx) => (
          <div key={day.date} className="relative">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-[#1e3a8a] text-blue-300 font-bold py-1 px-3 rounded-full text-sm border border-blue-800">
                Day {dayIdx + 1}
              </div>
              <h3 className="text-lg font-bold text-white">
                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
            </div>

            <div className="ml-4 pl-8 border-l-2 border-trip-border space-y-6 pb-2">
              {day.activities.map((activity) => (
                <div key={activity.id} className="relative bg-trip-card p-6 rounded-[2rem] border border-trip-border shadow-sm hover:shadow-md transition-shadow">
                  {/* Activity Connector Dot */}
                  <div className="absolute -left-[41px] top-1/2 -translate-y-1/2 w-4 h-4 bg-trip-dark border-4 border-trip-blue rounded-full"></div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-trip-blue font-bold text-sm">
                        <Clock className="w-4 h-4" />
                        {activity.time}
                      </div>
                      <h4 className="text-lg font-bold text-white">{activity.title}</h4>
                      <p className="text-gray-400 text-sm leading-relaxed">{activity.description}</p>
                      
                      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-trip-border">
                        <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
                          <MapPinIcon className="w-3.5 h-3.5" />
                          {activity.location}
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
                          <MessageSquare className="w-3.5 h-3.5" />
                          3 Comments
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Added by</span>
                        <div className="w-8 h-8 bg-[#1e3a8a] rounded-full flex items-center justify-center text-[10px] font-bold text-blue-200 border border-blue-800 shadow-sm" title={activity.addedBy}>
                          {activity.addedBy.charAt(0)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex items-center gap-1.5 bg-trip-item border border-trip-border rounded-full py-1.5 px-3 text-xs font-bold text-white">
                          <span className="text-sm">👍</span> 3
                        </button>
                        <button className="flex items-center gap-1.5 bg-trip-item border border-trip-border rounded-full py-1.5 px-3 text-xs font-bold text-gray-500">
                          <span className="text-sm">👎</span> 0
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              <button className="w-full py-4 border-2 border-dashed border-trip-border rounded-[2rem] text-gray-500 text-sm font-medium hover:border-trip-blue hover:text-trip-blue hover:bg-trip-item/50 transition-all flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add activity to Day {dayIdx + 1}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CollaborativeItinerary