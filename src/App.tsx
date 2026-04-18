import { useState } from 'react'
import { currentUser, mockTrip } from './data/mockData'
import Header from './components/Header'
import TripDashboard from './components/TripDashboard'
import GroupRoster from './components/GroupRoster'
import CollaborativeItinerary from './components/CollaborativeItinerary'
import Discover from './components/Discover'

function App() {
  const [activeTab, setActiveTab] = useState<'my-trips' | 'discover'>('my-trips')

  return (
    <div className="min-h-screen bg-trip-dark flex flex-col">
      <Header 
        user={currentUser} 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />
      
      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
        {activeTab === 'my-trips' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-8">
              <TripDashboard trip={mockTrip} />
              <CollaborativeItinerary itinerary={mockTrip.itinerary} />
            </div>

            {/* Sidebar Area */}
            <div className="space-y-8">
              <GroupRoster members={mockTrip.members} />
              
              <div className="bg-blue-600 rounded-[2rem] p-6 text-white shadow-lg">
                <h3 className="text-xl font-bold mb-2">Trip Polls</h3>
                <p className="text-blue-100 mb-4">Should we book the Versailles day trip?</p>
                <div className="space-y-2">
                  <button className="w-full bg-white text-blue-600 font-semibold py-2 px-4 rounded-full hover:bg-blue-50 transition-colors">
                    Yes, definitely! (4)
                  </button>
                  <button className="w-full border border-blue-400 text-white font-semibold py-2 px-4 rounded-full hover:bg-blue-500 transition-colors">
                    Maybe another time (1)
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <Discover />
          </div>
        )}
      </main>

      <footer className="bg-trip-dark border-t border-trip-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          &copy; 2026 TripWe. Collaborative Group Travel, Simplified.
        </div>
      </footer>
    </div>
  )
}

export default App