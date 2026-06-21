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

export class SeatMapRowDto {
  @IsString()
  @MaxLength(10)
  label: string;

  @IsNumber()
  @Min(1)
  seats: number;
}

export class PricingTierDto {
  @IsString()
  @MaxLength(100)
  tierName: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  seatsCount?: number;

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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rows?: string[];
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

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SeatMapRowDto)
  @IsArray()
  seatMap?: SeatMapRowDto[]; // custom seat layout (only for seated events)
}
