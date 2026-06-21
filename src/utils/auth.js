const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'
const PERMISSION_KEY = 'auth_permissions'

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
  removePermissions()
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

export function getPermissions() {
  const permsStr = localStorage.getItem(PERMISSION_KEY)
  if (permsStr) {
    try {
      return JSON.parse(permsStr)
    } catch (e) {
      return []
    }
  }
  return []
}

export function setPermissions(permissions) {
  localStorage.setItem(PERMISSION_KEY, JSON.stringify(permissions))
}

export function removePermissions() {
  localStorage.removeItem(PERMISSION_KEY)
}

export function hasBtnPermission(...identifiers) {
  const user = getUser()
  const permissions = getPermissions()
  
  // 超级管理员拥有所有权限
  if (user) {
    // 检查角色编码
    if (user.roleCode === 'admin' || user.roleCode === 'super_admin' || user.roleCode === 'ADMIN') {
      return true
    }
    // 检查 isAdmin 标识
    if (user.isAdmin === true || user.isAdmin === 1) {
      return true
    }
    // 检查角色列表（roles 是角色名称数组）
    if (user.roles && user.roles.some(r => 
      r === 'admin' || 
      r === 'ADMIN' ||
      r === '超级管理员' || 
      r === 'SuperAdmin' ||
      (typeof r === 'object' && (r.roleCode === 'admin' || r.roleCode === 'ADMIN'))
    )) {
      return true
    }
  }
  
  const result = identifiers.some(id => permissions.includes(id))
  return result
}
