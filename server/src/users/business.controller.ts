import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Optional,
  Inject,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantScopeGuard } from '../common/guards/tenant-scope.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminRole } from './enums/admin-role.enum';
import { VoiceProxyGateway } from '../ai-voice/voice-proxy.gateway';

import { UpdateBusinessDto } from './dto/update-business.dto';

@Controller('business')
export class BusinessController {
  constructor(
    private readonly usersService: UsersService,
    @Optional()
    @Inject(VoiceProxyGateway)
    private readonly voiceProxyGateway?: VoiceProxyGateway,
  ) {}

  @UseGuards(JwtAuthGuard, TenantScopeGuard)
  @Get('current')
  async getCurrentBusiness(@Req() req: any) {
    const business = await this.usersService.findBusinessById(req.businessId);
    return business;
  }

  @UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
  @Roles(AdminRole.OWNER, AdminRole.ADMIN)
  @Patch('current')
  @HttpCode(HttpStatus.OK)
  async updateCurrentBusiness(
    @Req() req: any,
    @Body() dto: UpdateBusinessDto,
  ) {
    const updated = await this.usersService.updateBusiness(req.businessId, dto);

    // If widget visibility toggle changed, immediately invalidate gateway cache
    if (dto.isWidgetActive !== undefined && this.voiceProxyGateway) {
      if (updated?.publishableKey) {
        this.voiceProxyGateway.invalidatePublishableKey(updated.publishableKey);
      }
      // If disabled, cleanly close any active live voice sessions for this merchant
      if (dto.isWidgetActive === false) {
        this.voiceProxyGateway.terminateBusinessSessions(req.businessId);
      }
    }

    return {
      message: 'Store settings updated successfully.',
      business: updated,
    };
  }

  @UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
  @Roles(AdminRole.OWNER, AdminRole.ADMIN)
  @Delete('publishable-key')
  @HttpCode(HttpStatus.OK)
  async deletePublishableKey(@Req() req: any) {
    const business = await this.usersService.findBusinessById(req.businessId);
    if (business?.publishableKey && this.voiceProxyGateway) {
      this.voiceProxyGateway.invalidatePublishableKey(business.publishableKey);
    }
    const updated = await this.usersService.deletePublishableKey(req.businessId);
    return {
      message: 'Publishable key revoked successfully.',
      business: updated,
    };
  }

  @UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
  @Roles(AdminRole.OWNER, AdminRole.ADMIN)
  @Post('publishable-key')
  @HttpCode(HttpStatus.CREATED)
  async generatePublishableKey(@Req() req: any) {
    const result = await this.usersService.generatePublishableKey(req.businessId);
    if (this.voiceProxyGateway) {
      this.voiceProxyGateway.invalidatePublishableKey();
    }
    return {
      message: 'Publishable key generated successfully.',
      publishableKey: result.publishableKey,
      business: result.business,
    };
  }

  @UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
  @Roles(AdminRole.OWNER, AdminRole.ADMIN)
  @Post('secret-key')
  @HttpCode(HttpStatus.CREATED)
  async generateSecretKey(@Req() req: any) {
    const result = await this.usersService.generateSecretKey(req.businessId);
    return {
      message: 'Secret API key generated successfully.',
      secretApiKey: result.secretApiKey,
      business: result.business,
    };
  }

  @UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
  @Roles(AdminRole.OWNER, AdminRole.ADMIN)
  @Delete('secret-key')
  @HttpCode(HttpStatus.OK)
  async deleteSecretKey(@Req() req: any) {
    const updated = await this.usersService.deleteSecretKey(req.businessId);
    return {
      message: 'Secret API key revoked successfully.',
      business: updated,
    };
  }
}
