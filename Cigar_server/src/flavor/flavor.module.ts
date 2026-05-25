import { Module } from '@nestjs/common';
import { FlavorService } from './flavor.service';
import { FlavorController } from './flavor.controller';
import { AsrModule } from '../asr/asr.module';

@Module({
  imports: [AsrModule],
  controllers: [FlavorController],
  providers: [FlavorService],
  exports: [FlavorService],
})
export class FlavorModule {}
