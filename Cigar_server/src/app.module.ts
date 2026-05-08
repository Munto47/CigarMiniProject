import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './infra/redis/redis.module';
import { MinioModule } from './infra/minio/minio.module';
import { AuthModule } from './auth/auth.module';
import { OperationLogModule } from './operation-log/operation-log.module';
import { ProductModule } from './product/product.module';
import { LibraryModule } from './library/library.module';
import { UploadModule } from './upload/upload.module';
import { MemberModule } from './member/member.module';
import { StoredValueModule } from './storedvalue/storedvalue.module';
import { CartModule } from './cart/cart.module';
import { OrderModule } from './order/order.module';
import { ReviewModule } from './review/review.module';
import { RecommendModule } from './recommend/recommend.module';
import { HistoryModule } from './history/history.module';
import { PosterModule } from './poster/poster.module';
import { FlavorModule } from './flavor/flavor.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { StatisticsModule } from './statistics/statistics.module';
import { SettingsModule } from './settings/settings.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { ExportModule } from './export/export.module';
import { AdminAccountsModule } from './admin-accounts/admin-accounts.module';
import { MetricsModule } from './metrics/metrics.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PermissionsGuard } from './auth/permissions.guard';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    RedisModule,
    MinioModule,
    OperationLogModule,
    AuthModule,
    ProductModule,
    LibraryModule,
    UploadModule,
    MemberModule,
    StoredValueModule,
    CartModule,
    OrderModule,
    ReviewModule,
    RecommendModule,
    HistoryModule,
    PosterModule,
    FlavorModule,
    DashboardModule,
    StatisticsModule,
    SettingsModule,
    ReconciliationModule,
    ExportModule,
    AdminAccountsModule,
    MetricsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
