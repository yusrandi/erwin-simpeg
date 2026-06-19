// Kredensial static — ganti sesuai kebutuhan
export const STATIC_CREDENTIALS = {
  username: "admin",
  password: "simpeg2026",
}

const SESSION_KEY = "simpeg_session"
const EXPIRED_DURATION = 1000 * 60 * 60 * 24 // 1 hari dalam ms

interface Session {
  username: string
  expiredAt: number
}

export function login(username: string, password: string): boolean {
  if (
    username === STATIC_CREDENTIALS.username &&
    password === STATIC_CREDENTIALS.password
  ) {
    const session: Session = {
      username,
      expiredAt: Date.now() + EXPIRED_DURATION,
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return true
  }
  return false
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session: Session = JSON.parse(raw)
    if (Date.now() > session.expiredAt) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return getSession() !== null
}
