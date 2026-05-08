import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { QueryLoginLogsDto } from './dto/query-login-logs.dto';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class AdminAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAccounts(page: number, pageSize: number) {
    const where = { deletedAt: null };
    const [list, total] = await Promise.all([
      this.prisma.admin.findMany({
        where,
        select: {
          id: true,
          username: true,
          name: true,
          roleCode: true,
          status: true,
          mustChangePassword: true,
          passwordChangedAt: true,
          lockedUntil: true,
          lastLoginAt: true,
          lastLoginIp: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.admin.count({ where }),
    ]);
    return paginate(
      list.map(a => ({ ...a, id: a.id.toString() })),
      total,
      page,
      pageSize,
    );
  }

  async getAccountById(id: number) {
    const admin = await this.prisma.admin.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        username: true,
        name: true,
        roleCode: true,
        status: true,
        mustChangePassword: true,
        passwordChangedAt: true,
        lockedUntil: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!admin) {
      throw new NotFoundException('管理员不存在');
    }
    return { ...admin, id: admin.id.toString() };
  }

  async createAccount(dto: CreateAdminDto) {
    const existing = await this.prisma.admin.findFirst({
      where: { username: dto.username, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('用户名已存在');
    }

    // Verify role exists
    const role = await this.prisma.role.findUnique({
      where: { code: dto.roleCode },
    });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const created = await this.prisma.admin.create({
      data: {
        username: dto.username,
        name: dto.name,
        passwordHash,
        roleCode: dto.roleCode,
        mustChangePassword: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        roleCode: true,
        status: true,
        createdAt: true,
      },
    });
    return { ...created, id: created.id.toString() };
  }

  async updateAccount(id: number, dto: UpdateAdminDto) {
    await this.getAccountById(id);

    if (dto.roleCode) {
      const role = await this.prisma.role.findUnique({
        where: { code: dto.roleCode },
      });
      if (!role) {
        throw new NotFoundException('角色不存在');
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.roleCode !== undefined) data.roleCode = dto.roleCode;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
      data.mustChangePassword = true;
      data.passwordChangedAt = new Date();
    }

    const updated = await this.prisma.admin.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        name: true,
        roleCode: true,
        status: true,
        mustChangePassword: true,
        updatedAt: true,
      },
    });
    return { ...updated, id: updated.id.toString() };
  }

  async deleteAccount(id: number) {
    await this.getAccountById(id);
    return this.prisma.admin.update({
      where: { id },
      data: { deletedAt: new Date(), status: 0 },
    });
  }

  async getLoginLogs(query: QueryLoginLogsDto) {
    const where: Record<string, unknown> = {};
    if (query.username) where.username = query.username;
    if (query.result) where.result = query.result;

    const [list, total] = await Promise.all([
      this.prisma.adminLoginLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page! - 1) * query.pageSize!,
        take: query.pageSize,
      }),
      this.prisma.adminLoginLog.count({ where }),
    ]);
    return paginate(
      list.map(l => ({ ...l, id: l.id.toString(), adminId: l.adminId?.toString() })),
      total,
      query.page!,
      query.pageSize!,
    );
  }
}
