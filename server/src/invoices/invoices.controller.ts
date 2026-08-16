import { Controller, Get, Post, Param, Query, UseGuards, HttpCode, HttpStatus, Header } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantScopeGuard } from '../common/guards/tenant-scope.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminRole } from '../users/enums/admin-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@Controller('invoices')
@UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
@Roles(AdminRole.OWNER, AdminRole.ADMIN)
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

  @Get(':id/pdf')
  @Header('Content-Type', 'text/html')
  async getInvoicePdf(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
  ) {
    return this.invoicesService.getInvoiceHtml(user.businessId, id);
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
