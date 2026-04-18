export interface User {
  id: string;
  name: string;
  avatar?: string;
}

export interface Activity {
  id: string;
  time: string;
  title: string;
  description: string;
  location: string;
  addedBy: string;
}

export interface DayItinerary {
  date: string;
  activities: Activity[];
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  members: User[];
  itinerary: DayItinerary[];
}

export const users: User[] = [
  { id: '1', name: 'Max Dekel' },
  { id: '2', name: 'Noah Weindling' },
  { id: '3', name: 'Lee Peleg' },
  { id: '4', name: 'Evan Fuller' },
  { id: '5', name: 'Ivan Zlunitcyn' },
];

export const currentUser = users[0]; // Max Dekel

export const mockTrip: Trip = {
  id: 'trip-1',
  title: 'Paris Summer Getaway',
  destination: 'Paris, France',
  startDate: '2026-07-15',
  endDate: '2026-07-20',
  members: users,
  itinerary: [
    {
      date: '2026-07-15',
      activities: [
        {
          id: 'a1',
          time: '14:00',
          title: 'Check-in at Hotel Lutetia',
          description: 'Meet in the lobby to drop off bags.',
          location: '45 Bd Raspail, 75006 Paris',
          addedBy: 'Max Dekel'
        },
        {
          id: 'a2',
          time: '19:00',
          title: 'Welcome Dinner',
          description: 'Traditional French bistro experience.',
          location: 'Le Comptoir du Relais',
          addedBy: 'Lee Peleg'
        }
      ]
    },
    {
      date: '2026-07-16',
      activities: [
        {
          id: 'a3',
          time: '10:00',
          title: 'Louvre Museum Tour',
          description: 'Guided tour of the highlights.',
          location: 'Rue de Rivoli, 75001 Paris',
          addedBy: 'Noah Weindling'
        },
        {
          id: 'a4',
          time: '15:30',
          title: 'Eiffel Tower Picnic',
          description: 'Grab wine and cheese from Rue Cler.',
          location: 'Champ de Mars',
          addedBy: 'Evan Fuller'
        }
      ]
    }
  ]
};

export const discoverActivities = [
  // SIGHTS
  {
    id: 'd1',
    title: 'Eiffel Tower',
    category: 'Sights',
    price: '$25/person',
    rating: 4.9,
    description: 'The iconic iron lattice tower on the Champ de Mars.',
    image: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&q=80&w=800',
    location: 'Champ de Mars'
  },
  {
    id: 'd2',
    title: 'Arc de Triomphe',
    category: 'Sights',
    price: '$13/person',
    rating: 4.7,
    description: 'One of the most famous monuments in Paris, standing at the western end of the Champs-Élysées.',
    image: 'https://images.unsplash.com/photo-1509439581779-6298f75bf6e5?auto=format&fit=crop&q=80&w=800',
    location: 'Pl. Charles de Gaulle'
  },
  // FOOD
  {
    id: 'd3',
    title: 'Le Comptoir du Relais',
    category: 'Food',
    price: '$50/person',
    rating: 4.6,
    description: 'Classic French bistro fare in a lively, historic setting.',
    image: 'https://images.unsplash.com/photo-1550966841-3ee7adac1ad0?auto=format&fit=crop&q=80&w=800',
    location: '9 Cr de la Croix Rouge'
  },
  {
    id: 'd4',
    title: 'French Pastry Class',
    category: 'Food',
    price: '$75/person',
    rating: 4.8,
    description: 'Learn the secrets of making authentic French macarons and croissants.',
    image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&q=80&w=800',
    location: '6 Rue des Arquebusiers'
  },
  // MUSEUMS
  {
    id: 'd5',
    title: 'Louvre Museum',
    category: 'Museums',
    price: '$17/person',
    rating: 4.8,
    description: 'The world\'s largest art museum and a historic monument in Paris.',
    image: 'https://images.unsplash.com/photo-1491156855053-9cdff72c7f85?auto=format&fit=crop&q=80&w=800',
    location: 'Rue de Rivoli'
  },
  {
    id: 'd6',
    title: 'Musée d\'Orsay',
    category: 'Museums',
    price: '$16/person',
    rating: 4.9,
    description: 'Housed in a grand former railway station, featuring masterpieces of Impressionism.',
    image: 'https://images.unsplash.com/photo-1594142465967-e41eef5ea95e?auto=format&fit=crop&q=80&w=800',
    location: '1 Rue de la Légion d\'Honneur'
  }
];