import { IsNotEmpty, IsIn } from 'class-validator';

export class AdminUserActionDto {
  @IsNotEmpty()
  @IsIn(['suspend', 'activate', 'resend_otp', 'revoke_sessions', 'delete'])
  action: 'suspend' | 'activate' | 'resend_otp' | 'revoke_sessions' | 'delete';
}
