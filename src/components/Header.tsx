import { User } from '../data/mockData'
import { MapPin, Bell, User as UserIcon } from 'lucide-react'

interface HeaderProps {
  user: User;
  activeTab: 'my-trips' | 'discover';
  onTabChange: (tab: 'my-trips' | 'discover') => void;
}

const Header = ({ user, activeTab, onTabChange }: HeaderProps) => {
  return (
    <header className="bg-trip-card border-b border-trip-border sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-trip-blue p-2 rounded-lg">
            <MapPin className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">TripWe</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-gray-400 font-medium">
          <button 
            onClick={() => onTabChange('my-trips')}
            className={`transition-colors ${activeTab === 'my-trips' ? 'text-trip-blue' : 'hover:text-white'}`}
          >
            My Trips
          </button>
          <button 
            onClick={() => onTabChange('discover')}
            className={`transition-colors ${activeTab === 'discover' ? 'text-trip-blue' : 'hover:text-white'}`}
          >
            Discover
          </button>
          <button className="hover:text-white transition-colors cursor-not-allowed opacity-50">Expenses</button>
        </nav>

        <div className="flex items-center gap-4">
          <button className="p-2 text-gray-400 hover:bg-trip-item rounded-full transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-trip-card"></span>
          </button>
          
          <div className="flex items-center gap-3 pl-4 border-l border-trip-border">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-white leading-none">{user.name}</p>
              <p className="text-xs text-gray-500 mt-1">Traveler</p>
            </div>
            <div className="w-10 h-10 bg-trip-item rounded-full flex items-center justify-center border-2 border-trip-border shadow-sm overflow-hidden">
              <UserIcon className="w-6 h-6 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header