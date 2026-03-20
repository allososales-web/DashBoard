import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method: string = request.method;

    if (method === 'GET') {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        this.createAuditLog(request).catch((err) => {
          this.logger.error('Failed to create audit log', err.stack);
        });
      }),
    );
  }

  private async createAuditLog(request: any): Promise<void> {
    const user: AuthenticatedUser | undefined = request.user;
    const storeId: string | undefined = request.params?.storeId;
    const resourceId: string | undefined =
      request.params?.id ?? request.params?.storeId;

    const pathSegments = (request.path as string)
      .split('/')
      .filter(Boolean);
    const resourceType = this.extractResourceType(pathSegments);

    // 핀 로그인 유저(HQ 또는 storeId)는 users 테이블에 없으므로 감사 로그 스킵
    if (!user?.id || user.id === 'HQ') return;

    // users 테이블에 실제 존재하는지 확인
    const userExists = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true },
    }).catch(() => null);

    if (!userExists) return;

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        storeId: storeId ?? null,
        action: request.method,
        resourceType,
        resourceId: resourceId ?? null,
        ipAddress: request.ip ?? request.connection?.remoteAddress ?? null,
      },
    });
  }

  private extractResourceType(segments: string[]): string {
    // Find the main resource name from URL path
    // e.g., /stores/:storeId/quotes/:id -> 'quotes'
    // e.g., /auth/login -> 'auth'
    // e.g., /hq/notices -> 'notices'
    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = segments[i];
      // Skip UUID-like segments and action segments
      if (
        !this.isUuid(segment) &&
        !['cancel', 'recalculate', 'status'].includes(segment)
      ) {
        return segment;
      }
    }
    return segments[0] ?? 'unknown';
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
