import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ApiClient, ApiClientSchema } from './schemas/api-client.schema';
import { ApiClientService } from './api-client.service';
import { OAuthService } from './oauth.service';
import { OAuthController } from './oauth.controller';
import { UserInputService } from './user-input.service';
import { UserInputController } from './user-input.controller';
import { OAuthScopesGuard } from './guards/oauth-scopes.guard';
import { DualAuthGuard } from '../common/guards/dual-auth.guard';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { RedisModule } from '../common/redis/redis.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('OAUTH_JWT_SECRET') ||
          configService.get<string>('JWT_SECRET') ||
          'ora-secret-key-change-in-prod',
      }),
    }),
    KnowledgeModule,
    ConversationsModule,
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([
      { name: ApiClient.name, schema: ApiClientSchema },
    ]),
  ],
  controllers: [OAuthController, UserInputController],
  providers: [
    ApiClientService,
    OAuthService,
    UserInputService,
    OAuthScopesGuard,
    DualAuthGuard,
  ],
  exports: [
    ApiClientService,
    OAuthService,
    OAuthScopesGuard,
    DualAuthGuard,
    JwtModule,
  ],
})
export class ApiAccessModule {}
