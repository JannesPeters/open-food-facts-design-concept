import { useSyncExternalStore } from 'react'

const SESSION_USER_KEY = 'off-session-user'
const SESSION_AUTH_KEY = 'off-session-auth'
const SESSION_USER_EVENT = 'off-session-user-updated'

export interface SessionUser {
  username: string
  signedInAt: string
  name?: string
  email?: string
  country?: string
}

export interface SessionAuth {
  username: string
  password: string
}

let cachedRaw: string | null = null
let cachedUser: SessionUser | null = null

function parseSessionUser(raw: string | null): SessionUser | null {
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SessionUser>
    if (!parsed.username || !parsed.signedInAt) {
      return null
    }

    const username = parsed.username.trim()
    if (!username) {
      return null
    }

    return {
      username,
      signedInAt: parsed.signedInAt,
      name: parsed.name?.trim() || undefined,
      email: parsed.email?.trim() || undefined,
      country: parsed.country?.trim() || undefined,
    }
  } catch {
    return null
  }
}

function readSessionUser(): SessionUser | null {
  if (typeof localStorage === 'undefined') {
    return null
  }

  const raw = localStorage.getItem(SESSION_USER_KEY)
  if (raw === cachedRaw) {
    return cachedUser
  }

  cachedRaw = raw
  cachedUser = parseSessionUser(raw)
  return cachedUser
}

function emitSessionUserUpdated() {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new Event(SESSION_USER_EVENT))
}

export function getSessionUser(): SessionUser | null {
  return readSessionUser()
}

export interface SetSessionUserInput {
  username: string
  name?: string
  email?: string
  country?: string
}

export function setSessionUser(input: string | SetSessionUserInput): SessionUser {
  const details = typeof input === 'string' ? { username: input } : input
  const sessionUser: SessionUser = {
    username: details.username.trim(),
    signedInAt: new Date().toISOString(),
    name: details.name?.trim() || undefined,
    email: details.email?.trim() || undefined,
    country: details.country?.trim() || undefined,
  }

  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(sessionUser))
  emitSessionUserUpdated()
  return sessionUser
}

export function clearSessionUser() {
  localStorage.removeItem(SESSION_USER_KEY)
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(SESSION_AUTH_KEY)
  }
  emitSessionUserUpdated()
}

export function getSessionAuth(): SessionAuth | null {
  if (typeof sessionStorage === 'undefined') {
    return null
  }

  try {
    const raw = sessionStorage.getItem(SESSION_AUTH_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<SessionAuth>
    if (!parsed.username || !parsed.password) {
      return null
    }

    const username = parsed.username.trim()
    const password = parsed.password
    if (!username || !password) {
      return null
    }

    return { username, password }
  } catch {
    return null
  }
}

export function setSessionAuth(auth: SessionAuth) {
  if (typeof sessionStorage === 'undefined') {
    return
  }

  const payload: SessionAuth = {
    username: auth.username.trim(),
    password: auth.password,
  }

  sessionStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(payload))
  emitSessionUserUpdated()
}

function subscribeToSessionUser(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== SESSION_USER_KEY) {
      return
    }
    onStoreChange()
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(SESSION_USER_EVENT, onStoreChange)

  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(SESSION_USER_EVENT, onStoreChange)
  }
}

export function useSessionUser(): SessionUser | null {
  return useSyncExternalStore(subscribeToSessionUser, getSessionUser, () => null)
}
