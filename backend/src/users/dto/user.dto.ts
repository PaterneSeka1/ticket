import {
  DirectionType,
  OperationService,
  UserRole,
} from '../../prisma/enums.js';

export class UserDto {
  id!: string;
  nom!: string;
  prenom!: string;
  email!: string;
  matricule!: string;
  role!: UserRole;
  direction?: DirectionType | null;
  service?: OperationService | null;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  createdById?: string | null;
  lastLogin?: Date | null;
}
