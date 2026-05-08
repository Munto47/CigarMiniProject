import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../constants/error-codes';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // BusinessException
    if (exception instanceof BusinessException) {
      const body = exception.getResponse() as Record<string, unknown>;
      return response.status(exception.getStatus()).json({
        code: exception.bizCode,
        message: body.message,
        data: null,
        timestamp: Date.now(),
        requestId: request.headers['x-request-id'] ?? null,
      });
    }

    // NestJS HttpException (包括 ValidationPipe)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      let message = '请求失败';
      let code = status;

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        if (Array.isArray(r.message)) {
          message = (r.message as string[]).join('; ');
        } else if (typeof r.message === 'string') {
          message = r.message;
        }
      }

      // 400 Bad Request → Validation Failed
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      if (status === HttpStatus.BAD_REQUEST) {
        code = ErrorCode.VALIDATION_FAILED;
      }

      return response.status(status).json({
        code,
        message,
        data: null,
        timestamp: Date.now(),
        requestId: request.headers['x-request-id'] ?? null,
      });
    }

    // Prisma unique constraint violation (幂等命中第二道防线)

    if (
      exception instanceof Error &&
      'code' in exception &&
      exception.code === 'P2002'
    ) {
      this.logger.warn('唯一约束冲突（幂等命中）', {
        meta: (exception as Record<string, unknown>).meta,
        url: request.url,
      });
      return response.status(HttpStatus.CONFLICT).json({
        code: ErrorCode.BUSINESS_CONFLICT,
        message: '请求重复（幂等命中）',
        data: null,
        timestamp: Date.now(),
        requestId: request.headers['x-request-id'] ?? null,
      });
    }

    // 未知错误
    this.logger.error(
      `未处理异常: ${exception instanceof Error ? exception.message : String(exception)}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: ErrorCode.INTERNAL_ERROR,
      message: '服务器内部错误',
      data: null,
      timestamp: Date.now(),
      requestId: request.headers['x-request-id'] ?? null,
    });
  }
}
