import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminRole } from '../users/enums/admin-role.enum';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getStats(@Query('period') period?: string) {
    return this.adminService.getPlatformStats(period);
  }

  @Get('businesses')
  async getBusinesses(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getBusinesses({ page, limit, search, status });
  }

  @Get('businesses/:id')
  async getBusinessById(@Param('id') id: string) {
    return this.adminService.getBusinessById(id);
  }

  @Patch('businesses/:id/status')
  async updateBusinessStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateBusinessStatus(id, status);
  }

  @Get('users')
  async getUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers({ page, limit, role, search });
  }

  @Get('voice-sessions')
  async getVoiceSessions(@Query('limit') limit?: number) {
    return this.adminService.getVoiceSessions(limit);
  }

  @Get('system/health')
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }
}

