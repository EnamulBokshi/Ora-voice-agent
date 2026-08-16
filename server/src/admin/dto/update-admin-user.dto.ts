import { IsOptional, IsString, IsEmail, IsEnum, IsBoolean, MinLength } from 'class-validator';
import { AdminRole } from '../../users/enums/admin-role.enum';

export class UpdateAdminUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;
}
