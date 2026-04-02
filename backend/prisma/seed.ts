import 'dotenv/config';
import { hash } from 'bcryptjs';
import { PrismaClient } from '../generated/prisma/client.js';
import {
  UserRole,
  IncidentScope,
  TicketPriority,
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

async function ensureSlaPolicy(details: {
  priority: TicketPriority;
  responseMinutes: number;
  resolutionMinutes: number;
  isActive?: boolean;
}) {
  const now = new Date();
  return prisma.slaPolicy.upsert({
    where: { priority: details.priority },
    update: {
      responseMinutes: details.responseMinutes,
      resolutionMinutes: details.resolutionMinutes,
      isActive: details.isActive ?? true,
      updatedAt: now,
    },
    create: {
      priority: details.priority,
      responseMinutes: details.responseMinutes,
      resolutionMinutes: details.resolutionMinutes,
      isActive: details.isActive ?? true,
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

  const departments = await Promise.all([
    ensureDepartment({
      name: 'Direction des Affaires Financières',
      description: 'Pilotage des budgets et des arbitrages financiers.',
    }),
    ensureDepartment({
      name: 'Direction du Service Informatique',
      description: 'Gouvernance des plateformes et de la sécurité technique.',
    }),
    ensureDepartment({
      name: 'Direction des Opérations',
      description: 'Pilotage des incidents et des processus critiques.',
    }),
  ]);

  const operations = departments.find(
    (department) => department.name === 'Direction des Opérations',
  );
  const informatique = departments.find(
    (department) => department.name === 'Direction du Service Informatique',
  );

  if (!operations || !informatique) {
    throw new Error(
      'Impossible de retrouver les départements requis pour le seed.',
    );
  }

  await Promise.all([
    ensureService({
      name: 'Service Qualité',
      description: 'Assure le suivi qualité des interventions.',
      departmentId: operations.id,
    }),
    ensureService({
      name: 'Service Réputation',
      description: 'Gère la communication sur les incidents sensibles.',
      departmentId: operations.id,
    }),
    ensureService({
      name: 'Service Information',
      description: 'Collectionne les flux de renseignement opérationnels.',
      departmentId: operations.id,
    }),
  ]);

  const hashedPassword = await hash(BASE_PASSWORD, 10);

  await ensureUser({
    nom: 'Super',
    prenom: 'Admin',
    email: 'superadmin@example.com',
    matricule: 'SUPER-0001',
    role: UserRole.SUPER_ADMIN,
    departmentId: informatique.id,
    hashedPassword,
  });

  const slaPolicies = [
    {
      label: 'P1',
      priority: TicketPriority.CRITICAL,
      responseMinutes: 5,
      resolutionMinutes: 30,
    },
    {
      label: 'P2',
      priority: TicketPriority.HIGH,
      responseMinutes: 15,
      resolutionMinutes: 120,
    },
    {
      label: 'P3',
      priority: TicketPriority.MEDIUM,
      responseMinutes: 30,
      resolutionMinutes: 360,
    },
  ];

  await Promise.all(
    slaPolicies.map(
      async ({ label, priority, responseMinutes, resolutionMinutes }) => {
        await ensureSlaPolicy({
          priority,
          responseMinutes,
          resolutionMinutes,
        });
        log(`seed : SLA ${label} (${priority}) configuré`);
      },
    ),
  );

  const [interne, externe] = await Promise.all([
    ensureIncidentType({
      name: 'Incident Interne',
      scope: IncidentScope.INTERNE,
      description:
        'Dysfonctionnement ou panne affectant uniquement les équipes internes',
    }),
    ensureIncidentType({
      name: 'Incident Externe',
      scope: IncidentScope.EXTERNE,
      description:
        'Incident impliquant des entités extérieures (clients, fournisseurs)',
    }),
  ]);

  await ensureCategory({
    name: 'Panne réseau',
    incidentTypeId: interne.id,
    description:
      'Interruption ou perte de connectivité sur les infrastructures internes',
  });

  await ensureCategory({
    name: 'Incident client critique',
    incidentTypeId: externe.id,
    description:
      'Incident signalé par un client majeur impactant un service payant',
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
