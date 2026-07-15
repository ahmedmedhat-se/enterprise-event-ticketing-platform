import {
  IsString,
  IsUUID,
  IsArray,
  IsOptional,
  IsInt,
  Min,
  ArrayMinSize,
} from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  @IsString()
  eventId!: string;

  /**
   * Seat IDs – required for seated events.
   * At least one seat must be provided.
   */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  seatIds?: string[];

  /**
   * Number of tickets – required for general admission events.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
