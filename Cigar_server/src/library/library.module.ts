import { Module } from '@nestjs/common';
import { InstoreService } from './instore.service';
import { InstoreController } from './instore.controller';
import { ReferenceController } from './reference.controller';
import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';

@Module({
  controllers: [InstoreController, ReferenceController, TagsController],
  providers: [InstoreService, TagsService],
})
export class LibraryModule {}
