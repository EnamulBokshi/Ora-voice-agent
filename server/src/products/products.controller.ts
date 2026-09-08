import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { BatchSyncProductsDto } from './dto/batch-sync-products.dto';
import { VerifyLiveDto } from './dto/verify-live.dto';
import { UpdateProductOverrideDto } from './dto/update-product-override.dto';
import { DualAuthGuard } from '../common/guards/dual-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Scopes } from '../api-access/decorators/scopes.decorator';
import { ApiScope } from '../api-access/schemas/api-client.schema';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@Controller('products')
@UseGuards(DualAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Scopes(ApiScope.PRODUCTS_READ)
  async findAll(
    @CurrentUser() user: JwtPayloadUser,
    @Query() query: QueryProductsDto,
  ) {
    return this.productsService.findAll(user.businessId, query);
  }

  @Get(':id')
  @Scopes(ApiScope.PRODUCTS_READ)
  async findOne(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
  ) {
    return this.productsService.findOne(user.businessId, id);
  }

  @Post()
  @Scopes(ApiScope.PRODUCTS_WRITE)
  @Roles('owner' as any, 'admin' as any)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(user.businessId, dto);
  }

  /**
   * Manual Product Override Endpoint (Admin Correction of Mirrored Record)
   */
  @Patch(':id')
  @Scopes(ApiScope.PRODUCTS_WRITE)
  @Roles('owner' as any, 'admin' as any)
  @HttpCode(HttpStatus.OK)
  async manualOverride(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductOverrideDto,
  ) {
    return this.productsService.manualOverride(user.businessId, id, dto);
  }

  @Post('batch-sync')
  @Scopes(ApiScope.PRODUCTS_WRITE)
  @Roles('owner' as any, 'admin' as any)
  @HttpCode(HttpStatus.OK)
  async batchSync(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: BatchSyncProductsDto,
  ) {
    return this.productsService.batchSync(user.businessId, dto);
  }

  @Post(':id/verify-live')
  @Scopes(ApiScope.PRODUCTS_READ, ApiScope.PRODUCTS_WRITE)
  @HttpCode(HttpStatus.OK)
  async verifyLive(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() liveData: VerifyLiveDto,
  ) {
    return this.productsService.verifyLive(user.businessId, id, liveData);
  }

  @Delete(':id')
  @Scopes(ApiScope.PRODUCTS_WRITE)
  @Roles('owner' as any, 'admin' as any)
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
  ) {
    return this.productsService.remove(user.businessId, id);
  }
}
