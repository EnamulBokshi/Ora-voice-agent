import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantScopeGuard } from '../common/guards/tenant-scope.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminRole } from '../users/enums/admin-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantScopeGuard, RolesGuard)
@Roles(AdminRole.OWNER, AdminRole.ADMIN, AdminRole.STAFF)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayloadUser,
    @Query() query: QueryNotificationsDto,
  ) {
    return this.notificationsService.findAll(user.businessId, query);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: JwtPayloadUser) {
    return this.notificationsService.getUnreadCount(user.businessId);
  }

  @Patch('mark-all-read')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@CurrentUser() user: JwtPayloadUser) {
    return this.notificationsService.markAllAsRead(user.businessId);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(user.businessId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.remove(user.businessId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateNotificationDto,
  ) {
    return this.notificationsService.create(user.businessId, dto);
  }
}
