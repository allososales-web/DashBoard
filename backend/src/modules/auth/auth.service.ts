import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { Role, PermissionLevel } from '../../common/types/roles.enum';
import { LoginDto } from './dto/login.dto';
import { TokenResponseDto } from './dto/token-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) return null;

    return user;
  }

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      include: {
        storePermissions: {
          include: { store: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const storePermissions = user.storePermissions.map((sp) => ({
      storeId: sp.storeId,
      level: sp.permissionLevel as PermissionLevel,
    }));

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role as Role,
      storePermissions,
    };

    const accessToken = this.jwtService.sign(payload);

    const rawRefreshToken = uuidv4();
    const hashedRefreshToken = await bcrypt.hash(rawRefreshToken, 10);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: hashedRefreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        stores: user.storePermissions.map((sp) => ({
          storeId: sp.storeId,
          storeName: sp.store.name,
          permissionLevel: sp.permissionLevel,
        })),
      },
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: {
            storePermissions: true,
          },
        },
      },
    });

    let matchedToken: (typeof storedTokens)[0] | null = null;
    for (const token of storedTokens) {
      const isMatch = await bcrypt.compare(refreshToken, token.token);
      if (isMatch) {
        matchedToken = token;
        break;
      }
    }

    if (!matchedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke old token (Refresh Token Rotation)
    await this.prisma.refreshToken.update({
      where: { id: matchedToken.id },
      data: { revokedAt: new Date() },
    });

    const user = matchedToken.user;

    const storePermissions = user.storePermissions.map((sp) => ({
      storeId: sp.storeId,
      level: sp.permissionLevel as PermissionLevel,
    }));

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role as Role,
      storePermissions,
    };

    const newAccessToken = this.jwtService.sign(payload);

    const rawRefreshToken = uuidv4();
    const hashedRefreshToken = await bcrypt.hash(rawRefreshToken, 10);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: hashedRefreshToken,
        expiresAt,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: rawRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
      },
    });

    for (const token of storedTokens) {
      const isMatch = await bcrypt.compare(refreshToken, token.token);
      if (isMatch) {
        await this.prisma.refreshToken.update({
          where: { id: token.id },
          data: { revokedAt: new Date() },
        });
        return;
      }
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        storePermissions: {
          include: { store: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role as string,
      stores: user.storePermissions.map((sp) => ({
        storeId: sp.storeId,
        storeName: sp.store.name,
        permissionLevel: sp.permissionLevel as string,
      })),
    };
  }
}
