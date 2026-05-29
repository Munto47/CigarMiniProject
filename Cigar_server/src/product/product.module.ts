import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { PublicCigarController } from './public-cigar.controller';
import { PublicDrinkController } from './public-drink.controller';
import { AdminCigarController } from './admin-cigar.controller';
import { AdminDrinkController } from './admin-drink.controller';
import { RedisModule } from '../infra/redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [
    PublicCigarController,
    PublicDrinkController,
    AdminCigarController,
    AdminDrinkController,
  ],
  providers: [ProductService],
})
export class ProductModule {}
