import { hash } from 'bcryptjs';
import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';

type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'READER' | 'EMPLOYE';
type TicketPriority = 'MEDIUM' | 'HIGH' | 'CRITICAL';
type ServiceScope = 'INTERNE' | 'EXTERNE';

type Department = {
  id: string;
  name: string;
};

type Service = {
  id: string;
};

type ServiceType = {
  id: string;
};

type Category = {
  id: string;
};

type ResolutionResponsible = {
  id: string;
};

type SlaPolicy = {
  id: string;
};

type PrismaArgs = Record<string, unknown>;

type SeedPrismaClient = {
  department: {
    upsert(args: PrismaArgs): Promise<Department>;
  };
  service: {
    upsert(args: PrismaArgs): Promise<Service>;
  };
  user: {
    upsert(args: PrismaArgs): Promise<unknown>;
  };
  serviceType: {
    upsert(args: PrismaArgs): Promise<ServiceType>;
  };
  category: {
    upsert(args: PrismaArgs): Promise<Category>;
  };
  resolutionResponsible: {
    findUnique(args: PrismaArgs): Promise<ResolutionResponsible | null>;
    findFirst(args: PrismaArgs): Promise<ResolutionResponsible | null>;
    update(args: PrismaArgs): Promise<ResolutionResponsible>;
    create(args: PrismaArgs): Promise<ResolutionResponsible>;
  };
  slaPolicy: {
    upsert(args: PrismaArgs): Promise<SlaPolicy>;
  };
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
};

const prisma = new (PrismaClient as new () => SeedPrismaClient)();
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
}): Promise<Department> {
  const now = new Date();
  const department: Department = await prisma.department.upsert({
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
  return department;
}

async function ensureService(details: {
  name: string;
  description?: string;
  departmentId: string;
}): Promise<Service> {
  const now = new Date();
  const service: Service = await prisma.service.upsert({
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
  return service;
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

async function ensureServiceType(details: {
  name: string;
  scope: ServiceScope;
  description?: string;
}): Promise<ServiceType> {
  const now = new Date();
  const serviceType: ServiceType = await prisma.serviceType.upsert({
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
  return serviceType;
}

async function ensureCategory(details: {
  name: string;
  serviceTypeId: string;
  description?: string;
}): Promise<Category> {
  const now = new Date();
  const category: Category = await prisma.category.upsert({
    where: {
      serviceTypeId_name: {
        serviceTypeId: details.serviceTypeId,
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
      serviceTypeId: details.serviceTypeId,
      description: details.description,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  });
  return category;
}

async function ensureResolutionResponsible(details: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role?: string;
  department?: string;
  isExternal?: boolean;
}): Promise<ResolutionResponsible> {
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
    const responsible: ResolutionResponsible =
      await prisma.resolutionResponsible.update({
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
    return responsible;
  }

  const responsible: ResolutionResponsible =
    await prisma.resolutionResponsible.create({
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
  return responsible;
}

async function ensureSlaPolicy(details: {
  priority: TicketPriority;
  responseMinutes: number;
  resolutionMinutes: number;
  isActive?: boolean;
}): Promise<SlaPolicy> {
  const now = new Date();
  const slaPolicy: SlaPolicy = await prisma.slaPolicy.upsert({
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
  return slaPolicy;
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
    role: 'SUPER_ADMIN',
    departmentId: informatique.id,
    hashedPassword,
  });

  await ensureUser({
    nom: 'Lecteur',
    prenom: 'Global',
    email: 'reader@example.com',
    matricule: 'READER-0001',
    role: 'READER',
    departmentId: informatique.id,
    hashedPassword,
  });

  const slaPolicies = [
    {
      label: 'P1',
      priority: 'CRITICAL' as const,
      responseMinutes: 5,
      resolutionMinutes: 30,
    },
    {
      label: 'P2',
      priority: 'HIGH' as const,
      responseMinutes: 15,
      resolutionMinutes: 120,
    },
    {
      label: 'P3',
      priority: 'MEDIUM' as const,
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
    ensureServiceType({
      name: 'Incident Interne',
      scope: 'INTERNE',
      description:
        'Dysfonctionnement ou panne affectant uniquement les équipes internes',
    }),
    ensureServiceType({
      name: 'Incident Externe',
      scope: 'EXTERNE',
      description:
        'Incident impliquant des entités extérieures (clients, fournisseurs)',
    }),
  ]);

  await ensureCategory({
    name: 'Panne réseau',
    serviceTypeId: interne.id,
    description:
      'Interruption ou perte de connectivité sur les infrastructures internes',
  });

  await ensureCategory({
    name: 'Incident client critique',
    serviceTypeId: externe.id,
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
