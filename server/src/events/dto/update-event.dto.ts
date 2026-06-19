import {
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
  IsEnum,
} from 'class-validator';

export class UpdateEventDto {
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

  @IsDateString()
  salesStartAt: string;

  @IsOptional()
  @IsDateString()
  salesEndAt?: string;

  @IsDateString()
  date: string;

  @IsEnum(['seated', 'general_admission'])
  eventType: 'seated' | 'general_admission';
}
