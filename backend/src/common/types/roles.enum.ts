export enum Role {
  HQ_ADMIN = 'HQ_ADMIN',
  STORE_MANAGER = 'STORE_MANAGER',
  STORE_STAFF = 'STORE_STAFF',
  READONLY = 'READONLY',
}

export enum PermissionLevel {
  MANAGE = 'MANAGE',
  VIEW = 'VIEW',
  NONE = 'NONE',
}

export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.HQ_ADMIN]: 4,
  [Role.STORE_MANAGER]: 3,
  [Role.STORE_STAFF]: 2,
  [Role.READONLY]: 1,
};
