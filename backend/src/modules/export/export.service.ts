import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type StoreResource =
  | 'quotes'
  | 'contracts'
  | 'consults'
  | 'staffs'
  | 'deliveries'
  | 'memos'
  | 'issues'
  | 'schedules';

type HqResource = 'notices' | 'events' | 'delivery-rules';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 매장 리소스 데이터를 CSV 형식으로 내보내기
   * Requirements: 19.3
   */
  async exportStoreResource(
    storeId: string,
    resource: string,
    format: string = 'csv',
    query?: Record<string, any>,
  ): Promise<string> {
    switch (resource as StoreResource) {
      case 'quotes':
        return this.exportQuotes(storeId);
      case 'contracts':
        return this.exportContracts(storeId);
      case 'consults':
        return this.exportConsults(storeId);
      case 'staffs':
        return this.exportStaffs(storeId);
      case 'deliveries':
        return this.exportDeliveries(storeId);
      case 'memos':
        return this.exportMemos(storeId);
      case 'issues':
        return this.exportIssues(storeId);
      case 'schedules':
        return this.exportSchedules(storeId);
      default:
        throw new BadRequestException(`지원하지 않는 리소스: ${resource}`);
    }
  }

  /**
   * HQ 리소스 데이터를 CSV 형식으로 내보내기
   * Requirements: 19.3
   */
  async exportHqResource(resource: string, format: string = 'csv'): Promise<string> {
    switch (resource as HqResource) {
      case 'notices':
        return this.exportNotices();
      case 'events':
        return this.exportEvents();
      case 'delivery-rules':
        return this.exportDeliveryRules();
      default:
        throw new BadRequestException(`지원하지 않는 리소스: ${resource}`);
    }
  }

  // ─── 매장 리소스 내보내기 ───────────────────────────────────────

  private async exportQuotes(storeId: string): Promise<string> {
    const rows = await this.prisma.quote.findMany({
      where: { storeId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      '견적번호', '고객명', '상태', '총금액', '유효기간', '생성일',
    ];

    const data = rows.map((r) => [
      r.quoteNumber,
      r.customerName,
      r.status,
      String(r.totalAmount),
      r.validUntil ? r.validUntil.toISOString().split('T')[0] : '',
      r.createdAt.toISOString().split('T')[0],
    ]);

    return this.toCsv(headers, data);
  }

  private async exportContracts(storeId: string): Promise<string> {
    const rows = await this.prisma.contract.findMany({
      where: { storeId },
      include: { items: true, cancellation: true },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      '계약번호', '고객명', '상태', '총금액', '계약일', '배송예정일', '생성일',
    ];

    const data = rows.map((r) => [
      r.contractNumber,
      r.customerName,
      r.status,
      String(r.totalAmount),
      r.contractDate.toISOString().split('T')[0],
      r.deliveryDate ? r.deliveryDate.toISOString().split('T')[0] : '',
      r.createdAt.toISOString().split('T')[0],
    ]);

    return this.toCsv(headers, data);
  }

  private async exportConsults(storeId: string): Promise<string> {
    const rows = await this.prisma.consult.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      '고객명', '연락처', '이메일', '상태', '상담일', '메모', '생성일',
    ];

    const data = rows.map((r) => [
      r.customerName,
      r.customerPhone ?? '',
      r.customerEmail ?? '',
      r.status,
      r.consultDate.toISOString().split('T')[0],
      r.notes ?? '',
      r.createdAt.toISOString().split('T')[0],
    ]);

    return this.toCsv(headers, data);
  }

  private async exportStaffs(storeId: string): Promise<string> {
    const rows = await this.prisma.staff.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['이름', '연락처', '직책', '입사일', '활성여부', '등록일'];

    const data = rows.map((r) => [
      r.name,
      r.phone ?? '',
      r.position ?? '',
      r.hireDate ? r.hireDate.toISOString().split('T')[0] : '',
      r.isActive ? '활성' : '비활성',
      r.createdAt.toISOString().split('T')[0],
    ]);

    return this.toCsv(headers, data);
  }

  private async exportDeliveries(storeId: string): Promise<string> {
    const rows = await this.prisma.delivery.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      '고객명', '상태', '예정일', '실제배송일', '주소', '메모', '생성일',
    ];

    const data = rows.map((r) => [
      r.customerName,
      r.status,
      r.scheduledDate.toISOString().split('T')[0],
      r.actualDate ? r.actualDate.toISOString().split('T')[0] : '',
      r.address ?? '',
      r.notes ?? '',
      r.createdAt.toISOString().split('T')[0],
    ]);

    return this.toCsv(headers, data);
  }

  private async exportMemos(storeId: string): Promise<string> {
    const rows = await this.prisma.memo.findMany({
      where: { storeId },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    const headers = ['제목', '카테고리', '고정여부', '내용', '생성일'];

    const data = rows.map((r) => [
      r.title,
      r.category,
      r.isPinned ? '고정' : '',
      r.content ?? '',
      r.createdAt.toISOString().split('T')[0],
    ]);

    return this.toCsv(headers, data);
  }

  private async exportIssues(storeId: string): Promise<string> {
    const rows = await this.prisma.issue.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['제목', '우선순위', '상태', '설명', '생성일'];

    const data = rows.map((r) => [
      r.title,
      r.priority,
      r.status,
      r.description ?? '',
      r.createdAt.toISOString().split('T')[0],
    ]);

    return this.toCsv(headers, data);
  }

  private async exportSchedules(storeId: string): Promise<string> {
    const rows = await this.prisma.schedule.findMany({
      where: { storeId },
      include: { staff: { select: { name: true } } },
      orderBy: { workDate: 'desc' },
    });

    const headers = ['직원명', '근무일', '근무유형', '시작시간', '종료시간', '메모'];

    const data = rows.map((r) => [
      r.staff.name,
      r.workDate.toISOString().split('T')[0],
      r.shiftType,
      r.startTime ? r.startTime.toISOString().split('T')[1]?.substring(0, 5) ?? '' : '',
      r.endTime ? r.endTime.toISOString().split('T')[1]?.substring(0, 5) ?? '' : '',
      r.notes ?? '',
    ]);

    return this.toCsv(headers, data);
  }

  // ─── HQ 리소스 내보내기 ─────────────────────────────────────────

  private async exportNotices(): Promise<string> {
    const rows = await this.prisma.hqNotice.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['제목', '우선순위', '게시여부', '게시일', '내용', '생성일'];

    const data = rows.map((r) => [
      r.title,
      r.priority,
      r.isPublished ? '게시' : '미게시',
      r.publishDate ? r.publishDate.toISOString().split('T')[0] : '',
      r.content,
      r.createdAt.toISOString().split('T')[0],
    ]);

    return this.toCsv(headers, data);
  }

  private async exportEvents(): Promise<string> {
    const rows = await this.prisma.hqEvent.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['제목', '설명', '시작일', '종료일', '활성여부', '생성일'];

    const data = rows.map((r) => [
      r.title,
      r.description ?? '',
      r.startDate.toISOString().split('T')[0],
      r.endDate.toISOString().split('T')[0],
      r.isActive ? '활성' : '비활성',
      r.createdAt.toISOString().split('T')[0],
    ]);

    return this.toCsv(headers, data);
  }

  private async exportDeliveryRules(): Promise<string> {
    const rows = await this.prisma.hqDeliveryRule.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['규칙명', '설명', '활성여부', '생성일'];

    const data = rows.map((r) => [
      r.ruleName,
      r.description ?? '',
      r.isActive ? '활성' : '비활성',
      r.createdAt.toISOString().split('T')[0],
    ]);

    return this.toCsv(headers, data);
  }

  // ─── CSV 변환 유틸리티 ──────────────────────────────────────────

  /**
   * 헤더 + 데이터 행을 CSV 문자열로 변환 (외부 라이브러리 없이 직접 구현)
   */
  private toCsv(headers: string[], rows: string[][]): string {
    const escape = (val: string): string => {
      // 쉼표, 큰따옴표, 줄바꿈이 포함된 경우 큰따옴표로 감싸기
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const headerLine = headers.map(escape).join(',');
    const dataLines = rows.map((row) => row.map(escape).join(','));

    return [headerLine, ...dataLines].join('\r\n');
  }
}
