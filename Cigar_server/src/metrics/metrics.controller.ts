import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { MetricsService } from './metrics.service';
import { Public } from '../common/decorators/public.decorator';

@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Public()
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async getMetrics(@Res() res: Response) {
    const metrics = await this.metrics.getMetrics();
    return res.send(metrics);
  }
}
