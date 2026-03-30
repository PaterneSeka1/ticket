import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { TicketPriority as TicketPriorityEnum, UserRole as UserRoleEnum } from '../generated/prisma/index.js';
import type { TicketPriority as TicketPriorityType, UserRole as UserRoleType } from '../generated/prisma/index.js';
import { hash } from 'bcryptjs';

const seedLog = (message: string) => {
  console.error(message);
};

seedLog('seed : script chargé');

type UserRole = UserRoleType;
type TicketPriority = TicketPriorityType;

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
  const passwordHash = await hash(BASE_PASSWORD, 10);
  const now = new Date();
  const data = {
    matricule: details.matricule,
    nom: details.nom,
    prenom: details.prenom,
    role: details.role,
    passwordHash,
    isActive: true,
    accessReport: true,
    exportReport: true,
    lastLogin: now,
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
          createdById: existing.createdById ?? null,
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
          createdById: null,
          ...data,
        },
      });
    seedLog(
      `seed : compte ${details.email} créé (role=${details.role}, actif=true)`,
    );
  }
}

const slaDefaults: Array<{
  priority: TicketPriority;
  responseMinutes: number;
  resolutionMinutes: number;
}> = [
  {
    priority: TicketPriorityEnum.CRITIQUE,
    responseMinutes: 30,
    resolutionMinutes: 240,
  },
  {
    priority: TicketPriorityEnum.HAUT,
    responseMinutes: 120,
    resolutionMinutes: 480,
  },
  {
    priority: TicketPriorityEnum.MOYEN,
    responseMinutes: 1440,
    resolutionMinutes: 4320,
  },
  {
    priority: TicketPriorityEnum.BAS,
    responseMinutes: 2880,
    resolutionMinutes: 10080,
  },
];

async function ensureDefaultSlaPolicies() {
  for (const policy of slaDefaults) {
    await ensureSlaPolicy(policy);
  }
}

async function ensureSlaPolicy(details: {
  priority: TicketPriority;
  responseMinutes: number;
  resolutionMinutes: number;
}) {
  const { priority, responseMinutes, resolutionMinutes } = details;
  await prisma.slaPolicy.upsert({
    where: { priority },
    create: {
      priority,
      responseMinutes,
      resolutionMinutes,
      isActive: true,
    },
    update: {
      responseMinutes,
      resolutionMinutes,
      isActive: true,
    },
  });
  seedLog(`seed : SLA ${priority} mis à jour`);
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
  await ensureDefaultSlaPolicies();
  seedLog('seed : comptes et SLA sauvegardés');
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
