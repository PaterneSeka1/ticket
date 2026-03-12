import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { UserRole as UserRoleEnum } from '../generated/prisma/enums.js';
import type { UserRole as UserRoleType } from '../generated/prisma/enums.js';
import { hash } from 'bcryptjs';

const seedLog = (message: string) => {
  console.error(message);
};

seedLog('seed : script chargé');

type UserRole = UserRoleType;

const prisma = new PrismaClient();
const BASE_PASSWORD = 'ChangeMe123!';

async function ensureAccount(details: {
  email: string;
  matricule: string;
  role: UserRole;
  nom: string;
  prenom: string;
}) {
    seedLog(
      `seed : traitement de ${details.nom} ${details.prenom} (${details.email}) [matricule ${details.matricule}]`,
    );
  const password = await hash(BASE_PASSWORD, 10);
  const now = new Date();
  const data = {
    matricule: details.matricule,
    nom: details.nom,
    prenom: details.prenom,
    role: details.role,
    password,
    isActive: true,
    updatedAt: now,
  };

  const existing = await prisma.user.findUnique({
    where: { email: details.email },
  });
  if (existing) {
    await prisma.user.update({
      where: { email: details.email },
      data: {
        ...data,
        createdAt: existing.createdAt,
      },
    });
    seedLog(
      `seed : compte ${details.email} mis à jour (role=${details.role}, actif=true)`,
    );
  } else {
    await prisma.user.create({
      data: {
        email: details.email,
        createdAt: now,
        ...data,
      },
    });
    seedLog(
      `seed : compte ${details.email} créé (role=${details.role}, actif=true)`,
    );
  }
}

async function main() {
  seedLog('seed : démarrage');
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set before running the seed.');
  }

  await prisma.$connect();

  seedLog('seed : connexion établie, mise à jour des comptes');

  await Promise.all([
    ensureAccount({
      email: 'superadmin@example.com',
      matricule: 'SUPER-0001',
      nom: 'Super',
      prenom: 'Admin',
      role: UserRoleEnum.SUPER_ADMIN,
    }),
    ensureAccount({
      email: 'admin@example.com',
      matricule: 'ADMIN-0001',
      nom: 'Base',
      prenom: 'Admin',
      role: UserRoleEnum.ADMIN,
    }),
  ]);
  seedLog('seed : comptes sauvegardés');
}

void main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
    })
  .finally(() => {
    void prisma.$disconnect();
    seedLog('seed : déconnexion');
  });
