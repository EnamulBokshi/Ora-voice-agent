import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { QueryProductsDto } from './dto/query-products.dto';
import { BatchSyncProductsDto } from './dto/batch-sync-products.dto';
import { VerifyLiveDto } from './dto/verify-live.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantScopeGuard } from '../common/guards/tenant-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard, TenantScopeGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayloadUser,
    @Query() query: QueryProductsDto,
  ) {
    return this.productsService.findAll(user.businessId, query);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
  ) {
    return this.productsService.findOne(user.businessId, id);
  }

  @Post('batch-sync')
  @UseGuards(RolesGuard)
  @Roles('owner' as any, 'admin' as any)
  @HttpCode(HttpStatus.OK)
  async batchSync(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: BatchSyncProductsDto,
  ) {
    return this.productsService.batchSync(user.businessId, dto);
  }

  @Post(':id/verify-live')
  @HttpCode(HttpStatus.OK)
  async verifyLive(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() liveData: VerifyLiveDto,
  ) {
    return this.productsService.verifyLive(user.businessId, id, liveData);
  }
}
