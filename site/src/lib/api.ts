import { session } from './session'

export interface User {
  id: string
  name: string
}

export interface Group {
  code: string
  name: string
  destination: string | null
  country: string | null
  lat: number | null
  lon: number | null
  start_date: string | null
  end_date: string | null
  setup_done: boolean
  created_by: string
  members: User[]
}

export interface Place {
  id: string
  title: string
  category: string
  description: string
  location: string
  lat: number | null
  lon: number | null
  image: string | null
  rating: number
  price: string
  tags?: Record<string, string>
  my_vote?: 'like' | 'dislike'
}

export interface PlacesResponse {
  destination: string
  category: string
  places: Place[]
}

export interface Match extends Place {
  likes: number
}

export interface MatchesResponse {
  member_count: number
  matches: Match[]
  progress: { user_id: string; name: string; votes: number }[]
}

export interface ItineraryItem {
  slot: 'morning' | 'lunch' | 'afternoon' | 'dinner' | string
  time: string
  place: Place & { likes: number; dislikes: number; likes_present?: number; score: number }
}

export interface ItineraryDay {
  day_index: number
  date: string | null
  present_members: { user_id: string; name: string }[]
  items: ItineraryItem[]
}

export interface ItineraryResponse {
  days: ItineraryDay[]
  generated_at: number
  place_count: number
  member_count: number
}

export interface MemberAvailability {
  user_id: string
  name: string
  start_date: string
  end_date: string
  is_default: boolean
}

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * API base URL.
 *
 * - In dev, leave VITE_API_URL unset and let Vite proxy /api/* to the
 *   local backend (see vite.config.ts).
 * - In production (Cloudflare Pages), set VITE_API_URL to your backend
 *   origin, e.g. `https://api.tripwe.example`. Paths are joined as
 *   `${API_BASE}${path}`, so trailing slashes must not be in the env value.
 */
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

async function req<T>(
  method: string,
  path: string,
  body?: unknown,
  init?: { skipAuth?: boolean },
): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (!init?.skipAuth) {
    const uid = session.getUserId()
    if (uid) headers['x-tripwe-uid'] = uid
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`
    try {
      const data = await res.json()
      if (typeof data?.detail === 'string') message = data.detail
      else if (Array.isArray(data?.detail) && data.detail[0]?.msg) message = data.detail[0].msg
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  health: () => req<{ ok: boolean }>('GET', '/api/health'),
  createUser: (name: string) => req<User>('POST', '/api/users', { name }),
  me: () => req<User>('GET', '/api/me'),
  myGroups: () => req<Group[]>('GET', '/api/me/groups'),
  createGroup: (name: string) => req<Group>('POST', '/api/groups', { name }),
  joinGroup: (code: string) =>
    req<Group>('POST', `/api/groups/${encodeURIComponent(code)}/join`),
  getGroup: (code: string) => req<Group>('GET', `/api/groups/${encodeURIComponent(code)}`),
  updateSetup: (
    code: string,
    payload: {
      destination?: string | null
      country?: string | null
      start_date?: string | null
      end_date?: string | null
      mark_done?: boolean
    },
  ) => req<Group>('PUT', `/api/groups/${encodeURIComponent(code)}/setup`, payload),

  /** Public, cacheable. Edge-cached by Cloudflare per (lat, lon, category). */
  getPublicPlaces: (lat: number, lon: number, category: string) =>
    req<{ category: string; places: Place[] }>(
      'GET',
      `/api/places?lat=${lat}&lon=${lon}&category=${encodeURIComponent(category)}`,
      undefined,
      { skipAuth: true },
    ),

  /** Per-user vote map for a group. Tiny payload, never cached. */
  getMyVotes: (code: string) =>
    req<{ votes: Record<string, 'like' | 'dislike'> }>(
      'GET',
      `/api/groups/${encodeURIComponent(code)}/my-votes`,
    ),

  /**
   * Fetch places for a group: hits the cacheable public endpoint AND the
   * per-user votes endpoint in parallel, then merges. This is what the
   * swipe deck should use.
   */
  async getGroupPlaces(group: Group, category: string): Promise<PlacesResponse> {
    if (group.lat == null || group.lon == null) {
      throw new ApiError(400, 'Group has no destination set.')
    }
    const [pub, mine] = await Promise.all([
      this.getPublicPlaces(group.lat, group.lon, category),
      this.getMyVotes(group.code),
    ])
    const places = pub.places.map((p) =>
      mine.votes[p.id] ? { ...p, my_vote: mine.votes[p.id] } : p,
    )
    return { destination: group.destination ?? '', category: pub.category, places }
  },

  vote: (code: string, place: Place, liked: boolean) =>
    req<{ ok: boolean }>('POST', `/api/groups/${encodeURIComponent(code)}/votes`, {
      place_id: place.id,
      liked,
      place,
    }),
  getMatches: (code: string) =>
    req<MatchesResponse>('GET', `/api/groups/${encodeURIComponent(code)}/matches`),
  getItinerary: (code: string) =>
    req<ItineraryResponse>('GET', `/api/groups/${encodeURIComponent(code)}/itinerary`),
  getAvailability: (code: string) =>
    req<MemberAvailability[]>('GET', `/api/groups/${encodeURIComponent(code)}/availability`),
  setAvailability: (code: string, start_date: string, end_date: string) =>
    req<MemberAvailability[]>('PUT', `/api/groups/${encodeURIComponent(code)}/availability`, {
      start_date,
      end_date,
    }),
}

export { ApiError }
