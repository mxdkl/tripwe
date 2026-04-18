import { discoverActivities as fallbackData } from '../data/mockData';

export interface DiscoverItem {
  id: string;
  title: string;
  category: string;
  price: string;
  rating: number;
  description: string;
  image: string;
  location: string;
}

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

const BBOX = '48.84,2.30,48.88,2.36';

const getBundledQuery = (category: string) => {
  const timeout = 25;
  let selectors: string[] = [];
  
  if (category === 'Sights') {
    selectors = ['node["tourism"="attraction"]["name"]', 'node["historic"="monument"]["name"]'];
  } else if (category === 'Food') {
    selectors = ['node["amenity"="restaurant"]["name"]', 'node["amenity"="cafe"]["name"]'];
  } else if (category === 'Museums') {
    selectors = ['node["tourism"="museum"]["name"]'];
  } else {
    selectors = [
      'node["tourism"~"attraction|museum"]["name"]',
      'node["historic"="monument"]["name"]',
      'node["amenity"~"restaurant|cafe"]["name"]'
    ];
  }

  // Construct union: (node(...);node(...);)
  const union = selectors.map(s => `${s}(${BBOX});`).join('');
  return `[out:json][timeout:${timeout}];(${union});out 30;`;
};

const defaultImages: Record<string, string[]> = {
  Sights: [
    'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1509439581779-6298f75bf6e5?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&q=80&w=800'
  ],
  Food: [
    'https://images.unsplash.com/photo-1550966841-3ee7adac1ad0?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=800'
  ],
  Museums: [
    'https://images.unsplash.com/photo-1491156855053-9cdff72c7f85?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1594142465967-e41eef5ea95e?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1572953109213-3be62398eb95?auto=format&fit=crop&q=80&w=800'
  ]
};

export const fetchOsmData = async (category: string, attempt = 0): Promise<DiscoverItem[]> => {
  if (attempt >= ENDPOINTS.length) {
    console.warn('All OSM mirrors failed. Falling back to mock data.');
    return category === 'All' ? fallbackData : fallbackData.filter(a => a.category === category);
  }

  try {
    const query = getBundledQuery(category);
    const url = `${ENDPOINTS[attempt]}?data=${encodeURIComponent(query)}`;
    
    const response = await fetch(url, { method: 'GET' });
    
    if (response.status === 429 || response.status === 504) {
      console.warn(`Mirror ${attempt} busy/rate-limited. Trying next...`);
      return fetchOsmData(category, attempt + 1);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('Response was not JSON. Likely an HTML error page.');
      return fetchOsmData(category, attempt + 1);
    }

    if (!data.elements || data.elements.length === 0) {
      return fetchOsmData(category, attempt + 1);
    }

    return data.elements.map((element: any, index: number) => {
      const tags = element.tags || {};
      const type = tags.tourism || tags.amenity || tags.historic || 'Sights';
      const mappedCategory = (type === 'restaurant' || type === 'cafe') ? 'Food' 
                            : (type === 'museum') ? 'Museums' 
                            : 'Sights';

      const images = defaultImages[mappedCategory] || defaultImages['Sights'];

      return {
        id: element.id.toString(),
        title: tags.name || 'Interesting Place',
        category: mappedCategory,
        price: mappedCategory === 'Food' ? `$${20 + (index % 50)}/person` : (mappedCategory === 'Museums' ? '$15/person' : 'Free'),
        rating: 4 + (index % 10) / 10,
        description: tags.description || `A popular ${mappedCategory.toLowerCase()} in the heart of Paris.`,
        image: images[index % images.length],
        location: tags['addr:street'] ? `${tags['addr:housenumber'] || ''} ${tags['addr:street']}`.trim() : 'Central Paris'
      };
    });
  } catch (error) {
    console.error(`Fetch error on mirror ${attempt}:`, error);
    return fetchOsmData(category, attempt + 1);
  }
};