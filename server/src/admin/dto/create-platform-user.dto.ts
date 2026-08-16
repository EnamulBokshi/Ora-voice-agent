import { IsNotEmpty, IsString, IsEmail, IsEnum, MinLength, IsOptional } from 'class-validator';
import { AdminRole } from '../../users/enums/admin-role.enum';

export class CreatePlatformUserDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @IsNotEmpty()
  @IsEnum(AdminRole)
  role: AdminRole;

  @IsOptional()
  @IsString()
  businessId?: string;

  @IsOptional()
  @IsString()
  businessName?: string;
}
