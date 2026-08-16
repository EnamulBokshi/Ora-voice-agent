import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantScopeGuard } from '../common/guards/tenant-scope.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminRole } from '../users/enums/admin-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
@Roles(AdminRole.OWNER, AdminRole.ADMIN, AdminRole.STAFF)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayloadUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.findAll(
      user.businessId,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    return this.ordersService.findOne(user.businessId, id);
  }
}
