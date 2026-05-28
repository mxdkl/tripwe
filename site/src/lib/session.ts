const COOKIE_NAME = 'tripwe_uid'
const NAME_KEY = 'tripwe_name'
const LAST_GROUP_KEY = 'tripwe_last_group'

function getCookie(name: string): string | null {
  return (
    document.cookie
      .split('; ')
      .find((c) => c.startsWith(name + '='))
      ?.slice(name.length + 1) ?? null
  )
}

function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`
}

function clearCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

export const session = {
  getUserId(): string | null {
    return getCookie(COOKIE_NAME)
  },
  setUser(id: string, name: string) {
    setCookie(COOKIE_NAME, id)
    localStorage.setItem(NAME_KEY, name)
  },
  getName(): string | null {
    return localStorage.getItem(NAME_KEY)
  },
  rememberGroup(code: string) {
    localStorage.setItem(LAST_GROUP_KEY, code)
  },
  getLastGroup(): string | null {
    return localStorage.getItem(LAST_GROUP_KEY)
  },
  forgetGroup() {
    localStorage.removeItem(LAST_GROUP_KEY)
  },
  signOut() {
    clearCookie(COOKIE_NAME)
    localStorage.removeItem(NAME_KEY)
    localStorage.removeItem(LAST_GROUP_KEY)
  },
}
