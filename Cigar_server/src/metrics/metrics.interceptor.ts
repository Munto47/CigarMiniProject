import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const start = process.hrtime.bigint();

    // Normalize path: strip dynamic segments like /api/orders/123 -> /api/orders/:id
    const path = this.normalizePath(req.route?.path ?? req.path);
    const method = req.method;
    // Use the route pattern if available to get the actual matched route
    const routePath = req.route?.path
      ? `${req.baseUrl ?? ''}${req.route.path}`
      : this.normalizePath(req.path);

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse<Response>();
        const duration = Number(process.hrtime.bigint() - start) / 1e9;
        const statusCode = String(res.statusCode);

        this.metrics.httpRequestsTotal.inc({ method, path: routePath, status_code: statusCode });
        this.metrics.httpRequestDuration.observe(
          { method, path: routePath, status_code: statusCode },
          duration,
        );
      }),
      catchError((err) => {
        const statusCode = String(err.status ?? 500);
        const duration = Number(process.hrtime.bigint() - start) / 1e9;

        this.metrics.httpRequestsTotal.inc({ method, path: routePath, status_code: statusCode });
        this.metrics.httpRequestDuration.observe(
          { method, path: routePath, status_code: statusCode },
          duration,
        );
        throw err;
      }),
    );
  }

  private normalizePath(raw: string): string {
    if (!raw) return '/';
    // Replace dynamic segments (numbers, UUIDs) with placeholders
    return (
      '/' +
      raw
        .split('/')
        .filter(Boolean)
        .map((seg) => {
          if (/^\d+$/.test(seg)) return ':id';
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(seg)) return ':uuid';
          return seg;
        })
        .join('/')
    );
  }
}
