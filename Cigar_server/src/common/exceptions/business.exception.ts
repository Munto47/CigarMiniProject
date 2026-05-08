import { HttpException } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';

export class BusinessException extends HttpException {
  public readonly bizCode: number;

  constructor(code: number, message: string) {
    const httpStatus = BusinessException.toHttpStatus(code);
    super(
      {
        code,
        message,
        data: null,
        timestamp: Date.now(),
      },
      httpStatus,
    );
    this.bizCode = code;
  }

  static toHttpStatus(code: number): number {
    // 401
    if (code === ErrorCode.TOKEN_EXPIRED) return 401;
    if (code === ErrorCode.TOKEN_INVALID) return 401;
    if (code === ErrorCode.NOT_LOGIN) return 401;
    // 403
    if (code === ErrorCode.FORBIDDEN) return 403;
    // 409
    if (code === ErrorCode.BUSINESS_CONFLICT) return 409;
    if (code === ErrorCode.ALREADY_REVIEWED) return 409;
    if (code === ErrorCode.REFUND_IN_FLIGHT) return 409;
    // 410
    if (code === ErrorCode.ORDER_EXPIRED) return 410;
    // 423
    if (code === ErrorCode.ACCOUNT_LOCKED) return 423;
    if (code === ErrorCode.RESOURCE_LOCKED) return 423;
    // 426
    if (code === ErrorCode.MUST_CHANGE_PASSWORD) return 426;
    // 429
    if (code === ErrorCode.RATE_LIMITED) return 429;
    // 502
    if (code === ErrorCode.MEITUAN_API_ERROR) return 502;
    if (code === ErrorCode.WECHAT_PAY_API_ERROR) return 502;
    if (code === ErrorCode.UPSTREAM_AI_ERROR) return 502;
    // 500
    if (code === ErrorCode.INTERNAL_ERROR) return 500;
    return 422;
  }
}
