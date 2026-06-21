import { hasBtnPermission } from '../utils/auth'

export function usePermission() {
  const hasPermission = (permission) => {
    return hasBtnPermission(permission)
  }

  return {
    hasPermission
  }
}