import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import { JwtPayload } from './jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    if (!user || user.type !== 'admin') return false;

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
