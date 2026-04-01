import type { SignOptions } from 'jsonwebtoken';
import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ActivityModule } from '../activity/activity.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

const jwtSignOptions = {
  expiresIn: process.env.JWT_EXPIRATION ?? '1h',
} as unknown as SignOptions;

@Module({
  imports: [
    forwardRef(() => ActivityModule),
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'ChangeMe123!',
      signOptions: jwtSignOptions,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard, JwtStrategy],
  exports: [JwtAuthGuard, RolesGuard, JwtStrategy],
})
export class AuthModule {}
