import 'dotenv/config';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { PrismaClient as PrismaClientGenerated } from '../../generated/prisma/client.js';
import { importGeneratedPrismaModule } from './generated-prisma-import.js';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private clientInstance?: PrismaClientGenerated;

  get client(): PrismaClientGenerated {
    if (!this.clientInstance) {
      throw new Error('Prisma client not initialized yet.');
    }
    return this.clientInstance;
  }

  async onModuleInit() {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'DATABASE_URL must be defined before the Prisma client can connect.',
      );
    }

    const prismaModule = await importGeneratedPrismaModule<
      typeof import('../../generated/prisma/client.js')
    >('client.js');
    const { PrismaClient } = prismaModule;
    const instance = new PrismaClient();
    this.clientInstance = instance;
    await instance.$connect();
  }

  async onModuleDestroy() {
    await this.clientInstance?.$disconnect();
  }
}
