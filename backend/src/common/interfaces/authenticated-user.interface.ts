import { Role, PermissionLevel } from '../types/roles.enum';

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: Role;
  storePermissions: Map<string, PermissionLevel>;
}
