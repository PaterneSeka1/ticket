import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.client.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
