import { Role, PermissionLevel } from '../types/roles.enum';

export interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
  storePermissions: { storeId: string; level: PermissionLevel }[];
  iat?: number;
  exp?: number;
}
