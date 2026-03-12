import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../prisma/enums.js';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
