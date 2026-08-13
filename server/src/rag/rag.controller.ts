import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { RagService } from './services/rag.service';
import { SearchRagDto } from './dto/search-rag.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantScopeGuard } from '../common/guards/tenant-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@Controller('rag')
@UseGuards(JwtAuthGuard, TenantScopeGuard)
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('search-products')
  @HttpCode(HttpStatus.OK)
  async searchProducts(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: SearchRagDto,
  ) {
    return this.ragService.searchProducts(user.businessId, dto.query, {
      limit: dto.limit,
      confidenceThreshold: dto.confidenceThreshold,
    });
  }

  @Post('search-knowledge')
  @HttpCode(HttpStatus.OK)
  async searchKnowledge(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: SearchRagDto,
  ) {
    return this.ragService.searchKnowledge(user.businessId, dto.query, {
      limit: dto.limit,
      confidenceThreshold: dto.confidenceThreshold,
    });
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: SearchRagDto,
  ) {
    return this.ragService.searchCombined(user.businessId, dto.query, {
      limit: dto.limit,
      confidenceThreshold: dto.confidenceThreshold,
      entityType: dto.entityType,
    });
  }

  @Post('reindex-tenant')
  @UseGuards(RolesGuard)
  @Roles('owner' as any, 'admin' as any)
  @HttpCode(HttpStatus.OK)
  async reindexTenant(@CurrentUser() user: JwtPayloadUser) {
    return this.ragService.reindexTenant(user.businessId);
  }
}
