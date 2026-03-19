export class DeliveryRuleResponseDto {
  id: string;
  ruleName: string;
  description: string | null;
  conditions: any;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
