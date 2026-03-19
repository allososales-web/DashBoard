export class EventResponseDto {
  id: string;
  title: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  targetStores: any;
  createdBy: string | null;
  createdAt: Date;
}
