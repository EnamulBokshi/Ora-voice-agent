import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { CreateKnowledgeDocDto } from './dto/create-knowledge-doc.dto';
import { UpdateKnowledgeDocDto } from './dto/update-knowledge-doc.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantScopeGuard } from '../common/guards/tenant-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@Controller('knowledge')
@UseGuards(JwtAuthGuard, TenantScopeGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('owner' as any, 'admin' as any)
  async create(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateKnowledgeDocDto,
  ) {
    return this.knowledgeService.create(user.businessId, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayloadUser,
    @Query('docType') docType?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.knowledgeService.findAll(user.businessId, docType, search, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
  ) {
    return this.knowledgeService.findOne(user.businessId, id);
  }

  @Get(':id/chunks')
  async findChunks(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
  ) {
    return this.knowledgeService.findChunksForDoc(user.businessId, id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('owner' as any, 'admin' as any)
  async update(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: UpdateKnowledgeDocDto,
  ) {
    return this.knowledgeService.update(user.businessId, id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('owner' as any, 'admin' as any)
  async remove(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
  ) {
    return this.knowledgeService.remove(user.businessId, id);
  }
}
