import { PartialType } from '@nestjs/mapped-types';
import { CreateDeliveryRuleDto } from './create-delivery-rule.dto';

export class UpdateDeliveryRuleDto extends PartialType(CreateDeliveryRuleDto) {}
