import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import { ALLOW_PASSWORD_CHANGE_KEY } from '../common/decorators/allow-password-change.decorator';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { JwtPayload } from './jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    if (!user) return false;

    // 受限 Token（仅允许修改密码）只能在标记了 @AllowPasswordChange() 的端点上使用
    if (user.type === 'admin' && user.scope === 'change_password') {
      const allowPasswordChange = this.reflector.getAllAndOverride<boolean>(
        ALLOW_PASSWORD_CHANGE_KEY,
        [context.getHandler(), context.getClass()],
      );
      return !!allowPasswordChange;
    }

    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    // 未声明权限要求的端点：任何已认证用户（含微信小程序用户）放行
    if (!required || required.length === 0) return true;

    // 带 @Permissions() 的端点必须是管理员
    if (user.type !== 'admin') return false;

    // super 角色跳过权限检查
    if (user.roleCode === 'super') return true;

    const rolePerms = await this.prisma.rolePermission.findMany({
      where: { roleCode: user.roleCode },
      select: { permissionCode: true },
    });
    const permSet = new Set(rolePerms.map((r) => r.permissionCode));
    return required.every((p) => permSet.has(p));
  }
}
