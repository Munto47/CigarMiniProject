import { Module } from '@nestjs/common';
import { PosterService } from './poster.service';
import { PosterController } from './poster.controller';
import { AdminPosterController } from './admin-poster.controller';

@Module({
  controllers: [PosterController, AdminPosterController],
  providers: [PosterService],
  exports: [PosterService],
})
export class PosterModule {}
