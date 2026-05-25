import {
  Controller, Get, Header, Res, UnauthorizedException,
  Headers as HeaderParams,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { MetricsService } from './metrics.service';
import { Public } from '../common/decorators/public.decorator';

@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async getMetrics(
    @Res() res: Response,
    @HeaderParams('x-metrics-api-key') apiKey?: string,
  ) {
    const expectedKey = this.config.get<string>('METRICS_API_KEY');
    if (expectedKey && apiKey !== expectedKey) {
      throw new UnauthorizedException('无效的 Metrics API Key');
    }
    const metrics = await this.metrics.getMetrics();
    return res.send(metrics);
  }
}
