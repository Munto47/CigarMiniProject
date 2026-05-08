import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TiersService } from './tiers.service';
import { LevelConfigService } from './tiers.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('storedvalue')
@Controller('storedvalue')
export class StoredValuePublicController {
  constructor(
    private readonly tiersService: TiersService,
    private readonly levelConfigService: LevelConfigService,
  ) {}

  @Public()
  @Get('tiers')
  @ApiOperation({ summary: '公开：充值档位列表' })
  async getTiers() {
    return this.tiersService.findAll(false);
  }

  @Public()
  @Get('level-config/:type')
  @ApiOperation({ summary: '公开：等级配置（recharge|consumption）' })
  async getLevelConfig(@Param('type') type: string) {
    return this.levelConfigService.findByType(type);
  }
}
