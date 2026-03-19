import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { Role, PermissionLevel } from '../../common/types/roles.enum';
import { LoginDto } from './dto/login.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { PinLoginDto, ChangePinDto, ResetPinDto } from './dto/pin-login.dto';

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
    // PIN 기반 토큰: sub가 'HQ' 또는 storeId(UUID)
    if (userId === 'HQ') {
      return { id: 'HQ', username: 'HQ', name: 'Alloso 본사', role: 'HQ_ADMIN', stores: [] };
    }

    // storeId로 먼저 확인 (PIN 로그인한 매장)
    const store = await this.prisma.store.findUnique({ where: { id: userId } }).catch(() => null);
    if (store) {
      return {
        id: store.id,
        username: store.code,
        name: store.name,
        role: 'STORE_MANAGER',
        stores: [{ storeId: store.id, storeName: store.name, permissionLevel: 'MANAGE' }],
      };
    }

    // 일반 User 로그인
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { storePermissions: { include: { store: true } } },
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

  // ─── PIN 기반 인증 ───

  async getStoreList() {
    const stores = await this.prisma.store.findMany({
      where: { isActive: true, showOnLogin: true },
      select: { id: true, name: true, code: true, region: true, displayName: true, defaultChannel: true },
      orderBy: { name: 'asc' },
    });
    return stores.map((s) => ({
      id: s.id,
      name: s.displayName ?? s.name,
      code: s.code,
      region: s.region,
      defaultChannel: s.defaultChannel ?? 'ROAD',
    }));
  }

  async pinLogin(dto: PinLoginDto) {
    const isHq = dto.storeId === 'HQ';

    if (isHq) {
      const hqAuth = await this.prisma.hqAuth.findFirst();
      if (!hqAuth) throw new UnauthorizedException('HQ not configured');

      const valid = await bcrypt.compare(dto.pin, hqAuth.pinHash);
      if (!valid) throw new UnauthorizedException('PIN이 올바르지 않습니다');

      const token = this.jwtService.sign({
        sub: 'HQ',
        role: 'HQ_ADMIN',
        storePermissions: [],
      });

      return {
        accessToken: token,
        isFirstLogin: hqAuth.isFirstLogin,
        role: 'HQ_ADMIN',
        storeId: 'HQ',
        storeName: 'Alloso 본사',
      };
    } else {
      const storeAuth = await this.prisma.storeAuth.findUnique({
        where: { storeId: dto.storeId },
        include: { store: true },
      });

      if (!storeAuth) throw new UnauthorizedException('매장 정보를 찾을 수 없습니다');

      const valid = await bcrypt.compare(dto.pin, storeAuth.pinHash);
      if (!valid) throw new UnauthorizedException('PIN이 올바르지 않습니다');

      const token = this.jwtService.sign({
        sub: dto.storeId,
        role: 'STORE_MANAGER',
        storePermissions: [{ storeId: dto.storeId, level: 'MANAGE' }],
      });

      return {
        accessToken: token,
        isFirstLogin: storeAuth.isFirstLogin,
        role: 'STORE_MANAGER',
        storeId: dto.storeId,
        storeName: storeAuth.store.name,
      };
    }
  }

  async changePin(storeId: string, dto: ChangePinDto) {
    const isHq = storeId === 'HQ';

    if (isHq) {
      const hqAuth = await this.prisma.hqAuth.findFirst();
      if (!hqAuth) throw new BadRequestException('HQ not configured');

      const valid = await bcrypt.compare(dto.currentPin, hqAuth.pinHash);
      if (!valid) throw new UnauthorizedException('현재 PIN이 올바르지 않습니다');

      const newHash = await bcrypt.hash(dto.newPin, 10);
      await this.prisma.hqAuth.update({
        where: { id: hqAuth.id },
        data: { pinHash: newHash, plainPin: dto.newPin, isFirstLogin: false, pinChangedAt: new Date() },
      });
    } else {
      const storeAuth = await this.prisma.storeAuth.findUnique({ where: { storeId } });
      if (!storeAuth) throw new BadRequestException('매장 정보를 찾을 수 없습니다');

      const valid = await bcrypt.compare(dto.currentPin, storeAuth.pinHash);
      if (!valid) throw new UnauthorizedException('현재 PIN이 올바르지 않습니다');

      const newHash = await bcrypt.hash(dto.newPin, 10);
      await this.prisma.storeAuth.update({
        where: { storeId },
        data: { pinHash: newHash, plainPin: dto.newPin, isFirstLogin: false, pinChangedAt: new Date() },
      });
    }

    return { message: 'PIN이 변경되었습니다' };
  }

  async resetPin(dto: ResetPinDto) {
    const newHash = await bcrypt.hash(dto.newPin, 10);

    if (dto.storeId === 'HQ') {
      const hqAuth = await this.prisma.hqAuth.findFirst();
      if (!hqAuth) throw new BadRequestException('HQ not configured');
      await this.prisma.hqAuth.update({
        where: { id: hqAuth.id },
        data: { pinHash: newHash, plainPin: dto.newPin, isFirstLogin: true, pinChangedAt: new Date() },
      });
    } else {
      // storeAuth가 없는 매장도 처리 (upsert)
      await this.prisma.storeAuth.upsert({
        where: { storeId: dto.storeId },
        update: { pinHash: newHash, plainPin: dto.newPin, isFirstLogin: true, pinChangedAt: new Date() },
        create: { storeId: dto.storeId, pinHash: newHash, plainPin: dto.newPin, isFirstLogin: true, pinChangedAt: new Date() },
      });
    }

    return { message: 'PIN이 초기화되었습니다' };
  }

  async getAllPins() {
    const stores = await this.prisma.store.findMany({
      where: { isActive: true },
      include: { storeAuth: true },
      orderBy: { code: 'asc' },
    });

    const hqAuth = await this.prisma.hqAuth.findFirst();

    return {
      hq: {
        storeId: 'HQ',
        storeName: 'Alloso 본사',
        isFirstLogin: hqAuth?.isFirstLogin ?? true,
        pinChangedAt: hqAuth?.pinChangedAt,
        currentPin: hqAuth?.plainPin ?? null,
      },
      stores: stores.map((s) => ({
        storeId: s.id,
        storeName: s.name,
        storeCode: s.code,
        showOnLogin: s.showOnLogin,
        isFirstLogin: s.storeAuth?.isFirstLogin ?? true,
        pinChangedAt: s.storeAuth?.pinChangedAt,
        currentPin: s.storeAuth?.plainPin ?? null,
      })),
    };
  }
}
