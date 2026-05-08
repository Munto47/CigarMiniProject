import { Controller, Get, Put, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PosterService } from './poster.service';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Admin - Posters')
@ApiBearerAuth()
@Controller('admin/posters')
export class AdminPosterController {
  constructor(private readonly posterService: PosterService) {}

  @Get()
  @ApiOperation({ summary: '海报列表' })
  @RequirePermissions('poster:read')
  async listPosters(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.posterService.listPosters(page ?? 1, pageSize ?? 20);
  }

  @Get('template')
  @ApiOperation({ summary: '获取海报模板' })
  @RequirePermissions('poster:template')
  async getTemplate() {
    return this.posterService.getTemplate();
  }

  @Put('template')
  @ApiOperation({ summary: '更新海报模板' })
  @RequirePermissions('poster:template')
  async updateTemplate(
    @CurrentUser() admin: any,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.posterService.updateTemplate(dto, BigInt(admin.sub));
  }
}
