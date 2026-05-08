import { Module } from '@nestjs/common';
import { TiersService, LevelConfigService } from './tiers.service';
import { TiersAdminController } from './tiers-admin.controller';
import { StoredValuePublicController } from './storedvalue-public.controller';
import { LevelConfigAdminController } from './level-config-admin.controller';
import { RechargeController } from './recharge.controller';
import { WechatCallbackController } from './wechat-callback.controller';
import { StoredValueAdminController } from './storedvalue-admin.controller';
import { RechargeService } from './recharge.service';
import { WechatPayService } from './wechat-pay.service';
import { AdjustService } from './adjust.service';
import { LevelRecalcService } from './level-recalc.service';
import { MemberModule } from '../member/member.module';

@Module({
  imports: [MemberModule],
  controllers: [
    TiersAdminController,
    StoredValuePublicController,
    LevelConfigAdminController,
    RechargeController,
    WechatCallbackController,
    StoredValueAdminController,
  ],
  providers: [
    TiersService,
    LevelConfigService,
    RechargeService,
    WechatPayService,
    AdjustService,
    LevelRecalcService,
  ],
  exports: [TiersService, LevelConfigService, RechargeService, WechatPayService],
})
export class StoredValueModule {}
