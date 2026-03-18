export class GoalResponseDto {
  id: string;
  storeId: string;
  year: number;
  month: number;
  targetAmount: number;
  targetContracts: number;
  targetConsults: number;
  customGoals: Record<string, any> | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
