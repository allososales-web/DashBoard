import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role, PermissionLevel } from '../types/roles.enum';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class StoreAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const storeId: string | undefined = request.params.storeId;

    if (!storeId) {
      return true;
    }

    const user: AuthenticatedUser = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    if (user.role === Role.HQ_ADMIN) {
      return true;
    }

    const permission = user.storePermissions.get(storeId);

    if (!permission || permission === PermissionLevel.NONE) {
      throw new ForbiddenException(
        'You do not have access to this store',
      );
    }

    return true;
  }
}
