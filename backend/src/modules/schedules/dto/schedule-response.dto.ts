export class ScheduleResponseDto {
  id: string;
  storeId: string;
  staffId: string;
  workDate: Date;
  startTime: Date | null;
  endTime: Date | null;
  shiftType: string;
  notes: string | null;
  createdAt: Date;
  staff?: {
    id: string;
    name: string;
    position: string | null;
  };
}
