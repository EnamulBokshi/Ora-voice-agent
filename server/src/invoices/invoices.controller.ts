import { Controller, Get, Post, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantScopeGuard } from '../common/guards/tenant-scope.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@Controller('invoices')
@UseGuards(JwtAuthGuard, TenantScopeGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayloadUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.invoicesService.findAll(user.businessId, Number(page) || 1, Number(limit) || 20);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
  ) {
    return this.invoicesService.findOne(user.businessId, id);
  }

  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  async resendInvoice(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
  ) {
    return this.invoicesService.resendInvoice(user.businessId, id);
  }
}
