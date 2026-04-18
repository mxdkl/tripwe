import { useState, useEffect } from 'react'
import { fetchOsmData, DiscoverItem } from '../services/osm'
import { X, Heart, MapPin, Star, Info, Loader2 } from 'lucide-react'

const categories = ['All', 'Sights', 'Food', 'Museums']

const Discover = () => {
  const [activeCategory, setActiveCategory] = useState('All')
  const [activities, setActivities] = useState<DiscoverItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right' | null>(null)

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      setIsLoading(true);
      const data = await fetchOsmData(activeCategory);
      
      if (isMounted) {
        setActivities(data);
        setCurrentIndex(0);
        setDirection(null);
        setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [activeCategory]);

  const activeActivity = activities.length > 0 ? activities[currentIndex % activities.length] : null

  const handleAction = (dir: 'left' | 'right') => {
    if (!activeActivity) return;
    
    setDirection(dir)
    setTimeout(() => {
      setDirection(null)
      setCurrentIndex((prev) => (prev + 1) % activities.length)
    }, 300)
  }

  return (
    <div className="flex flex-col items-center justify-center py-4 min-h-[700px]">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-4">Discover Paris</h2>
        
        {/* Category Selector */}
        <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all border
                ${activeCategory === cat 
                  ? 'bg-trip-blue text-white border-trip-blue shadow-lg shadow-blue-900/20' 
                  : 'bg-trip-item text-gray-400 border-trip-border hover:text-white hover:border-gray-500'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full max-w-md h-[620px] mt-4">
        {isLoading ? (
          <div className="absolute inset-0 bg-trip-card rounded-[2.5rem] border border-trip-border flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-trip-blue animate-spin mb-4" />
            <p className="text-gray-400 font-medium tracking-wide">Finding local {activeCategory.toLowerCase()}...</p>
          </div>
        ) : activities.length > 0 && activeActivity ? (
          <>
            {/* Card Stack Effect */}
            <div className="absolute inset-0 bg-trip-card rounded-[2.5rem] transform translate-y-4 scale-95 opacity-40 border border-trip-border"></div>
            <div className="absolute inset-0 bg-trip-card rounded-[2.5rem] transform translate-y-2 scale-[0.975] opacity-60 border border-trip-border"></div>
            
            {/* Active Card */}
            <div 
              className={`absolute inset-0 bg-trip-card rounded-[2.5rem] overflow-hidden border border-trip-border shadow-2xl transition-all duration-300 flex flex-col
                ${direction === 'left' ? '-translate-x-[150%] -rotate-12 opacity-0' : ''}
                ${direction === 'right' ? 'translate-x-[150%] rotate-12 opacity-0' : ''}
              `}
            >
              {/* Image Section */}
              <div className="relative h-[320px] flex-shrink-0">
                <img 
                  src={activeActivity.image} 
                  alt={activeActivity.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-trip-card via-transparent to-transparent"></div>
                
                <div className="absolute bottom-6 left-6 right-6">
                  <span className="bg-trip-blue/90 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {activeActivity.category}
                  </span>
                  <h3 className="text-3xl font-bold text-white mt-2 leading-tight">
                    {activeActivity.title}
                  </h3>
                </div>
              </div>

              {/* Details Section */}
              <div className="p-6 flex-grow flex flex-col justify-between overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-trip-green font-bold text-lg">
                      <Star className="w-5 h-5 fill-current" />
                      {activeActivity.rating}
                    </div>
                    <div className="text-white font-bold text-lg">{activeActivity.price}</div>
                  </div>
                  
                  <div className="flex items-start gap-2 text-gray-400 text-sm">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{activeActivity.location}</span>
                  </div>
                  
                  <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
                    {activeActivity.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-6 pt-6 pb-2">
                  <button 
                    onClick={() => handleAction('left')}
                    className="w-16 h-16 rounded-full bg-trip-item border border-trip-border flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition-colors shadow-lg active:scale-90"
                  >
                    <X className="w-9 h-9" />
                  </button>
                  
                  <button 
                    className="w-12 h-12 rounded-full bg-trip-item border border-trip-border flex items-center justify-center text-gray-400 hover:bg-trip-blue/10 transition-colors active:scale-95"
                  >
                    <Info className="w-6 h-6" />
                  </button>

                  <button 
                    onClick={() => handleAction('right')}
                    className="w-16 h-16 rounded-full bg-trip-item border border-trip-border flex items-center justify-center text-trip-green hover:bg-trip-green/10 transition-colors shadow-lg active:scale-90"
                  >
                    <Heart className="w-9 h-9 fill-current" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-trip-card rounded-[2.5rem] border border-trip-border flex flex-col items-center justify-center text-center p-8">
            <p className="text-gray-400 text-lg mb-4">We couldn't find any {activeCategory.toLowerCase()} right now.</p>
            <button 
              onClick={() => setActiveCategory('All')}
              className="text-trip-blue font-bold hover:underline"
            >
              Show all activities
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Discover