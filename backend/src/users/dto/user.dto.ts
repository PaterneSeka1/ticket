import { UserRole } from '../../prisma/enums.js';

export class UserDto {
  id!: string;
  nom!: string;
  prenom!: string;
  email!: string;
  matricule!: string;
  role!: UserRole;
  departmentId?: string | null;
  serviceId?: string | null;
  isActive!: boolean;
  receiveEmails!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  createdById?: string | null;
}
