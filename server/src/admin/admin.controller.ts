import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminRole } from '../users/enums/admin-role.enum';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { AdminUserActionDto } from './dto/admin-user-action.dto';
import { CreatePlatformUserDto } from './dto/create-platform-user.dto';
import { UpdatePlatformAgentDto } from './dto/update-platform-agent.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
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

  @Delete('businesses/:id/publishable-key')
  async revokeBusinessPublishableKey(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const adminUserId = req?.user?.adminUserId || req?.user?.sub;
    return this.adminService.revokeBusinessPublishableKey(id, adminUserId);
  }

  @Patch('businesses/:id/key-status')
  async updateBusinessKeyStatus(
    @Param('id') id: string,
    @Body('keyStatus') keyStatus: string,
  ) {
    return this.adminService.updateBusinessKeyStatus(id, keyStatus);
  }

  @Get('users')
  async getUsers(@Query() query: AdminUserQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Post('users')
  async createPlatformUser(@Body() dto: CreatePlatformUserDto) {
    return this.adminService.createPlatformUser(dto);
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.adminService.updateUser(id, dto);
  }

  @Post('users/:id/action')
  async executeUserAction(
    @Param('id') id: string,
    @Body() dto: AdminUserActionDto,
    @Req() req: any,
  ) {
    const currentUserId = req?.user?.adminUserId || req?.user?.sub;
    return this.adminService.executeUserAction(id, dto, currentUserId);
  }

  @Get('voice-sessions')
  async getVoiceSessions(@Query('limit') limit?: number) {
    return this.adminService.getVoiceSessions(limit);
  }

  @Get('system/health')
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('platform-agent')
  async getPlatformAgent() {
    return this.adminService.getPlatformAgentConfig();
  }

  @Patch('platform-agent')
  async updatePlatformAgent(@Body() dto: UpdatePlatformAgentDto) {
    return this.adminService.updatePlatformAgentConfig(dto);
  }

  @Get('token-analytics')
  async getTokenAnalytics(@Query('days') days?: number) {
    return this.adminService.getTokenAnalytics(days ? Number(days) : 30);
  }

  @Get('merchants-cost')
  async getMerchantsCost() {
    return this.adminService.getMerchantsCostAnalytics();
  }

  @Patch('businesses/:id/budget-cap')
  async updateMerchantBudgetCap(
    @Param('id') id: string,
    @Body('budgetCapUsd') budgetCapUsd: number | null,
  ) {
    return this.adminService.updateMerchantBudgetCap(id, budgetCapUsd);
  }
}


