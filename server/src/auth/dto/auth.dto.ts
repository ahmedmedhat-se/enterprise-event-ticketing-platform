import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class FanSignupDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class FanLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class OrganizerSignupDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  businessName!: string;

  @IsString()
  businessRegistrationNumber!: string;

  @IsString()
  taxId!: string;
}

export class OrganizerLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
