import 'dotenv/config';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { PrismaClient as PrismaClientGenerated } from '../../generated/prisma/client.js';

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

    const { PrismaClient } = await import('../../generated/prisma/client.js');
    this.clientInstance = new PrismaClient();
    await this.clientInstance.$connect();
  }

  async onModuleDestroy() {
    await this.clientInstance?.$disconnect();
  }
}
