import {
  Controller, Get, Post, Res, Query, UseInterceptors,
  UploadedFile, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExportService } from './export.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BusinessException } from '../common/exceptions/business.exception';
import { ErrorCode } from '../common/constants/error-codes';

@ApiTags('Admin - Export')
@ApiBearerAuth()
@Controller('admin/export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('orders')
  @ApiOperation({ summary: '导出订单 Excel' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @RequirePermissions('order:export')
  async exportOrders(
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const buffer = await this.exportService.exportOrders(startDate, endDate);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.xlsx');
    res.send(buffer);
  }

  @Get('transactions')
  @ApiOperation({ summary: '导出储值流水 Excel' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @RequirePermissions('storedvalue:read')
  async exportTransactions(
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const buffer = await this.exportService.exportTransactions(startDate, endDate);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.xlsx');
    res.send(buffer);
  }

  @Get('cigars')
  @ApiOperation({ summary: '导出雪茄库 Excel' })
  @RequirePermissions('library:read')
  async exportCigars(@Res() res: Response) {
    const buffer = await this.exportService.exportCigars();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=cigars.xlsx');
    res.send(buffer);
  }

  @Post('cigars/import')
  @ApiOperation({ summary: '从 Excel 导入雪茄库' })
  @ApiConsumes('multipart/form-data')
  @RequirePermissions('library:write')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  async importCigars(
    @UploadedFile() file: Express.Multer.File,
    @Query('dryRun') dryRun?: string,
  ) {
    if (!file) {
      throw new BusinessException(ErrorCode.VALIDATION_FAILED, '请上传Excel文件');
    }

    if (dryRun === 'true') {
      const cigars = await this.exportService.parseCigarsFromExcel(file.buffer);
      return { total: cigars.length, dryRun: true, preview: cigars.slice(0, 5) };
    }

    return this.exportService.importCigarsFromExcel(file.buffer);
  }
}
