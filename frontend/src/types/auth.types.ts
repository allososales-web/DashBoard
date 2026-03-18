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

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: UserInfo;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface UserInfo {
  id: string;
  username: string;
  name: string;
  role: Role;
  stores: StorePermission[];
}

export interface StorePermission {
  storeId: string;
  storeName: string;
  permissionLevel: PermissionLevel;
}

export interface AuthState {
  user: UserInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  selectedStoreId: string | null;
}
