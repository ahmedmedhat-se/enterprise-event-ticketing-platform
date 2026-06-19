import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PricingTierDto {
  @IsString()
  @MaxLength(100)
  tierName: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsNumber()
  @Min(1)
  seatsCount: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  earlyBirdPrice?: number;

  @IsOptional()
  @IsDateString()
  earlyBirdExpiration?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxPerOrder?: number;
}

export class CreateEventDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsEnum(['seated', 'general_admission'])
  eventType: 'seated' | 'general_admission';

  @IsDateString()
  salesStartAt: string;

  @IsOptional()
  @IsDateString()
  salesEndAt?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  totalCapacity?: number; // for general_admission

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingTierDto)
  @ArrayMinSize(1)
  pricingTiers: PricingTierDto[];
}
