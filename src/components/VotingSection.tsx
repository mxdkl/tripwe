import { Utensils, Camera, ThumbsUp, ThumbsDown } from 'lucide-react'

const VotingSection = () => {
  return (
    <div className="bg-trip-card rounded-[2.5rem] p-8 border border-trip-border h-full">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-2xl font-bold tracking-tight">Vote on Options</h2>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-trip-green rounded-full shadow-[0_0_8px_#10b981]"></span>
          <span className="text-gray-400 text-sm font-medium">Live</span>
        </div>
      </div>

      <div className="space-y-10">
        {/* Option 1: Le Bistro */}
        <div className="space-y-4">
          <div className="bg-trip-item border border-trip-border rounded-[2.5rem] p-5 flex items-center gap-5">
            <div className="bg-[#1e3a8a] p-4 rounded-full">
              <Utensils className="text-trip-blue w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-lg">Le Bistro</p>
              <p className="text-gray-400 text-sm">French cuisine • $45/person</p>
            </div>
          </div>
          <div className="flex gap-4 px-2">
            <button className="flex-1 bg-[#1e293b]/50 border border-trip-border rounded-full py-2.5 px-4 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="text-lg">👍</span> Yes
              </span>
              <span className="font-bold">3</span>
            </button>
            <button className="flex-1 bg-[#1e293b]/50 border border-trip-border rounded-full py-2.5 px-4 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="text-lg">👎</span> No
              </span>
              <span className="font-bold text-gray-400">2</span>
            </button>
          </div>
        </div>

        {/* Option 2: Eiffel Tower */}
        <div className="space-y-4">
          <div className="bg-trip-item border border-trip-border rounded-[2.5rem] p-5 flex items-center gap-5">
            <div className="bg-[#1e3a8a] p-4 rounded-full">
              <Camera className="text-trip-blue w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-lg">Eiffel Tower</p>
              <p className="text-gray-400 text-sm">Sightseeing • $25/person</p>
            </div>
          </div>
          <div className="flex gap-4 px-2">
            <button className="flex-1 bg-[#1e293b]/50 border border-trip-border rounded-full py-2.5 px-4 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="text-lg">👍</span> Yes
              </span>
              <span className="font-bold">3</span>
            </button>
            <button className="flex-1 bg-[#1e293b]/50 border border-trip-border rounded-full py-2.5 px-4 flex items-center justify-between">
              {/* Empty placeholder to match image */}
              <span className="font-bold text-gray-400 ml-auto">2</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VotingSection