// Role constants that match database enums
export const APP_ROLES = {
  SYSTEM_ADMIN: 'system_admin',
} as const;

export const ORG_ROLES = {
  META_ORG_ADMIN: 'meta_org_admin',
  ORG_ADMIN: 'org_admin',
  USER: 'user',
} as const;

export type AppRole = typeof APP_ROLES[keyof typeof APP_ROLES];
export type OrgRole = typeof ORG_ROLES[keyof typeof ORG_ROLES];
export type AnyRole = AppRole | OrgRole;

// Translation keys for roles
export const ROLE_TRANSLATION_KEYS: Record<AnyRole, string> = {
  [APP_ROLES.SYSTEM_ADMIN]: 'roles.systemAdmin',
  [ORG_ROLES.META_ORG_ADMIN]: 'roles.metaOrgAdmin',
  [ORG_ROLES.ORG_ADMIN]: 'roles.orgAdmin',
  [ORG_ROLES.USER]: 'roles.user',
};
