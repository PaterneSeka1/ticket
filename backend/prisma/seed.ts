import 'dotenv/config';
import { hash } from 'bcryptjs';
import { PrismaClient } from '../generated/prisma/client.js';
import {
  UserRole,
  IncidentScope,
} from '../generated/prisma/index.js';

const prisma = new PrismaClient();
const BASE_PASSWORD = 'ChangeMe123!';

const log = (message: string) => {
  console.error(message);
};

type UserDetails = {
  nom: string;
  prenom: string;
  email: string;
  matricule: string;
  role: UserRole;
  departmentId?: string;
  serviceId?: string;
  createdById?: string | null;
  hashedPassword: string;
};

async function ensureDepartment(details: {
  name: string;
  description?: string;
}) {
  const now = new Date();
  return prisma.department.upsert({
    where: { name: details.name },
    update: {
      description: details.description ?? undefined,
      isActive: true,
      updatedAt: now,
    },
    create: {
      name: details.name,
      description: details.description,
      createdAt: now,
      updatedAt: now,
    },
  });
}

async function ensureService(details: {
  name: string;
  description?: string;
  departmentId: string;
}) {
  const now = new Date();
  return prisma.service.upsert({
    where: { name: details.name },
    update: {
      description: details.description ?? undefined,
      departmentId: details.departmentId,
      isActive: true,
      updatedAt: now,
    },
    create: {
      name: details.name,
      description: details.description,
      departmentId: details.departmentId,
      createdAt: now,
      updatedAt: now,
    },
  });
}

async function ensureUser(details: UserDetails) {
  log(`seed : création/mise à jour de ${details.email} (${details.role})`);
  const now = new Date();
  await prisma.user.upsert({
    where: { email: details.email },
    update: {
      nom: details.nom,
      prenom: details.prenom,
      passwordHash: details.hashedPassword,
      role: details.role,
      matricule: details.matricule,
      departmentId: details.departmentId ?? undefined,
      serviceId: details.serviceId ?? undefined,
      isActive: true,
      receiveEmails: true,
      createdById: details.createdById ?? undefined,
      updatedAt: now,
    },
    create: {
      nom: details.nom,
      prenom: details.prenom,
      email: details.email,
      matricule: details.matricule,
      passwordHash: details.hashedPassword,
      role: details.role,
      departmentId: details.departmentId,
      serviceId: details.serviceId,
      isActive: true,
      receiveEmails: true,
      createdById: details.createdById ?? null,
      createdAt: now,
      updatedAt: now,
    },
  });
}

async function ensureIncidentType(details: {
  name: string;
  scope: IncidentScope;
  description?: string;
}) {
  const now = new Date();
  return prisma.incidentType.upsert({
    where: { name: details.name },
    update: {
      scope: details.scope,
      description: details.description ?? undefined,
      isActive: true,
      updatedAt: now,
    },
    create: {
      name: details.name,
      scope: details.scope,
      description: details.description,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  });
}

async function ensureCategory(details: {
  name: string;
  incidentTypeId: string;
  description?: string;
}) {
  const now = new Date();
  return prisma.category.upsert({
    where: {
      incidentTypeId_name: {
        incidentTypeId: details.incidentTypeId,
        name: details.name,
      },
    },
    update: {
      description: details.description ?? undefined,
      isActive: true,
      updatedAt: now,
    },
    create: {
      name: details.name,
      incidentTypeId: details.incidentTypeId,
      description: details.description,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  });
}

async function ensureResolutionResponsible(details: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role?: string;
  department?: string;
  isExternal?: boolean;
}) {
  const now = new Date();
  const existing = details.email
    ? await prisma.resolutionResponsible.findUnique({
        where: { email: details.email },
      })
    : await prisma.resolutionResponsible.findFirst({
        where: {
          firstName: details.firstName,
          lastName: details.lastName,
          department: details.department ?? undefined,
        },
      });

  if (existing) {
    return prisma.resolutionResponsible.update({
      where: { id: existing.id },
      data: {
        phone: details.phone ?? undefined,
        role: details.role ?? undefined,
        department: details.department ?? undefined,
        isExternal: details.isExternal ?? false,
        isActive: true,
        updatedAt: now,
      },
    });
  }

  return prisma.resolutionResponsible.create({
    data: {
      firstName: details.firstName,
      lastName: details.lastName,
      email: details.email,
      phone: details.phone,
      role: details.role,
      department: details.department,
      isExternal: details.isExternal ?? false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set before running the seed.');
  }

  await prisma.$connect();
  log('seed : connexion établie');

  const direction = await ensureDepartment({
    name: 'Direction des Opérations',
    description: 'Pilotage des incidents et des processus critiques',
  });

  const operationalService = await ensureService({
    name: 'Support IT',
    description: 'Service en charge du traitement technique des incidents',
    departmentId: direction.id,
  });

  const hashedPassword = await hash(BASE_PASSWORD, 10);

  await ensureUser({
    nom: 'Super',
    prenom: 'Admin',
    email: 'superadmin@example.com',
    matricule: 'SUPER-0001',
    role: UserRole.SUPER_ADMIN,
    hashedPassword,
  });

  const superAdmin = await prisma.user.findUnique({
    where: { email: 'superadmin@example.com' },
  });

  if (!superAdmin) {
    throw new Error('Impossible de retrouver le SUPER_ADMIN après création.');
  }

  await ensureUser({
    nom: 'Base',
    prenom: 'Admin',
    email: 'admin@example.com',
    matricule: 'ADMIN-0001',
    role: UserRole.ADMIN,
    departmentId: direction.id,
    serviceId: operationalService.id,
    createdById: superAdmin.id,
    hashedPassword,
  });

  await ensureUser({
    nom: 'Lecteur',
    prenom: 'Rapport',
    email: 'reader@example.com',
    matricule: 'READER-0001',
    role: UserRole.READER,
    departmentId: direction.id,
    createdById: superAdmin.id,
    hashedPassword,
  });

  await ensureUser({
    nom: 'Employé',
    prenom: 'Utilisateur',
    email: 'employee@example.com',
    matricule: 'EMPL-0001',
    role: UserRole.EMPLOYE,
    departmentId: direction.id,
    serviceId: operationalService.id,
    createdById: superAdmin.id,
    hashedPassword,
  });

  const [interne, externe] = await Promise.all([
    ensureIncidentType({
      name: 'Incident Interne',
      scope: IncidentScope.INTERNE,
      description: 'Dysfonctionnement ou panne affectant uniquement les équipes internes',
    }),
    ensureIncidentType({
      name: 'Incident Externe',
      scope: IncidentScope.EXTERNE,
      description: 'Incident impliquant des entités extérieures (clients, fournisseurs)',
    }),
  ]);

  await ensureCategory({
    name: 'Panne réseau',
    incidentTypeId: interne.id,
    description: 'Interruption ou perte de connectivité sur les infrastructures internes',
  });

  await ensureCategory({
    name: 'Incident client critique',
    incidentTypeId: externe.id,
    description: 'Incident signalé par un client majeur impactant un service payant',
  });

  await ensureResolutionResponsible({
    firstName: 'Claire',
    lastName: 'Technicienne',
    email: 'claire.tech@example.com',
    phone: '+22500000000',
    role: 'Technicien réseau senior',
    department: 'Support IT',
    isExternal: false,
  });

  await ensureResolutionResponsible({
    firstName: 'Alex',
    lastName: 'Partenaire',
    email: 'alex.partner@example.com',
    phone: '+22511111111',
    role: 'Prestataire externe',
    department: 'Sous-traitance',
    isExternal: true,
  });

  log('seed : données initiales sauvegardées');
}

void main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
    log('seed : déconnexion');
  });
