import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PermissionLevel } from '../../../common/types/roles.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    const storePermissions = new Map<string, PermissionLevel>();
    if (payload.storePermissions) {
      for (const sp of payload.storePermissions) {
        storePermissions.set(sp.storeId, sp.level as PermissionLevel);
      }
    }

    return {
      id: payload.sub,
      username: payload.username ?? payload.sub,
      role: payload.role as Role,
      storePermissions,
    };
  }
}
