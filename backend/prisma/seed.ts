import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();
const BASE_PASSWORD = 'ChangeMe123!';

async function ensureAccount(details: {
  email: string;
  matricule: string;
  role: UserRole;
  nom: string;
  prenom: string;
}) {
  const password = await hash(BASE_PASSWORD, 10);
  const now = new Date();

  await prisma.user.upsert({
    where: { email: details.email },
    create: {
      email: details.email,
      matricule: details.matricule,
      nom: details.nom,
      prenom: details.prenom,
      role: details.role,
      password,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    update: {
      matricule: details.matricule,
      nom: details.nom,
      prenom: details.prenom,
      role: details.role,
      password,
      isActive: true,
      updatedAt: now,
    },
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set before running the seed.');
  }

  await prisma.$connect();

  await Promise.all([
    ensureAccount({
      email: 'superadmin@example.com',
      matricule: 'SUPER-0001',
      nom: 'Super',
      prenom: 'Admin',
      role: UserRole.SUPER_ADMIN,
    }),
    ensureAccount({
      email: 'admin@example.com',
      matricule: 'ADMIN-0001',
      nom: 'Base',
      prenom: 'Admin',
      role: UserRole.ADMIN,
    }),
  ]);
}

void main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
