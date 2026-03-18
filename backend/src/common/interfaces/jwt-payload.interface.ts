import { Role, PermissionLevel } from '../types/roles.enum';

export interface JwtPayload {
  sub: string;
  username?: string;
  role: Role | string;
  storePermissions: { storeId: string; level: PermissionLevel | string }[];
  iat?: number;
  exp?: number;
}
