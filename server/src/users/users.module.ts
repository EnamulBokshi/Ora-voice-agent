import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { BusinessController } from './business.controller';
import { AdminUser, AdminUserSchema } from './schemas/admin-user.schema';
import { Business, BusinessSchema } from './schemas/business.schema';
import { AiVoiceModule } from '../ai-voice/ai-voice.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminUser.name, schema: AdminUserSchema },
      { name: Business.name, schema: BusinessSchema },
    ]),
    forwardRef(() => AiVoiceModule),
  ],
  controllers: [UsersController, BusinessController],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}

