import { Module } from '@nestjs/common';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { AdminMemberService } from './admin-member.service';
import { AdminMemberController } from './admin-member.controller';

@Module({
  controllers: [MemberController, AdminMemberController],
  providers: [MemberService, AdminMemberService],
  exports: [MemberService],
})
export class MemberModule {}
