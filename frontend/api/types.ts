export type UserRole = "SUPER_ADMIN" | "ADMIN" | "READER" | "EMPLOYE";

export interface Department {
  id: string;
  name: string;
}

export interface Service {
  id: string;
  name: string;
  departmentId: string;
}

export type OperationService = "QUALITE" | "OPERATIONS" | "REPUTATION";

export type DsiTicketRole = "RESPONSABLE" | "CO_RESPONSABLE";

export type UserResponsibility = "RESPONSABLE" | "EMPLOYE";

export type TicketType = "INCIDENT" | "DEMANDE";

export type TicketStatus =
  | "RECU"
  | "EN_COURS"
  | "AJOURNE"
  | "RESOLU"
  | "ABANDONNE"
  | "FERME"
  | "OUVERT"
  | "PRIS"
  | "PENDING_ASSIGNMENT"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "UNRESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TimelineEventType = "CREATE" | "RECEIVE" | "STATUS_CHANGE" | "ACTION";

export interface AuthenticatedUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  matricule: string;
  role: UserRole;
  departmentId?: string | null;
  serviceId?: string | null;
  department?: Department | null;
  service?: Service | null;
  dsiTicketRole?: DsiTicketRole | null;
  isResponsable: boolean;
  isActive: boolean;
  accessReport: boolean;
  exportReport: boolean;
  createdAt: string;
  updatedAt: string;
  createdById?: string | null;
  lastLogin?: string | null;
}

export interface TicketCategory {
  id: string;
  libelle: string;
  name: string;
  type: TicketType;
  description?: string | null;
  isActive: boolean;
  incidentTypeId: string;
  incidentType: {
    id: string;
    name: string;
    scope: "INTERNE" | "EXTERNE";
    description?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TicketCategorySummary {
  id: string;
  libelle: string;
  type: TicketType;
}

export interface TicketActor {
  id: string;
  nom: string;
  prenom: string;
  email?: string;
  matricule?: string;
  role?: UserRole;
}

export interface TicketCategoryRef extends TicketCategorySummary {
  name?: string;
  incidentTypeId?: string;
  isActive?: boolean;
  incidentType?: TicketCategory["incidentType"];
}

export interface TicketTimeline {
  id: string;
  ticketId: string;
  type: TimelineEventType;
  label: string;
  actorName: string;
  createdAt: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  content: string;
  createdAt: string;
  author: TicketActor;
}

export interface TicketAttachment {
  id: string;
  ticketId: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedById?: string | null;
  uploadedAt: string;
}

export interface TicketStatusLog {
  id: string;
  ticketId: string;
  fromStatus?: TicketStatus | null;
  toStatus: TicketStatus;
  changedById?: string | null;
  changedBy?: TicketActor | null;
  comment?: string | null;
  createdAt: string;
}

export interface Ticket {
  id: string;
  code?: string;
  ticketNumber?: string;
  type?: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  title?: string;
  description: string;
  assignedService?: OperationService | null;
  category: TicketCategoryRef;
  emitter?: TicketActor;
  createdBy?: TicketActor | null;
  receivedBy: TicketActor | null;
  receivedAt?: string | null;
  assignedResponsible?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    isActive: boolean;
  } | null;
  assignedAt?: string | null;
  clientName?: string | null;
  product?: string | null;
  attachmentName?: string | null;
  detectedAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  resolutionComment?: string | null;
  slaMaxMinutes?: number | null;
  waitMinutes?: number | null;
  createdAt: string;
  updatedAt: string;
  attachments?: TicketAttachment[];
  statusHistory?: TicketStatusLog[];
  comments?: TicketComment[];
  timeline?: TicketTimeline[];
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  details?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  role?: string | null;
  ticketId?: string | null;
  createdAt: string;
}

export interface SlaPolicy {
  priority: TicketPriority;
  responseMinutes: number;
  resolutionMinutes: number;
  isActive: boolean;
}
