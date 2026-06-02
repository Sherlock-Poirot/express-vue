const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function getUser() {
  const userStr = localStorage.getItem(USER_KEY)
  if (userStr) {
    try {
      return JSON.parse(userStr)
    } catch (e) {
      return null
    }
  }
  return null
}

export function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function removeUser() {
  localStorage.removeItem(USER_KEY)
}

export function clearAuth() {
  removeToken()
  removeUser()
}

export function hasPermission(permission) {
  const user = getUser()
  if (!user || !user.permissions) return false
  return user.permissions.includes(permission)
}

export function hasRole(role) {
  const user = getUser()
  if (!user || !user.roles) return false
  return user.roles.includes(role)
}
