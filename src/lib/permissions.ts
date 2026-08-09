import type { AppContextData } from '../types/domain'

export function isAdmin(ctx: AppContextData | null): boolean {
  return !!ctx?.assignments.some((a) => !a.organization_id && ctx.roles.find((r) => r.id === a.role_id)?.key === 'administrator')
}

export function roleKeys(ctx: AppContextData | null): string[] {
  if (!ctx) return []
  return ctx.assignments.map((a) => ctx.roles.find((r) => r.id === a.role_id)?.key).filter((v): v is string => Boolean(v))
}

export function canPermission(ctx: AppContextData | null, permissionKey: string, organizationId?: string | null): boolean {
  if (!ctx) return false
  if (isAdmin(ctx)) return true
  if (!organizationId) return false
  const target = ctx.organizations.find((o) => o.id === organizationId)
  if (!target) return false
  return ctx.assignments.some((assignment) => {
    const role = ctx.roles.find((r) => r.id === assignment.role_id)
    if (!role) return false
    const permission = ctx.permissions.find((p) => p.key === permissionKey)
    if (!permission) return false
    if (!ctx.rolePermissions.some((rp) => rp.role_id === role.id && rp.permission_id === permission.id)) return false
    if (assignment.organization_id === organizationId) {
      if (role.key === 'pastor') return true
      if (['team_leader', 'small_group_leader', 'club_leader', 'volunteer_team_leader'].includes(role.key)) {
        return ctx.memberships.some((m) => m.organization_id === organizationId && m.status === 'active')
      }
      return true
    }
    return target.type === 'small_group'
      && ['pastor', 'team_leader'].includes(role.key)
      && target.parent_organization_id === assignment.organization_id
  })
}

export function canManageOrganization(ctx: AppContextData | null, permissionKey: string, organizationId: string): boolean {
  return canPermission(ctx, permissionKey, organizationId)
}
